// ============================================================
// interpreterStore.ts — Estado global del intérprete
// ============================================================

import { create } from 'zustand';
import { ProfileConfig, DEFAULT_PROFILE } from '@/interpreter/profiles/ProfileConfig';

export type ExecutionStatus = 'idle' | 'running' | 'paused' | 'finished' | 'error';

export interface VariableInfo {
  name: string;
  type: string;
  value: string;
  scope: string;
}

export interface ConsoleMessage {
  type: 'output' | 'input' | 'error' | 'info';
  content: string;
  timestamp: number;
}

interface InterpreterState {
  // Ejecución
  status: ExecutionStatus;
  currentLine: number | null;
  executionSpeed: number; // ms entre pasos

  // Variables
  variables: VariableInfo[];

  // Consola
  consoleMessages: ConsoleMessage[];
  inputBuffer: string[];
  waitingForInput: boolean;
  inputCallback: ((value: string) => void) | null;

  // Perfil
  profile: ProfileConfig;

  // Errores
  errors: string[];

  // Acciones
  setStatus: (status: ExecutionStatus) => void;
  setCurrentLine: (line: number | null) => void;
  setVariables: (variables: VariableInfo[]) => void;
  updateVariable: (name: string, value: string, type: string) => void;
  addConsoleMessage: (msg: Omit<ConsoleMessage, 'timestamp'>) => void;
  clearConsole: () => void;
  setProfile: (profile: ProfileConfig) => void;
  addError: (error: string) => void;
  clearErrors: () => void;
  setWaitingForInput: (waiting: boolean, callback?: (value: string) => void) => void;
  provideInput: (value: string) => void;
  setExecutionSpeed: (speed: number) => void;
  reset: () => void;
}

export const useInterpreterStore = create<InterpreterState>((set, get) => ({
  status: 'idle',
  currentLine: null,
  executionSpeed: 200,
  variables: [],
  consoleMessages: [],
  inputBuffer: [],
  waitingForInput: false,
  inputCallback: null,
  profile: DEFAULT_PROFILE,
  errors: [],

  setStatus: (status) => set({ status }),
  setCurrentLine: (currentLine) => set({ currentLine }),

  setVariables: (variables) => set({ variables }),

  updateVariable: (name, value, type) =>
    set((state) => {
      const existing = state.variables.findIndex((v) => v.name === name);
      if (existing >= 0) {
        const updated = [...state.variables];
        updated[existing] = { ...updated[existing], value, type };
        return { variables: updated };
      }
      return {
        variables: [...state.variables, { name, value, type, scope: 'global' }],
      };
    }),

  addConsoleMessage: (msg) =>
    set((state) => ({
      consoleMessages: [...state.consoleMessages, { ...msg, timestamp: Date.now() }],
    })),

  clearConsole: () => set({ consoleMessages: [] }),

  setProfile: (profile) => set({ profile }),

  addError: (error) =>
    set((state) => ({ errors: [...state.errors, error] })),

  clearErrors: () => set({ errors: [] }),

  setWaitingForInput: (waiting, callback) =>
    set({ waitingForInput: waiting, inputCallback: callback ?? null }),

  provideInput: (value) => {
    const { inputCallback } = get();
    if (inputCallback) {
      inputCallback(value);
      set({ waitingForInput: false, inputCallback: null });
    }
  },

  setExecutionSpeed: (speed) => set({ executionSpeed: speed }),

  reset: () =>
    set({
      status: 'idle',
      currentLine: null,
      variables: [],
      consoleMessages: [],
      inputBuffer: [],
      waitingForInput: false,
      inputCallback: null,
      errors: [],
    }),
}));
