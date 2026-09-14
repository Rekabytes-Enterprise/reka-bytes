import {
  AppError,
  type LeadDTO,
  type LeadCreateInput,
  type LeadUpdateInput,
} from '@reka-bytes/shared';
import { prisma } from '../lib/prisma';

type LeadRow = Awaited<ReturnType<typeof prisma.lead.findFirstOrThrow>>;

const toDTO = (lead: LeadRow): LeadDTO => ({
  id: lead.id,
  name: lead.name,
  email: lead.email,
  phone: lead.phone,
  service: lead.service,
  platform: lead.platform,
  budget: lead.budget,
  message: lead.message,
  status: lead.status,
  adminNotes: lead.adminNotes,
  createdAt: lead.createdAt.toISOString(),
});

/**
 * Public lead intake — no auth, no user relation. The honeypot is checked by
 * the route BEFORE this runs, so rows here are real (rate-limited) enquiries.
 */
export async function createLead(input: LeadCreateInput): Promise<LeadDTO> {
  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      service: input.service,
      platform: input.platform,
      budget: input.budget,
      message: input.message,
    },
  });
  return toDTO(lead);
}

export async function listLeads(): Promise<LeadDTO[]> {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  return leads.map(toDTO);
}

export async function updateLead(id: string, input: LeadUpdateInput): Promise<LeadDTO> {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Lead not found');
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.adminNotes !== undefined ? { adminNotes: input.adminNotes } : {}),
    },
  });
  return toDTO(lead);
}
