import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, Info, HelpCircle, X } from 'lucide-react';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState(null);
  const resolverRef = useRef(null);

  const closeModal = useCallback((result) => {
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setModalState(null);
  }, []);

  const openModal = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        title: options.title || (options.isConfirm ? 'Confirm Action' : 'Notice'),
        message: options.message || '',
        confirmText: options.confirmText || 'YES',
        cancelText: options.cancelText || 'NO',
        buttonText: options.buttonText || 'OK',
        type: options.type || (options.isConfirm ? 'danger' : 'info'),
        isConfirm: !!options.isConfirm,
      });
    });
  }, []);

  const modalMethods = {
    confirm: (options) => {
      const opts = typeof options === 'string' ? { message: options } : (options || {});
      return openModal({
        ...opts,
        isConfirm: true,
        confirmText: opts.confirmText || 'YES',
        cancelText: opts.cancelText || 'NO',
        type: opts.type || 'danger',
      });
    },
    alert: (options) => {
      const opts = typeof options === 'string' ? { message: options } : (options || {});
      return openModal({
        ...opts,
        isConfirm: false,
        buttonText: opts.buttonText || 'OK',
        type: opts.type || 'info',
      });
    },
    success: (message, title = 'Success') => {
      return openModal({
        title,
        message,
        type: 'success',
        isConfirm: false,
        buttonText: 'OK',
      });
    },
    error: (message, title = 'Error') => {
      return openModal({
        title,
        message,
        type: 'error',
        isConfirm: false,
        buttonText: 'OK',
      });
    },
    warning: (message, title = 'Warning') => {
      return openModal({
        title,
        message,
        type: 'warning',
        isConfirm: false,
        buttonText: 'OK',
      });
    },
    info: (message, title = 'Information') => {
      return openModal({
        title,
        message,
        type: 'info',
        isConfirm: false,
        buttonText: 'OK',
      });
    },
  };

  // Listen for custom global modal events from standalone helper
  useEffect(() => {
    const handleCustomModal = (e) => {
      if (e.detail && e.detail.options && e.detail.resolve) {
        resolverRef.current = e.detail.resolve;
        setModalState({
          title: e.detail.options.title || (e.detail.options.isConfirm ? 'Confirm Action' : 'Notice'),
          message: e.detail.options.message || '',
          confirmText: e.detail.options.confirmText || 'YES',
          cancelText: e.detail.options.cancelText || 'NO',
          buttonText: e.detail.options.buttonText || 'OK',
          type: e.detail.options.type || (e.detail.options.isConfirm ? 'danger' : 'info'),
          isConfirm: !!e.detail.options.isConfirm,
        });
      }
    };

    window.addEventListener('app-modal', handleCustomModal);
    return () => window.removeEventListener('app-modal', handleCustomModal);
  }, []);

  // Icon and theme config based on type
  const getTypeConfig = (type) => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-red-600" />,
          bgBadge: 'bg-red-100 text-red-600',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-600" />,
          bgBadge: 'bg-emerald-100 text-emerald-600',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-8 h-8 text-amber-600" />,
          bgBadge: 'bg-amber-100 text-amber-600',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500',
        };
      case 'info':
      default:
        return {
          icon: <HelpCircle className="w-8 h-8 text-blue-600" />,
          bgBadge: 'bg-blue-100 text-blue-600',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
        };
    }
  };

  const typeConfig = modalState ? getTypeConfig(modalState.type) : null;

  return (
    <ModalContext.Provider value={modalMethods}>
      {children}

      {/* Global Unified Modal UI */}
      {modalState && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm sm:max-w-md w-full p-6 text-center border border-gray-100 flex flex-col items-center relative animate-in zoom-in-95 duration-150">
            
            {/* Close X Button */}
            <button
              onClick={() => closeModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Type Icon Badge */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xs ${typeConfig.bgBadge}`}>
              {typeConfig.icon}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
              {modalState.title}
            </h3>

            {/* Message Body */}
            <p className="text-sm text-gray-600 mb-6 leading-relaxed px-2">
              {modalState.message}
            </p>

            {/* Action Buttons */}
            {modalState.isConfirm ? (
              <div className="flex space-x-3 w-full">
                <button
                  type="button"
                  onClick={() => closeModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  {modalState.cancelText}
                </button>
                <button
                  type="button"
                  onClick={() => closeModal(true)}
                  className={`flex-1 py-3 px-4 font-bold rounded-xl transition-all text-sm shadow-sm focus:outline-none focus:ring-2 ${typeConfig.confirmBtn}`}
                  autoFocus
                >
                  {modalState.confirmText}
                </button>
              </div>
            ) : (
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => closeModal(true)}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                >
                  {modalState.buttonText}
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    return modal;
  }
  return context;
};

// Standalone modal helper function accessible anywhere in the codebase without React hooks
const dispatchModal = (options) => {
  return new Promise((resolve) => {
    window.dispatchEvent(
      new CustomEvent('app-modal', {
        detail: {
          options,
          resolve,
        },
      })
    );
  });
};

export const modal = {
  confirm: (options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    return dispatchModal({
      ...opts,
      isConfirm: true,
      confirmText: opts.confirmText || 'YES',
      cancelText: opts.cancelText || 'NO',
      type: opts.type || 'danger',
    });
  },
  alert: (options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {});
    return dispatchModal({
      ...opts,
      isConfirm: false,
      buttonText: opts.buttonText || 'OK',
      type: opts.type || 'info',
    });
  },
  success: (message, title = 'Success') => {
    return dispatchModal({
      title,
      message,
      type: 'success',
      isConfirm: false,
      buttonText: 'OK',
    });
  },
  error: (message, title = 'Error') => {
    return dispatchModal({
      title,
      message,
      type: 'error',
      isConfirm: false,
      buttonText: 'OK',
    });
  },
  warning: (message, title = 'Warning') => {
    return dispatchModal({
      title,
      message,
      type: 'warning',
      isConfirm: false,
      buttonText: 'OK',
    });
  },
  info: (message, title = 'Information') => {
    return dispatchModal({
      title,
      message,
      type: 'info',
      isConfirm: false,
      buttonText: 'OK',
    });
  },
};
