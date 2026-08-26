'use client';

import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TypeToken } from '@reka-bytes/shared';
import { typeStyles } from '@reka-bytes/shared';

/**
 * Typography hook — apply shared type-scale tokens as Tailwind classes.
 *   const { t, ty } = useTypography();
 *   <h1 className={t.displayXL} />
 *   <p className={ty('body', 'text-muted')} />
 */
export function useTypography() {
  const t = typeStyles;
  const ty = useCallback((token: TypeToken, ...extra: (string | false | undefined)[]) => {
    return cn(typeStyles[token], ...extra);
  }, []);
  return { t, ty };
}
