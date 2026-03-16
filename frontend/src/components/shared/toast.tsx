'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastInput {
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

function getToastStyles(type: ToastType): string {
  switch (type) {
    case 'success':
      return 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/60 dark:text-green-300';
    case 'error':
      return 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300';
    case 'info':
      return 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300';
  }
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = requestAnimationFrame(() => setVisible(true));
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, 3000);

    return () => {
      cancelAnimationFrame(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`transform rounded-lg border px-4 py-3 text-sm shadow-lg transition-all duration-200 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
      } ${getToastStyles(toast.type)}`}
    >
      {toast.message}
    </div>
  );
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((input: ToastInput) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...input, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
