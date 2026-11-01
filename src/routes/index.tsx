import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BootGate } from "@/components/console/BootGate";
import { OperatorConsole } from "@/components/console/OperatorConsole";
import { useLattice } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const hydrated = useLattice((s) => s.hydrated);
  const booted = useLattice((s) => s.snap.booted);
  const hydrate = useLattice((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg text-muted">
        <p className="font-mono text-xs tracking-[0.2em] uppercase">Lattice</p>
      </main>
    );
  }

  return booted ? <OperatorConsole /> : <BootGate />;
}
