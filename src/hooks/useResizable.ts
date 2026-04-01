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
    onTouchStart: (e: React.TouchEvent) => void;
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

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // No llamar a e.preventDefault() aquí porque rompería el scroll si el touch no es para drag,
      // pero el handle es pequeño así que está bien.
      e.stopPropagation();

      const touch = e.touches[0];
      setIsDragging(true);
      startPosRef.current = direction === 'horizontal' ? touch.clientX : touch.clientY;
      startSizeRef.current = isOpen ? size : 0;

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

    const handleMove = (currentPos: number) => {
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

    const onMouseMove = (e: MouseEvent) => handleMove(direction === 'horizontal' ? e.clientX : e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      // Prevenir scroll mientras se arrastra el handle
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      handleMove(direction === 'horizontal' ? touch.clientX : touch.clientY);
    };

    const stopDragging = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', stopDragging);
    document.addEventListener('touchcancel', stopDragging);

    // Cambiar cursor global durante arrastre
    document.body.style.cursor =
      direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', stopDragging);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', stopDragging);
      document.removeEventListener('touchcancel', stopDragging);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, direction, reverse, minSize, maxSize, collapseThreshold, onToggle]);

  const handleProps = {
    onMouseDown: handleMouseDown,
    onTouchStart: handleTouchStart,
    onDoubleClick: toggle,
    style: {
      cursor: direction === 'horizontal' ? 'col-resize' : 'row-resize',
      touchAction: 'none', // Importante para touch
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
