/**
 * Type declarations for <model-viewer> (@google/model-viewer), a custom
 * element React does not know about. Attributes are enumerated — unknown
 * props are TS errors. Props not listed here can be added as needed.
 *
 * IMPORTANT (house rule): no `as any` — this declaration is what makes the
 * custom element type-safe. If an attribute is missing from this list, add
 * it here with a real type instead of casting at the call site.
 *
 * React 19 moved the JSX namespace into the react package, so the
 * augmentation targets `react`/JSX, not the deprecated global JSX namespace.
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        /** Required: model URL (self-hosted, under /public). */
        src: string;
        alt?: string;
        /** Camera */
        'camera-controls'?: boolean | string;
        'camera-orbit'?: string;
        'disable-zoom'?: boolean | string;
        'field-of-view'?: string;
        'min-field-of-view'?: string;
        'max-field-of-view'?: string;
        'touch-action'?: 'pan-y' | 'pan-x' | 'none';
        /** Motion */
        'auto-rotate'?: boolean | string;
        'rotation-per-second'?: string;
        'interaction-prompt'?: 'auto' | 'none' | 'when-focused' | string;
        'interaction-prompt-threshold'?: number | string;
        /** Presentation */
        'shadow-intensity'?: number | string;
        'shadow-softness'?: number | string;
        'environment-image'?: string;
        exposure?: number | string;
        loading?: 'auto' | 'lazy' | 'eager';
        poster?: string;
        reveal?: 'auto' | 'interaction' | 'manual';
      };
    }
  }
}
