// Stratified block randomisation, block size 2, stratum = own platform (§8).
import type { AssignmentKind, BlockQueues, Condition, OwnPlatform, Settings } from "../types";
import { ensureUser, getFirebase } from "./firebase";
import { localBlocks, saveLocalBlocks } from "./storage";

const BLOCK: Condition[] = ["ios", "md"];

export function emptyQueues(): BlockQueues {
  return { ios: [], android: [], other: [] };
}

function permutation(rng: () => number): Condition[] {
  return rng() < 0.5 ? [...BLOCK] : [...BLOCK].reverse();
}

/** Pops the next slot for a stratum, refilling its queue with a random permutation when empty. */
export function drawFromBlocks(
  queues: BlockQueues,
  stratum: OwnPlatform,
  rng: () => number = Math.random,
): { condition: Condition; queues: BlockQueues } {
  const q = [...(queues[stratum] ?? [])];
  if (q.length === 0) q.push(...permutation(rng));
  const condition = q.shift()!;
  return { condition, queues: { ...emptyQueues(), ...queues, [stratum]: q } };
}

export type Assignment = { condition: Condition; assignment: AssignmentKind };

/** Decides how a session is assigned; `draw` is only called for automatic assignment. */
export async function resolveAssignment(
  settings: Settings,
  demoCondition: Condition | null,
  draw: () => Promise<Condition>,
): Promise<Assignment> {
  if (demoCondition) return { condition: demoCondition, assignment: "demo-forced" };
  if (settings.force !== "auto") return { condition: settings.force, assignment: "forced" };
  return { condition: await draw(), assignment: "stratified-block" };
}

function drawLocal(stratum: OwnPlatform): Condition {
  const r = drawFromBlocks(localBlocks(), stratum);
  saveLocalBlocks(r.queues);
  return r.condition;
}

/** Draws from `config/blocks` inside a Firestore transaction, so two phones never share a slot. */
export async function drawCondition(stratum: OwnPlatform): Promise<Condition> {
  const fb = await getFirebase();
  if (!fb) return drawLocal(stratum);
  try {
    await ensureUser(fb);
    const { fs, db } = fb;
    const ref = fs.doc(db, "config", "blocks");
    return await fs.runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const queues = snap.exists() ? (snap.data().queues as BlockQueues) : emptyQueues();
      const r = drawFromBlocks(queues, stratum);
      tx.set(ref, { queues: r.queues });
      return r.condition;
    });
  } catch (err) {
    console.warn("Remote assignment failed; using local queues", err);
    return drawLocal(stratum);
  }
}

export function assignCondition(own: OwnPlatform, settings: Settings, demoCondition: Condition | null) {
  return resolveAssignment(settings, demoCondition, () => drawCondition(own));
}
