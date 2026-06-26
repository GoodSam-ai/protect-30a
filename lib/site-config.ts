export type AuthProviderConfig = {
  id:
    | "google"
    | "apple"
    | "facebook"
    | "linkedin_oidc"
    | "email"
    | "custom:tiktok"
    | "custom:instagram";
  label: string;
  enabled: boolean;
  note?: string;
};

type EnvLike = Record<string, string | undefined>;

const defaultSiteUrl = "https://protect30a.org";

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export const siteConfig = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || "Protect30A",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl,
  canonicalDomain:
    process.env.NEXT_PUBLIC_CANONICAL_DOMAIN || "protect30a.org",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "doug@goodsam.ai",
  defaultRealtimeMode: process.env.DEFAULT_REALTIME_MODE || "auto",
  pollingIntervalMs: Number(process.env.POLLING_INTERVAL_MS || 5000),
  bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || "doug@goodsam.ai"
} as const;

export function getCanonicalUrl(pathname: string) {
  const base = siteConfig.siteUrl.replace(/\/$/, "");
  if (pathname === "/") return `${base}/`;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${normalized}`;
}

export function getEnabledAuthProviders(env: EnvLike = process.env) {
  const providers: AuthProviderConfig[] = [
    { id: "email", label: "Email magic link", enabled: true },
    { id: "google", label: "Google", enabled: true },
    { id: "apple", label: "Apple", enabled: true },
    { id: "facebook", label: "Facebook", enabled: true },
    { id: "linkedin_oidc", label: "LinkedIn", enabled: true },
    {
      id: "custom:tiktok",
      label: "TikTok",
      enabled: readBoolean(env.ENABLE_TIKTOK_LOGIN, true),
      note: "Uses TikTok Login Kit through a Supabase custom OAuth provider."
    },
    {
      id: "custom:instagram",
      label: "Instagram",
      enabled: readBoolean(env.ENABLE_INSTAGRAM_LOGIN, true),
      note:
        "Instagram login is for eligible Business/Creator accounts through Meta's supported Instagram Login/API path."
    }
  ];

  return providers.filter((provider) => provider.enabled);
}
