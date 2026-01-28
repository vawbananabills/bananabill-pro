import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

// Event for opening payment dialog
export const OPEN_PAYMENT_DIALOG_EVENT = 'open-payment-dialog';

export function GlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

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

    // Alt + P: Open Add Payment form
    if (e.altKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      // If not on payments page, navigate there first
      if (location.pathname !== '/payments') {
        navigate('/payments');
      }
      // Dispatch event to open payment dialog
      window.dispatchEvent(new CustomEvent(OPEN_PAYMENT_DIALOG_EVENT));
      return;
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null;
}

// Global shortcuts info for display
export const GLOBAL_SHORTCUTS = [
  { keys: 'Alt + N', description: 'New Invoice' },
  { keys: 'Alt + P', description: 'Add Payment' },
  { keys: 'Alt + D', description: 'Dashboard' },
  { keys: 'Alt + I', description: 'Invoices' },
  { keys: 'Alt + C', description: 'Customers' },
  { keys: 'Alt + V', description: 'Vendors' },
  { keys: 'Alt + R', description: 'Reports' },
  { keys: 'Ctrl + K', description: 'Search' },
];
