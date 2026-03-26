// ============================================================
// errors.ts — Errores de parsing para mensajes claros en español
// ============================================================

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
    public readonly hint?: string,
  ) {
    super(`Error de sintaxis en línea ${line}, columna ${column}: ${message}`);
    this.name = 'ParseError';
  }
}

export class RuntimeError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(`Error de ejecución en línea ${line}: ${message}`);
    this.name = 'RuntimeError';
  }
}

/**
 * Genera un mensaje de error amigable para el estudiante.
 */
export function formatError(error: ParseError | RuntimeError): string {
  const header = error instanceof ParseError
    ? '❌ Error de Sintaxis'
    : '💥 Error de Ejecución';

  let msg = `${header}\n`;
  msg += `📍 Línea ${error.line}, Columna ${error.column}\n`;
  msg += `📝 ${error.message}\n`;

  if (error instanceof ParseError && error.hint) {
    msg += `💡 Sugerencia: ${error.hint}\n`;
  }

  return msg;
}
