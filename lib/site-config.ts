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
const defaultPollingIntervalMs = 5000;

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
}

export function parsePollingIntervalMs(
  value: string | undefined,
  fallback = defaultPollingIntervalMs
) {
  if (value === undefined) return fallback;
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return fallback;
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function buildPublicSiteConfig(env: EnvLike = process.env) {
  return {
    brandName: env.NEXT_PUBLIC_BRAND_NAME || "Protect30A",
    siteUrl: env.NEXT_PUBLIC_SITE_URL || defaultSiteUrl,
    canonicalDomain: env.NEXT_PUBLIC_CANONICAL_DOMAIN || "protect30a.org",
    supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL || "doug@goodsam.ai"
  } as const;
}

export function buildServerConfig(env: EnvLike = process.env) {
  return {
    defaultRealtimeMode: env.DEFAULT_REALTIME_MODE || "auto",
    pollingIntervalMs: parsePollingIntervalMs(env.POLLING_INTERVAL_MS),
    bootstrapAdminEmail: env.BOOTSTRAP_ADMIN_EMAIL || "doug@goodsam.ai"
  } as const;
}

export const siteConfig = buildPublicSiteConfig();

export const serverConfig = buildServerConfig();

export function getCanonicalUrl(pathname: string, env?: EnvLike) {
  const config = env ? buildPublicSiteConfig(env) : siteConfig;
  const base = config.siteUrl.replace(/\/$/, "");
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
