import React, { useState, useEffect } from 'react';
import CheckIcon from './icons/CheckIcon';

interface ToastProps {
  toast: { message: string, id: number, type?: 'default' | 'automationSuccess' } | null;
  onDismiss: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isDefaultVisible, setIsDefaultVisible] = useState(false);
  const [automationStage, setAutomationStage] = useState<'initial' | 'transformed' | 'hiding'>('initial');

  useEffect(() => {
    if (!toast) {
      return;
    }

    if (toast.type === 'automationSuccess') {
      setIsDefaultVisible(false); // Ensure default isn't showing
      setAutomationStage('initial');
      const transformTimer = setTimeout(() => setAutomationStage('transformed'), 1000);
      const hideTimer = setTimeout(() => {
        setAutomationStage('hiding');
        setTimeout(onDismiss, 300); // Wait for animation
      }, 2800); // 1s (initial) + 1.8s (transformed)

      return () => {
        clearTimeout(transformTimer);
        clearTimeout(hideTimer);
      };
    } else {
      // Default toast logic
      setIsDefaultVisible(true);
      const timer = setTimeout(() => {
        setIsDefaultVisible(false);
        setTimeout(onDismiss, 300);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

  if (toast.type === 'automationSuccess') {
    const isInitial = automationStage === 'initial';
    const isTransformed = automationStage === 'transformed';
    const isHiding = automationStage === 'hiding';

    return (
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full shadow-lg transition-all duration-300 ease-out z-[100] overflow-hidden ${
          isHiding ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }`}
      >
        <div
          className={`flex items-center justify-center transition-all duration-500 ease-in-out ${
            isInitial ? 'w-12 h-12 bg-green-500' : 'w-48 h-12 bg-gray-700'
          }`}
        >
          {isInitial ? (
            <CheckIcon className="w-6 h-6 text-white" />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">{toast.message}</span>
              {isTransformed && <div className="automation-toast-shine"></div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback for default toast
  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800/90 text-white px-4 py-2 rounded-full shadow-lg transition-all duration-300 ease-out z-[100] ${
        isDefaultVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {toast.message}
    </div>
  );
};

export default Toast;