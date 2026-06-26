import {
  getCanonicalUrl,
  getEnabledAuthProviders,
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
      ENABLE_TIKTOK_LOGIN: "false",
      ENABLE_INSTAGRAM_LOGIN: "false"
    });

    expect(providers.map((provider) => provider.id)).not.toContain(
      "custom:tiktok"
    );
    expect(providers.map((provider) => provider.id)).not.toContain(
      "custom:instagram"
    );
  });
});
