// ============================================================
// diagnostics.ts — Análisis en tiempo real del código PSeInt
// ============================================================
// Ejecuta Lexer + Parser en cada cambio y devuelve diagnósticos
// (errores y advertencias) para mostrar en el editor Monaco.
// ============================================================

import { Lexer, LexerError } from '../lexer/Lexer';
import { Parser } from '../parser/Parser';
import { ParseError } from '../parser/errors';
import { TokenType } from '../lexer/Token';
import { ProfileConfig, DEFAULT_PROFILE } from '../profiles/ProfileConfig';
import type { Token } from '../lexer/Token';

export interface Diagnostic {
  line: number;
  column: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Ejecuta análisis léxico, sintáctico y verificaciones adicionales.
 * Retorna una lista de diagnósticos para mostrar en el editor.
 */
export function analyzeCode(source: string, profile: ProfileConfig = DEFAULT_PROFILE): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (!source.trim()) return diagnostics;

  // ============================================================
  // 1. Análisis léxico
  // ============================================================
  let tokens: Token[];
  try {
    const lexer = new Lexer(source);
    tokens = lexer.tokenize();
  } catch (error) {
    if (error instanceof LexerError) {
      diagnostics.push({
        line: error.line,
        column: error.column,
        endColumn: error.column + 10,
        message: error.message,
        severity: 'error',
      });
    }
    return diagnostics;
  }

  // ============================================================
  // 2. Análisis sintáctico
  // ============================================================
  try {
    const parser = new Parser(tokens, profile);
    parser.parse();
  } catch (error) {
    if (error instanceof ParseError) {
      diagnostics.push({
        line: error.line,
        column: error.column,
        endColumn: error.column + 15,
        message: error.message,
        severity: 'error',
      });
    }
  }

  // ============================================================
  // 3. Advertencias y verificaciones adicionales
  // ============================================================
  const filteredTokens = tokens.filter(
    (t) => t.type !== TokenType.NUEVA_LINEA && t.type !== TokenType.EOF,
  );

  // --- Verificar estructura Proceso/FinProceso ---
  const hasProceso = filteredTokens.some(
    (t) => t.type === TokenType.PROCESO,
  );
  const hasFinProceso = filteredTokens.some(
    (t) => t.type === TokenType.FIN_PROCESO,
  );

  if (hasProceso && !hasFinProceso) {
    const procesoToken = filteredTokens.find(
      (t) => t.type === TokenType.PROCESO,
    )!;
    diagnostics.push({
      line: procesoToken.line,
      column: procesoToken.column,
      endColumn: procesoToken.column + procesoToken.value.length,
      message: 'Falta "FinProceso" al final del programa.',
      severity: 'error',
    });
  }

  if (!hasProceso && filteredTokens.length > 0) {
    diagnostics.push({
      line: 1,
      column: 1,
      endColumn: 20,
      message: 'El programa debe comenzar con "Proceso NombreDelProceso".',
      severity: 'error',
    });
  }

  // --- Verificar bloques abiertos sin cerrar ---
  checkMatchingBlocks(filteredTokens, diagnostics, TokenType.SI, TokenType.FIN_SI, 'Si', 'FinSi');
  checkMatchingBlocks(filteredTokens, diagnostics, TokenType.MIENTRAS, TokenType.FIN_MIENTRAS, 'Mientras', 'FinMientras');
  checkMatchingBlocks(filteredTokens, diagnostics, TokenType.PARA, TokenType.FIN_PARA, 'Para', 'FinPara');
  checkMatchingBlocks(filteredTokens, diagnostics, TokenType.SEGUN, TokenType.FIN_SEGUN, 'Segun', 'FinSegun');

  // --- Verificar Definir sin Como ---
  for (let i = 0; i < filteredTokens.length; i++) {
    const t = filteredTokens[i];

    // Definir sin Como
    if (t.type === TokenType.DEFINIR) {
      let foundComo = false;
      for (let j = i + 1; j < filteredTokens.length && j < i + 50; j++) {
        if (filteredTokens[j].type === TokenType.COMO) {
          foundComo = true;
          break;
        }
        // Si encuentra otra keyword, parar
        if (isBlockKeyword(filteredTokens[j].type)) break;
      }
      if (!foundComo) {
        diagnostics.push({
          line: t.line,
          column: t.column,
          endColumn: t.column + t.value.length,
          message: 'Falta "Como" después de "Definir". Sintaxis: Definir variable Como Tipo.',
          severity: 'error',
        });
      }
    }

    // Si sin Entonces
    if (t.type === TokenType.SI) {
      let foundEntonces = false;
      let foundFinSi = false;
      for (let j = i + 1; j < filteredTokens.length && j < i + 50; j++) {
        if (filteredTokens[j].type === TokenType.ENTONCES) {
          foundEntonces = true;
          break;
        }
        if (filteredTokens[j].type === TokenType.FIN_SI) {
          foundFinSi = true;
          break;
        }
        if (filteredTokens[j].type === TokenType.SI) break; // otro Si anidado
      }
      if (!foundEntonces && !foundFinSi) {
        diagnostics.push({
          line: t.line,
          column: t.column,
          endColumn: t.column + t.value.length,
          message: 'Falta "Entonces" después de la condición del "Si".',
          severity: 'warning',
        });
      }
    }

    // Leer o Escribir sin argumento
    if (t.type === TokenType.LEER || t.type === TokenType.ESCRIBIR) {
      const next = filteredTokens[i + 1];
      if (!next || isBlockKeyword(next.type) || next.type === TokenType.FIN_PROCESO) {
        diagnostics.push({
          line: t.line,
          column: t.column,
          endColumn: t.column + t.value.length,
          message: `"${t.value}" debe tener al menos un argumento.`,
          severity: 'error',
        });
      }
    }
  }

  // --- Variables usadas sin Definir (warning, no error en modo flexible) ---
  const definedVars = new Set<string>();
  const usedVars = new Map<string, Token>();

  for (let i = 0; i < filteredTokens.length; i++) {
    const t = filteredTokens[i];

    // Recolectar variables definidas
    if (t.type === TokenType.DEFINIR) {
      for (let j = i + 1; j < filteredTokens.length; j++) {
        const v = filteredTokens[j];
        if (v.type === TokenType.COMO) break;
        if (v.type === TokenType.IDENTIFICADOR) {
          definedVars.add(v.value.toLowerCase());
        }
      }
    }

    // Recolectar variables en Leer
    if (t.type === TokenType.LEER) {
      for (let j = i + 1; j < filteredTokens.length; j++) {
        const v = filteredTokens[j];
        if (v.type === TokenType.PUNTO_Y_COMA || isBlockKeyword(v.type)) break;
        if (v.type === TokenType.IDENTIFICADOR) {
          definedVars.add(v.value.toLowerCase()); // Leer implícitamente define la variable
        }
      }
    }

    // Recolectar variables en asignación
    if (
      t.type === TokenType.IDENTIFICADOR &&
      filteredTokens[i + 1]?.type === TokenType.ASIGNACION
    ) {
      definedVars.add(t.value.toLowerCase());
    }

    // Recolectar variables de Para
    if (t.type === TokenType.PARA) {
      const next = filteredTokens[i + 1];
      if (next?.type === TokenType.IDENTIFICADOR) {
        definedVars.add(next.value.toLowerCase());
      }
    }

    // Registrar uso de variables (solo identificadores que no son nombre de proceso)
    if (
      t.type === TokenType.IDENTIFICADOR &&
      i > 0 &&
      filteredTokens[i - 1]?.type !== TokenType.PROCESO &&
      filteredTokens[i - 1]?.type !== TokenType.SUBPROCESO &&
      filteredTokens[i - 1]?.type !== TokenType.FUNCION
    ) {
      const key = t.value.toLowerCase();
      if (!usedVars.has(key)) {
        usedVars.set(key, t);
      }
    }
  }

  // Reportar variables usadas sin definir
  for (const [varName, token] of usedVars) {
    if (!definedVars.has(varName)) {
      // Excluir nombres de proceso, nombres que podrían ser funciones built-in
      const builtinNames = new Set([
        'rc', 'raiz', 'abs', 'trunc', 'redon', 'azar',
        'sen', 'cos', 'tan', 'asen', 'acos', 'atan',
        'ln', 'exp', 'longitud', 'subcadena', 'concatenar',
        'convertiranumero', 'convertiratexto', 'mayusculas', 'minusculas',
      ]);
      if (!builtinNames.has(varName)) {
        diagnostics.push({
          line: token.line,
          column: token.column,
          endColumn: token.column + token.value.length,
          message: `La variable "${token.value}" se usa sin haber sido definida con "Definir" previamente.`,
          severity: profile.requireVariableDeclaration ? 'error' : 'warning',
        });
      }
    }
  }

  return diagnostics;
}

// ============================================================
// Helpers
// ============================================================

function checkMatchingBlocks(
  tokens: Token[],
  diagnostics: Diagnostic[],
  openType: TokenType,
  closeType: TokenType,
  openName: string,
  closeName: string,
): void {
  const stack: Token[] = [];

  for (const t of tokens) {
    if (t.type === openType) {
      stack.push(t);
    } else if (t.type === closeType) {
      if (stack.length > 0) {
        stack.pop();
      } else {
        diagnostics.push({
          line: t.line,
          column: t.column,
          endColumn: t.column + t.value.length,
          message: `"${closeName}" sin "${openName}" correspondiente.`,
          severity: 'error',
        });
      }
    }
  }

  // Los que quedaron sin cerrar
  for (const t of stack) {
    diagnostics.push({
      line: t.line,
      column: t.column,
      endColumn: t.column + t.value.length,
      message: `"${openName}" sin "${closeName}" correspondiente.`,
      severity: 'error',
    });
  }
}

function isBlockKeyword(type: TokenType): boolean {
  return [
    TokenType.PROCESO, TokenType.FIN_PROCESO,
    TokenType.SI, TokenType.ENTONCES, TokenType.SINO, TokenType.FIN_SI,
    TokenType.MIENTRAS, TokenType.FIN_MIENTRAS,
    TokenType.PARA, TokenType.FIN_PARA,
    TokenType.REPETIR, TokenType.HASTA_QUE,
    TokenType.SEGUN, TokenType.FIN_SEGUN,
    TokenType.DEFINIR, TokenType.DIMENSION,
    TokenType.LEER, TokenType.ESCRIBIR,
    TokenType.SUBPROCESO, TokenType.FIN_SUBPROCESO,
    TokenType.FUNCION, TokenType.FIN_FUNCION,
  ].includes(type);
}
