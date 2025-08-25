import React, { useState, useEffect } from 'react';

interface ToastProps {
  toast: { message: string, id: number } | null;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Wait for animation to finish before dismissing
        setTimeout(onDismiss, 300);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800/90 text-white px-4 py-2 rounded-full shadow-lg transition-all duration-300 ease-out z-50 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {toast.message}
    </div>
  );
};

export default Toast;
