/**
 * Type scale tokens — Tailwind utility strings consumed via useTypography().
 * Fonts (--font-display, --font-body, --font-mono) are wired in each app's globals.css @theme.
 *
 * NOTE: `leading-*` must come AFTER `text-*` in each string — tailwind-merge
 * drops a leading class when a text-[arbitrary] follows it.
 */
export const typeStyles = {
  displayXL:
    'font-display font-semibold tracking-[-0.03em] text-[clamp(3rem,8vw,6.5rem)] leading-[0.95]',
  displayL:
    'font-display font-semibold tracking-[-0.02em] text-[clamp(2.25rem,5vw,4rem)] leading-[1.02]',
  displayM:
    'font-display font-medium tracking-[-0.01em] text-[clamp(1.75rem,3.5vw,2.75rem)] leading-[1.08]',
  headingS: 'font-body font-semibold tracking-[-0.01em] text-xl leading-snug',
  body: 'font-body font-normal text-base leading-relaxed',
  bodySm: 'font-body font-normal text-sm leading-relaxed',
  label: 'font-mono font-bold uppercase tracking-[0.12em] text-xs leading-normal',
  mono: 'font-mono font-normal text-sm leading-relaxed',
} as const;

export type TypeToken = keyof typeof typeStyles;
