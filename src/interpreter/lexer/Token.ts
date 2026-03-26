// ============================================================
// Token.ts — Tipos de tokens para el Lexer de PSeInt
// ============================================================

export enum TokenType {
  // --- Palabras clave de estructura ---
  PROCESO = 'PROCESO',
  FIN_PROCESO = 'FIN_PROCESO',
  DEFINIR = 'DEFINIR',
  COMO = 'COMO',
  DIMENSION = 'DIMENSION',

  // --- Tipos de datos ---
  TIPO_NUMERICO = 'TIPO_NUMERICO', // Entero, Real, Numero/Numerico
  TIPO_CARACTER = 'TIPO_CARACTER', // Cadena, Caracter, Texto
  TIPO_LOGICO = 'TIPO_LOGICO',     // Logico

  // --- E/S ---
  LEER = 'LEER',
  ESCRIBIR = 'ESCRIBIR',

  // --- Condicional ---
  SI = 'SI',
  ENTONCES = 'ENTONCES',
  SINO = 'SINO',
  FIN_SI = 'FIN_SI',

  // --- Según ---
  SEGUN = 'SEGUN',
  HACER = 'HACER',
  DE_OTRO_MODO = 'DE_OTRO_MODO',
  FIN_SEGUN = 'FIN_SEGUN',

  // --- Bucles ---
  MIENTRAS = 'MIENTRAS',
  FIN_MIENTRAS = 'FIN_MIENTRAS',
  REPETIR = 'REPETIR',
  HASTA_QUE = 'HASTA_QUE',
  PARA = 'PARA',
  HASTA = 'HASTA',
  CON_PASO = 'CON_PASO',
  FIN_PARA = 'FIN_PARA',

  // --- Subprogramas ---
  SUBPROCESO = 'SUBPROCESO',
  FIN_SUBPROCESO = 'FIN_SUBPROCESO',
  FUNCION = 'FUNCION',
  FIN_FUNCION = 'FIN_FUNCION',

  // --- Operador de asignación ---
  ASIGNACION = 'ASIGNACION', // <-

  // --- Operadores aritméticos ---
  MAS = 'MAS',               // +
  MENOS = 'MENOS',           // -
  MULTIPLICAR = 'MULTIPLICAR', // *
  DIVIDIR = 'DIVIDIR',       // /
  MODULO = 'MODULO',         // % o MOD
  POTENCIA = 'POTENCIA',     // ^

  // --- Operadores relacionales ---
  IGUAL = 'IGUAL',           // = o ==
  DISTINTO = 'DISTINTO',     // <> o !=
  MENOR = 'MENOR',           // <
  MAYOR = 'MAYOR',           // >
  MENOR_IGUAL = 'MENOR_IGUAL', // <=
  MAYOR_IGUAL = 'MAYOR_IGUAL', // >=

  // --- Operadores lógicos ---
  AND = 'AND',   // & o Y
  OR = 'OR',     // | o O
  NOT = 'NOT',   // ~ o NO

  // --- Literales ---
  NUMERO = 'NUMERO',         // 42, 3.14
  CADENA = 'CADENA',         // "hola mundo"
  VERDADERO = 'VERDADERO',   // Verdadero
  FALSO = 'FALSO',           // Falso

  // --- Identificadores ---
  IDENTIFICADOR = 'IDENTIFICADOR',

  // --- Puntuación ---
  PARENTESIS_IZQ = 'PARENTESIS_IZQ',   // (
  PARENTESIS_DER = 'PARENTESIS_DER',   // )
  CORCHETE_IZQ = 'CORCHETE_IZQ',       // [
  CORCHETE_DER = 'CORCHETE_DER',       // ]
  COMA = 'COMA',                       // ,
  PUNTO_Y_COMA = 'PUNTO_Y_COMA',       // ;
  DOS_PUNTOS = 'DOS_PUNTOS',           // :

  // --- Especiales ---
  NUEVA_LINEA = 'NUEVA_LINEA',
  EOF = 'EOF',
}

/**
 * Representa un token producido por el Lexer.
 */
export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * Posición en el código fuente para mensajes de error.
 */
export interface SourcePosition {
  line: number;
  column: number;
  offset: number;
}

/**
 * Mapa de palabras clave del lenguaje PSeInt.
 * Las claves están en minúscula para búsqueda case-insensitive.
 */
export const KEYWORDS: Record<string, TokenType> = {
  // Estructura
  'proceso': TokenType.PROCESO,
  'finproceso': TokenType.FIN_PROCESO,
  'definir': TokenType.DEFINIR,
  'como': TokenType.COMO,
  'dimension': TokenType.DIMENSION,

  // Tipos
  'entero': TokenType.TIPO_NUMERICO,
  'real': TokenType.TIPO_NUMERICO,
  'numero': TokenType.TIPO_NUMERICO,
  'numerico': TokenType.TIPO_NUMERICO,
  'cadena': TokenType.TIPO_CARACTER,
  'caracter': TokenType.TIPO_CARACTER,
  'texto': TokenType.TIPO_CARACTER,
  'logico': TokenType.TIPO_LOGICO,

  // E/S
  'leer': TokenType.LEER,
  'escribir': TokenType.ESCRIBIR,

  // Condicional
  'si': TokenType.SI,
  'entonces': TokenType.ENTONCES,
  'sino': TokenType.SINO,
  'finsi': TokenType.FIN_SI,

  // Según
  'segun': TokenType.SEGUN,
  'hacer': TokenType.HACER,
  'de otro modo': TokenType.DE_OTRO_MODO,
  'finsegun': TokenType.FIN_SEGUN,

  // Mientras
  'mientras': TokenType.MIENTRAS,
  'finmientras': TokenType.FIN_MIENTRAS,

  // Repetir
  'repetir': TokenType.REPETIR,
  'hasta que': TokenType.HASTA_QUE,

  // Para
  'para': TokenType.PARA,
  'hasta': TokenType.HASTA,
  'con paso': TokenType.CON_PASO,
  'finpara': TokenType.FIN_PARA,

  // Subprogramas
  'subproceso': TokenType.SUBPROCESO,
  'finsubproceso': TokenType.FIN_SUBPROCESO,
  'funcion': TokenType.FUNCION,
  'finfuncion': TokenType.FIN_FUNCION,

  // Lógicos como palabras
  'mod': TokenType.MODULO,
  'y': TokenType.AND,
  'o': TokenType.OR,
  'no': TokenType.NOT,

  // Booleanos
  'verdadero': TokenType.VERDADERO,
  'falso': TokenType.FALSO,
};

/**
 * Palabras clave compuestas (dos palabras) que el Lexer debe manejar especialmente.
 */
export const COMPOUND_KEYWORDS: Record<string, TokenType> = {
  'de otro modo': TokenType.DE_OTRO_MODO,
  'hasta que': TokenType.HASTA_QUE,
  'con paso': TokenType.CON_PASO,
};
