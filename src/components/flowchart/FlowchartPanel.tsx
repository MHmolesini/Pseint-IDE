'use client';

// ============================================================
// FlowchartPanel.tsx — Panel de diagrama de flujo
// ============================================================
// Renderiza un diagrama de flujo Mermaid a partir del código PSeInt
// actual en el editor. Se actualiza cuando el usuario genera
// el diagrama explícitamente.
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Lexer, LexerError } from '@/interpreter/lexer/Lexer';
import { Parser } from '@/interpreter/parser/Parser';
import { ParseError } from '@/interpreter/parser/errors';
import { astToFlowchart } from '@/interpreter/flowchart/ast-to-flowchart';

export default function FlowchartPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const activeFile = useEditorStore((s) => s.files.find((f) => f.id === s.activeFileId));
  const [lastCode, setLastCode] = useState<string>('');

  const generateDiagram = useCallback(async () => {
    if (!activeFile) return;

    const code = activeFile.content;
    setLastCode(code);
    setError(null);

    try {
      // 1. Lexer
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();

      // 2. Parser
      const parser = new Parser(tokens);
      const fileNode = parser.parse();

      // 3. Convertir AST a Mermaid
      const mermaidDef = astToFlowchart(fileNode);

      // 4. Renderizar con Mermaid
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          primaryColor: '#2D2D2D',
          primaryTextColor: '#D1D5DB',
          primaryBorderColor: '#E8875A',
          lineColor: '#6B7280',
          secondaryColor: '#1A1A1A',
          tertiaryColor: '#111111',
          fontFamily: "'Inter', 'Segoe UI', sans-serif",
          fontSize: '14px',
        },
        flowchart: {
          htmlLabels: true,
          curve: 'basis',
          padding: 15,
          nodeSpacing: 30,
          rankSpacing: 40,
        },
      });

      const { svg } = await mermaid.render('flowchart-svg', mermaidDef);
      setSvgContent(svg);
    } catch (err) {
      if (err instanceof LexerError || err instanceof ParseError) {
        setError(err.message);
      } else {
        setError(`No se pudo generar el diagrama: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }, [activeFile]);

  // Auto-generar al montar y cuando cambie el código
  useEffect(() => {
    if (activeFile && activeFile.content !== lastCode) {
      const timer = setTimeout(() => {
        generateDiagram();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeFile?.content, generateDiagram, activeFile, lastCode]);

  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center bg-[#111111] text-gray-500">
        <p className="text-sm">Seleccioná un archivo para ver su diagrama.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-[#111111] overflow-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={generateDiagram}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded text-xs font-medium border border-orange-500/20 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Regenerar
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-3xl mb-3">⚠️</div>
            <p className="text-red-400 text-sm mb-2">Error al generar diagrama</p>
            <p className="text-gray-500 text-xs font-mono bg-[#1A1A1A] p-3 rounded">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!svgContent) {
    return (
      <div className="h-full flex items-center justify-center bg-[#111111] text-gray-500">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Generando diagrama...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#111111] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] border-b border-gray-800 flex-shrink-0">
        <button
          onClick={generateDiagram}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded text-xs font-medium border border-orange-500/20 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Actualizar
        </button>
        <span className="text-xs text-gray-600">Diagrama de flujo</span>
      </div>

      {/* SVG container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-start justify-center"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
