// ============================================================
// Environment.ts — Scope de variables para el intérprete
// ============================================================

export type RuntimeValue = number | string | boolean | RuntimeValue[];

export class Environment {
  private variables: Map<string, RuntimeValue> = new Map();
  private parent: Environment | null;

  constructor(parent?: Environment) {
    this.parent = parent ?? null;
  }

  get(name: string): RuntimeValue | undefined {
    const val = this.variables.get(name.toLowerCase());
    if (val !== undefined) return val;
    return this.parent?.get(name);
  }

  set(name: string, value: RuntimeValue): void {
    const key = name.toLowerCase();
    // Si la variable existe en un scope padre, actualizar ahí
    if (!this.variables.has(key) && this.parent?.has(name)) {
      this.parent.set(name, value);
      return;
    }
    this.variables.set(key, value);
  }

  has(name: string): boolean {
    const key = name.toLowerCase();
    return this.variables.has(key) || (this.parent?.has(name) ?? false);
  }

  /** Devuelve todas las variables como pares [nombre, valor] */
  getAll(): Array<{ name: string; value: RuntimeValue }> {
    const result: Array<{ name: string; value: RuntimeValue }> = [];
    const seen = new Set<string>();

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let env: Environment | null = this;
    while (env) {
      for (const [key, val] of env.variables) {
        if (!seen.has(key)) {
          seen.add(key);
          result.push({ name: key, value: val });
        }
      }
      env = env.parent;
    }
    return result;
  }
}
