import { z } from "zod";

function normalizeEnumInput(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

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

export const reportReasonSchema = z.preprocess(
  normalizeEnumInput,
  z.enum(["spam", "harassment", "misinformation", "off_topic", "other"])
);

export const reportInputSchema = z.object({
  reason: reportReasonSchema,
  details: z.string().trim().max(1000).optional()
});

export const sharePlatformSchema = z.preprocess(
  normalizeEnumInput,
  z.enum(["facebook", "instagram", "tiktok", "x", "email", "copy_link", "other"])
);

export const shareInputSchema = z.object({
  eventId: z.string().uuid(),
  platform: sharePlatformSchema
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

  return sameBody && seconds >= 0 && seconds <= 60;
}
