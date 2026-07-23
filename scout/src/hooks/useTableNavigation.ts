import { useRef, useCallback } from 'react';

export interface NavigationEvent {
  rowIndex: number;
  columnIndex: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'enter';
}

export function useTableNavigation(totalRows: number, totalColumns: number) {
  const fieldRefs = useRef<Map<string, HTMLElement>>(new Map());

  const getFieldKey = (rowIndex: number, columnIndex: number) => 
    `${rowIndex}-${columnIndex}`;

  const registerField = useCallback((rowIndex: number, columnIndex: number, element: HTMLElement | null) => {
    const key = getFieldKey(rowIndex, columnIndex);
    if (element) {
      fieldRefs.current.set(key, element);
    } else {
      fieldRefs.current.delete(key);
    }
  }, []);

  const focusField = useCallback((rowIndex: number, columnIndex: number) => {
    const key = getFieldKey(rowIndex, columnIndex);
    const field = fieldRefs.current.get(key);
    if (field) {
      field.focus();
      // For inputs, select all text for easy replacement
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.select();
      }
    }
  }, []);

  const handleNavigation = useCallback((event: NavigationEvent) => {
    const { rowIndex, columnIndex, direction } = event;

    switch (direction) {
      case 'up':
        if (rowIndex > 0) {
          focusField(rowIndex - 1, columnIndex);
        }
        break;
      case 'down':
        if (rowIndex < totalRows - 1) {
          focusField(rowIndex + 1, columnIndex);
        }
        break;
      case 'left':
        if (columnIndex > 1) {
          focusField(rowIndex, columnIndex - 1);
        }
        break;
      case 'right':
        if (columnIndex < totalColumns - 1) {
          focusField(rowIndex, columnIndex + 1);
        }
        break;
    }
  }, [totalRows, totalColumns, focusField]);

  return {
    registerField,
    handleNavigation,
    focusField,
  };
}
