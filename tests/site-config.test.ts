import {
  buildServerConfig,
  getCanonicalUrl,
  getEnabledAuthProviders,
  parsePollingIntervalMs,
  serverConfig,
  siteConfig
} from "@/lib/site-config";
import { describe, expect, it } from "vitest";

describe("site config", () => {
  it("keeps Protect30A canonical until Protect38 is configured", () => {
    expect(siteConfig.brandName).toBe("Protect30A");
    expect(siteConfig.siteUrl).toBe("https://protect30a.org");
    expect(getCanonicalUrl("/live")).toBe("https://protect30a.org/live");
  });

  it("normalizes canonical paths", () => {
    expect(getCanonicalUrl("live/test-event")).toBe(
      "https://protect30a.org/live/test-event"
    );
    expect(getCanonicalUrl("/")).toBe("https://protect30a.org/");
  });

  it("uses injected public site URL for canonical URLs", () => {
    expect(
      getCanonicalUrl("/live", {
        NEXT_PUBLIC_SITE_URL: "https://example.org/"
      })
    ).toBe("https://example.org/live");
  });

  it("keeps public config separate from server-only config", () => {
    expect(siteConfig).not.toHaveProperty("defaultRealtimeMode");
    expect(siteConfig).not.toHaveProperty("pollingIntervalMs");
    expect(siteConfig).not.toHaveProperty("bootstrapAdminEmail");
    expect(serverConfig).toHaveProperty("defaultRealtimeMode");
    expect(serverConfig).toHaveProperty("pollingIntervalMs");
    expect(serverConfig).toHaveProperty("bootstrapAdminEmail");
    expect(buildServerConfig({})).toEqual({
      defaultRealtimeMode: "auto",
      pollingIntervalMs: 5000,
      bootstrapAdminEmail: "doug@goodsam.ai"
    });
  });

  it("falls back when polling interval is invalid", () => {
    expect(parsePollingIntervalMs("later")).toBe(5000);
    expect(parsePollingIntervalMs("-1")).toBe(5000);
    expect(parsePollingIntervalMs("1.5")).toBe(5000);
  });

  it("uses a valid positive integer polling interval", () => {
    expect(parsePollingIntervalMs("2500")).toBe(2500);
  });

  it("falls back when polling interval is empty or whitespace", () => {
    expect(parsePollingIntervalMs("")).toBe(5000);
    expect(parsePollingIntervalMs("   ")).toBe(5000);
  });

  it("enables TikTok and Instagram when env flags are absent", () => {
    const providers = getEnabledAuthProviders({});

    expect(providers.map((provider) => provider.id)).toContain("custom:tiktok");
    expect(providers.map((provider) => provider.id)).toContain(
      "custom:instagram"
    );
  });

  it("enables TikTok and Instagram when env flags are true", () => {
    const providers = getEnabledAuthProviders({
      ENABLE_TIKTOK_LOGIN: "true",
      ENABLE_INSTAGRAM_LOGIN: "true"
    });

    expect(providers.map((provider) => provider.id)).toContain("custom:tiktok");
    expect(providers.map((provider) => provider.id)).toContain(
      "custom:instagram"
    );
  });

  it("disables TikTok and Instagram when env flags are false", () => {
    const providers = getEnabledAuthProviders({
      ENABLE_TIKTOK_LOGIN: " false ",
      ENABLE_INSTAGRAM_LOGIN: " false "
    });

    expect(providers.map((provider) => provider.id)).not.toContain(
      "custom:tiktok"
    );
    expect(providers.map((provider) => provider.id)).not.toContain(
      "custom:instagram"
    );
  });

  it("uses fallback auth provider flags for invalid values", () => {
    const providers = getEnabledAuthProviders({
      ENABLE_TIKTOK_LOGIN: "sometimes",
      ENABLE_INSTAGRAM_LOGIN: "nope"
    });

    expect(providers.map((provider) => provider.id)).toContain("custom:tiktok");
    expect(providers.map((provider) => provider.id)).toContain(
      "custom:instagram"
    );
  });
});
