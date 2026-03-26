'use client';

// ============================================================
// QuickHelp.tsx — Panel de ayuda rápida con plantillas
// ============================================================

import { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';

interface Template {
  label: string;
  icon: string;
  code: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    label: 'Si - Entonces',
    icon: '🔀',
    code: `Si (condicion) Entonces
    // instrucciones
SiNo
    // instrucciones alternativas
FinSi`,
    description: 'Estructura condicional básica',
  },
  {
    label: 'Según',
    icon: '🎯',
    code: `Segun variable Hacer
    1:
        // caso 1
    2:
        // caso 2
    De Otro Modo:
        // caso por defecto
FinSegun`,
    description: 'Selección múltiple por valor',
  },
  {
    label: 'Mientras',
    icon: '🔄',
    code: `Mientras (condicion) Hacer
    // instrucciones
FinMientras`,
    description: 'Bucle con condición al inicio',
  },
  {
    label: 'Repetir',
    icon: '🔁',
    code: `Repetir
    // instrucciones
Hasta Que (condicion);`,
    description: 'Bucle con condición al final',
  },
  {
    label: 'Para',
    icon: '🔢',
    code: `Para i <- 1 Hasta 10 Con Paso 1 Hacer
    // instrucciones
FinPara`,
    description: 'Bucle con contador',
  },
  {
    label: 'Leer / Escribir',
    icon: '📖',
    code: `Escribir "Ingrese un valor:";
Leer variable;
Escribir "El valor es: ", variable;`,
    description: 'Entrada y salida de datos',
  },
  {
    label: 'Definir Variables',
    icon: '📦',
    code: `Definir nombre Como Cadena;
Definir edad Como Entero;
Definir promedio Como Real;
Definir aprobado Como Logico;`,
    description: 'Declaración de variables con tipos',
  },
  {
    label: 'Arreglo',
    icon: '📊',
    code: `Dimension numeros[10];
Para i <- 1 Hasta 10 Hacer
    numeros[i] <- i * 2;
FinPara`,
    description: 'Declaración y uso de arreglos',
  },
  {
    label: 'SubProceso',
    icon: '⚙️',
    code: `SubProceso resultado <- Sumar(a, b)
    Definir resultado Como Entero;
    resultado <- a + b;
FinSubProceso`,
    description: 'Función o subrutina reutilizable',
  },
  {
    label: 'Programa Completo',
    icon: '🚀',
    code: `Proceso MiPrograma
    Definir nombre Como Cadena;
    Definir edad Como Entero;
    
    Escribir "¿Cuál es tu nombre?";
    Leer nombre;
    Escribir "¿Cuántos años tenés?";
    Leer edad;
    
    Si (edad >= 18) Entonces
        Escribir "Hola ", nombre, ", sos mayor de edad.";
    SiNo
        Escribir "Hola ", nombre, ", sos menor de edad.";
    FinSi
FinProceso`,
    description: 'Ejemplo de programa completo con E/S y condicional',
  },
];

export default function QuickHelp() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="h-full flex flex-col bg-[#1E1E1E] text-gray-300">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/50">
        <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Ayuda Rápida
        </span>
      </div>

      {/* Templates */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {TEMPLATES.map((template, i) => (
          <div key={i} className="rounded-lg overflow-hidden border border-gray-700/30">
            <button
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700/30 transition-colors text-left"
            >
              <span className="text-base">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-200">{template.label}</div>
                <div className="text-xs text-gray-500 truncate">{template.description}</div>
              </div>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  expandedIndex === i ? 'rotate-180' : ''
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {expandedIndex === i && (
              <div className="border-t border-gray-700/30 bg-[#141414]">
                <pre className="p-3 text-xs text-gray-300 overflow-x-auto leading-relaxed">
                  <code>{template.code}</code>
                </pre>
                <div className="flex justify-end gap-1 px-2 pb-2">
                  <button
                    onClick={() => handleCopy(template.code, i)}
                    className="px-3 py-1 text-xs rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors"
                  >
                    {copiedIndex === i ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
