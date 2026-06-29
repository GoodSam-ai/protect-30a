"use client";

import { getEnabledAuthProviders } from "@/lib/site-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Mail } from "lucide-react";
import { useState } from "react";

export function SignInPanel({ redirectTo = "/live" }: { redirectTo?: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const providers = getEnabledAuthProviders();

  async function signInWithProvider(provider: string) {
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as never,
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });

    if (error) setMessage(error.message);
  }

  async function sendMagicLink() {
    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      }
    });

    setMessage(error ? error.message : "Check your email for the sign-in link.");
  }

  return (
    <section className="rounded border border-protect-sand bg-white p-4 shadow-sm">
      <h2 className="font-serif text-xl font-semibold text-protect-teal">
        Sign in to join the conversation
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {providers
          .filter((provider) => provider.id !== "email")
          .map((provider) => (
            <button
              key={provider.id}
              type="button"
              className="rounded border border-protect-sand px-3 py-2 text-left font-semibold hover:bg-protect-cream"
              onClick={() => signInWithProvider(provider.id)}
            >
              {provider.label}
            </button>
          ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="magic-email">
          Email address
        </label>
        <input
          id="magic-email"
          className="min-h-11 flex-1 rounded border border-protect-sand px-3"
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
        <button
          type="button"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-protect-teal px-4 font-semibold text-white"
          onClick={sendMagicLink}
        >
          <Mail size={18} aria-hidden="true" />
          Email link
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-protect-ink">{message}</p> : null}
    </section>
  );
}
