/**
 * Operator identity for the public legal documents and the landing footer.
 *
 * This module is the single source of truth for env reads. It deliberately
 * holds NO operator data in source — who runs the service, their registration
 * number, their email, and their address are deployment facts, not repository
 * facts. Set the variables below and the legal pages + footer pick them up.
 *
 *   LEG_OPERATOR_NAME            legal name of the data controller
 *                                (defaults to "Reka Bytes" — the brand)
 *   LEG_FOUNDER_NAME             founder's full name (rendered on /about)
 *   LEG_OPERATOR_REGISTRATION    business/company registration number
 *   LEG_OPERATOR_ENTITY_NOTE     optional one-liner on the legal form
 *   LEG_OPERATOR_COUNTRY         where the operator is based (footer only)
 *                                (defaults to "Malaysia")
 *   LEG_CONTACT_EMAIL            ONE inbox for all contact (privacy/support/
 *                                abuse/security/legal)
 *   LEG_POSTAL_ADDRESS           correspondence address (optional)
 *   LEG_HOSTING_REGION           where the hosted database runs
 *   LEG_BACKUP_RETENTION         how long backups are kept
 *
 * Server-only. None of these are `NEXT_PUBLIC_*` because Next inlines a
 * prefixed var into the client bundle and none of them belong there. Every
 * consumer is a server component.
 *
 * Anything unset renders as a highlighted "not configured" chip rather than
 * a blank, so a half-configured install cannot quietly ship someone else's
 * policy.
 *
 * The document TEXT (statutes, liability cap, governing law) lives in the
 * page.tsx files — rewrite it for your own jurisdiction if needed.
 */

const env = (key: string): string | null => process.env[key]?.trim() || null;

/** Date the documents were last revised, and when that revision takes effect. */
export const LEGAL_UPDATED = '27 August 2026';
export const LEGAL_EFFECTIVE = '27 August 2026';

/** The law these documents are drafted under — a property of the text. */
export const GOVERNING_LAW = 'Malaysia';

export const OPERATOR = {
  /**
   * Legal name of the entity operating the Service. Falls back to the brand
   * name so a sole-trader / single-entity setup does not have to set anything.
   */
  name: env('LEG_OPERATOR_NAME') ?? 'Reka Bytes',
  /** SSM / Companies Commission reference, quoted in the notice. */
  registrationNo: env('LEG_OPERATOR_REGISTRATION'),
  /** e.g. "a business registered in Malaysia under the Registration of
   *  Businesses Act 1956, which is not a separate legal person". */
  entityNote: env('LEG_OPERATOR_ENTITY_NOTE'),
  /** Where the operator is based — used in the footer only. */
  country: env('LEG_OPERATOR_COUNTRY') ?? 'Malaysia',
  /** The brand name, used in the footer's brand mark. */
  productName: 'Reka Bytes',
};

/**
 * The person behind the brand. Separate from OPERATOR (the legal entity) — a
 * founder is not a company, and the two are quoted in different places.
 */
export const FOUNDER = {
  name: env('LEG_FOUNDER_NAME'),
};

export const CONTACT = {
  /** One inbox for data-subject requests, support, abuse and security reports. */
  email: env('LEG_CONTACT_EMAIL'),
  /** null is a valid choice, rendered as a stated withholding, not a gap. */
  postalAddress: env('LEG_POSTAL_ADDRESS'),
  /** Region the hosted database runs in — needed for the s.12 transfer note. */
  hostingRegion: env('LEG_HOSTING_REGION'),
  /** Caps how fast deletion is final, and how long logs survive. */
  backupRetention: env('LEG_BACKUP_RETENTION'),
};

/**
 * Public profiles. Server-only like the rest of the company facts, so the URLs
 * live in the environment rather than in source — and unset ones simply do not
 * render instead of showing a dead link.
 */
export const SOCIAL = {
  /** GitHub profile, rendered on /about. */
  github: env('LEG_SOCIAL_GITHUB'),
};

/**
 * There is no published office address unless one is configured, and a home
 * address should not go on a website. This is what we say instead — enough
 * for the PDPA's notice duty (contact *details*, not a street address).
 */
export const ADDRESS_NOT_PUBLISHED =
  'not published — an address for service is supplied on request to a data ' +
  'subject, the Personal Data Protection Commissioner, or a court';

export type LegalSlug = 'terms' | 'privacy' | 'cookies';

export type LegalDocMeta = {
  slug: LegalSlug;
  href: string;
  /** Short label used in the footer and cross-links. */
  nav: string;
  /** Full H1 title on the page itself. */
  title: string;
  /** One line under the H1 (the lede). */
  lede: string;
};

export const LEGAL_DOCS: Record<LegalSlug, LegalDocMeta> = {
  terms: {
    slug: 'terms',
    href: '/terms',
    nav: 'Terms of Use',
    title: 'Terms of Use',
    lede: 'The rules of the road — the agreement between you and Reka Bytes.',
  },
  privacy: {
    slug: 'privacy',
    href: '/privacy',
    nav: 'Privacy Policy',
    title: 'Privacy Policy',
    lede: 'How Reka Bytes collects, uses, and protects your personal data.',
  },
  cookies: {
    slug: 'cookies',
    href: '/cookies',
    nav: 'Cookies Policy',
    title: 'Cookies Policy',
    lede: 'Cookies and similar technologies we use (spoiler: only what we need).',
  },
};

/** Order the documents are listed in the footer and the consent lines. */
export const LEGAL_LINKS: LegalDocMeta[] = [
  LEGAL_DOCS.privacy,
  LEGAL_DOCS.terms,
  LEGAL_DOCS.cookies,
];

/**
 * Operator-supplied value, or a "not configured" chip naming the variable
 * the deployer needs to set. The chip is visible on purpose — it is a feature,
 * not a bug: a half-configured install is loudly incomplete.
 */
export function field(value: string | null, varName: string, label?: string): string {
  return value ?? `[${label ?? varName}]`;
}

/**
 * The operator's inbox as a mailto link, or a chip when unset. Uses the single
 * LEG_CONTACT_EMAIL for all inquiries (privacy requests, support, abuse, legal).
 */
export function mailtoHref(): string | null {
  if (!CONTACT.email) return null;
  return `mailto:${CONTACT.email}?subject=${encodeURIComponent(OPERATOR.productName)}`;
}
