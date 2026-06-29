import { z } from "zod";

export const topicSchema = z.enum([
  "Stormwater",
  "Traffic",
  "Beach access",
  "Mosquito control",
  "Public safety",
  "Growth/development",
  "Parking",
  "Environment",
  "Other"
]);

export const commentInputSchema = z.object({
  eventId: z.string().uuid(),
  districtId: z.string().uuid().optional(),
  parentCommentId: z.string().uuid().optional(),
  body: z.string().trim().min(5).max(500),
  topic: topicSchema.optional()
});

export const reportInputSchema = z.object({
  reason: z.string().trim().min(3).max(80),
  details: z.string().trim().max(500).optional()
});

export const shareInputSchema = z.object({
  eventId: z.string().uuid(),
  platform: z.string().trim().min(2).max(40)
});

export function normalizeCommentBody(body: string) {
  return body.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isRapidDuplicateComment(input: {
  previousBody: string;
  nextBody: string;
  previousCreatedAt: Date;
  now: Date;
}) {
  const sameBody =
    normalizeCommentBody(input.previousBody) ===
    normalizeCommentBody(input.nextBody);
  const seconds =
    (input.now.getTime() - input.previousCreatedAt.getTime()) / 1000;

  return sameBody && seconds <= 60;
}
