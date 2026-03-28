import JSZip from 'jszip';

// ============================================================
// psx-utils.ts — Utilidades para archivos PSeInt (.psc, .psx)
// ============================================================

/**
 * Desencripta el contenido de un archivo .psx usando el algoritmo oficial de PSeInt.
 * @param buffer El contenido binario del archivo.
 * @param password La clave de desencriptación (ej. "IRP").
 * @returns El contenido del archivo ZIP desencriptado.
 */
export function decryptPSeInt(buffer: Uint8Array, password: string): Uint8Array {
  const len = password.length;
  if (len === 0) return buffer;

  // 1. Calcular suma ASCII de la clave para la posición inicial
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += password.charCodeAt(i);
  }

  let pos = sum % len;
  let baseDelta = pos;

  // 2. Detectar cabecera "verYYYYMMDD%"
  const headerSize = 12; // "ver20160401%" son 12 caracteres
  let startIndex = 0;
  const headerStr = new TextDecoder('windows-1252').decode(buffer.slice(0, 3));
  
  const isNewEncryption = headerStr === 'ver';
  if (isNewEncryption) {
    startIndex = 12;
  }

  const encryptedData = buffer.slice(startIndex);
  const decryptedData = new Uint8Array(encryptedData.length);

  // 3. Bucle de desencriptación (modular subtraction flow cipher)
  for (let i = 0; i < encryptedData.length; i++) {
    const x = encryptedData[i];
    const charCode = password.charCodeAt(pos);

    if (isNewEncryption) {
      baseDelta = (baseDelta + charCode) % 256;
      decryptedData[i] = (x + 256 - baseDelta) % 256;
    } else {
      decryptedData[i] = (x + 256 - charCode) % 256;
    }

    pos = (pos + 1) % len;
  }

  return decryptedData;
}

export async function processPSeIntFile(file: File, password?: string): Promise<{ 
  name: string; 
  content: string;
  enunciado?: string;
  tests?: string; // XML de evaluación
}> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder('windows-1252').decode(buffer.slice(0, 3));

  if (header === 'ver') {
    // Archivo protegido
    if (!password) {
      throw new Error('PASSWORD_REQUIRED');
    }

    const decryptedZip = decryptPSeInt(buffer, password);
    
    try {
      const zip = await JSZip.loadAsync(decryptedZip);
      
      // 1. Buscar el código .psc
      const pscFile = Object.keys(zip.files).find(name => name.endsWith('.psc'));
      if (!pscFile) {
        throw new Error('No se encontró un archivo .psc dentro del paquete protegido.');
      }
      const pscBytes = await zip.files[pscFile].async('uint8array');
      const pscContent = new TextDecoder('windows-1252').decode(pscBytes);

      // 2. Buscar el enunciado (prefiriendo HTML)
      let enunciadoContent = '';
      const enunciadoFile = Object.keys(zip.files).find(name => 
        name.toLowerCase().includes('enunciado') || name.toLowerCase().includes('tarea')
      );
      if (enunciadoFile) {
        const bytes = await zip.files[enunciadoFile].async('uint8array');
        enunciadoContent = new TextDecoder('windows-1252').decode(bytes);
      }

      // 3. Buscar datos de evaluación (evaluar.xml)
      let testsContent = '';
      const testsFile = Object.keys(zip.files).find(name => 
        name.toLowerCase().includes('evaluar') && name.endsWith('.xml')
      );
      if (testsFile) {
        const bytes = await zip.files[testsFile].async('uint8array');
        testsContent = new TextDecoder('windows-1252').decode(bytes);
      }

      return { 
        name: pscFile, 
        content: pscContent,
        enunciado: enunciadoContent,
        tests: testsContent
      };
    } catch (e) {
      if ((e as Error).message === 'No se encontró un archivo .psc dentro del paquete protegido.') throw e;
      throw new Error('PASSWORD_INCORRECT');
    }
  }

  // Si no tiene cabecera "ver", lo tratamos como texto plano (PSC normal)
  const content = new TextDecoder('windows-1252').decode(buffer);
  return { name: file.name, content };
}

/**
 * Detecta si el archivo es un .psx o .psc
 */
export function isPSeIntFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext === 'psc' || ext === 'psx';
}

/**
 * Verifica si un buffer tiene cabecera de archivo protegido
 */
export function isProtectedFile(buffer: Uint8Array): boolean {
  const header = new TextDecoder('windows-1252').decode(buffer.slice(0, 3));
  return header === 'ver';
}
