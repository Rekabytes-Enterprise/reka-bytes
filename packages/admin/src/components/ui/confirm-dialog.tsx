'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Generic, accessible confirmation dialog.
 * Mirrors the pattern from applications/[id]/page.tsx but is reusable.
 * - Backdrop click + Escape key both call onClose (guarded by !busy).
 * - Confirm button is auto-focused on open.
 * - AnimatePresence handles exit animation (component must render before it can animate out).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, busy, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby={description ? 'confirm-dialog-description' : undefined}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default bg-canvas/70"
            onClick={() => !busy && onClose()}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-md border border-line bg-elevated p-8"
            data-testid="confirm-dialog"
          >
            <div className="flex items-start gap-3">
              {tone === 'danger' && (
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger" aria-hidden />
              )}
              <div className="flex-1">
                <h2 id="confirm-dialog-title" className="font-display text-2xl font-semibold">
                  {title}
                </h2>
                {description && (
                  <p id="confirm-dialog-description" className="mt-2 font-body text-sm text-muted">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={onClose}
                data-testid="confirm-dialog-cancel"
              >
                {cancelLabel}
              </Button>
              <Button
                variant={tone === 'danger' ? 'danger' : 'primary'}
                disabled={busy}
                onClick={onConfirm}
                autoFocus
                data-testid="confirm-dialog-confirm"
              >
                {busy ? 'Working…' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
