'use client';

// ============================================================
// Terminal.tsx — Consola interactiva para Leer/Escribir
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { useInterpreterStore } from '@/store/interpreterStore';

export default function Terminal() {
  const consoleMessages = useInterpreterStore((s) => s.consoleMessages);
  const waitingForInput = useInterpreterStore((s) => s.waitingForInput);
  const provideInput = useInterpreterStore((s) => s.provideInput);
  const clearConsole = useInterpreterStore((s) => s.clearConsole);
  const status = useInterpreterStore((s) => s.status);

  const [inputValue, setInputValue] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [consoleMessages]);

  // Focus en input cuando se espera entrada
  useEffect(() => {
    if (waitingForInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForInput]);

  const handleSubmitInput = () => {
    if (inputValue.trim() !== '' || waitingForInput) {
      provideInput(inputValue);
      setInputValue('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#141414] font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1A1A1A] border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Consola
          </span>
          {status === 'running' && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              Ejecutando
            </span>
          )}
        </div>
        <button
          onClick={clearConsole}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-700/50"
          title="Limpiar consola"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 space-y-0.5"
      >
        {consoleMessages.length === 0 ? (
          <div className="text-gray-600 text-xs italic">
            La salida del programa aparecerá acá...
          </div>
        ) : (
          consoleMessages.map((msg, i) => (
            <div
              key={i}
              className={`leading-relaxed ${
                msg.type === 'output'
                  ? 'text-gray-300'
                  : msg.type === 'input'
                  ? 'text-orange-300'
                  : msg.type === 'error'
                  ? 'text-red-400'
                  : 'text-blue-400'
              }`}
            >
              {msg.type === 'input' && (
                <span className="text-orange-500/60 mr-1">›</span>
              )}
              {msg.type === 'error' && (
                <span className="mr-1">❌</span>
              )}
              {msg.content}
            </div>
          ))
        )}

        {waitingForInput && (
          <div className="text-orange-400 animate-pulse flex items-center gap-1">
            <span className="text-orange-500/60">›</span>
            Esperando entrada...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center border-t border-gray-700/50 bg-[#1A1A1A]">
        <span className="text-orange-500/60 pl-3 font-bold">›</span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitInput();
          }}
          placeholder={waitingForInput ? 'Ingresá un valor...' : 'Consola'}
          disabled={!waitingForInput && status !== 'idle'}
          className="flex-1 bg-transparent px-2 py-2.5 text-gray-200 placeholder-gray-600 outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSubmitInput}
          disabled={!waitingForInput}
          className="px-3 py-2.5 text-orange-400 hover:text-orange-300 disabled:text-gray-600 transition-colors"
          title="Enviar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
