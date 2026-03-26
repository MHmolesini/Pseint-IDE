// ============================================================
// ast-to-flowchart.ts — Convierte el AST de PSeInt a Mermaid flowchart
// ============================================================
// Genera la definición de un diagrama de flujo en Mermaid a partir
// del AST, con las formas estándar:
//   - Óvalo: inicio/fin (stadium shape)
//   - Rombo: decisiones/condiciones
//   - Rectángulo: instrucciones
//   - Paralelogramo: entrada/salida
// ============================================================

import type { FileNode, Statement, Expression } from '../ast/types';

let nodeId = 0;

function nextId(): string {
  return `n${nodeId++}`;
}

/**
 * Convierte un FileNode (AST) a un string Mermaid flowchart.
 */
export function astToFlowchart(fileNode: FileNode): string {
  nodeId = 0;
  const lines: string[] = [];
  lines.push('flowchart TD');

  const startId = nextId();
  const endId = nextId();
  const processName = fileNode.program.name || 'Proceso';

  // Nodo inicio
  lines.push(`  ${startId}([${esc(processName)}])`);

  // Generar nodos del cuerpo
  const bodyEnd = generateStatements(fileNode.program.body, startId, lines);

  // Nodo fin
  lines.push(`  ${endId}([FinProceso])`);
  lines.push(`  ${bodyEnd} --> ${endId}`);

  // Estilos
  lines.push('');
  lines.push(`  style ${startId} fill:#E8875A,stroke:#C5704A,color:#fff,stroke-width:2px`);
  lines.push(`  style ${endId} fill:#E8875A,stroke:#C5704A,color:#fff,stroke-width:2px`);

  return lines.join('\n');
}

/**
 * Genera nodos Mermaid para una lista de statements.
 * Retorna el ID del último nodo generado.
 */
function generateStatements(
  stmts: Statement[],
  previousId: string,
  lines: string[],
): string {
  let prevId = previousId;

  for (const stmt of stmts) {
    prevId = generateStatement(stmt, prevId, lines);
  }

  return prevId;
}

/**
 * Genera nodo(s) Mermaid para un statement individual.
 * Retorna el ID del último nodo generado.
 */
function generateStatement(
  stmt: Statement,
  previousId: string,
  lines: string[],
): string {
  switch (stmt.kind) {
    case 'Write': {
      const id = nextId();
      const text = stmt.expressions.map(exprToString).join(', ');
      lines.push(`  ${id}[/${esc(`Escribir ${text}`)}/]`);
      lines.push(`  ${previousId} --> ${id}`);
      return id;
    }

    case 'Read': {
      const id = nextId();
      const vars = stmt.variables.map((v) => v.name).join(', ');
      lines.push(`  ${id}[/${esc(`Leer ${vars}`)}/]`);
      lines.push(`  ${previousId} --> ${id}`);
      return id;
    }

    case 'Assignment': {
      const id = nextId();
      const target = stmt.target.kind === 'Variable' ? stmt.target.name : stmt.target.kind === 'ArrayAccess' ? stmt.target.array : '?';
      const value = exprToString(stmt.value);
      lines.push(`  ${id}[${esc(`${target} <- ${value}`)}]`);
      lines.push(`  ${previousId} --> ${id}`);
      return id;
    }

    case 'Define': {
      const id = nextId();
      lines.push(`  ${id}[${esc(`Definir ${stmt.variables.join(', ')} Como ${stmt.dataType}`)}]`);
      lines.push(`  ${previousId} --> ${id}`);
      return id;
    }

    case 'Dimension': {
      const id = nextId();
      const dims = stmt.arrays.map((a) => `${a.name}[${a.dimensions.map(exprToString).join(',')}]`).join(', ');
      lines.push(`  ${id}[${esc(`Dimension ${dims}`)}]`);
      lines.push(`  ${previousId} --> ${id}`);
      return id;
    }

    case 'If': {
      const condId = nextId();
      const condText = exprToString(stmt.condition);
      lines.push(`  ${condId}{${esc(condText)}}`);
      lines.push(`  ${previousId} --> ${condId}`);

      // Merge node (punto donde convergen las ramas)
      const mergeId = nextId();
      lines.push(`  ${mergeId}(( ))`);
      lines.push(`  style ${mergeId} fill:#2D2D2D,stroke:#4B5563,width:1px,height:1px`);

      // Rama verdadero (then)
      if (stmt.thenBody.length > 0) {
        const thenStart = nextId();
        lines.push(`  ${thenStart}[" "]`);
        lines.push(`  style ${thenStart} fill:none,stroke:none`);
        lines.push(`  ${condId} -->|V| ${thenStart}`);
        const thenEnd = generateStatements(stmt.thenBody, thenStart, lines);
        lines.push(`  ${thenEnd} --> ${mergeId}`);
      } else {
        lines.push(`  ${condId} -->|V| ${mergeId}`);
      }

      // Rama falso (else)
      if (stmt.elseBody.length > 0) {
        const elseStart = nextId();
        lines.push(`  ${elseStart}[" "]`);
        lines.push(`  style ${elseStart} fill:none,stroke:none`);
        lines.push(`  ${condId} -->|F| ${elseStart}`);
        const elseEnd = generateStatements(stmt.elseBody, elseStart, lines);
        lines.push(`  ${elseEnd} --> ${mergeId}`);
      } else {
        lines.push(`  ${condId} -->|F| ${mergeId}`);
      }

      return mergeId;
    }

    case 'While': {
      const condId = nextId();
      const condText = exprToString(stmt.condition);
      lines.push(`  ${condId}{${esc(condText)}}`);
      lines.push(`  ${previousId} --> ${condId}`);

      // Cuerpo del while
      if (stmt.body.length > 0) {
        const bodyEnd = generateStatements(stmt.body, condId, lines);
        // Flecha de vuelta a la condición
        lines.push(`  ${bodyEnd} --> ${condId}`);
      }

      // Salida del while
      const exitId = nextId();
      lines.push(`  ${exitId}(( ))`);
      lines.push(`  style ${exitId} fill:#2D2D2D,stroke:#4B5563`);
      lines.push(`  ${condId} -->|F| ${exitId}`);

      return exitId;
    }

    case 'Repeat': {
      // Cuerpo primero
      const bodyEnd = generateStatements(stmt.body, previousId, lines);

      // Condición al final
      const condId = nextId();
      const condText = exprToString(stmt.condition);
      lines.push(`  ${condId}{${esc(condText)}}`);
      lines.push(`  ${bodyEnd} --> ${condId}`);

      // Si F, vuelve al inicio del cuerpo
      lines.push(`  ${condId} -->|F| ${previousId}`);

      // Si V, sale
      const exitId = nextId();
      lines.push(`  ${exitId}(( ))`);
      lines.push(`  style ${exitId} fill:#2D2D2D,stroke:#4B5563`);
      lines.push(`  ${condId} -->|V| ${exitId}`);

      return exitId;
    }

    case 'For': {
      // Inicialización
      const initId = nextId();
      const stepExpr = stmt.step ? exprToString(stmt.step) : '1';
      lines.push(`  ${initId}[${esc(`${stmt.variable} <- ${exprToString(stmt.start)}`)}]`);
      lines.push(`  ${previousId} --> ${initId}`);

      // Condición
      const condId = nextId();
      lines.push(`  ${condId}{${esc(`${stmt.variable} <= ${exprToString(stmt.end)}`)}}`);
      lines.push(`  ${initId} --> ${condId}`);

      // Cuerpo
      if (stmt.body.length > 0) {
        const bodyEnd = generateStatements(stmt.body, condId, lines);
        // Incremento
        const incId = nextId();
        lines.push(`  ${incId}[${esc(`${stmt.variable} <- ${stmt.variable} + ${stepExpr}`)}]`);
        lines.push(`  ${bodyEnd} --> ${incId}`);
        lines.push(`  ${incId} --> ${condId}`);
      }

      // Salida
      const exitId = nextId();
      lines.push(`  ${exitId}(( ))`);
      lines.push(`  style ${exitId} fill:#2D2D2D,stroke:#4B5563`);
      lines.push(`  ${condId} -->|F| ${exitId}`);

      return exitId;
    }

    case 'Switch': {
      const switchId = nextId();
      const switchText = exprToString(stmt.expression);
      lines.push(`  ${switchId}{${esc(switchText)}}`);
      lines.push(`  ${previousId} --> ${switchId}`);

      const mergeId = nextId();
      lines.push(`  ${mergeId}(( ))`);
      lines.push(`  style ${mergeId} fill:#2D2D2D,stroke:#4B5563`);

      for (const c of stmt.cases) {
        const caseLabel = c.values.map(exprToString).join(', ');
        if (c.body.length > 0) {
          const caseEnd = generateStatements(c.body, switchId, lines);
          // Add label to the first connection
          lines.push(`  ${switchId} -.->|${esc(caseLabel)}| ${caseEnd}`);
          lines.push(`  ${caseEnd} --> ${mergeId}`);
        }
      }

      if (stmt.defaultCase.length > 0) {
        const defaultEnd = generateStatements(stmt.defaultCase, switchId, lines);
        lines.push(`  ${defaultEnd} --> ${mergeId}`);
      } else {
        lines.push(`  ${switchId} --> ${mergeId}`);
      }

      return mergeId;
    }

    case 'FunctionCallStatement': {
      const id = nextId();
      const args = stmt.call.arguments.map(exprToString).join(', ');
      lines.push(`  ${id}[${esc(`${stmt.call.name}(${args})`)}]`);
      lines.push(`  ${previousId} --> ${id}`);
      return id;
    }

    default:
      return previousId;
  }
}

// ============================================================
// Expresión a string legible
// ============================================================

function exprToString(expr: Expression): string {
  switch (expr.kind) {
    case 'NumberLiteral':
      return String(expr.value);
    case 'StringLiteral':
      return `"${expr.value}"`;
    case 'BooleanLiteral':
      return expr.value ? 'Verdadero' : 'Falso';
    case 'Variable':
      return expr.name;
    case 'BinaryExpression': {
      const l = exprToString(expr.left);
      const r = exprToString(expr.right);
      const opMap: Record<string, string> = {
        '=': '=', '<>': '≠', '<': '<', '>': '>',
        '<=': '≤', '>=': '≥', '+': '+', '-': '-',
        '*': '×', '/': '÷', '%': ' MOD ', '^': '^',
        '&': ' Y ', '|': ' O ',
      };
      return `${l} ${opMap[expr.operator] || expr.operator} ${r}`;
    }
    case 'UnaryExpression':
      return `${expr.operator === '~' ? 'NO ' : expr.operator}${exprToString(expr.operand)}`;
    case 'FunctionCall':
      return `${expr.name}(${expr.arguments.map(exprToString).join(', ')})`;
    case 'ArrayAccess':
      return `${expr.array}[${expr.indices.map(exprToString).join(', ')}]`;
    default:
      return '?';
  }
}

/**
 * Escapa caracteres especiales de Mermaid.
 */
function esc(text: string): string {
  return `"${text.replace(/"/g, "'")}"`;
}
