'use client';

// ============================================================
// EditorPanel.tsx — Panel del Monaco Editor con soporte PSeInt
// ============================================================

import { useRef, useCallback, useEffect, useState } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type * as MonacoTypes from 'monaco-editor';
import { useEditorStore } from '@/store/editorStore';
import { useInterpreterStore } from '@/store/interpreterStore';
import { analyzeCode } from '@/interpreter/diagnostics/diagnostics';
import {
  PSEINT_LANGUAGE_ID,
  pseintLanguageDefinition,
  pseintLanguageConfiguration,
} from './pseint-language';
import ExercisePanel from './ExercisePanel';

export default function EditorPanel() {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoTypes | null>(null);
  const activeFile = useEditorStore((s) => s.files.find((f) => f.id === s.activeFileId));
  const updateFileContent = useEditorStore((s) => s.updateFileContent);
  const currentLine = useInterpreterStore((s) => s.currentLine);
  const status = useInterpreterStore((s) => s.status);
  const profile = useInterpreterStore((s) => s.profile);
  const [decorations, setDecorations] = useState<string[]>([]);

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    // Registrar lenguaje PSeInt
    monaco.languages.register({ id: PSEINT_LANGUAGE_ID });
    monaco.languages.setMonarchTokensProvider(PSEINT_LANGUAGE_ID, pseintLanguageDefinition);
    monaco.languages.setLanguageConfiguration(PSEINT_LANGUAGE_ID, pseintLanguageConfiguration);

    // Registrar tema personalizado Claude AI
    monaco.editor.defineTheme('pseint-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'E8875A', fontStyle: 'bold' },
        { token: 'keyword.operator.assignment', foreground: 'E8875A' },
        { token: 'keyword.operator.comparison', foreground: 'D4A06A' },
        { token: 'keyword.operator.arithmetic', foreground: 'D4A06A' },
        { token: 'keyword.operator.logical', foreground: 'E8875A' },
        { token: 'type', foreground: 'CC8844', fontStyle: 'italic' },
        { token: 'support.function', foreground: 'E0A870' },
        { token: 'string', foreground: '9ABFA0' },
        { token: 'number', foreground: 'D4A06A' },
        { token: 'number.float', foreground: 'D4A06A' },
        { token: 'comment', foreground: '6B7280', fontStyle: 'italic' },
        { token: 'identifier', foreground: 'D1D5DB' },
        { token: 'delimiter', foreground: '9CA3AF' },
      ],
      colors: {
        'editor.background': '#1A1A1A',
        'editor.foreground': '#D1D5DB',
        'editor.lineHighlightBackground': '#2A2A2A',
        'editor.selectionBackground': '#E8875A33',
        'editorCursor.foreground': '#E8875A',
        'editorLineNumber.foreground': '#4B5563',
        'editorLineNumber.activeForeground': '#E8875A',
        'editor.selectionHighlightBackground': '#E8875A22',
      },
    });

    // ============================================================
    // Autocompletado PSeInt — palabras clave, tipos, funciones, snippets
    // ============================================================
    const CK = monaco.languages.CompletionItemKind;

    monaco.languages.registerCompletionItemProvider(PSEINT_LANGUAGE_ID, {
      provideCompletionItems: (model: import('monaco-editor').editor.ITextModel, position: import('monaco-editor').Position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: Array<{
          label: string;
          kind: typeof CK[keyof typeof CK];
          insertText: string;
          insertTextRules?: number;
          detail: string;
          documentation?: string;
          range: typeof range;
          sortText?: string;
        }> = [];

        // --- 🔑 Palabras clave de estructura (Keyword) ---
        const keywords = [
          { label: 'Proceso', detail: 'Palabra clave', doc: 'Inicio del programa principal' },
          { label: 'FinProceso', detail: 'Palabra clave', doc: 'Fin del programa principal' },
          { label: 'Definir', detail: 'Palabra clave', doc: 'Declaración de variables' },
          { label: 'Como', detail: 'Palabra clave', doc: 'Indica el tipo de dato en Definir' },
          { label: 'Dimension', detail: 'Palabra clave', doc: 'Declaración de arreglos' },
          { label: 'Leer', detail: 'Palabra clave', doc: 'Lee entrada del usuario' },
          { label: 'Escribir', detail: 'Palabra clave', doc: 'Muestra salida en consola' },
          { label: 'Si', detail: 'Palabra clave', doc: 'Inicio de estructura condicional' },
          { label: 'Entonces', detail: 'Palabra clave', doc: 'Parte del Si condicional' },
          { label: 'SiNo', detail: 'Palabra clave', doc: 'Rama alternativa del Si' },
          { label: 'FinSi', detail: 'Palabra clave', doc: 'Fin de estructura condicional' },
          { label: 'Segun', detail: 'Palabra clave', doc: 'Selección múltiple' },
          { label: 'Hacer', detail: 'Palabra clave', doc: 'Parte de Segun/Mientras' },
          { label: 'FinSegun', detail: 'Palabra clave', doc: 'Fin de selección múltiple' },
          { label: 'Mientras', detail: 'Palabra clave', doc: 'Bucle con condición al inicio' },
          { label: 'FinMientras', detail: 'Palabra clave', doc: 'Fin del bucle Mientras' },
          { label: 'Repetir', detail: 'Palabra clave', doc: 'Bucle con condición al final' },
          { label: 'Para', detail: 'Palabra clave', doc: 'Bucle con contador' },
          { label: 'Hasta', detail: 'Palabra clave', doc: 'Límite del bucle Para' },
          { label: 'FinPara', detail: 'Palabra clave', doc: 'Fin del bucle Para' },
          { label: 'SubProceso', detail: 'Palabra clave', doc: 'Definición de subrutina' },
          { label: 'FinSubProceso', detail: 'Palabra clave', doc: 'Fin de subrutina' },
          { label: 'Funcion', detail: 'Palabra clave', doc: 'Definición de función' },
          { label: 'FinFuncion', detail: 'Palabra clave', doc: 'Fin de función' },
          { label: 'Verdadero', detail: 'Palabra clave', doc: 'Valor lógico verdadero' },
          { label: 'Falso', detail: 'Palabra clave', doc: 'Valor lógico falso' },
          { label: 'Mod', detail: 'Palabra clave', doc: 'Operador módulo (resto)' },
        ];

        for (const kw of keywords) {
          suggestions.push({
            label: kw.label,
            kind: CK.Keyword,
            insertText: kw.label,
            detail: `⟨clave⟩ ${kw.detail}`,
            documentation: kw.doc,
            range,
            sortText: `0_${kw.label}`, // prioridad alta
          });
        }

        // --- 📦 Tipos de dato (Class/Type icon) ---
        const types = [
          { label: 'Entero', doc: 'Tipo numérico entero (sin decimales)' },
          { label: 'Real', doc: 'Tipo numérico real (con decimales)' },
          { label: 'Numerico', doc: 'Tipo numérico genérico' },
          { label: 'Cadena', doc: 'Tipo texto / string' },
          { label: 'Caracter', doc: 'Tipo carácter individual' },
          { label: 'Texto', doc: 'Tipo texto / string' },
          { label: 'Logico', doc: 'Tipo booleano (Verdadero/Falso)' },
        ];

        for (const t of types) {
          suggestions.push({
            label: t.label,
            kind: CK.TypeParameter,
            insertText: t.label,
            detail: `⟨tipo⟩ Tipo de dato`,
            documentation: t.doc,
            range,
            sortText: `1_${t.label}`,
          });
        }

        // --- ƒ Funciones integradas (Function icon) ---
        const builtins = [
          { label: 'RC', insert: 'RC(${1:valor})', doc: 'Raíz cuadrada' },
          { label: 'RAIZ', insert: 'RAIZ(${1:valor})', doc: 'Raíz cuadrada' },
          { label: 'ABS', insert: 'ABS(${1:valor})', doc: 'Valor absoluto' },
          { label: 'TRUNC', insert: 'TRUNC(${1:valor})', doc: 'Truncar (quitar decimales)' },
          { label: 'REDON', insert: 'REDON(${1:valor})', doc: 'Redondear al entero más cercano' },
          { label: 'AZAR', insert: 'AZAR(${1:limite})', doc: 'Número aleatorio entre 0 y límite-1' },
          { label: 'SEN', insert: 'SEN(${1:angulo})', doc: 'Seno (ángulo en radianes)' },
          { label: 'COS', insert: 'COS(${1:angulo})', doc: 'Coseno (ángulo en radianes)' },
          { label: 'TAN', insert: 'TAN(${1:angulo})', doc: 'Tangente (ángulo en radianes)' },
          { label: 'LN', insert: 'LN(${1:valor})', doc: 'Logaritmo natural' },
          { label: 'EXP', insert: 'EXP(${1:valor})', doc: 'Exponencial (e^valor)' },
          { label: 'Longitud', insert: 'Longitud(${1:cadena})', doc: 'Largo de una cadena' },
          { label: 'Subcadena', insert: 'Subcadena(${1:cadena}, ${2:inicio}, ${3:fin})', doc: 'Extrae parte de una cadena' },
          { label: 'Concatenar', insert: 'Concatenar(${1:cadena1}, ${2:cadena2})', doc: 'Une dos cadenas' },
          { label: 'Mayusculas', insert: 'Mayusculas(${1:cadena})', doc: 'Convierte a mayúsculas' },
          { label: 'Minusculas', insert: 'Minusculas(${1:cadena})', doc: 'Convierte a minúsculas' },
          { label: 'ConvertirANumero', insert: 'ConvertirANumero(${1:cadena})', doc: 'Convierte texto a número' },
          { label: 'ConvertirATexto', insert: 'ConvertirATexto(${1:numero})', doc: 'Convierte número a texto' },
        ];

        for (const fn of builtins) {
          suggestions.push({
            label: fn.label,
            kind: CK.Function,
            insertText: fn.insert,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: `⟨función⟩ Función integrada`,
            documentation: fn.doc,
            range,
            sortText: `2_${fn.label}`,
          });
        }

        // --- 📝 Snippets de estructuras completas ---
        const snippets = [
          {
            label: 'Si-Entonces',
            insert: 'Si (${1:condicion}) Entonces\n\t${2:// instrucciones}\nFinSi',
            doc: 'Estructura condicional Si/FinSi',
          },
          {
            label: 'Si-SiNo',
            insert: 'Si (${1:condicion}) Entonces\n\t${2:// si verdadero}\nSiNo\n\t${3:// si falso}\nFinSi',
            doc: 'Condicional con rama alternativa',
          },
          {
            label: 'Mientras-Hacer',
            insert: 'Mientras (${1:condicion}) Hacer\n\t${2:// instrucciones}\nFinMientras',
            doc: 'Bucle Mientras con condición al inicio',
          },
          {
            label: 'Para-Hasta',
            insert: 'Para ${1:i} <- ${2:1} Hasta ${3:10} Con Paso ${4:1} Hacer\n\t${5:// instrucciones}\nFinPara',
            doc: 'Bucle Para con contador',
          },
          {
            label: 'Repetir-HastaQue',
            insert: 'Repetir\n\t${1:// instrucciones}\nHasta Que (${2:condicion});',
            doc: 'Bucle Repetir con condición al final',
          },
          {
            label: 'Segun-Hacer',
            insert: 'Segun ${1:variable} Hacer\n\t${2:1}:\n\t\t${3:// caso 1}\n\tDe Otro Modo:\n\t\t${4:// por defecto}\nFinSegun',
            doc: 'Selección múltiple Segun',
          },
          {
            label: 'Definir-Como',
            insert: 'Definir ${1:variable} Como ${2|Entero,Real,Cadena,Logico|};',
            doc: 'Declarar variable con tipo',
          },
          {
            label: 'Leer-variable',
            insert: 'Leer ${1:variable};',
            doc: 'Leer entrada del usuario',
          },
          {
            label: 'Escribir-texto',
            insert: 'Escribir ${1:"texto"};',
            doc: 'Mostrar texto en consola',
          },
          {
            label: 'SubProceso-completo',
            insert: 'SubProceso ${1:resultado} <- ${2:NombreSub}(${3:param1})\n\tDefinir ${1:resultado} Como ${4|Entero,Real,Cadena,Logico|};\n\t${5:// instrucciones}\nFinSubProceso',
            doc: 'SubProceso/función con retorno',
          },
          {
            label: 'Proceso-completo',
            insert: 'Proceso ${1:MiPrograma}\n\t${2:// instrucciones}\nFinProceso',
            doc: 'Estructura completa de un programa',
          },
        ];

        for (const sn of snippets) {
          suggestions.push({
            label: sn.label,
            kind: CK.Snippet,
            insertText: sn.insert,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: `⟨plantilla⟩ Snippet`,
            documentation: sn.doc,
            range,
            sortText: `3_${sn.label}`,
          });
        }

        return { suggestions };
      },
    });
  }, []);

  // Ejecutar diagnósticos con debounce
  const runDiagnostics = useCallback(
    (code: string, monaco: typeof MonacoTypes, model: editor.ITextModel, activeProfile = profile) => {
      const diagnostics = analyzeCode(code, activeProfile);

      const markers: MonacoTypes.editor.IMarkerData[] = diagnostics.map((d) => ({
        severity:
          d.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : d.severity === 'warning'
              ? monaco.MarkerSeverity.Warning
              : monaco.MarkerSeverity.Info,
        message: d.message,
        startLineNumber: d.line,
        startColumn: d.column,
        endLineNumber: d.line,
        endColumn: d.endColumn,
      }));

      monaco.editor.setModelMarkers(model, 'pseint-diagnostics', markers);
    },
    [profile],
  );

  const handleMount: OnMount = useCallback((editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;
    editorInstance.focus();

    // Ejecutar diagnósticos iniciales
    const model = editorInstance.getModel();
    if (model) {
      runDiagnostics(model.getValue(), monaco, model, profile);
    }
  }, [profile, runDiagnostics]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeFile && value !== undefined) {
        updateFileContent(activeFile.id, value);
      }
    },
    [activeFile, updateFileContent],
  );


  useEffect(() => {
    if (!activeFile || !monacoRef.current || !editorRef.current) return;

    const timer = setTimeout(() => {
      const model = editorRef.current?.getModel();
      if (model && monacoRef.current) {
        runDiagnostics(activeFile.content, monacoRef.current, model, profile);
      }
    }, 500); // debounce 500ms

    return () => clearTimeout(timer);
  }, [activeFile?.content, runDiagnostics, activeFile]);

  // Resaltar línea actual durante ejecución paso a paso
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;

    if (currentLine && (status === 'running' || status === 'paused')) {
      const newDecorations = ed.deltaDecorations(decorations, [
        {
          range: {
            startLineNumber: currentLine,
            startColumn: 1,
            endLineNumber: currentLine,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: 'current-execution-line',
            glyphMarginClassName: 'current-execution-glyph',
          },
        },
      ]);
      setDecorations(newDecorations);
    } else {
      const cleared = ed.deltaDecorations(decorations, []);
      setDecorations(cleared);
    }
  }, [currentLine, status]);

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#1A1A1A] text-gray-500">
        <div className="text-center">
          <div className="text-5xl mb-4">📝</div>
          <p className="text-lg">Seleccioná o creá un archivo para comenzar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 h-full min-h-0">
        <Editor
          height="100%"
          language={PSEINT_LANGUAGE_ID}
          theme="pseint-dark"
          value={activeFile.content}
          onChange={handleChange}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            minimap: { enabled: false },
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            tabSize: 4,
            wordWrap: 'on',
            glyphMargin: true,
            folding: true,
            fixedOverflowWidgets: true,
            bracketPairColorization: { enabled: true },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoIndent: 'full',
            formatOnType: true,
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>
      <ExercisePanel />
    </div>
  );
}
