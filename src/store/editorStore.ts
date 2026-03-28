// ============================================================
// editorStore.ts — Estado global del editor y archivos
// ============================================================

import { create } from 'zustand';

export interface VirtualFile {
  id: string;
  name: string;
  content: string;
  language: 'pseint';
  isModified: boolean;
  enunciado?: string;
  tests?: string;
}

interface EditorState {
  // Archivos
  files: VirtualFile[];
  activeFileId: string | null;

  // Acciones
  createFile: (name: string, content?: string, enunciado?: string, tests?: string) => void;
  openFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  closeFile: (id: string) => void;
  deleteFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  getActiveFile: () => VirtualFile | null;
}

let fileCounter = 0;

const DEFAULT_CONTENT = `Proceso SinNombre
    // Escribí tu pseudocódigo acá
    Escribir "Hola Mundo";
FinProceso`;

export const useEditorStore = create<EditorState>((set, get) => ({
  files: [
    {
      id: 'default-1',
      name: 'programa.psc',
      content: DEFAULT_CONTENT,
      language: 'pseint',
      isModified: false,
    },
  ],
  activeFileId: 'default-1',

  createFile: (name, content = DEFAULT_CONTENT, enunciado, tests) => {
    const id = `file-${++fileCounter}-${Date.now()}`;
    const newFile: VirtualFile = {
      id,
      name: name.endsWith('.psc') ? name : `${name}.psc`,
      content,
      language: 'pseint',
      isModified: false,
      enunciado,
      tests,
    };
    set((state) => ({
      files: [...state.files, newFile],
      activeFileId: id,
    }));
  },

  openFile: (id) => set({ activeFileId: id }),

  updateFileContent: (id, content) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, content, isModified: true } : f,
      ),
    })),

  closeFile: (id) =>
    set((state) => {
      const remaining = state.files.filter((f) => f.id !== id);
      return {
        files: remaining,
        activeFileId:
          state.activeFileId === id
            ? remaining[remaining.length - 1]?.id ?? null
            : state.activeFileId,
      };
    }),

  deleteFile: (id) =>
    set((state) => {
      const remaining = state.files.filter((f) => f.id !== id);
      return {
        files: remaining,
        activeFileId:
          state.activeFileId === id
            ? remaining[0]?.id ?? null
            : state.activeFileId,
      };
    }),

  renameFile: (id, newName) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id
          ? { ...f, name: newName.endsWith('.psc') ? newName : `${newName}.psc` }
          : f,
      ),
    })),

  getActiveFile: () => {
    const state = get();
    return state.files.find((f) => f.id === state.activeFileId) ?? null;
  },
}));
