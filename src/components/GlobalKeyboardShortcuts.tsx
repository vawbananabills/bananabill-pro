import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function GlobalKeyboardShortcuts() {
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input or textarea
    const target = e.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
      // Allow Ctrl+K for command palette even in inputs
      if (!(e.key === 'k' && (e.ctrlKey || e.metaKey))) {
        return;
      }
    }

    // Alt + N: New Invoice
    if (e.altKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      navigate('/invoice/new');
      toast.success('New Invoice (Alt+N)');
      return;
    }

    // Ctrl/Cmd + K: Go to search/command (future enhancement)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      // Focus search input in header if available
      const searchInput = document.querySelector('header input[placeholder*="Search"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        toast.info('Search activated (Ctrl+K)');
      }
      return;
    }

    // Alt + D: Dashboard
    if (e.altKey && e.key.toLowerCase() === 'd' && !e.shiftKey) {
      e.preventDefault();
      navigate('/dashboard');
      return;
    }

    // Alt + I: Invoices list
    if (e.altKey && e.key.toLowerCase() === 'i' && !e.shiftKey) {
      e.preventDefault();
      navigate('/invoices');
      return;
    }

    // Alt + C: Customers
    if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      navigate('/customers');
      return;
    }

    // Alt + V: Vendors
    if (e.altKey && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      navigate('/vendors');
      return;
    }

    // Alt + R: Reports
    if (e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      navigate('/reports');
      return;
    }

    // Alt + P: Products
    if (e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      navigate('/products');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
}

// Global shortcuts info for display
export const GLOBAL_SHORTCUTS = [
  { keys: 'Alt + N', description: 'New Invoice' },
  { keys: 'Alt + D', description: 'Go to Dashboard' },
  { keys: 'Alt + I', description: 'Go to Invoices' },
  { keys: 'Alt + C', description: 'Go to Customers' },
  { keys: 'Alt + V', description: 'Go to Vendors' },
  { keys: 'Alt + P', description: 'Go to Products' },
  { keys: 'Alt + R', description: 'Go to Reports' },
  { keys: 'Ctrl + K', description: 'Focus Search' },
];
