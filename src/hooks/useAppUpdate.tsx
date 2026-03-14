import { useState, useEffect, useCallback } from 'react';

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        }
      });

      // Listen for controller change (another tab triggered update)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    // Vite-based: listen for chunk load failures (stale assets after deploy)
    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes('Failed to fetch dynamically imported module') ||
        event.message?.includes('Loading chunk') ||
        event.message?.includes('Loading CSS chunk')
      ) {
        setUpdateAvailable(true);
      }
    };
    window.addEventListener('error', handleError);

    // Periodic version check every 5 minutes
    const BUILD_ID = document.querySelector('meta[name="build-id"]')?.getAttribute('content');
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/', { cache: 'no-store', headers: { 'Accept': 'text/html' } });
        const html = await res.text();
        const match = html.match(/name="build-id" content="([^"]+)"/);
        if (match && BUILD_ID && match[1] !== BUILD_ID) {
          setUpdateAvailable(true);
        }
        // Also check if any new script hashes exist
        const currentScripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src'));
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newScripts = Array.from(doc.querySelectorAll('script[src]')).map(s => s.getAttribute('src'));
        if (currentScripts.length > 0 && newScripts.length > 0) {
          const hasNewAssets = newScripts.some(s => !currentScripts.includes(s));
          if (hasNewAssets) {
            setUpdateAvailable(true);
          }
        }
      } catch {
        // ignore fetch errors
      }
    }, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('error', handleError);
      clearInterval(interval);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }
  }, []);

  return { updateAvailable, applyUpdate, setUpdateAvailable };
}
