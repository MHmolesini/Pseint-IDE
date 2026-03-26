// ============================================================
// types.ts — Definiciones del AST (Abstract Syntax Tree) de PSeInt
// ============================================================
// Cada nodo usa un campo 'kind' discriminante para pattern matching
// con TypeScript (discriminated unions).
// ============================================================

import type { SourcePosition } from '../lexer/Token';

// ============================================================
// Nodo Base
// ============================================================

export interface BaseNode {
  /** Posición en el código fuente para errores y highlighting */
  position: SourcePosition;
  /** Línea final del nodo (para bloques multi-línea) */
  endPosition?: SourcePosition;
}

// ============================================================
// Programa (raíz del AST)
// ============================================================

export interface ProgramNode extends BaseNode {
  kind: 'Program';
  name: string;
  body: Statement[];
}

// ============================================================
// Tipos de datos de PSeInt
// ============================================================

export type PSeIntDataType = 'Entero' | 'Real' | 'Numerico' | 'Cadena' | 'Caracter' | 'Logico';

// ============================================================
// Statements (instrucciones)
// ============================================================

export interface AssignmentStatement extends BaseNode {
  kind: 'Assignment';
  target: VariableExpression | ArrayAccessExpression;
  value: Expression;
}

export interface ReadStatement extends BaseNode {
  kind: 'Read';
  variables: VariableExpression[];
}

export interface WriteStatement extends BaseNode {
  kind: 'Write';
  expressions: Expression[];
  /** Si termina con "Sin Saltar" */
  withoutNewline: boolean;
}

export interface DefineStatement extends BaseNode {
  kind: 'Define';
  variables: string[];
  dataType: PSeIntDataType;
}

export interface DimensionStatement extends BaseNode {
  kind: 'Dimension';
  arrays: ArrayDeclaration[];
}

export interface ArrayDeclaration {
  name: string;
  dimensions: Expression[];
}

export interface IfStatement extends BaseNode {
  kind: 'If';
  condition: Expression;
  thenBody: Statement[];
  elseBody: Statement[];
}

export interface SwitchStatement extends BaseNode {
  kind: 'Switch';
  expression: Expression;
  cases: SwitchCase[];
  defaultCase: Statement[];
}

export interface SwitchCase {
  values: Expression[];
  body: Statement[];
}

export interface WhileStatement extends BaseNode {
  kind: 'While';
  condition: Expression;
  body: Statement[];
}

export interface RepeatStatement extends BaseNode {
  kind: 'Repeat';
  body: Statement[];
  condition: Expression;
}

export interface ForStatement extends BaseNode {
  kind: 'For';
  variable: string;
  start: Expression;
  end: Expression;
  step: Expression | null;
  body: Statement[];
}

export interface SubProcessNode extends BaseNode {
  kind: 'SubProcess';
  name: string;
  parameters: ParameterDeclaration[];
  returnVariable: string | null;
  body: Statement[];
}

export interface ParameterDeclaration {
  name: string;
  byReference: boolean;
}

export interface FunctionCallStatement extends BaseNode {
  kind: 'FunctionCallStatement';
  call: FunctionCallExpression;
}

export type Statement =
  | AssignmentStatement
  | ReadStatement
  | WriteStatement
  | DefineStatement
  | DimensionStatement
  | IfStatement
  | SwitchStatement
  | WhileStatement
  | RepeatStatement
  | ForStatement
  | FunctionCallStatement;

// ============================================================
// Expressions (expresiones)
// ============================================================

export interface NumberLiteral extends BaseNode {
  kind: 'NumberLiteral';
  value: number;
}

export interface StringLiteral extends BaseNode {
  kind: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral extends BaseNode {
  kind: 'BooleanLiteral';
  value: boolean;
}

export interface VariableExpression extends BaseNode {
  kind: 'Variable';
  name: string;
}

export interface ArrayAccessExpression extends BaseNode {
  kind: 'ArrayAccess';
  array: string;
  indices: Expression[];
}

export interface BinaryExpression extends BaseNode {
  kind: 'BinaryExpression';
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  kind: 'UnaryExpression';
  operator: UnaryOperator;
  operand: Expression;
}

export interface FunctionCallExpression extends BaseNode {
  kind: 'FunctionCall';
  name: string;
  arguments: Expression[];
}

export type Expression =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | VariableExpression
  | ArrayAccessExpression
  | BinaryExpression
  | UnaryExpression
  | FunctionCallExpression;

// ============================================================
// Operadores
// ============================================================

export type BinaryOperator =
  // Aritméticos
  | '+' | '-' | '*' | '/' | '%' | '^'
  // Relacionales
  | '=' | '<>' | '<' | '>' | '<=' | '>='
  // Lógicos
  | '&' | '|';

export type UnaryOperator = '-' | '~';

// ============================================================
// Nodo raíz del archivo (puede contener SubProcesos)
// ============================================================

export interface FileNode {
  kind: 'File';
  program: ProgramNode;
  subProcesses: SubProcessNode[];
}
