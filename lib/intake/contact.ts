import { z } from 'zod';
export const categories = ['general','flooding','evidence','correction','sponsorship','story','meeting_alerts','privacy'] as const;
export const contactSchema = z.object({
 id: z.string().uuid(), name: z.string().trim().min(1).max(120),
 email: z.string().trim().email().max(254), category: z.enum(categories),
 sourcePath: z.string().max(400).regex(/^\/(?!\/)[^\r\n]*$/),
 subject: z.string().trim().min(1).max(240), message: z.string().trim().min(5).max(6000),
 consentContact: z.literal(true), consentUpdates: z.boolean().default(false),
 website: z.string().max(200).optional()
});
export const categoryLabels: Record<string,string> = { general:'General question',flooding:'Flooding observation',evidence:'Photos or evidence',correction:'Source correction',sponsorship:'Sponsorship',story:'Community story',meeting_alerts:'Meeting alerts',privacy:'Privacy request' };
