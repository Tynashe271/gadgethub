// app/components/Toast.tsx
'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, onClose, duration = 2600 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  return (
    <div className="toast" role="alert" aria-live="polite">
      {message}
      <button onClick={onClose} aria-label="Close notification" className="toast-close">
        ×
      </button>
    </div>
  );
}
