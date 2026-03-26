// ============================================================
// builtins.ts — Funciones integradas de PSeInt
// ============================================================

import type { RuntimeValue } from './Environment';

type BuiltinFn = (...args: RuntimeValue[]) => RuntimeValue;

function toNumber(v: RuntimeValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return 0;
}

function toString(v: RuntimeValue): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'Verdadero' : 'Falso';
  if (typeof v === 'number') {
    return Number.isInteger(v) ? v.toString() : v.toString();
  }
  return String(v);
}

export const BUILTINS: Record<string, BuiltinFn> = {
  // Matemáticas
  rc: (n) => Math.sqrt(toNumber(n)),
  raiz: (n) => Math.sqrt(toNumber(n)),
  abs: (n) => Math.abs(toNumber(n)),
  trunc: (n) => Math.trunc(toNumber(n)),
  redon: (n) => Math.round(toNumber(n)),
  azar: (n) => Math.floor(Math.random() * toNumber(n)),

  // Trigonometría
  sen: (n) => Math.sin(toNumber(n)),
  cos: (n) => Math.cos(toNumber(n)),
  tan: (n) => Math.tan(toNumber(n)),
  asen: (n) => Math.asin(toNumber(n)),
  acos: (n) => Math.acos(toNumber(n)),
  atan: (n) => Math.atan(toNumber(n)),

  // Logaritmos
  ln: (n) => Math.log(toNumber(n)),
  exp: (n) => Math.exp(toNumber(n)),

  // Cadenas
  longitud: (s) => toString(s).length,
  subcadena: (s, inicio, fin) =>
    toString(s).substring(toNumber(inicio) - 1, toNumber(fin)),
  concatenar: (a, b) => toString(a) + toString(b),
  mayusculas: (s) => toString(s).toUpperCase(),
  minusculas: (s) => toString(s).toLowerCase(),

  // Conversión
  convertiranumero: (s) => parseFloat(toString(s)) || 0,
  convertiratexto: (n) => toString(n),
};
