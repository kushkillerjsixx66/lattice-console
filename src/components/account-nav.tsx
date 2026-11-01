import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { authEnabled } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/**
 * Header account control. Renders nothing when auth is disabled
 * (`VITE_AUTH_ENABLED=false` selects the dev user — there is no real
 * session to manage) or while the session is still resolving, so there
 * is no signed-out flash on hard reload. Signed out: a link to the
 * `/login` route. Signed in: the template's `<UserButton />` (identity
 * chip + sign-out).
 */
export function AccountNav() {
  const { user, isPending } = useCurrentUserState();
  if (!authEnabled || isPending) return null;

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex h-9 items-center gap-2 px-2 font-mono text-xs text-muted hover:text-fg"
      >
        <LogIn className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Sign in</span>
        <span className="sr-only sm:hidden">Sign in</span>
      </Link>
    );
  }

  return (
    <span className="px-2">
      <UserButton />
    </span>
  );
}
