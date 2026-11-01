import { useMemo, useState } from "react";
import { LatticeMark } from "@/components/Mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PRINCIPLES,
  POSTURES,
  PRINCIPLE_CATALOG,
  type Posture,
} from "@/lib/lattice/session";
import { useLattice } from "@/lib/store";
import { cn } from "@/lib/utils";

export function BootGate() {
  const boot = useLattice((s) => s.boot);
  const demo = useLattice((s) => s.demo);
  const [opId, setOpId] = useState("LDA-002");
  const [operatorId, setOperatorId] = useState("human:operator");
  const [posture, setPosture] = useState<Posture>("analyze");
  const [selected, setSelected] = useState<string[]>(() => [...DEFAULT_PRINCIPLES]);

  const canBoot = opId.trim().length > 0 && selected.length > 0;

  const toggle = (p: string) => {
    setSelected((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  };

  const postureHint = useMemo(() => {
    switch (posture) {
      case "observe":
        return "Read-only. No pipeline side effects.";
      case "analyze":
        return "Default. Diagnose, do not mutate.";
      case "propose":
        return "May emit proposals. Apply remains gated.";
      case "execute":
        return "Side effects. Requires explicit confirm at raise.";
      case "govern":
        return "Operator ceiling. Still requires confirm to arm.";
    }
  }, [posture]);

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
      <div className="pointer-events-none absolute inset-0 lattice-grid opacity-40" />
      <div className="relative">
        <div className="stagger-in flex items-center gap-3">
          <LatticeMark className="size-10 rounded-lg shadow-[0_0_0_1px_rgba(236,238,242,0.12)]" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted">LDA-002</p>
            <h1 className="font-sans text-3xl font-medium tracking-tight text-fg sm:text-4xl">Lattice</h1>
          </div>
        </div>
        <p className="stagger-in mt-5 max-w-md text-pretty text-base leading-relaxed text-muted">
          Bind principles. Issue a sigil. Work under governance.
        </p>

        <form
          className="stagger-in mt-10 space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canBoot) return;
            boot({ opId, operatorId, posture, principles: selected });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
                Operator id
              </span>
              <Input value={opId} onChange={(e) => setOpId(e.target.value)} autoComplete="off" />
            </label>
            <label className="block">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
                Signature
              </span>
              <Input value={operatorId} onChange={(e) => setOperatorId(e.target.value)} autoComplete="off" />
            </label>
          </div>

          <fieldset>
            <legend className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
              Posture
            </legend>
            <div className="flex flex-wrap gap-2">
              {POSTURES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosture(p)}
                  className={cn(
                    "h-11 rounded-full px-4 text-sm capitalize transition-colors",
                    posture === p ? "bg-fg text-bg" : "bg-elevated text-muted hover:text-fg",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-subtle">{postureHint}</p>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
              Principles
            </legend>
            <div className="flex flex-wrap gap-2">
              {PRINCIPLE_CATALOG.map((p) => {
                const on = selected.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggle(p)}
                    className={cn(
                      "h-10 rounded-full px-3 font-mono text-xs transition-colors",
                      on ? "bg-hud/15 text-hud" : "bg-elevated text-subtle hover:text-muted",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" size="lg" disabled={!canBoot} className="w-full sm:w-auto">
              Boot session
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => demo()}
            >
              Run canonical demo
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
