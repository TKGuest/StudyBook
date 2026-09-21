import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, UserX, ShieldAlert, X, Loader2, CheckCircle2, Info } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export const ConfirmModal: React.FC = () => {
  const { confirmModal, closeConfirmModal } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmModal && !isProcessing) {
        if (confirmModal.onCancel) confirmModal.onCancel();
        closeConfirmModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModal, isProcessing, closeConfirmModal]);

  if (!confirmModal) return null;

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      playSound('pop');
      if (confirmModal.onConfirm) {
        await confirmModal.onConfirm();
      }
    } catch (err) {
      console.error('Error executing action:', err);
    } finally {
      setIsProcessing(false);
      closeConfirmModal();
    }
  };

  const handleCancel = () => {
    if (isProcessing) return;
    if (confirmModal.onCancel) confirmModal.onCancel();
    closeConfirmModal();
  };

  const getIcon = () => {
    switch (confirmModal.icon) {
      case 'trash':
        return <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />;
      case 'userX':
        return <UserX className="w-6 h-6 text-rose-600 dark:text-rose-400" />;
      case 'shield':
        return <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
      case 'check':
        return <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      case 'alert':
      default:
        if (confirmModal.variant === 'danger') {
          return <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />;
        }
        return <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
    }
  };

  const getIconBg = () => {
    if (confirmModal.variant === 'danger') {
      return 'bg-rose-100 dark:bg-rose-950/60 text-rose-600';
    }
    if (confirmModal.variant === 'warning') {
      return 'bg-amber-100 dark:bg-amber-950/60 text-amber-600';
    }
    if (confirmModal.variant === 'primary') {
      return 'bg-blue-100 dark:bg-blue-950/60 text-blue-600';
    }
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
  };

  const getConfirmBtnClasses = () => {
    if (confirmModal.variant === 'danger') {
      return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20';
    }
    if (confirmModal.variant === 'warning') {
      return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20';
    }
    return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20';
  };

  const hasCancelBtn = confirmModal.cancelText !== null;

  return (
    <AnimatePresence>
      <div 
        id="confirm-modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isProcessing) handleCancel();
        }}
        className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-2xl relative"
        >
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${getIconBg()}`}>
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                {confirmModal.title}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            {hasCancelBtn && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isProcessing}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isProcessing}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl shadow-md transition-colors cursor-pointer inline-flex items-center gap-2 ${getConfirmBtnClasses()}`}
            >
              {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{confirmModal.confirmText || (hasCancelBtn ? 'Confirm' : 'Got it')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
