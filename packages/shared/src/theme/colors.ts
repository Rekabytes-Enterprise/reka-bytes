/**
 * Reka Bytes color tokens — HEX only. See docs/development/DESIGN.md.
 * Dark-first; light mode arrives in Phase 4.
 */
export const colors = {
  // Core surfaces (dark)
  bgPrimary: '#0A0B0D',
  bgElevated: '#111318',
  bgInset: '#16191F',

  // Text
  textPrimary: '#F2F4F1',
  textSecondary: '#9BA3AB',
  textFaint: '#4A5158',

  // Accent — acid lime
  accent: '#C6FF4A',
  accentHover: '#D8FF7A',
  accentDim: '#84A82F',
  accentInk: '#0A0B0D',

  // Semantic
  success: '#4ADE80',
  warning: '#FACC15',
  danger: '#F45B69',
  info: '#6EC1FF',

  // Lines & structure
  border: '#23262D',
  borderStrong: '#363B44',
} as const;

export type ColorToken = keyof typeof colors;
