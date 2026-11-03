import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, normalizeSubmissionKey, validateLocation, validatePhoto } from "../lib/storm-recovery/photo-intake";

describe("storm recovery photo intake", () => {
  const photo = { name: "limbs.jpg", type: "image/jpeg", size: 1024 };
  it("accepts a normal phone JPEG", () => expect(validatePhoto(photo)).toBeNull());
  it.each(["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"])("accepts %s", (type) =>
    expect(validatePhoto({ ...photo, type })).toBeNull());
  it("rejects scripts disguised as uploads", () =>
    expect(validatePhoto({ ...photo, type: "application/javascript" })).toMatch(/Unsupported/));
  it("rejects empty photos", () => expect(validatePhoto({ ...photo, size: 0 })).toMatch(/empty/));
  it("rejects oversized photos", () =>
    expect(validatePhoto({ ...photo, size: MAX_PHOTO_BYTES + 1 })).toMatch(/15 MB/));
  it("accepts a photo at the size limit", () =>
    expect(validatePhoto({ ...photo, size: MAX_PHOTO_BYTES })).toBeNull());
  it("rejects invalid sizes", () =>
    expect(validatePhoto({ ...photo, size: Number.NaN })).not.toBeNull());
  it("requires a location when GPS metadata is absent", () =>
    expect(validateLocation({})).toMatch(/address/));
  it("accepts fallback address without GPS", () =>
    expect(validateLocation({ address: "123 Main St" })).toBeNull());
  it("accepts valid GPS coordinates including zero", () =>
    expect(validateLocation({ latitude: 0, longitude: 0 })).toBeNull());
  it("rejects one coordinate without the other", () =>
    expect(validateLocation({ latitude: 30.3 })).toMatch(/Both/));
  it("rejects out-of-range coordinates", () =>
    expect(validateLocation({ latitude: 91, longitude: -86 })).toMatch(/Invalid/));
  it("normalizes an idempotency key for retries", () =>
    expect(normalizeSubmissionKey("  abcdefghijklmnop  ")).toBe("abcdefghijklmnop"));
  it("rejects unsafe idempotency keys", () =>
    expect(() => normalizeSubmissionKey("../duplicate")).toThrow(/Invalid/));
});
