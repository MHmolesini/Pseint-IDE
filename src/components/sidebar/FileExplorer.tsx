'use client';

// ============================================================
// FileExplorer.tsx — Explorador de archivos .psc
// ============================================================

import { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';

export default function FileExplorer() {
  const files = useEditorStore((s) => s.files);
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const openFile = useEditorStore((s) => s.openFile);
  const createFile = useEditorStore((s) => s.createFile);
  const deleteFile = useEditorStore((s) => s.deleteFile);
  const renameFile = useEditorStore((s) => s.renameFile);

  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleCreate = () => {
    if (newFileName.trim()) {
      createFile(newFileName.trim());
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const handleRename = (id: string) => {
    if (renameValue.trim()) {
      renameFile(id, renameValue.trim());
      setRenamingId(null);
      setRenameValue('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1E1E1E] text-gray-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Explorador
        </span>
        <button
          onClick={() => setIsCreating(true)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700/50 text-gray-400 hover:text-orange-400 transition-colors"
          title="Nuevo archivo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((file) => (
          <div
            key={file.id}
            className={`group flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${
              file.id === activeFileId
                ? 'bg-orange-500/10 text-orange-300 border-l-2 border-orange-500'
                : 'hover:bg-gray-700/30 border-l-2 border-transparent'
            }`}
            onClick={() => openFile(file.id)}
            onDoubleClick={() => {
              setRenamingId(file.id);
              setRenameValue(file.name.replace('.psc', ''));
            }}
          >
            <svg className="w-4 h-4 flex-shrink-0 text-orange-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>

            {renamingId === file.id ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRename(file.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(file.id);
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                className="flex-1 bg-gray-800 border border-orange-500/50 rounded px-1 py-0.5 text-sm outline-none text-gray-200"
                autoFocus
              />
            ) : (
              <>
                <span className="flex-1 text-sm truncate">
                  {file.name}
                </span>
                {file.isModified && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" title="Modificado" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`¿Eliminar "${file.name}"?`)) deleteFile(file.id);
                  }}
                  className="hidden group-hover:flex w-5 h-5 items-center justify-center rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                  title="Eliminar"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}

        {/* Crear nuevo archivo */}
        {isCreating && (
          <div className="px-4 py-1.5 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-orange-400/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => {
                if (newFileName.trim()) handleCreate();
                else setIsCreating(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
              placeholder="nombre.psc"
              className="flex-1 bg-gray-800 border border-orange-500/50 rounded px-2 py-0.5 text-sm outline-none text-gray-200 placeholder-gray-500"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 border-t border-gray-700/50 text-xs text-gray-500">
        {files.length} archivo{files.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
