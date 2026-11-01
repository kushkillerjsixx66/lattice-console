import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Download,
  Lock,
  Shield,
  ShieldOff,
  Upload,
  RotateCcw,
} from "lucide-react";
import { AccountNav } from "@/components/account-nav";
import { LatticeMark } from "@/components/Mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  POSTURES,
  SKILL_META,
  health,
  latestGes,
  publicStatus,
  type Posture,
  type SkillName,
} from "@/lib/lattice/session";
import { useLattice } from "@/lib/store";
import { cn } from "@/lib/utils";

export function OperatorConsole() {
  const snap = useLattice((s) => s.snap);
  const run = useLattice((s) => s.run);
  const raise = useLattice((s) => s.raise);
  const skill = useLattice((s) => s.skill);
  const exportVessel = useLattice((s) => s.exportVessel);
  const ingestVessel = useLattice((s) => s.ingestVessel);
  const clearLockdown = useLattice((s) => s.clearLockdown);
  const demo = useLattice((s) => s.demo);
  const reset = useLattice((s) => s.reset);
  const notice = useLattice((s) => s.notice);
  const dismiss = useLattice((s) => s.dismiss);

  const st = publicStatus(snap);
  const ges = latestGes(snap);
  const hx = health(snap);
  const lastSkill = snap.skills[snap.skills.length - 1];
  const lastVessel = snap.vessels[snap.vessels.length - 1];

  const [intent, setIntent] = useState("");
  const [pendingPosture, setPendingPosture] = useState<Posture | null>(null);
  const [txOpen, setTxOpen] = useState(false);
  const [evOpen, setEvOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<SkillName>("skill-expander");
  const [skillIntent, setSkillIntent] = useState("");
  const [ingestText, setIngestText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const remaining = st.sentinel.attention.remainingRatio;

  function submitIntent() {
    const text = intent.trim();
    if (!text) return;
    run(text);
    setIntent("");
  }

  function requestPosture(p: Posture) {
    if (p === "execute" || p === "govern") {
      setPendingPosture(p);
      return;
    }
    raise(p, false);
  }

  function downloadLastVessel() {
    if (!lastVessel) {
      exportVessel();
      return;
    }
    const blob = new Blob([JSON.stringify(lastVessel, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lattice-vessel-${lastVessel.vesselId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const gesTone = ges.status === "healthy" ? "ok" : ges.status === "degraded" ? "warn" : "danger";

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <LatticeMark className="size-8 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h1 className="font-sans text-sm font-medium tracking-tight">Lattice</h1>
              <span className="truncate font-mono text-[11px] text-subtle">{st.opId}</span>
            </div>
            <p className="truncate font-mono text-[11px] text-subtle">
              {st.sessionId.slice(0, 8)} · sigil {st.sigilId ? st.sigilId.slice(0, 8) : "none"}
            </p>
          </div>
          <Badge tone={st.locked ? "danger" : st.phase === "ready" ? "ok" : "warn"}>{st.phase}</Badge>
          <Badge tone={st.executeArmed ? "warn" : "accent"}>{st.posture}</Badge>
          <AccountNav />
        </div>
        <div className="h-px bg-elevated">
          <div
            className="h-px bg-hud transition-[width] duration-300"
            style={{ width: `${Math.round(remaining * 100)}%` }}
          />
        </div>
      </header>

      {st.locked ? (
        <div className="border-b border-danger/30 bg-danger/10 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-danger">
              Omega-LOCK. {snap.lockReason ?? "Sentinel halt."} Fail-closed until operator clear.
            </p>
            <Button variant="danger" size="sm" onClick={clearLockdown}>
              <ShieldOff className="size-4" />
              Clear lockdown
            </Button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="border-b border-border px-4 py-2 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-3">
            <p
              className={cn(
                "text-sm",
                notice.kind === "ok" && "text-ok",
                notice.kind === "warn" && "text-warn",
                notice.kind === "danger" && "text-danger",
              )}
            >
              {notice.text}
            </p>
            <button type="button" className="text-xs text-subtle hover:text-fg" onClick={dismiss}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[16rem_minmax(0,1fr)_18rem] lg:gap-8 lg:px-6 lg:py-8">
        <aside className="space-y-6">
          <section>
            <RailLabel>Posture</RailLabel>
            <div className="mt-2 flex flex-col gap-1">
              {POSTURES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => requestPosture(p)}
                  className={cn(
                    "flex h-11 items-center justify-between rounded-lg px-3 text-left text-sm capitalize transition-colors",
                    st.posture === p ? "bg-fg text-bg" : "text-muted hover:bg-fg/5 hover:text-fg",
                  )}
                >
                  <span>{p}</span>
                  {p === "execute" || p === "govern" ? <Lock className="size-3.5 opacity-70" /> : null}
                </button>
              ))}
            </div>
            {st.executeArmed ? (
              <p className="mt-2 text-xs text-warn">EXECUTE armed. Side-effecting intents permitted.</p>
            ) : (
              <p className="mt-2 text-xs text-subtle">EXECUTE requires explicit raise and active sigil.</p>
            )}
          </section>

          <section>
            <RailLabel>Principles</RailLabel>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {st.principles.map((p) => (
                <li key={p} className="rounded-full bg-elevated px-2.5 py-1 font-mono text-[11px] text-muted">
                  {p}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <RailLabel>Skills</RailLabel>
            <div className="mt-2 grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              {SKILL_META.map((sk) => (
                <button
                  key={sk.id}
                  type="button"
                  onClick={() => {
                    setActiveSkill(sk.id);
                    setSkillIntent(defaultSkillIntent(sk.id));
                    setSkillOpen(true);
                  }}
                  className="rounded-lg bg-elevated px-3 py-2.5 text-left transition-colors hover:bg-fg/8"
                >
                  <div className="text-sm text-fg">{sk.label}</div>
                  <div className="text-[11px] text-subtle">{sk.blurb}</div>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="rounded-xl bg-surface p-4 shadow-[0_0_0_1px_rgba(236,238,242,0.08)] sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <RailLabel>Neuralese HUD</RailLabel>
              <Badge tone="hud">primary surface</Badge>
            </div>
            <p className="font-mono text-[13px] leading-relaxed text-hud sm:text-sm">
              {st.neuraleseHud ?? "[silence | null | IV-SIL | epistemic_honesty]"}
            </p>
          </section>

          <section>
            <label className="sr-only" htmlFor="intent">
              Intent
            </label>
            <Textarea
              id="intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="Intent — assessed under the active posture"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submitIntent();
                }
              }}
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-subtle">Ctrl/Cmd + Enter to run</p>
              <Button onClick={submitIntent} disabled={!intent.trim() || st.locked} className="w-full sm:w-auto">
                Run under governance
              </Button>
            </div>
          </section>

          <section>
            <RailLabel>Recent runs</RailLabel>
            <ul className="mt-2 space-y-2">
              {snap.runs.length === 0 ? (
                <li className="rounded-lg bg-surface px-4 py-6 text-sm text-subtle">
                  No cycles yet. Submit an intent or run the canonical demo.
                </li>
              ) : (
                [...snap.runs].reverse().slice(0, 8).map((r) => (
                  <li key={r.runId} className="rounded-lg bg-surface px-4 py-3 shadow-[0_0_0_1px_rgba(236,238,242,0.08)]">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={r.status === "ok" ? "ok" : r.status === "blocked" ? "warn" : "danger"}>
                        {r.status}
                      </Badge>
                      <span className="font-mono text-[11px] text-subtle">{r.runId.slice(0, 8)}</span>
                    </div>
                    <p className="mt-2 text-sm text-fg">{r.intent}</p>
                    <p className="mt-1 font-mono text-[11px] text-hud">{r.neuraleseHud}</p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </main>

        <aside className="space-y-6">
          <section>
            <div className="flex items-baseline justify-between">
              <RailLabel>GES</RailLabel>
              <span className={cn("font-mono text-sm tabular-nums", gesToneClass(ges.status))}>
                {ges.status === "no_data" ? "—" : ges.overall.toFixed(3)}
              </span>
            </div>
            <Badge tone={gesTone} className="mt-2">
              {ges.status}
            </Badge>
            <ul className="mt-3 space-y-2">
              {Object.entries(ges.metrics).map(([k, v]) => (
                <li key={k}>
                  <div className="flex justify-between font-mono text-[11px] text-muted">
                    <span>{k.replace(/_/g, " ")}</span>
                    <span className="tabular-nums">{v.value.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-elevated">
                    <div
                      className={cn("h-full rounded-full", meterFill(k, v.value))}
                      style={{ width: `${Math.round(v.value * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <RailLabel>Sentinel / CFC</RailLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <StatChip label="G1" value="PASS" ok />
              <StatChip label="G2" value="PASS" ok />
              <StatChip label="G3" value="PASS" ok />
              <StatChip label="CFC" value={st.cfc.state} ok={!st.cfc.lockedDown} />
            </div>
            <p className="mt-2 font-mono text-[11px] text-subtle">
              attn {st.sentinel.attention.spent.toFixed(1)} / {st.sentinel.attention.budget}
            </p>
          </section>

          <section>
            <RailLabel>Vault</RailLabel>
            <p className="mt-1 font-mono text-xs text-muted">
              {st.vault.totalRecords} records · head {st.vault.headHash ?? "—"}
            </p>
            <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
              {[...snap.vault].reverse().slice(0, 6).map((v) => (
                <li key={v.hash} className="truncate font-mono text-[11px] text-subtle">
                  {v.key}
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => setTxOpen(true)}>
              <Upload className="size-4" />
              Transmission
            </Button>
            <Button variant="outline" onClick={() => setEvOpen(true)}>
              <Shield className="size-4" />
              Evidence
            </Button>
            <Button variant="ghost" onClick={demo}>
              Canonical demo
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" />
              End session
            </Button>
          </section>
        </aside>
      </div>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 py-3 sm:px-6">
          <div className="flex min-w-max gap-6 font-mono text-[11px] text-subtle">
            {hx.probes.map((p) => (
              <span key={p.name}>
                <span className={p.status === "PASS" ? "text-ok" : "text-danger"}>{p.status}</span> {p.name}
              </span>
            ))}
            {snap.audit.slice(-4).reverse().map((a) => (
              <span key={a.hash}>{a.step}</span>
            ))}
          </div>
        </div>
      </footer>

      <Dialog open={pendingPosture !== null} onOpenChange={(o) => !o && setPendingPosture(null)}>
        <DialogContent>
          <DialogTitle>Raise to {pendingPosture?.toUpperCase()}</DialogTitle>
          <DialogDescription>
            This arms side-effecting work. Requires an active sigil. Confirm explicitly — Lattice will not
            raise silently.
          </DialogDescription>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setPendingPosture(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (pendingPosture) raise(pendingPosture, true);
                setPendingPosture(null);
              }}
            >
              Confirm raise
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={txOpen} onOpenChange={setTxOpen}>
        <SheetContent className="p-5 pt-12">
          <SheetTitle>Transmission Vessel</SheetTitle>
          <SheetDescription>
            Sealed inter-session hand-off. Ingest verifies integrity and does not auto-execute.
          </SheetDescription>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => {
                exportVessel("Operator HUD hand-off");
              }}
            >
              Seal current session
            </Button>
            <Button variant="outline" onClick={downloadLastVessel} disabled={!lastVessel}>
              <Download className="size-4" />
              Download JSON
            </Button>
            <Button variant="ghost" onClick={() => fileRef.current?.click()}>
              Import file
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  ingestVessel(JSON.parse(text));
                } catch (err) {
                  ingestVessel(null);
                }
                e.target.value = "";
              }}
            />
          </div>
          <label className="mt-6 block text-[11px] font-medium uppercase tracking-[0.16em] text-subtle">
            Paste vessel JSON
          </label>
          <Textarea className="mt-2 min-h-32" value={ingestText} onChange={(e) => setIngestText(e.target.value)} />
          <Button
            className="mt-3 w-full"
            variant="outline"
            disabled={!ingestText.trim()}
            onClick={() => {
              try {
                ingestVessel(JSON.parse(ingestText));
                setIngestText("");
              } catch {
                ingestVessel(null);
              }
            }}
          >
            Ingest
          </Button>
          {lastVessel ? (
            <div className="mt-6 rounded-lg bg-elevated p-3 font-mono text-[11px] text-muted">
              <div>{lastVessel.title}</div>
              <div className="mt-1 text-subtle">{lastVessel.vesselId.slice(0, 8)} · {lastVessel.status}</div>
              <div className="mt-1 break-all text-hud">{lastVessel.contentHash.slice(0, 32)}</div>
              <p className="mt-2 text-subtle">{lastVessel.neuraleseSummary}</p>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={evOpen} onOpenChange={setEvOpen}>
        <SheetContent className="p-5 pt-12">
          <SheetTitle>Evidence Bundles</SheetTitle>
          <SheetDescription>SHA-linked seals of governed actions.</SheetDescription>
          <ul className="mt-6 space-y-3 overflow-auto">
            {snap.bundles.length === 0 ? (
              <li className="text-sm text-subtle">No bundles yet.</li>
            ) : (
              [...snap.bundles].reverse().map((b) => (
                <li key={b.bundleId} className="rounded-lg bg-elevated p-3">
                  <div className="flex justify-between text-sm">
                    <span>{b.bundleId}</span>
                    <span className="text-muted">{b.action}</span>
                  </div>
                  <p className="mt-1 break-all font-mono text-[11px] text-subtle">{b.hash}</p>
                </li>
              ))
            )}
          </ul>
        </SheetContent>
      </Sheet>

      <Sheet open={skillOpen} onOpenChange={setSkillOpen}>
        <SheetContent className="p-5 pt-12">
          <SheetTitle>{SKILL_META.find((s) => s.id === activeSkill)?.label}</SheetTitle>
          <SheetDescription>
            Runs inside the live session. Principles bind, a cycle is recorded, apply stays gated.
          </SheetDescription>
          <Textarea
            className="mt-5"
            value={skillIntent}
            onChange={(e) => setSkillIntent(e.target.value)}
          />
          <div className="mt-3 flex flex-col gap-2">
            <Button
              onClick={() => {
                skill(activeSkill, skillIntent || defaultSkillIntent(activeSkill), false);
              }}
            >
              Run governed
            </Button>
            {lastSkill?.operatorGate === "awaiting_approval" && lastSkill.skill === activeSkill ? (
              <Button
                variant="outline"
                onClick={() => skill(activeSkill, lastSkill.intent, true)}
              >
                Approve proposals
              </Button>
            ) : null}
          </div>
          {lastSkill && lastSkill.skill === activeSkill ? (
            <SkillResultPanel
              skill={lastSkill}
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SkillResultPanel({
  skill,
}: {
  skill: {
    status: string;
    operatorGate: string;
    residualRisk: string;
    diagnosis: Record<string, unknown>;
    proposals: { id: string; title: string; impact?: string; rationale?: string }[];
    neuraleseHud: string;
  };
}) {
  const diag = useMemo(() => JSON.stringify(skill.diagnosis, null, 2), [skill.diagnosis]);
  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <Badge tone={skill.status === "ok" ? "ok" : "warn"}>{skill.status}</Badge>
        <Badge tone={skill.operatorGate === "awaiting_approval" ? "warn" : "mute"}>{skill.operatorGate}</Badge>
      </div>
      <p className="font-mono text-[11px] text-hud">{skill.neuraleseHud}</p>
      <p className="text-sm text-muted">{skill.residualRisk}</p>
      {skill.proposals.length ? (
        <ul className="space-y-2">
          {skill.proposals.map((p) => (
            <li key={p.id} className="rounded-lg bg-elevated p-3">
              <div className="text-sm text-fg">{p.title}</div>
              {p.rationale ? <p className="mt-1 text-xs text-subtle">{p.rationale}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <pre className="max-h-40 overflow-auto rounded-lg bg-elevated p-3 font-mono text-[11px] text-subtle">
        {diag}
      </pre>
    </div>
  );
}

function RailLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">{children}</h2>
  );
}

function StatChip({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-lg bg-elevated px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-subtle">{label}</div>
      <div className={cn("font-mono text-xs", ok === false ? "text-danger" : "text-ok")}>{value}</div>
    </div>
  );
}

function defaultSkillIntent(id: SkillName): string {
  switch (id) {
    case "skill-expander":
      return "Diagnose lattice-module session wrapper coverage";
    case "vara-scan":
      return "Scan governance gap around ungoverned skill entry";
    case "flda":
      return "Run FLDA against the live session";
    case "capability-incubator":
      return "Incubate default governed skill entry as a capability seed";
    case "skill-synthesizer":
      return "Synthesize a governed-runtime skill from observed ungoverned activations";
  }
}

function gesToneClass(status: string) {
  if (status === "healthy") return "text-ok";
  if (status === "degraded") return "text-warn";
  if (status === "critical") return "text-danger";
  return "text-muted";
}

function meterFill(key: string, value: number) {
  const inverted = key === "drift" || key === "risk" || key === "opacity";
  const good = inverted ? value < 0.4 : value > 0.6;
  const bad = inverted ? value > 0.7 : value < 0.35;
  if (bad) return "bg-danger";
  if (good) return "bg-ok";
  return "bg-warn";
}
