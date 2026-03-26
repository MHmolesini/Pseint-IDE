// ============================================================
// Parser.ts — Analizador Sintáctico (Recursive Descent) para PSeInt
// ============================================================
// Convierte una secuencia de tokens en un AST (Abstract Syntax Tree).
// Soporta: Proceso, Definir, Leer, Escribir, Si, Segun, Mientras,
// Repetir, Para, asignaciones, expresiones con precedencia.
// ============================================================

import { Token, TokenType } from '../lexer/Token';
import { ParseError } from './errors';
import type {
  ProgramNode,
  Statement,
  Expression,
  AssignmentStatement,
  ReadStatement,
  WriteStatement,
  DefineStatement,
  DimensionStatement,
  IfStatement,
  SwitchStatement,
  SwitchCase,
  WhileStatement,
  RepeatStatement,
  ForStatement,
  FunctionCallStatement,
  FunctionCallExpression,
  BinaryOperator,
  PSeIntDataType,
  ArrayDeclaration,
  FileNode,
  SubProcessNode,
  ParameterDeclaration,
} from '../ast/types';

export class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    // Filtrar newlines — PSeInt no los usa como separadores significativos
    this.tokens = tokens.filter((t) => t.type !== TokenType.NUEVA_LINEA);
  }

  // ============================================================
  // Entrada principal
  // ============================================================

  parse(): FileNode {
    const subProcesses: SubProcessNode[] = [];

    // Parsear SubProcesos/Funciones antes del Proceso principal
    while (
      this.check(TokenType.SUBPROCESO) ||
      this.check(TokenType.FUNCION)
    ) {
      subProcesses.push(this.parseSubProcess());
    }

    const program = this.parseProgram();

    // Parsear SubProcesos/Funciones después del Proceso principal
    while (
      !this.check(TokenType.EOF) &&
      (this.check(TokenType.SUBPROCESO) || this.check(TokenType.FUNCION))
    ) {
      subProcesses.push(this.parseSubProcess());
    }

    return { kind: 'File', program, subProcesses };
  }

  // ============================================================
  // Programa
  // ============================================================

  private parseProgram(): ProgramNode {
    const token = this.expect(TokenType.PROCESO, 'Se esperaba "Proceso" al inicio del programa');
    const nameToken = this.expect(TokenType.IDENTIFICADOR, 'Se esperaba el nombre del proceso');
    this.consumeOptionalSemicolon();

    const body = this.parseBlock(TokenType.FIN_PROCESO);
    this.expect(TokenType.FIN_PROCESO, 'Se esperaba "FinProceso" al final del programa');
    this.consumeOptionalSemicolon();

    return {
      kind: 'Program',
      name: nameToken.value,
      body,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ============================================================
  // SubProceso / Función
  // ============================================================

  private parseSubProcess(): SubProcessNode {
    const token = this.advance(); // SUBPROCESO o FUNCION
    const isFunction = token.type === TokenType.FUNCION;
    let returnVariable: string | null = null;

    // Verificar si tiene variable de retorno: "resultado <- NombreFuncion(...)"
    const savedPos = this.pos;
    const possibleReturn = this.peek();
    if (
      possibleReturn.type === TokenType.IDENTIFICADOR &&
      this.peekAt(1)?.type === TokenType.ASIGNACION
    ) {
      returnVariable = possibleReturn.value;
      this.advance(); // identificador
      this.advance(); // <-
    } else {
      this.pos = savedPos;
    }

    const nameToken = this.expect(TokenType.IDENTIFICADOR, 'Se esperaba el nombre del subproceso');
    const parameters: ParameterDeclaration[] = [];

    if (this.match(TokenType.PARENTESIS_IZQ)) {
      if (!this.check(TokenType.PARENTESIS_DER)) {
        do {
          const paramName = this.expect(TokenType.IDENTIFICADOR, 'Se esperaba nombre del parámetro');
          parameters.push({ name: paramName.value, byReference: false });
        } while (this.match(TokenType.COMA));
      }
      this.expect(TokenType.PARENTESIS_DER, 'Se esperaba ")"');
    }
    this.consumeOptionalSemicolon();

    const endToken = isFunction ? TokenType.FIN_FUNCION : TokenType.FIN_SUBPROCESO;
    const body = this.parseBlock(endToken);
    this.expect(endToken, `Se esperaba "${isFunction ? 'FinFuncion' : 'FinSubProceso'}"`);
    this.consumeOptionalSemicolon();

    return {
      kind: 'SubProcess',
      name: nameToken.value,
      parameters,
      returnVariable,
      body,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ============================================================
  // Bloque de instrucciones
  // ============================================================

  private parseBlock(...terminators: TokenType[]): Statement[] {
    const statements: Statement[] = [];

    while (!this.check(TokenType.EOF) && !terminators.some((t) => this.check(t))) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    return statements;
  }

  // ============================================================
  // Instrucciones
  // ============================================================

  private parseStatement(): Statement | null {
    const token = this.peek();

    switch (token.type) {
      case TokenType.DEFINIR:
        return this.parseDefine();
      case TokenType.DIMENSION:
        return this.parseDimension();
      case TokenType.LEER:
        return this.parseRead();
      case TokenType.ESCRIBIR:
        return this.parseWrite();
      case TokenType.SI:
        return this.parseIf();
      case TokenType.SEGUN:
        return this.parseSwitch();
      case TokenType.MIENTRAS:
        return this.parseWhile();
      case TokenType.REPETIR:
        return this.parseRepeat();
      case TokenType.PARA:
        return this.parseFor();
      case TokenType.IDENTIFICADOR:
        return this.parseAssignmentOrCall();
      case TokenType.PUNTO_Y_COMA:
        this.advance(); // saltar punto y coma suelto
        return null;
      default:
        throw new ParseError(
          `Instrucción inesperada: "${token.value}"`,
          token.line,
          token.column,
          'Verificá que la instrucción esté bien escrita.',
        );
    }
  }

  // ---- Definir ----
  private parseDefine(): DefineStatement {
    const token = this.advance(); // DEFINIR
    const variables: string[] = [];

    do {
      const name = this.expect(TokenType.IDENTIFICADOR, 'Se esperaba nombre de variable');
      variables.push(name.value);
    } while (this.match(TokenType.COMA));

    this.expect(TokenType.COMO, 'Se esperaba "Como" después de los nombres de las variables');

    const typeToken = this.peek();
    let dataType: PSeIntDataType;
    if (
      typeToken.type === TokenType.TIPO_NUMERICO ||
      typeToken.type === TokenType.TIPO_CARACTER ||
      typeToken.type === TokenType.TIPO_LOGICO
    ) {
      this.advance();
      const lower = typeToken.value.toLowerCase();
      if (lower === 'entero') dataType = 'Entero';
      else if (lower === 'real') dataType = 'Real';
      else if (lower === 'numero' || lower === 'numerico') dataType = 'Numerico';
      else if (lower === 'cadena' || lower === 'texto') dataType = 'Cadena';
      else if (lower === 'caracter') dataType = 'Caracter';
      else dataType = 'Logico';
    } else {
      throw new ParseError(
        `Se esperaba un tipo de dato (Entero, Real, Cadena, Logico, etc.)`,
        typeToken.line,
        typeToken.column,
      );
    }

    this.consumeOptionalSemicolon();

    return {
      kind: 'Define',
      variables,
      dataType,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ---- Dimension ----
  private parseDimension(): DimensionStatement {
    const token = this.advance(); // DIMENSION
    const arrays: ArrayDeclaration[] = [];

    do {
      const name = this.expect(TokenType.IDENTIFICADOR, 'Se esperaba nombre del arreglo');
      this.expect(TokenType.PARENTESIS_IZQ, 'Se esperaba "(" o "["');
      // PSeInt usa paréntesis o corchetes para dimensiones
      const dimensions: Expression[] = [];
      do {
        dimensions.push(this.parseExpression());
      } while (this.match(TokenType.COMA));

      if (!this.match(TokenType.PARENTESIS_DER) && !this.match(TokenType.CORCHETE_DER)) {
        this.expect(TokenType.PARENTESIS_DER, 'Se esperaba ")" o "]"');
      }

      arrays.push({ name: name.value, dimensions });
    } while (this.match(TokenType.COMA));

    this.consumeOptionalSemicolon();

    return {
      kind: 'Dimension',
      arrays,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ---- Leer ----
  private parseRead(): ReadStatement {
    const token = this.advance(); // LEER
    const variables: Array<{ kind: 'Variable'; name: string; position: { line: number; column: number; offset: number } }> = [];

    do {
      const name = this.expect(TokenType.IDENTIFICADOR, 'Se esperaba nombre de variable para Leer');
      variables.push({
        kind: 'Variable',
        name: name.value,
        position: { line: name.line, column: name.column, offset: 0 },
      });
    } while (this.match(TokenType.COMA));

    this.consumeOptionalSemicolon();

    return {
      kind: 'Read',
      variables,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ---- Escribir ----
  private parseWrite(): WriteStatement {
    const token = this.advance(); // ESCRIBIR
    const expressions: Expression[] = [];

    // Parsear lista de expresiones separadas por coma
    do {
      expressions.push(this.parseExpression());
    } while (this.match(TokenType.COMA));

    // TODO: manejar "Sin Saltar"
    this.consumeOptionalSemicolon();

    return {
      kind: 'Write',
      expressions,
      withoutNewline: false,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ---- Si ----
  private parseIf(): IfStatement {
    const token = this.advance(); // SI
    const condition = this.parseExpression();
    this.expect(TokenType.ENTONCES, 'Se esperaba "Entonces" después de la condición');
    this.consumeOptionalSemicolon();

    const thenBody = this.parseBlock(TokenType.SINO, TokenType.FIN_SI);

    let elseBody: Statement[] = [];
    if (this.match(TokenType.SINO)) {
      this.consumeOptionalSemicolon();
      elseBody = this.parseBlock(TokenType.FIN_SI);
    }

    this.expect(TokenType.FIN_SI, 'Se esperaba "FinSi"');
    this.consumeOptionalSemicolon();

    return {
      kind: 'If',
      condition,
      thenBody,
      elseBody,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ---- Segun ----
  private parseSwitch(): SwitchStatement {
    const token = this.advance(); // SEGUN
    const expression = this.parseExpression();
    this.expect(TokenType.HACER, 'Se esperaba "Hacer" después de la expresión de Segun');
    this.consumeOptionalSemicolon();

    const cases: SwitchCase[] = [];
    let defaultCase: Statement[] = [];

    while (!this.check(TokenType.FIN_SEGUN) && !this.check(TokenType.EOF)) {
      if (this.check(TokenType.DE_OTRO_MODO)) {
        this.advance();
        this.match(TokenType.DOS_PUNTOS);
        this.consumeOptionalSemicolon();
        defaultCase = this.parseBlock(TokenType.FIN_SEGUN);
        break;
      }

      // Parsear valores del caso
      const values: Expression[] = [];
      do {
        values.push(this.parseExpression());
      } while (this.match(TokenType.COMA));

      this.expect(TokenType.DOS_PUNTOS, 'Se esperaba ":" después del valor del caso');
      this.consumeOptionalSemicolon();

      const body = this.parseBlock(TokenType.FIN_SEGUN, TokenType.DE_OTRO_MODO);
      // Check if next is a case value (number, string, identifier) - peek
      // Actually we need to break if next case starts
      cases.push({ values, body });
    }

    this.expect(TokenType.FIN_SEGUN, 'Se esperaba "FinSegun"');
    this.consumeOptionalSemicolon();

    return {
      kind: 'Switch',
      expression,
      cases,
      defaultCase,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ---- Mientras ----
  private parseWhile(): WhileStatement {
    const token = this.advance(); // MIENTRAS
    const condition = this.parseExpression();
    this.match(TokenType.HACER); // opcional
    this.consumeOptionalSemicolon();

    const body = this.parseBlock(TokenType.FIN_MIENTRAS);
    this.expect(TokenType.FIN_MIENTRAS, 'Se esperaba "FinMientras"');
    this.consumeOptionalSemicolon();

    return {
      kind: 'While',
      condition,
      body,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ---- Repetir ----
  private parseRepeat(): RepeatStatement {
    const token = this.advance(); // REPETIR
    this.consumeOptionalSemicolon();

    const body = this.parseBlock(TokenType.HASTA_QUE);
    this.expect(TokenType.HASTA_QUE, 'Se esperaba "Hasta Que"');
    const condition = this.parseExpression();
    this.consumeOptionalSemicolon();

    return {
      kind: 'Repeat',
      body,
      condition,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ---- Para ----
  private parseFor(): ForStatement {
    const token = this.advance(); // PARA
    const varToken = this.expect(TokenType.IDENTIFICADOR, 'Se esperaba variable del Para');
    this.expect(TokenType.ASIGNACION, 'Se esperaba "<-" en la instrucción Para');

    const start = this.parseExpression();
    this.expect(TokenType.HASTA, 'Se esperaba "Hasta" en la instrucción Para');
    const end = this.parseExpression();

    let step: Expression | null = null;
    if (this.match(TokenType.CON_PASO)) {
      step = this.parseExpression();
    }

    this.match(TokenType.HACER); // opcional
    this.consumeOptionalSemicolon();

    const body = this.parseBlock(TokenType.FIN_PARA);
    this.expect(TokenType.FIN_PARA, 'Se esperaba "FinPara"');
    this.consumeOptionalSemicolon();

    return {
      kind: 'For',
      variable: varToken.value,
      start,
      end,
      step,
      body,
      position: { line: token.line, column: token.column, offset: 0 },
    };
  }

  // ---- Asignación o llamada a función ----
  private parseAssignmentOrCall(): AssignmentStatement | FunctionCallStatement {
    const token = this.advance(); // IDENTIFICADOR
    const pos = { line: token.line, column: token.column, offset: 0 };

    // Asignación: variable <- expresión
    if (this.match(TokenType.ASIGNACION)) {
      const value = this.parseExpression();
      this.consumeOptionalSemicolon();

      return {
        kind: 'Assignment',
        target: { kind: 'Variable', name: token.value, position: pos },
        value,
        position: pos,
      };
    }

    // Asignación con =
    if (this.check(TokenType.IGUAL)) {
      this.advance();
      const value = this.parseExpression();
      this.consumeOptionalSemicolon();

      return {
        kind: 'Assignment',
        target: { kind: 'Variable', name: token.value, position: pos },
        value,
        position: pos,
      };
    }

    // Acceso a arreglo: arr[i] <- valor
    if (this.match(TokenType.CORCHETE_IZQ) || this.match(TokenType.PARENTESIS_IZQ)) {
      const closingToken = this.previous().type === TokenType.CORCHETE_IZQ
        ? TokenType.CORCHETE_DER
        : TokenType.PARENTESIS_DER;

      // Podría ser acceso a arreglo + asignación, o llamada a función
      const args: Expression[] = [];
      if (!this.check(closingToken)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMA));
      }
      this.expect(closingToken, `Se esperaba "${closingToken === TokenType.CORCHETE_DER ? ']' : ')'}"`);

      // Si sigue <-, es asignación de arreglo
      if (this.match(TokenType.ASIGNACION)) {
        const value = this.parseExpression();
        this.consumeOptionalSemicolon();
        return {
          kind: 'Assignment',
          target: { kind: 'ArrayAccess', array: token.value, indices: args, position: pos },
          value,
          position: pos,
        };
      }

      // Si no, es llamada a función como statement
      this.consumeOptionalSemicolon();
      const call: FunctionCallExpression = {
        kind: 'FunctionCall',
        name: token.value,
        arguments: args,
        position: pos,
      };
      return { kind: 'FunctionCallStatement', call, position: pos };
    }

    // Llamada a función sin paréntesis (raro pero posible)
    this.consumeOptionalSemicolon();
    const call: FunctionCallExpression = {
      kind: 'FunctionCall',
      name: token.value,
      arguments: [],
      position: pos,
    };
    return { kind: 'FunctionCallStatement', call, position: pos };
  }

  // ============================================================
  // Expresiones (con precedencia de operadores)
  // ============================================================

  private parseExpression(): Expression {
    return this.parseOr();
  }

  private parseOr(): Expression {
    let left = this.parseAnd();

    while (this.check(TokenType.OR)) {
      this.advance();
      const right = this.parseAnd();
      left = {
        kind: 'BinaryExpression',
        operator: '|' as BinaryOperator,
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseAnd(): Expression {
    let left = this.parseNot();

    while (this.check(TokenType.AND)) {
      this.advance();
      const right = this.parseNot();
      left = {
        kind: 'BinaryExpression',
        operator: '&' as BinaryOperator,
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseNot(): Expression {
    if (this.check(TokenType.NOT)) {
      const token = this.advance();
      const operand = this.parseNot();
      return {
        kind: 'UnaryExpression',
        operator: '~',
        operand,
        position: { line: token.line, column: token.column, offset: 0 },
      };
    }
    return this.parseComparison();
  }

  private parseComparison(): Expression {
    let left = this.parseAddition();

    while (
      this.check(TokenType.IGUAL) ||
      this.check(TokenType.DISTINTO) ||
      this.check(TokenType.MENOR) ||
      this.check(TokenType.MAYOR) ||
      this.check(TokenType.MENOR_IGUAL) ||
      this.check(TokenType.MAYOR_IGUAL)
    ) {
      const op = this.advance();
      const right = this.parseAddition();
      let operator: BinaryOperator;
      switch (op.type) {
        case TokenType.IGUAL: operator = '='; break;
        case TokenType.DISTINTO: operator = '<>'; break;
        case TokenType.MENOR: operator = '<'; break;
        case TokenType.MAYOR: operator = '>'; break;
        case TokenType.MENOR_IGUAL: operator = '<='; break;
        case TokenType.MAYOR_IGUAL: operator = '>='; break;
        default: operator = '=';
      }
      left = {
        kind: 'BinaryExpression',
        operator,
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseAddition(): Expression {
    let left = this.parseMultiplication();

    while (this.check(TokenType.MAS) || this.check(TokenType.MENOS)) {
      const op = this.advance();
      const right = this.parseMultiplication();
      left = {
        kind: 'BinaryExpression',
        operator: op.type === TokenType.MAS ? '+' : '-',
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseMultiplication(): Expression {
    let left = this.parsePower();

    while (
      this.check(TokenType.MULTIPLICAR) ||
      this.check(TokenType.DIVIDIR) ||
      this.check(TokenType.MODULO)
    ) {
      const op = this.advance();
      const right = this.parsePower();
      let operator: BinaryOperator;
      switch (op.type) {
        case TokenType.MULTIPLICAR: operator = '*'; break;
        case TokenType.DIVIDIR: operator = '/'; break;
        default: operator = '%';
      }
      left = {
        kind: 'BinaryExpression',
        operator,
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parsePower(): Expression {
    let left = this.parseUnary();

    while (this.check(TokenType.POTENCIA)) {
      this.advance();
      const right = this.parseUnary();
      left = {
        kind: 'BinaryExpression',
        operator: '^',
        left,
        right,
        position: left.position,
      };
    }

    return left;
  }

  private parseUnary(): Expression {
    if (this.check(TokenType.MENOS)) {
      const token = this.advance();
      const operand = this.parseUnary();
      return {
        kind: 'UnaryExpression',
        operator: '-',
        operand,
        position: { line: token.line, column: token.column, offset: 0 },
      };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    const token = this.peek();

    // Número
    if (this.check(TokenType.NUMERO)) {
      this.advance();
      return {
        kind: 'NumberLiteral',
        value: parseFloat(token.value),
        position: { line: token.line, column: token.column, offset: 0 },
      };
    }

    // Cadena
    if (this.check(TokenType.CADENA)) {
      this.advance();
      return {
        kind: 'StringLiteral',
        value: token.value,
        position: { line: token.line, column: token.column, offset: 0 },
      };
    }

    // Booleano
    if (this.check(TokenType.VERDADERO)) {
      this.advance();
      return {
        kind: 'BooleanLiteral',
        value: true,
        position: { line: token.line, column: token.column, offset: 0 },
      };
    }
    if (this.check(TokenType.FALSO)) {
      this.advance();
      return {
        kind: 'BooleanLiteral',
        value: false,
        position: { line: token.line, column: token.column, offset: 0 },
      };
    }

    // Identificador (variable o llamada a función)
    if (this.check(TokenType.IDENTIFICADOR)) {
      this.advance();
      const pos = { line: token.line, column: token.column, offset: 0 };

      // Llamada a función: nombre(args)
      if (this.match(TokenType.PARENTESIS_IZQ)) {
        const args: Expression[] = [];
        if (!this.check(TokenType.PARENTESIS_DER)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMA));
        }
        this.expect(TokenType.PARENTESIS_DER, 'Se esperaba ")"');
        return { kind: 'FunctionCall', name: token.value, arguments: args, position: pos };
      }

      // Acceso a arreglo: arr[i]
      if (this.match(TokenType.CORCHETE_IZQ)) {
        const indices: Expression[] = [];
        do {
          indices.push(this.parseExpression());
        } while (this.match(TokenType.COMA));
        this.expect(TokenType.CORCHETE_DER, 'Se esperaba "]"');
        return { kind: 'ArrayAccess', array: token.value, indices, position: pos };
      }

      // Variable simple
      return { kind: 'Variable', name: token.value, position: pos };
    }

    // Paréntesis agrupados
    if (this.match(TokenType.PARENTESIS_IZQ)) {
      const expr = this.parseExpression();
      this.expect(TokenType.PARENTESIS_DER, 'Se esperaba ")"');
      return expr;
    }

    throw new ParseError(
      `Expresión inesperada: "${token.value}"`,
      token.line,
      token.column,
      'Verificá que la expresión sea válida.',
    );
  }

  // ============================================================
  // Utilidades
  // ============================================================

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: '', line: 0, column: 0 };
  }

  private peekAt(offset: number): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private advance(): Token {
    const token = this.peek();
    if (token.type !== TokenType.EOF) this.pos++;
    return token;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const token = this.peek();
    throw new ParseError(message, token.line, token.column);
  }

  private consumeOptionalSemicolon(): void {
    this.match(TokenType.PUNTO_Y_COMA);
  }
}
