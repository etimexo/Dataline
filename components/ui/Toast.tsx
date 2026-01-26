
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { XIcon, BoltIcon } from './Icons';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md transform transition-all duration-300 animate-fade-in-up ${
                            toast.type === 'success' ? 'bg-green-900/80 border-green-500/30 text-green-100' :
                            toast.type === 'error' ? 'bg-red-900/80 border-red-500/30 text-red-100' :
                            'bg-gray-800/80 border-gray-600/30 text-gray-100'
                        }`}
                    >
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                             toast.type === 'success' ? 'bg-green-500/20 text-green-400' :
                             toast.type === 'error' ? 'bg-red-500/20 text-red-400' :
                             'bg-indigo-500/20 text-indigo-400'
                        }`}>
                            {toast.type === 'success' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.747a.75.75 0 011.04-.208z" clipRule="evenodd" /></svg>
                            ) : toast.type === 'error' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>
                            ) : (
                                <BoltIcon className="w-5 h-5" />
                            )}
                        </div>
                        <p className="text-sm font-medium flex-1">{toast.message}</p>
                        <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
