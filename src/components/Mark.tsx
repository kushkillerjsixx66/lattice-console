import { cn } from "@/lib/utils";

export function LatticeMark({ className, pip = true }: { className?: string; pip?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("text-accent", className)} aria-hidden="true">
      <rect width="32" height="32" rx="6" className="fill-bg" />
      <g fill="currentColor">
        <rect x="6" y="6" width="20" height="3" />
        <rect x="6" y="23" width="20" height="3" />
        <rect x="6" y="6" width="3" height="20" />
        <rect x="23" y="6" width="3" height="20" />
        <rect x="14.5" y="6" width="3" height="20" />
        <rect x="6" y="14.5" width="20" height="3" />
      </g>
      {pip ? <rect x="14.5" y="14.5" width="3" height="3" className="fill-hud" /> : null}
    </svg>
  );
}
