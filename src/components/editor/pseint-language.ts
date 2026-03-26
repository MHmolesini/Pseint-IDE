// ============================================================
// pseint-language.ts — Definición del lenguaje PSeInt para Monaco Editor
// ============================================================

import type { languages } from 'monaco-editor';

export const PSEINT_LANGUAGE_ID = 'pseint';

/**
 * Definición del lenguaje para Monaco Editor.
 * Incluye syntax highlighting, autocompletado básico y folding.
 */
export const pseintLanguageDefinition: languages.IMonarchLanguage = {
  defaultToken: '',
  ignoreCase: true,

  keywords: [
    'Proceso', 'FinProceso',
    'Definir', 'Como', 'Dimension',
    'Leer', 'Escribir',
    'Si', 'Entonces', 'SiNo', 'FinSi',
    'Segun', 'Hacer', 'De Otro Modo', 'FinSegun',
    'Mientras', 'FinMientras',
    'Repetir', 'Hasta Que',
    'Para', 'Hasta', 'Con Paso', 'FinPara',
    'SubProceso', 'FinSubProceso',
    'Funcion', 'FinFuncion',
    'Verdadero', 'Falso',
    'Mod',
  ],

  typeKeywords: [
    'Entero', 'Real', 'Numero', 'Numerico',
    'Cadena', 'Caracter', 'Texto',
    'Logico',
  ],

  builtinFunctions: [
    'RC', 'RAIZ', 'ABS', 'TRUNC', 'REDON', 'AZAR',
    'SEN', 'COS', 'TAN', 'ASEN', 'ACOS', 'ATAN',
    'LN', 'EXP', 'Longitud', 'Subcadena', 'Concatenar',
    'ConvertirANumero', 'ConvertirATexto',
    'Mayusculas', 'Minusculas',
  ],

  operators: [
    '<-', '<=', '>=', '<>', '!=', '==',
    '+', '-', '*', '/', '%', '^',
    '<', '>', '=',
    '&', '|', '~',
  ],

  symbols: /[=><!~?:&|+\-*\/\^%]+/,

  tokenizer: {
    root: [
      // Comentarios
      [/\/\/.*$/, 'comment'],

      // Cadenas
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string_double'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string_single'],

      // Números
      [/\d*\.\d+/, 'number.float'],
      [/\d+/, 'number'],

      // Identificadores y palabras clave
      [/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ_]\w*/, {
        cases: {
          '@keywords': 'keyword',
          '@typeKeywords': 'type',
          '@builtinFunctions': 'support.function',
          '@default': 'identifier',
        },
      }],

      // Operadores
      [/<-/, 'keyword.operator.assignment'],
      [/<=|>=|<>|!=|==/, 'keyword.operator.comparison'],
      [/[+\-*\/\^%]/, 'keyword.operator.arithmetic'],
      [/[<>=]/, 'keyword.operator.comparison'],
      [/[&|~]/, 'keyword.operator.logical'],

      // Delimitadores
      [/[{}()\[\]]/, '@brackets'],
      [/[;,.]/, 'delimiter'],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@pop'],
    ],
  },
};

/**
 * Configuración del lenguaje para Monaco.
 */
export const pseintLanguageConfiguration: languages.LanguageConfiguration = {
  comments: {
    lineComment: '//',
  },
  brackets: [
    ['(', ')'],
    ['[', ']'],
  ],
  autoClosingPairs: [
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
  ],
  folding: {
    markers: {
      start: /^\s*(Proceso|Si|Mientras|Para|Repetir|Segun|SubProceso|Funcion)\b/i,
      end: /^\s*(FinProceso|FinSi|FinMientras|FinPara|Hasta\s+Que|FinSegun|FinSubProceso|FinFuncion)\b/i,
    },
  },
  indentationRules: {
    increaseIndentPattern: /^\s*(Proceso|Si\b.*Entonces|SiNo|Mientras|Para\b.*Hacer|Para\b.*Hasta|Repetir|Segun\b.*Hacer|De\s+Otro\s+Modo|SubProceso|Funcion)\b/i,
    decreaseIndentPattern: /^\s*(FinProceso|FinSi|SiNo|FinMientras|FinPara|Hasta\s+Que|FinSegun|De\s+Otro\s+Modo|FinSubProceso|FinFuncion)\b/i,
  },
  onEnterRules: [
    // Después de línea que termina con "Entonces" → indentar
    {
      beforeText: /^\s*Si\b.*Entonces\s*(;?\s*)?$/i,
      action: { indentAction: 1 /* IndentAction.Indent */ },
    },
    // Después de "SiNo" → indentar
    {
      beforeText: /^\s*SiNo\s*(;?\s*)?$/i,
      action: { indentAction: 1 },
    },
    // Después de "Proceso NombreProceso" → indentar
    {
      beforeText: /^\s*Proceso\s+\w+\s*(;?\s*)?$/i,
      action: { indentAction: 1 },
    },
    // Después de "Mientras ... Hacer" → indentar
    {
      beforeText: /^\s*Mientras\b.*?(Hacer)?\s*(;?\s*)?$/i,
      action: { indentAction: 1 },
    },
    // Después de "Para ... Hacer" o "Para ... Hasta ..." → indentar
    {
      beforeText: /^\s*Para\b.*?(Hacer)?\s*(;?\s*)?$/i,
      action: { indentAction: 1 },
    },
    // Después de "Repetir" → indentar
    {
      beforeText: /^\s*Repetir\s*(;?\s*)?$/i,
      action: { indentAction: 1 },
    },
    // Después de "Segun ... Hacer" → indentar
    {
      beforeText: /^\s*Segun\b.*Hacer\s*(;?\s*)?$/i,
      action: { indentAction: 1 },
    },
    // Después de un caso "N:" en Segun → indentar
    {
      beforeText: /^\s*(\d+|\"[^\"]*\")\s*:\s*$/i,
      action: { indentAction: 1 },
    },
    // Después de "De Otro Modo:" → indentar
    {
      beforeText: /^\s*De\s+Otro\s+Modo\s*:?\s*$/i,
      action: { indentAction: 1 },
    },
    // Después de "SubProceso ..." → indentar
    {
      beforeText: /^\s*SubProceso\b.+$/i,
      action: { indentAction: 1 },
    },
    // Después de "Funcion ..." → indentar
    {
      beforeText: /^\s*Funcion\b.+$/i,
      action: { indentAction: 1 },
    },
  ],
};

/**
 * Tema personalizado para Monaco con colores estilo Claude AI.
 */
export const pseintDarkTheme: languages.IMonarchLanguage & { base: string; inherit: boolean; rules: Array<{ token: string; foreground?: string; fontStyle?: string }>; colors: Record<string, string> } = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'keyword', foreground: 'E8875A', fontStyle: 'bold' },         // Naranja Claude
    { token: 'keyword.operator.assignment', foreground: 'E8875A' },
    { token: 'keyword.operator.comparison', foreground: 'D4A06A' },
    { token: 'keyword.operator.arithmetic', foreground: 'D4A06A' },
    { token: 'keyword.operator.logical', foreground: 'E8875A' },
    { token: 'type', foreground: 'CC8844', fontStyle: 'italic' },          // Naranja suave
    { token: 'support.function', foreground: 'E0A870' },                    // Naranja claro
    { token: 'string', foreground: '9ABFA0' },                              // Verde tenue
    { token: 'number', foreground: 'D4A06A' },                              // Dorado suave
    { token: 'number.float', foreground: 'D4A06A' },
    { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },        // Gris
    { token: 'identifier', foreground: 'D1D5DB' },                          // Gris claro
    { token: 'delimiter', foreground: '9CA3AF' },
  ],
  colors: {
    'editor.background': '#1A1A1A',
    'editor.foreground': '#D1D5DB',
    'editor.lineHighlightBackground': '#2A2A2A',
    'editor.selectionBackground': '#E8875A33',
    'editorCursor.foreground': '#E8875A',
    'editorLineNumber.foreground': '#4B5563',
    'editorLineNumber.activeForeground': '#E8875A',
    'editor.selectionHighlightBackground': '#E8875A22',
  },
} as unknown as languages.IMonarchLanguage & { base: string; inherit: boolean; rules: Array<{ token: string; foreground?: string; fontStyle?: string }>; colors: Record<string, string> };
