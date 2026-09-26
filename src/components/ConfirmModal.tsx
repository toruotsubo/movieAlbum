'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from './AppProvider';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'OK',
  cancelText,
  showCancel = true,
  variant = 'danger',
  onConfirm,
  onClose,
}) => {
  const { t } = useApp();
  const effectiveCancelText = cancelText || t('cancel');
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          icon: <AlertTriangle className="w-6 h-6 text-rose-400" />,
          buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20',
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          icon: <AlertCircle className="w-6 h-6 text-amber-400" />,
          buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20',
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          icon: <Info className="w-6 h-6 text-blue-400" />,
          buttonBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="glass-card w-full max-w-md rounded-2xl border border-slate-700/60 shadow-2xl p-6 space-y-5 text-slate-100 relative select-none">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={clsx('p-3 rounded-xl border shrink-0', styles.iconBg)}>
            {styles.icon}
          </div>
          <div className="space-y-1.5 pt-1">
            <h3 className="text-lg font-bold text-white leading-snug">{title}</h3>
            {description && <p className="text-sm text-slate-300 leading-relaxed">{description}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              {effectiveCancelText}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className={clsx(
              'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg',
              styles.buttonBg
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
