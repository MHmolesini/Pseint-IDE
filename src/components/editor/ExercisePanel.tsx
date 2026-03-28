'use client';

import { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { Interpreter } from '@/interpreter/runtime/Interpreter';
import { Parser } from '@/interpreter/parser/Parser';
import { Lexer } from '@/interpreter/lexer/Lexer';
import { useInterpreterStore } from '@/store/interpreterStore';

interface TestCase {
  name: string;
  inputs: string[];
  expectedOutputs: string[];
}

export default function ExercisePanel() {
  const activeFile = useEditorStore((s) => s.getActiveFile());
  const profile = useInterpreterStore((s) => s.profile);
  
  const [showEnunciado, setShowEnunciado] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{ 
    success: boolean; 
    message: string;
    details?: string;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  if (!activeFile || (!activeFile.enunciado && !activeFile.tests)) return null;

  const parseTests = (xml: string): { cases: TestCase[], successMessage: string } => {
    const cases: TestCase[] = [];
    
    // Regex simple para extraer mensaje de éxito
    const successMatch = /<mensaje_exito>(.*?)<\/mensaje_exito>/s.exec(xml);
    const successMessage = successMatch ? successMatch[1].trim() : '¡Excelente! El ejercicio es correcto.';

    // Extraer cada <test> usando exec en un bucle
    const testRegex = /<test name="(.*?)">(.*?)<\/test>/gs;
    let match;
    while ((match = testRegex.exec(xml)) !== null) {
      const name = match[1];
      const content = match[2];
      
      const inputs: string[] = [];
      const inputRegex = /<entrada>(.*?)<\/entrada>/gs;
      let iMatch;
      while ((iMatch = inputRegex.exec(content)) !== null) {
        inputs.push(iMatch[1].trim());
      }

      const outputs: string[] = [];
      const outputRegex = /<salida>(.*?)<\/salida>/gs;
      let oMatch;
      while ((oMatch = outputRegex.exec(content)) !== null) {
        outputs.push(oMatch[1].trim());
      }
      
      cases.push({ name, inputs, expectedOutputs: outputs });
    }

    return { cases, successMessage };
  };

  const handleEvaluar = async () => {
    if (!activeFile.tests) return;
    setIsEvaluating(true);
    setEvaluationResult(null);

    try {
      const { cases, successMessage } = parseTests(activeFile.tests);
      
      // Preparar AST
      const lexer = new Lexer(activeFile.content);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, profile);
      const fileNode = parser.parse();

      for (const test of cases) {
        let inputIdx = 0;
        const actualOutputs: string[] = [];
        
        const interpreter = new Interpreter({
          onOutput: (text) => {
            actualOutputs.push(text.trim());
          },
          onInput: async () => {
            if (inputIdx < test.inputs.length) {
              return test.inputs[inputIdx++];
            }
            return "";
          },
          onVariableChange: () => {},
          onLineChange: () => {},
        });

        await interpreter.execute(fileNode);

        // Comparar salidas
        const allMatched = test.expectedOutputs.every((expected, i) => {
          const actual = actualOutputs[i] || "";
          return actual.toLowerCase().includes(expected.toLowerCase());
        });

        if (!allMatched) {
          setEvaluationResult({
            success: false,
            message: `Falló la prueba: "${test.name}"`,
            details: `Se esperaba "${test.expectedOutputs.join(', ')}" pero se obtuvo "${actualOutputs.join(', ')}"`
          });
          setIsEvaluating(false);
          return;
        }
      }

      setEvaluationResult({
        success: true,
        message: successMessage,
      });

    } catch (e: any) {
      setEvaluationResult({
        success: false,
        message: 'Error de ejecución o sintaxis',
        details: e.message
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border-t border-gray-800">
      {activeFile.enunciado && (
        <button
          onClick={() => setShowEnunciado(true)}
          className="px-3 py-1.5 text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-200 rounded border border-gray-700 transition-all flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Mostrar Enunciado
        </button>
      )}

      {activeFile.tests && (
        <button
          onClick={handleEvaluar}
          disabled={isEvaluating}
          className={`px-3 py-1.5 text-xs font-semibold rounded border transition-all flex items-center gap-2 ${
            isEvaluating 
              ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' 
              : 'bg-green-600/10 hover:bg-green-600/20 text-green-400 border-green-600/30'
          }`}
        >
          {isEvaluating ? (
             <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
             </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {isEvaluating ? 'Evaluando...' : 'Evaluar'}
        </button>
      )}

      {/* Modal de Resultado */}
      {evaluationResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className={`bg-[#1E1E1E] border ${evaluationResult.success ? 'border-green-500/30' : 'border-red-500/30'} rounded-xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in duration-200`}>
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <div className={`p-4 rounded-full ${evaluationResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                   {evaluationResult.success ? (
                     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                   ) : (
                     <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                   )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">
                    {evaluationResult.success ? '¡Pruebas Superadas!' : 'Error en la Solución'}
                  </h4>
                  <p className={`text-sm font-medium ${evaluationResult.success ? 'text-green-400/80' : 'text-red-400/80'}`}>
                    {evaluationResult.success ? 'Tu código funciona correctamente' : 'Revisá la lógica de tu programa'}
                  </p>
                </div>
              </div>
              
              <div className="bg-black/40 rounded-lg p-5 mb-8 border border-gray-800/50">
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{evaluationResult.message}</p>
                {evaluationResult.details && (
                  <div className="mt-4 pt-4 border-t border-gray-800/50">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Detalles técnicos</p>
                    <p className="text-xs text-gray-400 font-mono italic">{evaluationResult.details}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setEvaluationResult(null)}
                className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition-all border border-gray-700 shadow-lg"
              >
                Continuar
              </button>
           </div>
        </div>
      )}

      {/* Modal de Enunciado */}
      {showEnunciado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1A1A] border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-800 bg-[#1E1E1E]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-100">Enunciado del Desafío</h3>
              </div>
              <button 
                onClick={() => setShowEnunciado(false)}
                className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 text-gray-300 scroll-smooth">
              <div 
                className="prose prose-invert prose-orange max-w-none 
                  prose-headings:text-orange-400 
                  prose-p:text-gray-400 
                  prose-strong:text-white"
                dangerouslySetInnerHTML={{ __html: activeFile.enunciado || '' }}
              />
            </div>
            <div className="px-8 py-5 border-t border-gray-800 bg-[#1E1E1E] flex justify-end">
              <button
                onClick={() => setShowEnunciado(false)}
                className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-orange-900/20 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
