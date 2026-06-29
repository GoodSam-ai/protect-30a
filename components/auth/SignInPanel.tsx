import { SignInPanelClient } from "@/components/auth/SignInPanelClient";
import { getEnabledAuthProviders } from "@/lib/site-config";

export function SignInPanel({ redirectTo = "/live" }: { redirectTo?: string }) {
  const providers = getEnabledAuthProviders();

  return <SignInPanelClient providers={providers} redirectTo={redirectTo} />;
}
