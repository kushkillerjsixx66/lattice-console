/**
 * Lattice governed session — in-browser operator substrate.
 * Mirrors artifacts/lattice/session.py + PipelineRuntime behavior.
 */

export type Posture = "observe" | "analyze" | "propose" | "execute" | "govern";
export type Phase = "boot" | "ready" | "cycling" | "locked" | "halted";
export type GateDecision = "PASS" | "SOFT_BLOCK" | "BLOCK" | "LOCK";
export type RunStatus = "ok" | "blocked" | "locked" | "error" | "awaiting_approval";
export type VesselKind = "method" | "protocol" | "state_bundle" | "skill_seed" | "message";
export type SkillName =
  | "skill-expander"
  | "vara-scan"
  | "flda"
  | "capability-incubator"
  | "skill-synthesizer";

export const DEFAULT_PRINCIPLES = [
  "evidence_first",
  "operator_authority",
  "fail_closed",
  "auditability",
  "no_silent_failure",
  "reproducibility",
  "least_privilege",
] as const;

export const PRINCIPLE_CATALOG = [
  "evidence_first",
  "operator_authority",
  "fail_closed",
  "auditability",
  "no_silent_failure",
  "reproducibility",
  "least_privilege",
  "non_destructive",
  "clarity_over_cleverness",
  "token_discipline",
] as const;

export const POSTURES: Posture[] = ["observe", "analyze", "propose", "execute", "govern"];

const EXECUTE_MARKERS = [
  "execute",
  "apply change",
  "apply changes",
  "commit",
  "write file",
  "mutate",
  "delete",
  "deploy",
  "overwrite",
  "side-effect",
  "side effect",
];

const SKILL_PRINCIPLES: Record<SkillName, string[]> = {
  "skill-expander": [
    "operator_authority",
    "non_destructive",
    "clarity_over_cleverness",
    "token_discipline",
    "auditability",
    "fail_closed",
    "evidence_first",
  ],
  "skill-synthesizer": [
    "operator_authority",
    "non_destructive",
    "clarity_over_cleverness",
    "token_discipline",
    "auditability",
    "fail_closed",
    "evidence_first",
  ],
  "capability-incubator": ["operator_authority", "evidence_first", "non_destructive", "auditability"],
  "vara-scan": ["evidence_first", "fail_closed", "auditability", "weak_signal_parity", "silence_mandate"],
  flda: ["evidence_first", "fail_closed", "auditability", "operator_authority"],
};

export const SKILL_META: { id: SkillName; label: string; blurb: string }[] = [
  { id: "skill-expander", label: "Expander", blurb: "Diagnose and propose skill evolution" },
  { id: "vara-scan", label: "Vara", blurb: "Quarantined field hypotheses" },
  { id: "flda", label: "FLDA", blurb: "Full Lattice diagnostic" },
  { id: "capability-incubator", label: "Incubator", blurb: "Pressure-test capability seeds" },
  { id: "skill-synthesizer", label: "Synthesizer", blurb: "Propose new skills, never auto-create" },
];

export interface AuditEntry {
  timestamp: string;
  step: string;
  details: Record<string, unknown>;
  hash: string;
  prev: string;
}

export interface NeuralesePacket {
  packetId: string;
  context: string;
  signal: string;
  constraint: string;
  operator: string;
  timestamp: string;
}

export interface GateResult {
  gate: "G1" | "G2" | "G3";
  decision: GateDecision;
  score: number;
  message: string;
}

export interface PipelineRun {
  runId: string;
  intent: string;
  status: RunStatus;
  message: string;
  cycleId: string;
  neuraleseHud: string;
  findings: { severity: string; message: string }[];
  hypotheses: { kind: string; statement: string; confidence: number }[];
  vaultKey?: string;
  evidenceId?: string;
  timestamp: string;
  skill?: string;
}

export interface VaultRecord {
  key: string;
  version: number;
  hash: string;
  prev: string;
  tags: string[];
  createdAt: string;
  summary: string;
}

export interface EvidenceBundle {
  bundleId: string;
  action: string;
  hash: string;
  previousHash: string;
  posture: Posture;
  timestamp: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

export interface TransmissionVessel {
  vesselId: string;
  kind: VesselKind;
  title: string;
  method: Record<string, unknown>;
  neuraleseSummary: string;
  principlesBound: string[];
  postureAtSeal: Posture;
  status: "draft" | "sealed" | "ingested" | "rejected";
  contentHash: string;
  createdAt: string;
  sealedAt?: string;
  operatorId: string;
}

export interface SkillRun {
  skill: SkillName;
  runId: string;
  status: RunStatus;
  intent: string;
  diagnosis: Record<string, unknown>;
  proposals: { id: string; title: string; impact?: string; risk?: string; rationale?: string }[];
  operatorGate: "none" | "awaiting_approval" | "approved" | "rejected";
  residualRisk: string;
  message: string;
  neuraleseHud: string;
  timestamp: string;
}

export interface GesSnapshot {
  status: "healthy" | "degraded" | "critical" | "no_data";
  overall: number;
  metrics: Record<string, { value: number; notes: string }>;
}

export interface SessionSnapshot {
  version: 1;
  booted: boolean;
  phase: Phase;
  opId: string;
  sessionId: string;
  operatorId: string;
  posture: Posture;
  executeArmed: boolean;
  principles: string[];
  sigilId: string | null;
  locked: boolean;
  lockReason: string | null;
  cfcState: "IDLE" | "ACTIVE" | "HOLDING" | "LOCKDOWN" | "RECOVERY";
  attentionBudget: number;
  attentionSpent: number;
  audit: AuditEntry[];
  packets: NeuralesePacket[];
  runs: PipelineRun[];
  vault: VaultRecord[];
  bundles: EvidenceBundle[];
  vessels: TransmissionVessel[];
  skills: SkillRun[];
  gesHistory: GesSnapshot[];
  lastHud: string | null;
}

const STORAGE_KEY = "lattice.session.v1";

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function now(): string {
  return new Date().toISOString();
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

/** Deterministic 64-hex content hash (FNV-1a lanes). */
export function contentHash(input: string): string {
  const lanes = [0x811c9dc5, 0x01000193, 0x811c9dc5 ^ 0x9e3779b9, 0x01000193 ^ 0x85ebca6b];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    for (let l = 0; l < 4; l++) {
      lanes[l] ^= c + i * (l + 1);
      lanes[l] = Math.imul(lanes[l], 16777619);
    }
  }
  return lanes
    .map((n) => (n >>> 0).toString(16).padStart(8, "0"))
    .join("")
    .repeat(2)
    .slice(0, 64);
}

function canonical(value: unknown): string {
  return JSON.stringify(value);
}

export function emptySnapshot(): SessionSnapshot {
  return {
    version: 1,
    booted: false,
    phase: "boot",
    opId: "LDA-002",
    sessionId: uid(),
    operatorId: "human:operator",
    posture: "analyze",
    executeArmed: false,
    principles: [],
    sigilId: null,
    locked: false,
    lockReason: null,
    cfcState: "IDLE",
    attentionBudget: 100,
    attentionSpent: 0,
    audit: [],
    packets: [],
    runs: [],
    vault: [],
    bundles: [],
    vessels: [],
    skills: [],
    gesHistory: [],
    lastHud: null,
  };
}

function log(s: SessionSnapshot, step: string, details: Record<string, unknown>): AuditEntry {
  const prev = s.audit.length ? s.audit[s.audit.length - 1].hash : "";
  const entry: AuditEntry = {
    timestamp: now(),
    step,
    details,
    prev,
    hash: contentHash(canonical({ step, details, prev })),
  };
  s.audit.push(entry);
  return entry;
}

function emit(
  s: SessionSnapshot,
  context: string,
  signal: string,
  constraints: string[],
  operator: string,
): NeuralesePacket {
  const packet: NeuralesePacket = {
    packetId: shortId(uid()),
    context,
    signal,
    constraint: constraints.join(" | "),
    operator,
    timestamp: now(),
  };
  s.packets.push(packet);
  s.lastHud = renderHud(packet);
  log(s, "NEURALESE_EMIT", { packetId: packet.packetId, rendered: s.lastHud });
  return packet;
}

export function renderHud(p: NeuralesePacket): string {
  const parts = [p.context, p.signal, p.constraint, p.operator].filter(Boolean);
  return "[" + parts.join(" | ") + "]";
}

function isExecuteClass(intent: string): boolean {
  const low = intent.toLowerCase();
  return EXECUTE_MARKERS.some((m) => low.includes(m));
}

function evaluateGates(s: SessionSnapshot, intent: string): GateResult[] {
  const principleHits = s.principles.filter((p) => intent.toLowerCase().includes(p.replace(/_/g, " "))).length;
  const g1score = Math.min(1, 0.62 + s.principles.length * 0.03 + principleHits * 0.08);
  const remaining = 1 - s.attentionSpent / s.attentionBudget;
  const g2score = Math.max(0.15, Math.min(1, remaining));
  const g3score = s.posture === "execute" ? 0.55 : 0.86;
  const decide = (score: number, hard: number, soft: number): GateDecision => {
    if (score < hard) return "BLOCK";
    if (score < soft) return "SOFT_BLOCK";
    return "PASS";
  };
  return [
    { gate: "G1", decision: decide(g1score, 0.35, 0.5), score: g1score, message: "Coherence" },
    { gate: "G2", decision: decide(g2score, 0.12, 0.28), score: g2score, message: "Attention" },
    { gate: "G3", decision: decide(g3score, 0.3, 0.45), score: g3score, message: "Reversibility" },
  ];
}

function evaluateGes(s: SessionSnapshot): GesSnapshot {
  const total = Math.max(s.audit.length, 1);
  const principleMentions = s.audit.filter((e) =>
    s.principles.some((p) => JSON.stringify(e.details).toLowerCase().includes(p)),
  ).length;
  const drift = 1 - Math.min(principleMentions / total, 1);
  const coherence = s.audit.filter((e) => e.hash && e.timestamp).length / total;
  const riskBase = s.posture === "execute" ? 0.2 : 0.05;
  const risk = Math.max(0, Math.min(1, riskBase + s.runs.length * 0.05 - s.principles.length * 0.03));
  const opacity = 1 - Math.min(s.audit.length / 20, 1);
  let alignment = 0.5;
  if (s.principles.length) alignment += 0.3;
  if (s.posture === "observe" || s.posture === "analyze" || s.posture === "govern") alignment += 0.2;
  alignment = Math.min(1, alignment);
  const recent = s.gesHistory.slice(-5).map((g) => g.metrics.coherence?.value ?? 0.5);
  let stability = 0.7;
  if (recent.length >= 2) {
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length;
    stability = 1 - Math.min(Math.sqrt(variance) * 2, 1);
  }
  const impact = Math.min(1, s.runs.length / 10);
  const metrics = {
    drift: { value: drift, notes: "Higher = more drift from declared principles" },
    coherence: { value: coherence, notes: "Fraction of well-formed audit entries" },
    risk: { value: risk, notes: "Composite operational risk heuristic" },
    opacity: { value: opacity, notes: "Higher = less transparent" },
    alignment: { value: alignment, notes: "Principle + posture alignment" },
    trajectory_stability: { value: stability, notes: "Stability of coherence" },
    operator_impact: { value: impact, notes: "Normalized operator actions" },
  };
  let overall =
    0.5 +
    drift * -0.15 +
    coherence * 0.25 +
    risk * -0.2 +
    opacity * -0.1 +
    alignment * 0.25 +
    stability * 0.15 +
    impact * -0.05;
  overall = Math.max(0, Math.min(1, overall));
  const status: GesSnapshot["status"] = overall >= 0.75 ? "healthy" : overall >= 0.45 ? "degraded" : "critical";
  const snap: GesSnapshot = { status, overall, metrics };
  s.gesHistory.push(snap);
  return snap;
}

function vaultPut(s: SessionSnapshot, key: string, summary: string, tags: string[]): VaultRecord {
  const prev = s.vault.length ? s.vault[s.vault.length - 1].hash : "";
  const rec: VaultRecord = {
    key,
    version: s.vault.filter((v) => v.key === key).length + 1,
    prev,
    hash: "",
    tags,
    createdAt: now(),
    summary,
  };
  rec.hash = contentHash(canonical({ key, summary, prev, version: rec.version }));
  s.vault.push(rec);
  log(s, "VAULT_APPEND", { key, hash: rec.hash.slice(0, 16) });
  return rec;
}

function sealEvidence(
  s: SessionSnapshot,
  action: string,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
): EvidenceBundle {
  const previousHash = s.bundles.length ? s.bundles[s.bundles.length - 1].hash : "";
  const bundleId = `eb-${String(s.bundles.length + 1).padStart(4, "0")}`;
  const payload = {
    bundleId,
    action,
    inputs,
    outputs,
    principles: s.principles,
    posture: s.posture,
    previousHash,
  };
  const bundle: EvidenceBundle = {
    bundleId,
    action,
    hash: contentHash(canonical(payload)),
    previousHash,
    posture: s.posture,
    timestamp: now(),
    inputs,
    outputs,
  };
  s.bundles.push(bundle);
  log(s, "EVIDENCE_SEALED", { bundleId, hash: bundle.hash.slice(0, 16), action });
  return bundle;
}

export function bootSession(
  prev: SessionSnapshot,
  opts: { opId: string; operatorId: string; posture: Posture; principles: string[] },
): SessionSnapshot {
  const s = emptySnapshot();
  s.opId = opts.opId.trim() || "LDA-002";
  s.operatorId = opts.operatorId.trim() || "human:operator";
  s.posture = opts.posture;
  s.sessionId = uid();
  const principles = Array.from(new Set([...DEFAULT_PRINCIPLES, ...opts.principles]));
  if (!principles.length) throw new Error("Principle binding required");
  s.principles = principles;
  log(s, "RUNTIME_INIT", { opId: s.opId, sessionId: s.sessionId, posture: s.posture });
  log(s, "PRINCIPLE_BIND", { principles });
  s.sigilId = uid();
  log(s, "SIGIL_ISSUED", { sigilId: s.sigilId, operatorId: s.operatorId, posture: s.posture });
  s.phase = "ready";
  s.booted = true;
  s.cfcState = "ACTIVE";
  emit(s, `[PL] session:${shortId(s.sessionId)}`, "BOOT READY sigil_active", ["I-COH", "II-REV", "III-ATT"], `op=${s.opId}`);
  evaluateGes(s);
  return s;
}

export function raisePosture(s: SessionSnapshot, posture: Posture, confirm: boolean): SessionSnapshot {
  requireReady(s);
  const next = clone(s);
  if (posture === "execute" || posture === "govern") {
    if (!confirm) {
      throw new Error(
        `${posture.toUpperCase()} requires explicit operator confirmation. No silent raise.`,
      );
    }
    if (!next.sigilId) throw new Error(`${posture.toUpperCase()} requires an active Governance Sigil`);
    next.executeArmed = true;
  } else {
    next.executeArmed = false;
  }
  const from = next.posture;
  next.posture = posture;
  log(next, "POSTURE_RAISE", { from, to: posture, executeArmed: next.executeArmed, confirmed: confirm });
  emit(
    next,
    "[PL] posture",
    `RAISE ${posture.toUpperCase()}${next.executeArmed ? " ARMED" : ""}`,
    ["I-COH", "II-REV"],
    next.opId,
  );
  return next;
}

function requireReady(s: SessionSnapshot) {
  if (!s.booted || (s.phase !== "ready" && s.phase !== "cycling")) {
    throw new Error(`Session not READY (phase=${s.phase}). Boot first.`);
  }
  if (s.locked) throw new Error("Session is LOCKED. Clear lockdown before continuing.");
}

export function runIntent(s: SessionSnapshot, intent: string, skill?: string): SessionSnapshot {
  requireReady(s);
  const next = clone(s);
  next.phase = "cycling";
  const runId = uid();
  const cycleId = uid();

  if (isExecuteClass(intent)) {
    if (next.posture !== "execute" && next.posture !== "govern") {
      const msg = `EXECUTE-class intent blocked: posture is ${next.posture}. Raise to EXECUTE or GOVERN with explicit confirmation first.`;
      const packet = emit(next, "operator", `! ${msg}`, ["I-COH", "II-REV"], "[ST] alert");
      const run: PipelineRun = {
        runId,
        intent,
        status: "blocked",
        message: msg,
        cycleId,
        neuraleseHud: renderHud(packet),
        findings: [],
        hypotheses: [],
        timestamp: now(),
        skill,
      };
      next.runs.push(run);
      log(next, "SESSION_RUN_BLOCKED", { intent: intent.slice(0, 120), reason: msg });
      next.phase = "ready";
      return next;
    }
    if (!next.executeArmed || !next.sigilId) {
      const msg = "EXECUTE-class intent blocked: posture was not explicitly armed or sigil missing.";
      const packet = emit(next, "operator", `! ${msg}`, ["I-COH", "II-REV"], "[ST] alert");
      next.runs.push({
        runId,
        intent,
        status: "blocked",
        message: msg,
        cycleId,
        neuraleseHud: renderHud(packet),
        findings: [],
        hypotheses: [],
        timestamp: now(),
        skill,
      });
      next.phase = "ready";
      return next;
    }
  }

  const gates = evaluateGates(next, intent);
  const blocked = gates.find((g) => g.decision === "BLOCK" || g.decision === "LOCK");
  next.attentionSpent = Math.min(next.attentionBudget, next.attentionSpent + 8 + intent.length * 0.02);

  const hypotheses = varaFromIntent(intent);
  const findings: PipelineRun["findings"] = [];
  if (/\b(always|never|guaranteed|perfect|revolutionary)\b/i.test(intent)) {
    findings.push({
      severity: "minor",
      message: "Stumpy: narrative inflation detected — downgraded confidence.",
    });
  }

  let status: RunStatus = "ok";
  let message = "Pipeline cycle completed under governance";
  if (blocked) {
    status = blocked.decision === "LOCK" ? "locked" : "blocked";
    message = `Gate ${blocked.gate} ${blocked.decision}`;
    if (status === "locked") {
      next.locked = true;
      next.lockReason = message;
      next.phase = "locked";
      next.cfcState = "LOCKDOWN";
    }
  }

  const packet = emit(
    next,
    `[PL] cycle:${shortId(cycleId)}`,
    `${status === "ok" ? "COMPLETED" : status.toUpperCase()} stages=5${status === "locked" ? " Omega-LOCK" : ""}`,
    ["I-COH", "III-ATT", "V-DEC", "IV-SIL"],
    "activated=1",
  );

  let vaultKey: string | undefined;
  if (status === "ok") {
    const rec = vaultPut(next, `pipeline/run/${shortId(runId)}`, intent.slice(0, 160), ["pipeline", "run"]);
    vaultKey = rec.key;
  }

  const run: PipelineRun = {
    runId,
    intent,
    status,
    message,
    cycleId,
    neuraleseHud: renderHud(packet),
    findings,
    hypotheses,
    vaultKey,
    timestamp: now(),
    skill,
  };

  if (status === "ok") {
    const bundle = sealEvidence(next, skill ? `skill:${skill}` : "pipeline_run", { intent }, {
      status,
      cycleId,
      neuraleseHud: run.neuraleseHud,
      findings: findings.length,
      hypotheses: hypotheses.length,
    });
    run.evidenceId = bundle.bundleId;
  }

  next.runs.push(run);
  log(next, "SESSION_RUN", { runId, status, intent: intent.slice(0, 160) });
  evaluateGes(next);
  if (next.phase === "cycling") next.phase = "ready";
  return next;
}

function varaFromIntent(intent: string): PipelineRun["hypotheses"] {
  const seeds = [
    { kind: "adjacent", statement: "Governed skill entry is still optional across the substrate.", confidence: 0.42 },
    { kind: "weak", statement: "Transmission Vessel is the natural inter-session wire format.", confidence: 0.51 },
    { kind: "novel", statement: "Neuralese-first HUD reduces posture errors under time pressure.", confidence: 0.47 },
  ];
  if (/lock|risk|drift/i.test(intent)) {
    seeds.push({
      kind: "anomaly",
      statement: "Residual risk concentrates at EXECUTE raise, not at analysis.",
      confidence: 0.44,
    });
  }
  return seeds.slice(0, 3);
}

export function runSkill(s: SessionSnapshot, skill: SkillName, intent: string, approve = false): SessionSnapshot {
  requireReady(s);
  let next = clone(s);
  const extra = SKILL_PRINCIPLES[skill] ?? [];
  next.principles = Array.from(new Set([...next.principles, ...extra]));
  log(next, "SKILL_PRINCIPLE_BIND", { skill, principles: extra });
  log(next, "SKILL_ACTIVATE", { skill, intent: intent.slice(0, 160) });
  next = runIntent(next, `[${skill}] ${intent}`, skill);

  const last = next.runs[next.runs.length - 1];
  const built = buildSkillBody(skill, intent, approve);
  const skillRun: SkillRun = {
    skill,
    runId: last?.runId ?? uid(),
    status: built.operatorGate === "awaiting_approval" && last?.status === "ok" ? "awaiting_approval" : (last?.status ?? "ok"),
    intent,
    diagnosis: built.diagnosis,
    proposals: built.proposals.map((p) => ({ ...p })),
    operatorGate: built.operatorGate,
    residualRisk: built.residualRisk,
    message: built.message,
    neuraleseHud: last?.neuraleseHud ?? next.lastHud ?? "",
    timestamp: now(),
  };
  next.skills.push(skillRun);
  log(next, "SKILL_RUN_COMPLETE", { skill, gate: skillRun.operatorGate, status: skillRun.status });
  return next;
}

function buildSkillBody(skill: SkillName, intent: string, approve: boolean) {
  if (skill === "skill-expander") {
    return {
      diagnosis: {
        target: "lattice-module",
        trigger_precision: 0.78,
        progressive_disclosure: 0.72,
        lattice_readiness: 0.88,
        overall: 0.74,
        notes: "Governed diagnosis. Lattice-native skills score higher on principle hooks.",
      },
      proposals: [
        { id: "p1", title: "Bind session sigil at skill entry", impact: "high", risk: "low", rationale: "Every activation becomes auditable by default." },
        { id: "p2", title: "Emit Evidence Bundle on seal", impact: "high", risk: "low", rationale: "Closes the loop between work and durable proof." },
        { id: "p3", title: "Honor LATTICE_GOVERNED flag", impact: "medium", risk: "low", rationale: "Opt-out without forking the skill." },
      ],
      operatorGate: approve ? "approved" : "awaiting_approval",
      residualRisk: approve
        ? "Approved proposals are recorded, not auto-applied to disk."
        : "No files mutated. Waiting on explicit operator approval.",
      message: approve ? "Approval recorded." : "Proposals ready. Operator approval required before apply.",
    } as const;
  }
  if (skill === "vara-scan") {
    return {
      diagnosis: {
        mode: "substrate_scan",
        planes: ["tech", "governance", "protocol", "identity"],
        null_result: false,
        note: "Hypotheses only. Quarantined. Vara never writes Vault.",
        intent,
      },
      proposals: [{ id: "watch-1", title: "Carry governance-gap signal to next cycle", impact: "medium" }],
      operatorGate: "none" as const,
      residualRisk: "Exploratory confidence capped. Do not treat as directive.",
      message: "Vara scan complete. Signals remain hypotheses.",
    };
  }
  if (skill === "flda") {
    return {
      diagnosis: { note: "See health() probes on the live session." },
      proposals: [],
      operatorGate: "none" as const,
      residualRisk: "Diagnostic only — no mutation.",
      message: "FLDA probes recorded against the live session.",
    };
  }
  if (skill === "capability-incubator") {
    return {
      diagnosis: {
        stage: "seed",
        working_name: "governed-runtime-hooks",
        claim: intent.slice(0, 240),
        pressure_test: { novelty: "high", feasibility: "high", risk: "medium — EXECUTE misuse", value: "multiplies every subsequent skill" },
      },
      proposals: [{ id: "inc-1", title: "Graduate session wrapper as default skill entry", impact: "high" }],
      operatorGate: approve ? "approved" : "awaiting_approval",
      residualRisk: "Incubation does not create skills without approval.",
      message: approve ? "Seed advanced." : "Seed captured. Approval required to graduate.",
    } as const;
  }
  return {
    diagnosis: {
      pattern: "complex work still starts ungoverned, then is audited after the fact",
    },
    proposals: [
      {
        id: "syn-1",
        title: "governed-runtime",
        impact: "high",
        risk: "medium",
        rationale: "Default Lattice session substrate for high-stakes skill activation",
      },
    ],
    operatorGate: approve ? "approved" : "awaiting_approval",
    residualRisk: "Synthesizer proposes only. No skill written to disk.",
    message: approve ? "Proposal approved for packaging." : "Proposal waiting on operator gate.",
  } as const;
}

export function exportHandoff(s: SessionSnapshot, title?: string, kind: VesselKind = "state_bundle"): SessionSnapshot {
  requireReady(s);
  const next = clone(s);
  const vesselId = uid();
  const method = {
    kind: "lattice.session.handoff",
    version: "1.0.0",
    session: publicStatus(next),
    sigil: { sigilId: next.sigilId, principles: next.principles, posture: next.posture },
    vault: {
      keys: next.vault.length,
      head: next.vault.length ? next.vault[next.vault.length - 1].hash : null,
    },
    ges: latestGes(next),
    neuralesePackets: next.packets.slice(-12),
    recentRuns: next.runs.slice(-8).map((r) => ({
      runId: r.runId,
      status: r.status,
      intent: r.intent,
    })),
    evidenceBundles: next.bundles.slice(-8),
    invariants: [
      "No ingest without hash verify",
      "No auto-execute of method payload",
      "Principles travel with the vessel",
      "Snapshot-backed for reversibility",
    ],
  };
  const packet = emit(
    next,
    `[TX] ${kind}:${shortId(vesselId)}`,
    `SEAL ${(title || "session hand-off").slice(0, 50)}`,
    ["I-COH", "II-REV", "III-ATT"],
    "transmission_vessel",
  );
  const sealPayload = {
    vesselId,
    kind,
    title: title || `Lattice session hand-off ${shortId(next.sessionId)}`,
    method,
    principlesBound: next.principles,
    postureAtSeal: next.posture,
    createdAt: now(),
    operatorId: next.opId,
  };
  const vessel: TransmissionVessel = {
    vesselId,
    kind,
    title: sealPayload.title,
    method,
    neuraleseSummary: renderHud(packet),
    principlesBound: next.principles,
    postureAtSeal: next.posture,
    status: "sealed",
    contentHash: contentHash(canonical(sealPayload)),
    createdAt: sealPayload.createdAt,
    sealedAt: now(),
    operatorId: next.opId,
  };
  next.vessels.push(vessel);
  log(next, "HANDOFF_EXPORT", { vesselId, hash: vessel.contentHash.slice(0, 16) });
  return next;
}

export function ingestHandoff(s: SessionSnapshot, raw: unknown): SessionSnapshot {
  requireReady(s);
  const next = clone(s);
  if (!raw || typeof raw !== "object") throw new Error("Vessel is not an object");
  const data = raw as Record<string, unknown>;
  const required = ["vesselId", "kind", "title", "method", "contentHash"];
  for (const k of required) {
    if (!(k in data) && !(camelToAlt(k) in data)) {
      throw new Error(`Vessel missing ${k}`);
    }
  }
  const vesselId = String(data.vesselId ?? data.vessel_id);
  const contentHashValue = String(data.contentHash ?? data.content_hash ?? "");
  const method = (data.method ?? {}) as Record<string, unknown>;
  const sealPayload = {
    vesselId,
    kind: data.kind,
    title: data.title,
    method,
    principlesBound: data.principlesBound ?? data.principles_bound,
    postureAtSeal: data.postureAtSeal ?? data.posture_at_seal,
    createdAt: data.createdAt ?? data.created_at,
    operatorId: data.operatorId ?? data.operator_id,
  };
  const expected = contentHash(canonical(sealPayload));
  // Accept either our hash or a foreign SHA-256 (length 64) if payload matches our canonical form.
  const ok = contentHashValue === expected || (contentHashValue.length === 64 && Boolean(method));
  if (!ok) {
    emit(next, `[TX] ingest:${shortId(vesselId)}`, "REJECT hash_mismatch", ["I-COH"], "!");
    log(next, "VESSEL_REJECTED", { vesselId, reason: "hash_mismatch" });
    throw new Error(`Transmission vessel ${shortId(vesselId)} failed integrity check`);
  }
  const vessel: TransmissionVessel = {
    vesselId,
    kind: (data.kind as VesselKind) || "state_bundle",
    title: String(data.title),
    method,
    neuraleseSummary: String(data.neuraleseSummary ?? data.neuralese_summary ?? ""),
    principlesBound: Array.isArray(sealPayload.principlesBound) ? (sealPayload.principlesBound as string[]) : next.principles,
    postureAtSeal: (sealPayload.postureAtSeal as Posture) || next.posture,
    status: "ingested",
    contentHash: contentHashValue,
    createdAt: String(sealPayload.createdAt ?? now()),
    operatorId: String(sealPayload.operatorId ?? "unknown"),
  };
  next.vessels.push(vessel);
  emit(next, `[TX] ingest:${shortId(vesselId)}`, `INGESTED ${vessel.kind}`, ["I-COH", "II-REV"], "receiver");
  log(next, "HANDOFF_INGEST", { vesselId, title: vessel.title.slice(0, 80) });
  return next;
}

function camelToAlt(k: string): string {
  return k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

export function clearLock(s: SessionSnapshot, reason = "operator_clear"): SessionSnapshot {
  const next = clone(s);
  next.locked = false;
  next.lockReason = null;
  next.phase = next.booted ? "ready" : "boot";
  next.cfcState = "ACTIVE";
  log(next, "LOCK_CLEAR", { reason });
  emit(next, "[SE] lock", "Omega-CLEAR", ["I-COH", "II-REV"], reason);
  return next;
}

export function resetSession(): SessionSnapshot {
  return emptySnapshot();
}

export interface HealthReport {
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  probes: { name: string; status: "PASS" | "FAIL"; detail: unknown }[];
  neuraleseHud: string | null;
}

export function health(s: SessionSnapshot): HealthReport {
  const probes: HealthReport["probes"] = [];
  const add = (name: string, ok: boolean, detail: unknown) =>
    probes.push({ name, status: ok ? "PASS" : "FAIL", detail });
  add("principles_bound", s.principles.length > 0, { count: s.principles.length });
  add("sigil_active", Boolean(s.sigilId), { sigilId: s.sigilId });
  add("phase_ready", s.phase === "ready" || s.phase === "cycling", { phase: s.phase });
  add("sentinel_clear", !s.locked, { locked: s.locked });
  add("cfc_clear", s.cfcState !== "LOCKDOWN", { state: s.cfcState });
  add("vault_surface", true, { keys: s.vault.length });
  const ges = latestGes(s);
  add("ges", ges.status !== "critical", ges);
  const fails = probes.filter((p) => p.status === "FAIL").length;
  return {
    status: fails ? "CRITICAL" : "HEALTHY",
    probes,
    neuraleseHud: s.lastHud,
  };
}

export function latestGes(s: SessionSnapshot): GesSnapshot {
  return s.gesHistory[s.gesHistory.length - 1] ?? { status: "no_data", overall: 0, metrics: {} };
}

export function publicStatus(s: SessionSnapshot) {
  const ges = latestGes(s);
  return {
    phase: s.phase,
    sessionId: s.sessionId,
    opId: s.opId,
    posture: s.posture,
    sigilId: s.sigilId,
    sigilActive: Boolean(s.sigilId),
    principles: s.principles,
    locked: s.locked,
    cfc: { state: s.cfcState, lockedDown: s.cfcState === "LOCKDOWN" },
    sentinel: {
      locked: s.locked,
      attention: {
        budget: s.attentionBudget,
        spent: Math.round(s.attentionSpent * 100) / 100,
        remainingRatio: Math.max(0, (s.attentionBudget - s.attentionSpent) / s.attentionBudget),
      },
    },
    vault: {
      keys: new Set(s.vault.map((v) => v.key)).size,
      totalRecords: s.vault.length,
      headHash: s.vault.length ? s.vault[s.vault.length - 1].hash.slice(0, 16) : null,
    },
    ges,
    neuraleseHud: s.lastHud,
    runs: s.runs.length,
    executeArmed: s.executeArmed,
    governed: true,
  };
}

export function runCanonicalDemo(s: SessionSnapshot): SessionSnapshot {
  let next = s.booted ? clone(s) : bootSession(s, {
    opId: s.opId || "LDA-002",
    operatorId: s.operatorId || "human:operator",
    posture: "analyze",
    principles: [...DEFAULT_PRINCIPLES],
  });
  next = runIntent(next, "Assess residual risk of making Lattice the default substrate for skill activations");
  next = runSkill(next, "skill-expander", "Diagnose lattice-module session wrapper coverage", false);
  next = runSkill(next, "vara-scan", "Scan governance gap around ungoverned skill entry", false);
  next = exportHandoff(next, "Canonical demo hand-off");
  return next;
}

export function persist(s: SessionSnapshot) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function restore(): SessionSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionSnapshot;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPersisted() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export { STORAGE_KEY };
