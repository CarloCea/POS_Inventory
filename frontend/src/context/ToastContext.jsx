import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    if (!message) return;
    const id = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message: String(message), type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    return id;
  }, [removeToast]);

  const toastMethods = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  // Listen for custom global toast events
  useEffect(() => {
    const handleCustomToast = (e) => {
      if (e.detail && e.detail.message) {
        addToast(e.detail.message, e.detail.type || 'info', e.detail.duration);
      }
    };
    window.addEventListener('app-toast', handleCustomToast);
    return () => window.removeEventListener('app-toast', handleCustomToast);
  }, [addToast]);

  // Intercept window.alert to automatically convert any alert to a modern toast
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      if (!msg) return;
      const str = String(msg);
      const lower = str.toLowerCase();
      let type = 'info';
      if (lower.includes('fail') || lower.includes('error') || lower.includes('cannot') || lower.includes('denied')) {
        type = 'error';
      } else if (lower.includes('success') || lower.includes('saved') || lower.includes('updated')) {
        type = 'success';
      } else if (lower.includes('please') || lower.includes('check') || lower.includes('warning') || lower.includes('alert')) {
        type = 'warning';
      }
      addToast(str, type);
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      {/* Toast Notification Container */}
      <div 
        aria-live="polite" 
        className="fixed top-4 inset-x-3 sm:inset-x-auto sm:right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none items-center sm:items-end"
      >
        {toasts.map((t) => {
          let badgeStyles = 'bg-white text-gray-900 border-gray-200 shadow-md';
          let icon = <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />;

          if (t.type === 'success') {
            badgeStyles = 'bg-white text-emerald-950 border-emerald-300 shadow-emerald-500/10 shadow-lg';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />;
          } else if (t.type === 'error') {
            badgeStyles = 'bg-white text-red-950 border-red-300 shadow-red-500/10 shadow-lg';
            icon = <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />;
          } else if (t.type === 'warning') {
            badgeStyles = 'bg-white text-amber-950 border-amber-300 shadow-amber-500/10 shadow-lg';
            icon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />;
          } else if (t.type === 'info') {
            badgeStyles = 'bg-white text-blue-950 border-blue-300 shadow-blue-500/10 shadow-lg';
            icon = <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border transition-all duration-300 animate-toast w-full max-w-sm ${badgeStyles}`}
              role="alert"
            >
              {icon}
              <div className="flex-1 text-sm font-semibold leading-snug break-words">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg -mr-1.5 -mt-1.5 shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return toast;
  }
  return context;
};

// Standalone toast helper that works from any file or component without hook invocation
export const toast = {
  success: (msg, dur) => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: msg, type: 'success', duration: dur } })),
  error: (msg, dur) => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: msg, type: 'error', duration: dur } })),
  warning: (msg, dur) => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: msg, type: 'warning', duration: dur } })),
  info: (msg, dur) => window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: msg, type: 'info', duration: dur } })),
};
