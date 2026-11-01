import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LatticeMark } from "@/components/Mark";
import { Button } from "@/components/ui/button";
import { authClient, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({ component: LoginPage });

/**
 * Independent sign-in for the self-hosted deployment: email + password
 * against this app's own Better Auth (`/api/auth/*`), persisted in the
 * app's Postgres. The Grok broker providers (Google / X) are not offered
 * here — they federate through Grok's hosted broker and cannot run on an
 * independent domain.
 */
function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(result.error.message ?? "Something went wrong. Try again.");
        return;
      }
      await navigate({ to: "/" });
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = cn(
    "h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg",
    "placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-hud/60",
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 bg-bg px-5 py-10 text-fg sm:py-16">
      <div className="flex items-center gap-3">
        <LatticeMark className="size-10 shrink-0 rounded-md" />
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-subtle uppercase">Account</p>
          <h1 className="font-sans text-2xl font-medium tracking-tight">Lattice Console</h1>
        </div>
      </div>

      {isPending ? null : user ? (
        <section className="flex flex-col gap-4">
          <p className="text-base text-fg">
            Signed in as {user.primaryEmail ?? user.displayName ?? "your account"}.
          </p>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void navigate({ to: "/" })}>
              Back to the console
            </Button>
            <Button type="button" variant="ghost" onClick={() => void signOut("/login")}>
              Sign out
            </Button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-5">
          <div className="flex gap-2" role="tablist" aria-label="Sign in or create an account">
            <Button
              type="button"
              variant={mode === "sign-in" ? "default" : "ghost"}
              onClick={() => {
                setMode("sign-in");
                setError(null);
              }}
            >
              Sign in
            </Button>
            <Button
              type="button"
              variant={mode === "sign-up" ? "default" : "ghost"}
              onClick={() => {
                setMode("sign-up");
                setError(null);
              }}
            >
              Create account
            </Button>
          </div>

          <form className="flex flex-col gap-3" onSubmit={onSubmit}>
            {mode === "sign-up" ? (
              <label className="flex flex-col gap-1">
                <span className="font-mono text-xs text-muted">Name</span>
                <input
                  className={inputClass}
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1">
              <span className="font-mono text-xs text-muted">Email</span>
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-xs text-muted">Password</span>
              <input
                className={inputClass}
                type="password"
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={busy} className="mt-1">
              {busy ? "Working…" : mode === "sign-up" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-muted">
            Console sessions stay on this device either way; an account keeps your identity with
            the app.
          </p>
        </section>
      )}

      <Link to="/" className="font-mono text-xs text-muted hover:text-fg">
        ← Back to the console
      </Link>
    </main>
  );
}
