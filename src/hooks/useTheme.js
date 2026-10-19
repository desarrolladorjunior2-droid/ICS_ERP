import { useEffect, useState } from 'react';

/** Tema claro/oscuro: se guarda en el navegador y lo comparten la portada y el sistema. */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('ics-theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('ics-theme', theme);
    } catch {
      /* noop */
    }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}
