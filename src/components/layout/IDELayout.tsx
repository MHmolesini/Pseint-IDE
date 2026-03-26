'use client';

// ============================================================
// IDELayout.tsx — Layout principal tipo VS Code
// ============================================================
// Todos los paneles son redimensionables arrastrando los bordes.
// Si se achica por debajo del umbral, el panel se cierra.
// Doble-click en un borde restaura/colapsa el panel.
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import FileExplorer from '@/components/sidebar/FileExplorer';
import Terminal from '@/components/terminal/Terminal';
import VariablePanel from '@/components/variables/VariablePanel';
import QuickHelp from '@/components/help/QuickHelp';
import FlowchartPanel from '@/components/flowchart/FlowchartPanel';
import { useEditorStore } from '@/store/editorStore';
import { useInterpreterStore } from '@/store/interpreterStore';
import { useResizable } from '@/hooks/useResizable';
import { Lexer, LexerError } from '@/interpreter/lexer/Lexer';
import { Parser } from '@/interpreter/parser/Parser';
import { ParseError } from '@/interpreter/parser/errors';
import { Interpreter } from '@/interpreter/runtime/Interpreter';

// Monaco necesita carga dinámica (no SSR)
const EditorPanel = dynamic(() => import('@/components/editor/EditorPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#1A1A1A] text-gray-500">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
        <span>Cargando editor...</span>
      </div>
    </div>
  ),
});

type BottomTab = 'terminal' | 'flowchart' | 'help';

export default function IDELayout() {
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal');
  const interpreterRef = useRef<Interpreter | null>(null);

  // --- Paneles redimensionables ---
  const sidebar = useResizable({
    direction: 'horizontal',
    initialSize: 240,
    minSize: 160,
    maxSize: 450,
    collapseThreshold: 80,
    defaultOpen: true,
  });

  const bottomPanel = useResizable({
    direction: 'vertical',
    initialSize: 250,
    minSize: 120,
    maxSize: 600,
    collapseThreshold: 60,
    defaultOpen: true,
    reverse: true, // crece hacia arriba
  });

  const rightPanel = useResizable({
    direction: 'horizontal',
    initialSize: 280,
    minSize: 180,
    maxSize: 500,
    collapseThreshold: 80,
    defaultOpen: true,
    reverse: true, // crece hacia la izquierda
  });

  // Agregar clase al body durante drag para deshabilitar transiciones
  useEffect(() => {
    const isAnyDragging = sidebar.isDragging || bottomPanel.isDragging || rightPanel.isDragging;
    if (isAnyDragging) {
      document.body.classList.add('is-resizing');
    } else {
      document.body.classList.remove('is-resizing');
    }
  }, [sidebar.isDragging, bottomPanel.isDragging, rightPanel.isDragging]);

  // --- Stores ---
  const files = useEditorStore((s) => s.files);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const openFile = useEditorStore((s) => s.openFile);
  const closeFile = useEditorStore((s) => s.closeFile);
  const getActiveFile = useEditorStore((s) => s.getActiveFile);

  const status = useInterpreterStore((s) => s.status);
  const reset = useInterpreterStore((s) => s.reset);
  const addConsoleMessage = useInterpreterStore((s) => s.addConsoleMessage);
  const clearConsole = useInterpreterStore((s) => s.clearConsole);
  const setStatus = useInterpreterStore((s) => s.setStatus);
  const setCurrentLine = useInterpreterStore((s) => s.setCurrentLine);
  const addError = useInterpreterStore((s) => s.addError);
  const clearErrors = useInterpreterStore((s) => s.clearErrors);
  const setWaitingForInput = useInterpreterStore((s) => s.setWaitingForInput);
  const updateVariable = useInterpreterStore((s) => s.updateVariable);

  const handleRun = useCallback(() => {
    const file = getActiveFile();
    if (!file) return;

    // Abortar ejecución anterior si existe
    if (interpreterRef.current) {
      interpreterRef.current.abort();
    }

    reset();
    clearErrors();
    clearConsole();
    setStatus('running');

    // Abrir consola si está cerrada
    if (!bottomPanel.isOpen) {
      bottomPanel.open();
      setBottomTab('terminal');
    }

    // Ejecutar de forma async
    const run = async () => {
      try {
        // 1. Lexer
        const lexer = new Lexer(file.content);
        const tokens = lexer.tokenize();

        // 2. Parser
        const parser = new Parser(tokens);
        const fileNode = parser.parse();

        // 3. Interpreter
        addConsoleMessage({ type: 'info', content: `*** Ejecución Iniciada. ***` });

        const interpreter = new Interpreter({
          onOutput: (text) => {
            addConsoleMessage({ type: 'output', content: text });
          },
          onInput: () => {
            return new Promise<string>((resolve) => {
              setWaitingForInput(true, (value: string) => {
                addConsoleMessage({ type: 'input', content: value });
                resolve(value);
              });
            });
          },
          onVariableChange: (name, value, type) => {
            updateVariable(name, value, type);
          },
          onLineChange: (line) => {
            setCurrentLine(line);
          },
        });

        interpreterRef.current = interpreter;
        await interpreter.execute(fileNode);

        addConsoleMessage({ type: 'info', content: `*** Ejecución Finalizada. ***` });
        setStatus('finished');
        setCurrentLine(null);
      } catch (error) {
        if (error instanceof LexerError || error instanceof ParseError) {
          addConsoleMessage({ type: 'error', content: error.message });
          addError(error.message);
        } else {
          addConsoleMessage({
            type: 'error',
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
        addConsoleMessage({ type: 'info', content: `*** Ejecución Finalizada con errores. ***` });
        setStatus('error');
        setCurrentLine(null);
      }
    };

    run();
  }, [getActiveFile, reset, clearErrors, clearConsole, setStatus, setCurrentLine, addConsoleMessage, addError, setWaitingForInput, updateVariable, bottomPanel]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#111111] text-gray-300 overflow-hidden select-none">
      {/* ==================== TITLE BAR ==================== */}
      <header className="flex items-center justify-between h-10 px-4 bg-[#1A1A1A] border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
              P
            </div>
            <span className="text-sm font-semibold text-gray-300">
              PSeInt <span className="text-orange-400">IDE</span>
            </span>
          </div>
          <span className="text-xs text-gray-600">|</span>
          <span className="text-xs text-gray-500">UNSAM</span>
        </div>

        {/* Run controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={status === 'running'}
            className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 rounded text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-orange-500/20"
          >
            {status === 'running' ? (
              <>
                <div className="w-3 h-3 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                Ejecutando
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Ejecutar
              </>
            )}
          </button>

          <button
            onClick={() => {
              reset();
              clearConsole();
              clearErrors();
            }}
            className="flex items-center gap-1.5 px-3 py-1 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 rounded text-xs transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            Detener
          </button>

          <div className="w-px h-4 bg-gray-800 mx-1" />

          <button
            onClick={() => {
              if (!bottomPanel.isOpen) bottomPanel.open();
              setBottomTab('flowchart');
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded text-xs font-medium transition-all border border-blue-500/20"
            title="Ver diagrama de flujo (PSDraw)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v8" />
              <path d="m9 7 3 3 3-3" />
              <rect x="3" y="10" width="18" height="12" rx="2" />
              <path d="M7 14h10" />
              <path d="M7 18h10" />
            </svg>
            Diagrama
          </button>
        </div>
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ---- SIDEBAR ---- */}
        {sidebar.isOpen && (
          <div
            className="flex-shrink-0 overflow-hidden"
            style={{ width: sidebar.size }}
          >
            <FileExplorer />
          </div>
        )}

        {/* Resize handle: Sidebar ↔ Editor */}
        <div {...sidebar.handleProps} />

        {/* ---- CENTER + BOTTOM ---- */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Tab bar */}
          <div className="flex items-center bg-[#1A1A1A] border-b border-gray-800 h-9 flex-shrink-0 overflow-x-auto">
            {/* Sidebar toggle */}
            <button
              onClick={sidebar.toggle}
              className={`flex items-center justify-center w-9 h-9 hover:bg-gray-700/30 transition-colors flex-shrink-0 ${
                sidebar.isOpen ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
              }`}
              title={sidebar.isOpen ? 'Ocultar sidebar' : 'Mostrar sidebar'}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>

            {/* File tabs */}
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => openFile(file.id)}
                className={`group flex items-center gap-1.5 px-3 h-full text-xs cursor-pointer border-r border-gray-800 transition-colors ${
                  file.id === activeFileId
                    ? 'bg-[#1A1A1A] text-gray-200 border-t-2 border-t-orange-500'
                    : 'bg-[#141414] text-gray-500 hover:text-gray-300 border-t-2 border-t-transparent'
                }`}
              >
                <span className="truncate max-w-[120px]">{file.name}</span>
                {file.isModified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(file.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-600/50 transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Editor + Bottom Panel area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor row */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Monaco Editor */}
              <EditorPanel />

              {/* Resize handle: Editor ↔ Variables */}
              <div {...rightPanel.handleProps} />

              {/* Right panel (Variables) */}
              {rightPanel.isOpen && (
                <div
                  className="flex-shrink-0 overflow-hidden"
                  style={{ width: rightPanel.size }}
                >
                  <VariablePanel />
                </div>
              )}
            </div>

            {/* Resize handle: Editor ↔ Bottom panel */}
            <div {...bottomPanel.handleProps} />

            {/* Bottom panel */}
            {bottomPanel.isOpen && (
              <div
                className="flex-shrink-0 overflow-hidden"
                style={{ height: bottomPanel.size }}
              >
                {/* Bottom tabs */}
                <div className="flex items-center bg-[#1A1A1A] border-b border-gray-800 h-8 flex-shrink-0">
                  <button
                    onClick={() => setBottomTab('terminal')}
                    className={`px-4 h-full text-xs transition-colors ${
                      bottomTab === 'terminal'
                        ? 'text-orange-400 border-b-2 border-orange-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Consola
                  </button>
                  <button
                    onClick={() => setBottomTab('flowchart')}
                    className={`px-4 h-full text-xs transition-colors ${
                      bottomTab === 'flowchart'
                        ? 'text-orange-400 border-b-2 border-orange-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Diagrama
                  </button>
                  <button
                    onClick={() => setBottomTab('help')}
                    className={`px-4 h-full text-xs transition-colors ${
                      bottomTab === 'help'
                        ? 'text-orange-400 border-b-2 border-orange-400'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Ayuda Rápida
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={rightPanel.toggle}
                    className={`px-3 h-full text-xs transition-colors ${
                      rightPanel.isOpen ? 'text-orange-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Variables
                  </button>
                  <button
                    onClick={bottomPanel.close}
                    className="px-2 h-full text-gray-500 hover:text-gray-300 transition-colors"
                    title="Cerrar panel"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 15 12 9 18 15" />
                    </svg>
                  </button>
                </div>

                <div className="h-[calc(100%-32px)] overflow-hidden">
                  {bottomTab === 'terminal' && <Terminal />}
                  {bottomTab === 'flowchart' && <FlowchartPanel />}
                  {bottomTab === 'help' && <QuickHelp />}
                </div>
              </div>
            )}

            {/* Collapsed bottom panel bar */}
            {!bottomPanel.isOpen && (
              <div
                className="flex items-center h-6 bg-[#1A1A1A] border-t border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors flex-shrink-0"
                onClick={bottomPanel.open}
              >
                <div className="flex items-center gap-4 px-4 text-xs text-gray-500">
                  <span className="hover:text-gray-300 transition-colors">Consola</span>
                  <span className="hover:text-gray-300 transition-colors">Diagrama</span>
                  <span className="hover:text-gray-300 transition-colors">Ayuda Rápida</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== STATUS BAR ==================== */}
      <footer className="flex items-center justify-between h-6 px-4 bg-[#1A1A1A] border-t border-gray-800 flex-shrink-0 text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            {status === 'idle' && <span className="w-2 h-2 rounded-full bg-gray-500" />}
            {status === 'running' && <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
            {status === 'paused' && <span className="w-2 h-2 rounded-full bg-yellow-400" />}
            {status === 'finished' && <span className="w-2 h-2 rounded-full bg-green-400" />}
            {status === 'error' && <span className="w-2 h-2 rounded-full bg-red-400" />}
            {status === 'idle' && 'Listo'}
            {status === 'running' && 'Ejecutando...'}
            {status === 'paused' && 'Pausado'}
            {status === 'finished' && 'Finalizado'}
            {status === 'error' && 'Error'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>PSeInt</span>
          <span>UTF-8</span>
        </div>
      </footer>
    </div>
  );
}
