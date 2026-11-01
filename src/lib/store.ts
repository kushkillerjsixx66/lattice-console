import { create } from "zustand";
import {
  type Posture,
  type SessionSnapshot,
  type SkillName,
  type VesselKind,
  bootSession,
  clearLock,
  clearPersisted,
  emptySnapshot,
  exportHandoff,
  health,
  ingestHandoff,
  persist,
  publicStatus,
  raisePosture,
  resetSession,
  restore,
  runCanonicalDemo,
  runIntent,
  runSkill,
} from "@/lib/lattice/session";

type Notice = { kind: "ok" | "warn" | "danger"; text: string } | null;

interface LatticeStore {
  snap: SessionSnapshot;
  hydrated: boolean;
  notice: Notice;
  hydrate: () => void;
  boot: (opts: { opId: string; operatorId: string; posture: Posture; principles: string[] }) => void;
  run: (intent: string) => void;
  raise: (posture: Posture, confirm?: boolean) => void;
  skill: (name: SkillName, intent: string, approve?: boolean) => void;
  exportVessel: (title?: string, kind?: VesselKind) => void;
  ingestVessel: (raw: unknown) => void;
  clearLockdown: () => void;
  demo: () => void;
  reset: () => void;
  dismiss: () => void;
}

function apply(set: (p: Partial<LatticeStore>) => void, snap: SessionSnapshot, notice?: Notice) {
  persist(snap);
  set({ snap, notice: notice ?? null });
}

export const useLattice = create<LatticeStore>((set, get) => ({
  snap: emptySnapshot(),
  hydrated: false,
  notice: null,
  hydrate: () => {
    const saved = restore();
    set({ snap: saved ?? emptySnapshot(), hydrated: true });
  },
  boot: (opts) => {
    try {
      const snap = bootSession(get().snap, opts);
      apply(set, snap, { kind: "ok", text: "Sigil issued. Session ready." });
    } catch (e) {
      set({ notice: { kind: "danger", text: e instanceof Error ? e.message : "Boot failed" } });
    }
  },
  run: (intent) => {
    try {
      const snap = runIntent(get().snap, intent);
      const last = snap.runs[snap.runs.length - 1];
      const kind = last?.status === "ok" ? "ok" : last?.status === "blocked" ? "warn" : "danger";
      apply(set, snap, { kind, text: last?.message ?? "Run complete" });
    } catch (e) {
      set({ notice: { kind: "danger", text: e instanceof Error ? e.message : "Run failed" } });
    }
  },
  raise: (posture, confirm = false) => {
    try {
      const snap = raisePosture(get().snap, posture, confirm);
      apply(set, snap, { kind: "ok", text: `Posture ${posture.toUpperCase()}` });
    } catch (e) {
      set({ notice: { kind: "warn", text: e instanceof Error ? e.message : "Posture blocked" } });
    }
  },
  skill: (name, intent, approve = false) => {
    try {
      const snap = runSkill(get().snap, name, intent, approve);
      const last = snap.skills[snap.skills.length - 1];
      apply(set, snap, {
        kind: last?.operatorGate === "awaiting_approval" ? "warn" : "ok",
        text: last?.message ?? `${name} complete`,
      });
    } catch (e) {
      set({ notice: { kind: "danger", text: e instanceof Error ? e.message : "Skill failed" } });
    }
  },
  exportVessel: (title, kind) => {
    try {
      const snap = exportHandoff(get().snap, title, kind);
      apply(set, snap, { kind: "ok", text: "Transmission vessel sealed." });
    } catch (e) {
      set({ notice: { kind: "danger", text: e instanceof Error ? e.message : "Export failed" } });
    }
  },
  ingestVessel: (raw) => {
    try {
      const snap = ingestHandoff(get().snap, raw);
      apply(set, snap, { kind: "ok", text: "Vessel ingested. Method not executed." });
    } catch (e) {
      set({ notice: { kind: "danger", text: e instanceof Error ? e.message : "Ingest rejected" } });
    }
  },
  clearLockdown: () => {
    const snap = clearLock(get().snap);
    apply(set, snap, { kind: "ok", text: "Omega-LOCK cleared." });
  },
  demo: () => {
    try {
      const snap = runCanonicalDemo(get().snap);
      apply(set, snap, { kind: "ok", text: "Canonical demo sealed under governance." });
    } catch (e) {
      set({ notice: { kind: "danger", text: e instanceof Error ? e.message : "Demo failed" } });
    }
  },
  reset: () => {
    clearPersisted();
    set({ snap: resetSession(), notice: { kind: "ok", text: "Session discarded." } });
  },
  dismiss: () => set({ notice: null }),
}));

export function useStatus() {
  return publicStatus(useLattice((s) => s.snap));
}

export function useHealth() {
  return health(useLattice((s) => s.snap));
}
