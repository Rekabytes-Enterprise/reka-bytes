'use client';

import { atom, useAtomValue, useSetAtom } from 'jotai';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useCallback } from 'react';
import { formatApiError } from '@reka-bytes/shared';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

const toastsAtom = atom<Toast[]>([]);
let nextId = 1;

export function useToasts() {
  return useAtomValue(toastsAtom);
}

export function usePushToast() {
  const setToasts = useSetAtom(toastsAtom);
  return useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { ...toast, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [setToasts],
  );
}

/** Convenience: push an error toast from any caught error. Uses formatApiError so
 * ApiClientError / AppError surfaces code, status and first field detail in the toast. */
export function useToastError() {
  const push = usePushToast();
  return useCallback(
    (error: unknown, fallback = 'Something went wrong') => {
      const { title, description } = formatApiError(error, fallback);
      push({ variant: 'error', title, description });
    },
    [push],
  );
}

const icons: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const stripeColor: Record<ToastVariant, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-info',
};

export function Toaster() {
  const toasts = useToasts();

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = icons[toast.variant];
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`pointer-events-auto flex overflow-hidden border border-line bg-elevated ${'shadow-lg shadow-black/40'}`}
            >
              <span className={`w-0.5 shrink-0 ${stripeColor[toast.variant]}`} />
              <div className="flex items-start gap-3 p-4">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                <div>
                  <p className="font-body text-sm font-medium text-ink">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 font-body text-xs text-muted">{toast.description}</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
