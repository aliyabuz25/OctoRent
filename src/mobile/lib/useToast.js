import { useCallback, useState } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ isOpen: false, message: '', color: undefined });

  const show = useCallback((message, color) => {
    setToast({ isOpen: true, message: String(message || 'Əməliyyat tamamlandı'), color });
  }, []);

  const showError = useCallback((e) => {
    setToast({ isOpen: true, message: e?.message || 'Xəta baş verdi', color: 'danger' });
  }, []);

  const close = useCallback(() => setToast((t) => ({ ...t, isOpen: false })), []);

  return { toast, show, showError, close };
}
