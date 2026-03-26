// ============================================================
// ProfileConfig.ts — Sistema de perfiles de configuración
// ============================================================

export interface ProfileConfig {
  /** Nombre del perfil */
  name: string;
  /** Descripción del perfil */
  description: string;

  // --- Reglas de sintaxis ---
  /** Obligar punto y coma al final de cada instrucción */
  requireSemicolons: boolean;
  /** Obligar a definir variables con "Definir" antes de usarlas */
  requireVariableDeclaration: boolean;
  /** Validación estricta de tipos (no permitir conversiones implícitas) */
  strictTypes: boolean;
  /** Hacer el lenguaje sensible a mayúsculas/minúsculas */
  caseSensitive: boolean;
  /** Permitir uso de "=" para asignación además de "<-" */
  allowEqualAssignment: boolean;
  /** Requerir "Entonces" después de "Si" */
  requireThenKeyword: boolean;
  /** Permitir operadores lógicos en texto ("Y", "O", "NO") además de símbolos */
  allowTextLogicOperators: boolean;
}

/**
 * Perfil por defecto para la UNSAM.
 * Configuración académica con reglas estrictas.
 */
export const PROFILE_UNSAM: ProfileConfig = {
  name: 'UNSAM',
  description: 'Perfil académico de la UNSAM — reglas estrictas para el aprendizaje',
  requireSemicolons: true,
  requireVariableDeclaration: true,
  strictTypes: true,
  caseSensitive: false,
  allowEqualAssignment: false,
  requireThenKeyword: true,
  allowTextLogicOperators: true,
};

/**
 * Perfil flexible para aprendizaje libre.
 * Menos restricciones, ideal para principiantes.
 */
export const PROFILE_FLEXIBLE: ProfileConfig = {
  name: 'Flexible',
  description: 'Perfil relajado — ideal para primeros pasos con programación',
  requireSemicolons: false,
  requireVariableDeclaration: false,
  strictTypes: false,
  caseSensitive: false,
  allowEqualAssignment: true,
  requireThenKeyword: false,
  allowTextLogicOperators: true,
};

/**
 * Perfil estricto máximo.
 */
export const PROFILE_ESTRICTO: ProfileConfig = {
  name: 'Estricto',
  description: 'Perfil con todas las reglas activadas — para evaluaciones formales',
  requireSemicolons: true,
  requireVariableDeclaration: true,
  strictTypes: true,
  caseSensitive: true,
  allowEqualAssignment: false,
  requireThenKeyword: true,
  allowTextLogicOperators: false,
};

/** Todos los perfiles disponibles */
export const PROFILES: Record<string, ProfileConfig> = {
  unsam: PROFILE_UNSAM,
  flexible: PROFILE_FLEXIBLE,
  estricto: PROFILE_ESTRICTO,
};

/** Perfil por defecto */
export const DEFAULT_PROFILE = PROFILE_UNSAM;
