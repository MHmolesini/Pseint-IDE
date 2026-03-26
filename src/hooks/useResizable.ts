'use client';

// ============================================================
// useResizable.ts — Hook para paneles redimensionables
// ============================================================
// Permite arrastrar bordes para cambiar tamaño de paneles.
// Si se arrastra por debajo del mínimo, el panel se cierra.
// Similar al comportamiento de VS Code / Antigravity.
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';

export type ResizeDirection = 'horizontal' | 'vertical';

interface UseResizableOptions {
  /** Dirección del resize */
  direction: ResizeDirection;
  /** Tamaño inicial en px */
  initialSize: number;
  /** Tamaño mínimo antes de colapsar (px) */
  minSize: number;
  /** Tamaño máximo (px) */
  maxSize: number;
  /** Umbral para auto-cerrar: si se achica más que esto, se cierra */
  collapseThreshold: number;
  /** Si empieza abierto o cerrado */
  defaultOpen?: boolean;
  /** Si el resize es invertido (crece hacia la izquierda o hacia arriba) */
  reverse?: boolean;
  /** Callback cuando se abre/cierra */
  onToggle?: (isOpen: boolean) => void;
}

interface UseResizableReturn {
  /** Tamaño actual en px */
  size: number;
  /** Si el panel está abierto */
  isOpen: boolean;
  /** Si está siendo arrastrado actualmente */
  isDragging: boolean;
  /** Props para el handle de arrastre */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
    style: React.CSSProperties;
    className: string;
  };
  /** Abrir el panel */
  open: () => void;
  /** Cerrar el panel */
  close: () => void;
  /** Toggle abrir/cerrar */
  toggle: () => void;
  /** Setear tamaño manual */
  setSize: (size: number) => void;
}

export function useResizable(options: UseResizableOptions): UseResizableReturn {
  const {
    direction,
    initialSize,
    minSize,
    maxSize,
    collapseThreshold,
    defaultOpen = true,
    reverse = false,
    onToggle,
  } = options;

  const [size, setSizeState] = useState(initialSize);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isDragging, setIsDragging] = useState(false);

  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);
  const sizeBeforeCollapseRef = useRef(initialSize);

  const setSize = useCallback(
    (newSize: number) => {
      const clamped = Math.max(minSize, Math.min(maxSize, newSize));
      setSizeState(clamped);
    },
    [minSize, maxSize],
  );

  const open = useCallback(() => {
    setIsOpen(true);
    setSizeState(sizeBeforeCollapseRef.current || initialSize);
    onToggle?.(true);
  }, [initialSize, onToggle]);

  const close = useCallback(() => {
    sizeBeforeCollapseRef.current = size;
    setIsOpen(false);
    onToggle?.(false);
  }, [size, onToggle]);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, close, open]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
      startSizeRef.current = isOpen ? size : 0;

      // Si estaba cerrado, abrir con tamaño 0 para empezar a expandir
      if (!isOpen) {
        setIsOpen(true);
        setSizeState(minSize);
        startSizeRef.current = 0;
      }
    },
    [direction, size, isOpen, minSize],
  );

  // Global event listeners para drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = reverse
        ? startPosRef.current - currentPos
        : currentPos - startPosRef.current;

      const newSize = startSizeRef.current + delta;

      if (newSize < collapseThreshold) {
        // Achicar por debajo del umbral → cerrar
        setIsOpen(false);
        onToggle?.(false);
      } else {
        setIsOpen(true);
        const clamped = Math.max(minSize, Math.min(maxSize, newSize));
        setSizeState(clamped);
        sizeBeforeCollapseRef.current = clamped;
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cambiar cursor global durante arrastre
    document.body.style.cursor =
      direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, direction, reverse, minSize, maxSize, collapseThreshold, onToggle]);

  const handleProps = {
    onMouseDown: handleMouseDown,
    onDoubleClick: toggle,
    style: {
      cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
    } as React.CSSProperties,
    className: `resize-handle resize-handle-${direction} ${isDragging ? 'resize-handle-active' : ''}`,
  };

  return {
    size: isOpen ? size : 0,
    isOpen,
    isDragging,
    handleProps,
    open,
    close,
    toggle,
    setSize,
  };
}
