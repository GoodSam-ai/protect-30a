export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"]);
export type PhotoCandidate = { name: string; type: string; size: number };
export type PhotoLocation = { latitude?: number | null; longitude?: number | null; address?: string | null };
export function validatePhoto(photo: PhotoCandidate): string | null {
  if (!photo.name.trim()) return "Photo filename is required";
  if (!ALLOWED_PHOTO_TYPES.has(photo.type.toLowerCase())) return "Unsupported photo format";
  if (!Number.isSafeInteger(photo.size) || photo.size <= 0) return "Photo must not be empty";
  if (photo.size > MAX_PHOTO_BYTES) return "Photo exceeds 15 MB limit";
  return null;
}
export function validateLocation(location: PhotoLocation): string | null {
  const hasLat = location.latitude !== null && location.latitude !== undefined;
  const hasLng = location.longitude !== null && location.longitude !== undefined;
  if (hasLat !== hasLng) return "Both GPS coordinates are required";
  if (hasLat && hasLng) {
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) ||
      location.latitude! < -90 || location.latitude! > 90 ||
      location.longitude! < -180 || location.longitude! > 180) return "Invalid GPS coordinates";
    return null;
  }
  return location.address?.trim() ? null : "Enter an address or select a map pin";
}
export function normalizeSubmissionKey(value: string): string {
  const key = value.trim();
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new Error("Invalid idempotency key");
  return key;
}
