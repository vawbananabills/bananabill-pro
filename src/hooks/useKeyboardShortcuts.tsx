import { useEffect, useCallback, useRef } from 'react';

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const isMatch = 
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (!shortcut.ctrlKey || e.ctrlKey) &&
          (!shortcut.metaKey || e.metaKey) &&
          (!shortcut.shiftKey || e.shiftKey) &&
          (!shortcut.altKey || e.altKey);
        
        if (isMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Hook to handle Enter as Tab navigation
export function useEnterAsTab(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      
      // Don't interfere with buttons, textareas, or elements with role="button"
      if (
        tagName === 'button' || 
        tagName === 'textarea' ||
        target.getAttribute('role') === 'button' ||
        target.getAttribute('role') === 'option' ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="combobox"]')
      ) {
        return;
      }

      // Only handle Enter on input fields
      if (tagName !== 'input') return;
      
      e.preventDefault();
      
      // Find all focusable elements
      const focusableSelectors = [
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'button:not([disabled])',
        '[tabindex]:not([tabindex="-1"]):not([disabled])',
        '[role="combobox"]:not([disabled])',
      ].join(', ');
      
      const focusableElements = Array.from(
        container.querySelectorAll(focusableSelectors)
      ) as HTMLElement[];
      
      const currentIndex = focusableElements.indexOf(target);
      
      if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
        const nextElement = focusableElements[currentIndex + 1];
        nextElement.focus();
        
        // If it's an input, select all text
        if (nextElement.tagName.toLowerCase() === 'input') {
          (nextElement as HTMLInputElement).select();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);
}

// Global keyboard shortcuts info component
export interface ShortcutInfo {
  keys: string;
  description: string;
}

export const INVOICE_SHORTCUTS: ShortcutInfo[] = [
  { keys: 'Alt + S', description: 'Save Invoice' },
  { keys: 'Alt + N', description: 'New Invoice' },
  { keys: 'Alt + P', description: 'Print Invoice' },
  { keys: 'Alt + D', description: 'Download PDF' },
  { keys: 'Alt + I', description: 'Add Regular Item' },
  { keys: 'Alt + L', description: 'Add Loose Item' },
  { keys: 'Enter', description: 'Move to next field' },
];
