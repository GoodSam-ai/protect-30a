import { SouthWaltonResourcesPage } from "@/components/south-walton/SouthWaltonResourcesPage";
import { getCanonicalUrl } from "@/lib/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Official South Walton Resources",
  description:
    "A permission-aware Protect30A resource hub linking to official Visit South Walton neighborhood, event, beach access, and beach safety resources.",
  alternates: {
    canonical: getCanonicalUrl("/south-walton-resources")
  }
};

export default function Page() {
  return <SouthWaltonResourcesPage />;
}
