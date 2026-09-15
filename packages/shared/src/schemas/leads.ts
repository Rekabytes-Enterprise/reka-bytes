import { z } from 'zod';

/**
 * Leads — inbound enquiries from the public company site (/) "start small"
 * funnel: free consultation, free mockup, or the RM 150 PRD package. No auth;
 * the form is the marketing surface's only write path, so the schema is strict
 * and the endpoint is rate-limited + honeypot-guarded.
 */
export const LEAD_SERVICES = ['CONSULTATION', 'MOCKUP', 'PRD', 'BUILD'] as const;
export const LEAD_PLATFORMS = ['MOBILE', 'WEB', 'BOTH', 'UNSURE'] as const;
export const LEAD_BUDGETS = [
  'UNDER_5K',
  'RANGE_5_15K',
  'RANGE_15_50K',
  'OVER_50K',
  'UNSURE',
] as const;
export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'WON', 'LOST', 'ARCHIVED'] as const;

export type LeadService = (typeof LEAD_SERVICES)[number];
export type LeadPlatform = (typeof LEAD_PLATFORMS)[number];
export type LeadBudget = (typeof LEAD_BUDGETS)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const leadCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name needs at least 2 characters').max(80, 'Name is too long'),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(160, 'Email is too long'),
  phone: z.string().trim().max(30, 'Phone number is too long').optional(),
  service: z.enum(LEAD_SERVICES).default('CONSULTATION'),
  platform: z.enum(LEAD_PLATFORMS).default('UNSURE'),
  budget: z.enum(LEAD_BUDGETS).default('UNSURE'),
  message: z
    .string()
    .trim()
    .min(20, 'Tell us a little more — at least 20 characters')
    .max(4000, 'Message is too long'),
  // Honeypot — hidden from real users; bots that fill it get a fake success.
  website: z.string().max(200).optional(),
});
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

export const leadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  adminNotes: z.string().trim().max(4000, 'Notes are too long').nullable().optional(),
});
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;

export interface LeadDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: LeadService;
  platform: LeadPlatform;
  budget: LeadBudget;
  message: string;
  status: LeadStatus;
  adminNotes: string | null;
  createdAt: string;
}
