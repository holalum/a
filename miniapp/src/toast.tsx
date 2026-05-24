import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Toast } from './components/ui';

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  const notify = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && (
        <Toast key={toast.id} message={toast.message} onDone={() => setToast(null)} />
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}