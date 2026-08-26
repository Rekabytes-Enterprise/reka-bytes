'use client';

import { atom } from 'jotai';
import type { SessionUser } from '@reka-bytes/shared';

/** Client-side session mirror of the httpOnly cookie session. */
export const sessionAtom = atom<SessionUser | null>(null);
