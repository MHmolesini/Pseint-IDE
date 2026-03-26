// ============================================================
// Interpreter.ts — Tree-Walking Interpreter para PSeInt
// ============================================================
// Recorre el AST y ejecuta instrucciones una por una.
// La salida de Escribir se envía a un callback de output.
// Leer solicita input al usuario via callback async.
// ============================================================

import type {
  FileNode,
  ProgramNode,
  SubProcessNode,
  Statement,
  Expression,
  BinaryOperator,
} from '../ast/types';
import { Environment, type RuntimeValue } from './Environment';
import { BUILTINS } from './builtins';
import { RuntimeError } from '../parser/errors';

export interface InterpreterCallbacks {
  /** Se llama cuando Escribir produce salida */
  onOutput: (text: string) => void;
  /** Se llama cuando Leer necesita input del usuario. Debe resolver con el string ingresado. */
  onInput: (prompt?: string) => Promise<string>;
  /** Se llama cuando cambia una variable (para actualizar el panel) */
  onVariableChange: (name: string, value: string, type: string) => void;
  /** Se llama cuando cambia la línea actual de ejecución */
  onLineChange: (line: number) => void;
}

class ReturnSignal {
  constructor(public value: RuntimeValue) {}
}

export class Interpreter {
  private env: Environment = new Environment();
  private callbacks: InterpreterCallbacks;
  private subProcesses: Map<string, SubProcessNode> = new Map();
  private aborted = false;

  constructor(callbacks: InterpreterCallbacks) {
    this.callbacks = callbacks;
  }

  abort(): void {
    this.aborted = true;
  }

  async execute(fileNode: FileNode): Promise<void> {
    this.aborted = false;
    this.env = new Environment();

    // Registrar subprocesos/funciones
    for (const sp of fileNode.subProcesses) {
      this.subProcesses.set(sp.name.toLowerCase(), sp);
    }

    // Ejecutar programa principal
    await this.executeProgram(fileNode.program);
  }

  private async executeProgram(program: ProgramNode): Promise<void> {
    for (const stmt of program.body) {
      if (this.aborted) return;
      await this.executeStatement(stmt);
    }
  }

  private async executeStatement(stmt: Statement): Promise<void> {
    if (this.aborted) return;

    // Notificar línea actual
    if (stmt.position) {
      this.callbacks.onLineChange(stmt.position.line);
    }

    switch (stmt.kind) {
      case 'Define':
        // Definir solo reserva la variable, no asigna valor real
        for (const name of stmt.variables) {
          let defaultVal: RuntimeValue;
          switch (stmt.dataType) {
            case 'Entero':
            case 'Real':
            case 'Numerico':
              defaultVal = 0;
              break;
            case 'Cadena':
            case 'Caracter':
              defaultVal = '';
              break;
            case 'Logico':
              defaultVal = false;
              break;
            default:
              defaultVal = 0;
          }
          this.env.set(name, defaultVal);
          this.callbacks.onVariableChange(name, String(defaultVal), stmt.dataType);
        }
        break;

      case 'Assignment': {
        const value = await this.evaluateExpression(stmt.value);
        if (stmt.target.kind === 'Variable') {
          this.env.set(stmt.target.name, value);
          this.callbacks.onVariableChange(stmt.target.name, this.formatValue(value), this.getType(value));
        } else if (stmt.target.kind === 'ArrayAccess') {
          // Asignación a arreglo
          const arr = this.env.get(stmt.target.array);
          if (Array.isArray(arr)) {
            const idx = await this.evaluateExpression(stmt.target.indices[0]);
            (arr as RuntimeValue[])[Number(idx) - 1] = value;
            this.env.set(stmt.target.array, arr);
          }
        }
        break;
      }

      case 'Read': {
        for (const variable of stmt.variables) {
          if (this.aborted) return;
          const input = await this.callbacks.onInput();
          let val: RuntimeValue = input;
          // Intentar convertir a número si parece numérico
          const num = parseFloat(input);
          if (!isNaN(num) && String(num) === input.trim()) {
            val = num;
          }
          this.env.set(variable.name, val);
          this.callbacks.onVariableChange(variable.name, this.formatValue(val), this.getType(val));
        }
        break;
      }

      case 'Write': {
        const parts: string[] = [];
        for (const expr of stmt.expressions) {
          const val = await this.evaluateExpression(expr);
          parts.push(this.formatValue(val));
        }
        this.callbacks.onOutput(parts.join(''));
        break;
      }

      case 'Dimension': {
        for (const decl of stmt.arrays) {
          const dims: number[] = [];
          for (const d of decl.dimensions) {
            dims.push(Number(await this.evaluateExpression(d)));
          }
          // Crear arreglo con la primera dimensión
          const arr = new Array(dims[0]).fill(0);
          this.env.set(decl.name, arr);
          this.callbacks.onVariableChange(decl.name, `Arreglo[${dims.join(',')}]`, 'Arreglo');
        }
        break;
      }

      case 'If': {
        const condition = await this.evaluateExpression(stmt.condition);
        if (this.toBool(condition)) {
          for (const s of stmt.thenBody) {
            if (this.aborted) return;
            await this.executeStatement(s);
          }
        } else {
          for (const s of stmt.elseBody) {
            if (this.aborted) return;
            await this.executeStatement(s);
          }
        }
        break;
      }

      case 'Switch': {
        const switchVal = await this.evaluateExpression(stmt.expression);
        let matched = false;
        for (const c of stmt.cases) {
          for (const v of c.values) {
            const caseVal = await this.evaluateExpression(v);
            if (switchVal === caseVal) {
              matched = true;
              break;
            }
          }
          if (matched) {
            for (const s of c.body) {
              if (this.aborted) return;
              await this.executeStatement(s);
            }
            break;
          }
        }
        if (!matched && stmt.defaultCase.length > 0) {
          for (const s of stmt.defaultCase) {
            if (this.aborted) return;
            await this.executeStatement(s);
          }
        }
        break;
      }

      case 'While': {
        let guard = 0;
        while (!this.aborted && this.toBool(await this.evaluateExpression(stmt.condition))) {
          for (const s of stmt.body) {
            if (this.aborted) return;
            await this.executeStatement(s);
          }
          if (++guard > 100000) {
            throw new RuntimeError('Bucle Mientras infinito detectado (más de 100.000 iteraciones)', stmt.position.line, stmt.position.column);
          }
        }
        break;
      }

      case 'Repeat': {
        let guard = 0;
        do {
          for (const s of stmt.body) {
            if (this.aborted) return;
            await this.executeStatement(s);
          }
          if (++guard > 100000) {
            throw new RuntimeError('Bucle Repetir infinito detectado (más de 100.000 iteraciones)', stmt.position.line, stmt.position.column);
          }
        } while (!this.aborted && !this.toBool(await this.evaluateExpression(stmt.condition)));
        break;
      }

      case 'For': {
        const startVal = Number(await this.evaluateExpression(stmt.start));
        const endVal = Number(await this.evaluateExpression(stmt.end));
        const stepVal = stmt.step ? Number(await this.evaluateExpression(stmt.step)) : (startVal <= endVal ? 1 : -1);

        this.env.set(stmt.variable, startVal);
        this.callbacks.onVariableChange(stmt.variable, String(startVal), 'Numerico');

        const condition = stepVal > 0
          ? () => (this.env.get(stmt.variable) as number) <= endVal
          : () => (this.env.get(stmt.variable) as number) >= endVal;

        let guard = 0;
        while (!this.aborted && condition()) {
          for (const s of stmt.body) {
            if (this.aborted) return;
            await this.executeStatement(s);
          }
          const current = this.env.get(stmt.variable) as number;
          const next = current + stepVal;
          this.env.set(stmt.variable, next);
          this.callbacks.onVariableChange(stmt.variable, String(next), 'Numerico');

          if (++guard > 100000) {
            throw new RuntimeError('Bucle Para infinito detectado', stmt.position.line, stmt.position.column);
          }
        }
        break;
      }

      case 'FunctionCallStatement': {
        await this.evaluateExpression(stmt.call);
        break;
      }
    }
  }

  // ============================================================
  // Evaluación de expresiones
  // ============================================================

  private async evaluateExpression(expr: Expression): Promise<RuntimeValue> {
    switch (expr.kind) {
      case 'NumberLiteral':
        return expr.value;
      case 'StringLiteral':
        return expr.value;
      case 'BooleanLiteral':
        return expr.value;

      case 'Variable': {
        const val = this.env.get(expr.name);
        if (val === undefined) {
          // PSeInt en modo flexible permite usar variables sin definir
          return 0;
        }
        return val;
      }

      case 'ArrayAccess': {
        const arr = this.env.get(expr.array);
        if (Array.isArray(arr)) {
          const idx = Number(await this.evaluateExpression(expr.indices[0]));
          return (arr as RuntimeValue[])[idx - 1] ?? 0;
        }
        return 0;
      }

      case 'BinaryExpression': {
        const left = await this.evaluateExpression(expr.left);
        const right = await this.evaluateExpression(expr.right);
        return this.evaluateBinary(expr.operator, left, right, expr.position.line);
      }

      case 'UnaryExpression': {
        const operand = await this.evaluateExpression(expr.operand);
        if (expr.operator === '-') return -Number(operand);
        if (expr.operator === '~') return !this.toBool(operand);
        return operand;
      }

      case 'FunctionCall': {
        const name = expr.name.toLowerCase();

        // Buscar en built-ins
        const builtin = BUILTINS[name];
        if (builtin) {
          const args: RuntimeValue[] = [];
          for (const arg of expr.arguments) {
            args.push(await this.evaluateExpression(arg));
          }
          return builtin(...args);
        }

        // Buscar en subprocesos definidos por el usuario
        const sp = this.subProcesses.get(name);
        if (sp) {
          return await this.executeSubProcess(sp, expr.arguments);
        }

        throw new RuntimeError(
          `Función o SubProceso "${expr.name}" no definido`,
          expr.position.line,
          expr.position.column,
        );
      }
    }
  }

  // ============================================================
  // SubProceso
  // ============================================================

  private async executeSubProcess(sp: SubProcessNode, argExprs: Expression[]): Promise<RuntimeValue> {
    const childEnv = new Environment(this.env);
    const parentEnv = this.env;
    this.env = childEnv;

    // Asignar argumentos a parámetros
    for (let i = 0; i < sp.parameters.length; i++) {
      const val = i < argExprs.length
        ? await this.evaluateExpression(argExprs[i])
        : 0;
      this.env.set(sp.parameters[i].name, val);
    }

    // Si tiene variable de retorno, inicializarla
    if (sp.returnVariable) {
      this.env.set(sp.returnVariable, 0);
    }

    // Ejecutar cuerpo
    for (const stmt of sp.body) {
      if (this.aborted) break;
      await this.executeStatement(stmt);
    }

    const result = sp.returnVariable ? (this.env.get(sp.returnVariable) ?? 0) : 0;
    this.env = parentEnv;
    return result;
  }

  // ============================================================
  // Binarios
  // ============================================================

  private evaluateBinary(op: BinaryOperator, left: RuntimeValue, right: RuntimeValue, line: number): RuntimeValue {
    // Concatenación de cadenas con +
    if (op === '+' && (typeof left === 'string' || typeof right === 'string')) {
      return String(left) + String(right);
    }

    switch (op) {
      // Aritméticos
      case '+': return Number(left) + Number(right);
      case '-': return Number(left) - Number(right);
      case '*': return Number(left) * Number(right);
      case '/': {
        const divisor = Number(right);
        if (divisor === 0) throw new RuntimeError('División por cero', line, 0);
        return Number(left) / divisor;
      }
      case '%': return Number(left) % Number(right);
      case '^': return Math.pow(Number(left), Number(right));

      // Relacionales
      case '=': return left === right || Number(left) === Number(right);
      case '<>': return left !== right && Number(left) !== Number(right);
      case '<': return Number(left) < Number(right);
      case '>': return Number(left) > Number(right);
      case '<=': return Number(left) <= Number(right);
      case '>=': return Number(left) >= Number(right);

      // Lógicos
      case '&': return this.toBool(left) && this.toBool(right);
      case '|': return this.toBool(left) || this.toBool(right);

      default:
        return 0;
    }
  }

  // ============================================================
  // Utilidades
  // ============================================================

  private toBool(val: RuntimeValue): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    if (typeof val === 'string') return val.length > 0;
    return false;
  }

  private formatValue(val: RuntimeValue): string {
    if (typeof val === 'boolean') return val ? 'Verdadero' : 'Falso';
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val.toString() : val.toString();
    }
    return String(val);
  }

  private getType(val: RuntimeValue): string {
    if (typeof val === 'number') return Number.isInteger(val) ? 'Entero' : 'Real';
    if (typeof val === 'string') return 'Cadena';
    if (typeof val === 'boolean') return 'Logico';
    if (Array.isArray(val)) return 'Arreglo';
    return 'Desconocido';
  }
}
