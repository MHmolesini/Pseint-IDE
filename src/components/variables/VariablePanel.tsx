'use client';

// ============================================================
// VariablePanel.tsx — Tabla de variables en tiempo real
// ============================================================

import { useInterpreterStore } from '@/store/interpreterStore';

export default function VariablePanel() {
  const variables = useInterpreterStore((s) => s.variables);
  const status = useInterpreterStore((s) => s.status);

  return (
    <div className="h-full flex flex-col bg-[#1E1E1E] text-gray-300">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/50">
        <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Variables
        </span>
        {status !== 'idle' && (
          <span className="ml-auto px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-xs">
            {variables.length}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {variables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs p-4 text-center">
            <svg className="w-8 h-8 mb-2 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <p>Las variables aparecerán</p>
            <p>cuando ejecutes tu programa</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#1E1E1E]">
              <tr className="text-gray-500 text-left border-b border-gray-700/50">
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {variables.map((v, i) => (
                <tr
                  key={v.name}
                  className={`border-b border-gray-800/50 transition-colors hover:bg-gray-700/20 ${
                    i % 2 === 0 ? '' : 'bg-gray-800/10'
                  }`}
                >
                  <td className="px-3 py-1.5 text-orange-300 font-medium">
                    {v.name}
                  </td>
                  <td className="px-3 py-1.5 text-gray-500 italic">
                    {v.type}
                  </td>
                  <td className="px-3 py-1.5 text-green-300 font-mono">
                    {v.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
