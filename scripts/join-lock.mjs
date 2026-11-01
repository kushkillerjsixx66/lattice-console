#!/usr/bin/env node
/**
 * Reassemble package-lock.json from byte chunks in lock-parts/ before install.
 *
 * Why this exists: the deployment channel used to publish this project caps
 * a single uploaded file below this lockfile's size, so the lock ships as
 * ordered chunks (lock-parts/lock.part-00, -01, ...) and is joined back into
 * place as the first step of the install command (see vercel.json). The
 * chunks are exact byte slices of the original file; the join verifies the
 * result parses as JSON and reports lockfileVersion.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const target = join(root, "package-lock.json");
const partsDir = join(root, "lock-parts");

if (existsSync(target)) {
  try {
    const parsed = JSON.parse(readFileSync(target, "utf8"));
    console.log(`[join-lock] package-lock.json already present (lockfileVersion ${parsed.lockfileVersion}) — nothing to do.`);
    process.exit(0);
  } catch {
    console.log("[join-lock] existing package-lock.json does not parse — reassembling from parts.");
  }
}

const parts = readdirSync(partsDir)
  .filter((name) => name.startsWith("lock.part-"))
  .sort();
if (parts.length === 0) {
  console.error("[join-lock] no lock-parts found and no usable package-lock.json — cannot install reproducibly.");
  process.exit(1);
}
const buf = Buffer.concat(parts.map((name) => readFileSync(join(partsDir, name))));
const parsed = JSON.parse(buf.toString("utf8"));
writeFileSync(target, buf);
console.log(`[join-lock] reassembled package-lock.json from ${parts.length} parts (${buf.length} bytes, lockfileVersion ${parsed.lockfileVersion}).`);
