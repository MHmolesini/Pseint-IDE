// ============================================================
// Lexer.ts — Analizador Léxico para PSeInt
// ============================================================
// Convierte código fuente PSeInt en una secuencia de tokens.
// Case-insensitive para palabras clave. Soporta comentarios con //.
// ============================================================

import { Token, TokenType, KEYWORDS, COMPOUND_KEYWORDS } from './Token';

export class LexerError extends Error {
  constructor(
    message: string,
    public readonly line: number,
    public readonly column: number,
  ) {
    super(`Error léxico en línea ${line}, columna ${column}: ${message}`);
    this.name = 'LexerError';
  }
}

export class Lexer {
  private source: string;
  private tokens: Token[] = [];
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private lineStart: number = 0;

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Tokeniza todo el código fuente y devuelve la lista de tokens.
   */
  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.lineStart = 0;

    while (!this.isAtEnd()) {
      this.skipWhitespace();
      if (this.isAtEnd()) break;

      const ch = this.peek();

      // Comentarios
      if (ch === '/' && this.peekNext() === '/') {
        this.skipComment();
        continue;
      }

      // Newlines
      if (ch === '\n') {
        this.addToken(TokenType.NUEVA_LINEA, '\\n');
        this.advance();
        this.line++;
        this.column = 1;
        this.lineStart = this.pos;
        continue;
      }

      if (ch === '\r') {
        this.advance();
        if (this.peek() === '\n') {
          this.advance();
        }
        this.addToken(TokenType.NUEVA_LINEA, '\\n');
        this.line++;
        this.column = 1;
        this.lineStart = this.pos;
        continue;
      }

      // Cadenas
      if (ch === '"' || ch === "'") {
        this.readString(ch);
        continue;
      }

      // Números
      if (this.isDigit(ch)) {
        this.readNumber();
        continue;
      }

      // Identificadores y palabras clave
      if (this.isAlpha(ch) || ch === '_') {
        this.readIdentifier();
        continue;
      }

      // Operadores y puntuación
      if (this.readOperator()) {
        continue;
      }

      throw new LexerError(
        `Carácter inesperado: '${ch}'`,
        this.line,
        this.column,
      );
    }

    this.addToken(TokenType.EOF, '');
    return this.tokens;
  }

  // ============================================================
  // Métodos de lectura
  // ============================================================

  private readString(quote: string): void {
    const startCol = this.column;
    this.advance(); // consumir la comilla de apertura
    let value = '';

    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === '\n') {
        throw new LexerError(
          'Cadena no terminada (falta comilla de cierre)',
          this.line,
          startCol,
        );
      }
      // Secuencias de escape básicas
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.peek();
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += '\\' + escaped;
        }
        this.advance();
        continue;
      }
      value += this.peek();
      this.advance();
    }

    if (this.isAtEnd()) {
      throw new LexerError(
        'Cadena no terminada (se alcanzó el fin del archivo)',
        this.line,
        startCol,
      );
    }

    this.advance(); // consumir la comilla de cierre
    this.tokens.push({
      type: TokenType.CADENA,
      value,
      line: this.line,
      column: startCol,
    });
  }

  private readNumber(): void {
    const startCol = this.column;
    let value = '';

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.peek();
      this.advance();
    }

    // Parte decimal
    if (!this.isAtEnd() && this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += '.';
      this.advance();
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.peek();
        this.advance();
      }
    }

    this.tokens.push({
      type: TokenType.NUMERO,
      value,
      line: this.line,
      column: startCol,
    });
  }

  private readIdentifier(): void {
    const startCol = this.column;
    const startPos = this.pos;
    let value = '';

    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
      value += this.peek();
      this.advance();
    }

    const lower = value.toLowerCase();

    // Intentar detectar palabras clave compuestas
    const compoundResult = this.tryCompoundKeyword(lower);
    if (compoundResult) {
      this.tokens.push({
        type: compoundResult.type,
        value: compoundResult.value,
        line: this.line,
        column: startCol,
      });
      return;
    }

    // Verificar si es una palabra clave simple
    const keywordType = KEYWORDS[lower];
    if (keywordType !== undefined) {
      this.tokens.push({
        type: keywordType,
        value,
        line: this.line,
        column: startCol,
      });
      return;
    }

    // Es un identificador común
    this.tokens.push({
      type: TokenType.IDENTIFICADOR,
      value,
      line: this.line,
      column: startCol,
    });
  }

  /**
   * Intenta leer una palabra clave compuesta (ej: "De Otro Modo", "Hasta Que", "Con Paso").
   */
  private tryCompoundKeyword(firstWord: string): { type: TokenType; value: string } | null {
    // Guardar estado
    const savedPos = this.pos;
    const savedCol = this.column;

    for (const [compound, tokenType] of Object.entries(COMPOUND_KEYWORDS)) {
      const words = compound.split(' ');
      if (words[0] !== firstWord) continue;

      // Intentar leer las palabras restantes
      let tempPos = this.pos;
      let tempCol = this.column;
      let matched = true;
      let fullValue = '';

      for (let i = 1; i < words.length; i++) {
        // Saltar espacios
        while (tempPos < this.source.length && this.source[tempPos] === ' ') {
          tempPos++;
          tempCol++;
        }

        // Leer la siguiente palabra
        let nextWord = '';
        while (
          tempPos < this.source.length &&
          (this.isAlphaNumeric(this.source[tempPos]) || this.source[tempPos] === '_')
        ) {
          nextWord += this.source[tempPos];
          tempPos++;
          tempCol++;
        }

        if (nextWord.toLowerCase() !== words[i]) {
          matched = false;
          break;
        }
        fullValue += ' ' + nextWord;
      }

      if (matched) {
        // Avanzar el pos a la posición final
        this.pos = tempPos;
        this.column = tempCol;
        return { type: tokenType, value: firstWord + fullValue };
      }
    }

    return null;
  }

  private readOperator(): boolean {
    const ch = this.peek();
    const startCol = this.column;

    switch (ch) {
      case '<': {
        this.advance();
        if (this.peek() === '-') {
          this.advance();
          this.tokens.push({ type: TokenType.ASIGNACION, value: '<-', line: this.line, column: startCol });
        } else if (this.peek() === '=') {
          this.advance();
          this.tokens.push({ type: TokenType.MENOR_IGUAL, value: '<=', line: this.line, column: startCol });
        } else if (this.peek() === '>') {
          this.advance();
          this.tokens.push({ type: TokenType.DISTINTO, value: '<>', line: this.line, column: startCol });
        } else {
          this.tokens.push({ type: TokenType.MENOR, value: '<', line: this.line, column: startCol });
        }
        return true;
      }
      case '>': {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          this.tokens.push({ type: TokenType.MAYOR_IGUAL, value: '>=', line: this.line, column: startCol });
        } else {
          this.tokens.push({ type: TokenType.MAYOR, value: '>', line: this.line, column: startCol });
        }
        return true;
      }
      case '!': {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
          this.tokens.push({ type: TokenType.DISTINTO, value: '!=', line: this.line, column: startCol });
        } else {
          this.tokens.push({ type: TokenType.NOT, value: '!', line: this.line, column: startCol });
        }
        return true;
      }
      case '=': {
        this.advance();
        if (this.peek() === '=') {
          this.advance();
        }
        this.tokens.push({ type: TokenType.IGUAL, value: '=', line: this.line, column: startCol });
        return true;
      }
      case '+':
        this.advance();
        this.tokens.push({ type: TokenType.MAS, value: '+', line: this.line, column: startCol });
        return true;
      case '-':
        this.advance();
        this.tokens.push({ type: TokenType.MENOS, value: '-', line: this.line, column: startCol });
        return true;
      case '*':
        this.advance();
        this.tokens.push({ type: TokenType.MULTIPLICAR, value: '*', line: this.line, column: startCol });
        return true;
      case '/':
        this.advance();
        this.tokens.push({ type: TokenType.DIVIDIR, value: '/', line: this.line, column: startCol });
        return true;
      case '%':
        this.advance();
        this.tokens.push({ type: TokenType.MODULO, value: '%', line: this.line, column: startCol });
        return true;
      case '^':
        this.advance();
        this.tokens.push({ type: TokenType.POTENCIA, value: '^', line: this.line, column: startCol });
        return true;
      case '&':
        this.advance();
        this.tokens.push({ type: TokenType.AND, value: '&', line: this.line, column: startCol });
        return true;
      case '|':
        this.advance();
        this.tokens.push({ type: TokenType.OR, value: '|', line: this.line, column: startCol });
        return true;
      case '~':
        this.advance();
        this.tokens.push({ type: TokenType.NOT, value: '~', line: this.line, column: startCol });
        return true;
      case '(':
        this.advance();
        this.tokens.push({ type: TokenType.PARENTESIS_IZQ, value: '(', line: this.line, column: startCol });
        return true;
      case ')':
        this.advance();
        this.tokens.push({ type: TokenType.PARENTESIS_DER, value: ')', line: this.line, column: startCol });
        return true;
      case '[':
        this.advance();
        this.tokens.push({ type: TokenType.CORCHETE_IZQ, value: '[', line: this.line, column: startCol });
        return true;
      case ']':
        this.advance();
        this.tokens.push({ type: TokenType.CORCHETE_DER, value: ']', line: this.line, column: startCol });
        return true;
      case ',':
        this.advance();
        this.tokens.push({ type: TokenType.COMA, value: ',', line: this.line, column: startCol });
        return true;
      case ';':
        this.advance();
        this.tokens.push({ type: TokenType.PUNTO_Y_COMA, value: ';', line: this.line, column: startCol });
        return true;
      case ':':
        this.advance();
        this.tokens.push({ type: TokenType.DOS_PUNTOS, value: ':', line: this.line, column: startCol });
        return true;
      default:
        return false;
    }
  }

  // ============================================================
  // Utilidades
  // ============================================================

  private peek(): string {
    return this.source[this.pos] ?? '\0';
  }

  private peekNext(): string {
    return this.source[this.pos + 1] ?? '\0';
  }

  private advance(): string {
    const ch = this.source[this.pos];
    this.pos++;
    this.column++;
    return ch;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isAlpha(ch: string): boolean {
    return (
      (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      ch === '_' ||
      // Soporte para letras con acento (español)
      ch === 'á' || ch === 'é' || ch === 'í' || ch === 'ó' || ch === 'ú' ||
      ch === 'Á' || ch === 'É' || ch === 'Í' || ch === 'Ó' || ch === 'Ú' ||
      ch === 'ñ' || ch === 'Ñ' || ch === 'ü' || ch === 'Ü'
    );
  }

  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private skipComment(): void {
    // Avanzar hasta el final de la línea
    while (!this.isAtEnd() && this.peek() !== '\n' && this.peek() !== '\r') {
      this.advance();
    }
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({
      type,
      value,
      line: this.line,
      column: this.column,
    });
  }
}
