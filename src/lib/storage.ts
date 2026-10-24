// Session + config storage: Firestore when configured, always mirrored to localStorage.
import type { BlockQueues, Session, SessionStatus, Settings } from "../types";
import { ensureUser, getFirebase } from "./firebase";

export const KEYS = {
  sessions: "sn_sessions_v1",
  blocks: "sn_blocks_v1",
  settings: "sn_settings_v1",
  current: "sn_current_v1",
};

const EVENTS_INLINE_MAX = 800;
const EVENT_CHUNK = 500;

export const DEFAULT_SETTINGS: Settings = { force: "auto", demoMode: false };

// ---------------------------------------------------------------- localStorage

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: Firestore (if any) still has the data */
  }
}

export function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function localSessions(): Session[] {
  const v = lsGet<Session[]>(KEYS.sessions, []);
  return Array.isArray(v) ? v : [];
}

function upsertLocal(s: Session): void {
  const all = localSessions().filter((x) => x.id !== s.id);
  all.push(s);
  lsSet(KEYS.sessions, all);
}

export function deleteLocalSessions(): void {
  lsRemove(KEYS.sessions);
  lsRemove(KEYS.current);
}

// ---------------------------------------------------------------- sessions

/** Firestore rejects `undefined`; a JSON round-trip drops those fields. */
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export async function saveSession(s: Session): Promise<void> {
  upsertLocal(s);
  const fb = await getFirebase();
  if (!fb) return;
  try {
    const { fs, db } = fb;
    const uid = await ensureUser(fb);
    const chunked = s.events.length > EVENTS_INLINE_MAX;
    const docData = clean({ ...s, uid, events: chunked ? [] : s.events, eventChunks: chunked ? Math.ceil(s.events.length / EVENT_CHUNK) : 0 });
    await fs.setDoc(fs.doc(db, "sessions", s.id), docData, { merge: true });
    if (chunked) {
      for (let i = 0; i * EVENT_CHUNK < s.events.length; i++) {
        await fs.setDoc(fs.doc(db, "sessions", s.id, "events", `chunk${i}`), {
          uid,
          i,
          events: clean(s.events.slice(i * EVENT_CHUNK, (i + 1) * EVENT_CHUNK)),
        });
      }
    }
  } catch (err) {
    console.warn("Remote save failed; kept locally", err);
  }
}

const STATUS_RANK: Record<SessionStatus, number> = { started: 0, assigned: 1, task_done: 2, abandoned: 3, complete: 4 };

/** Union of Firestore and local sessions, de-duplicated by id (most advanced copy wins). */
export async function loadAllSessions(): Promise<{ sessions: Session[]; remoteError?: string }> {
  const byId = new Map<string, Session>();
  for (const s of localSessions()) byId.set(s.id, s);
  let remoteError: string | undefined;
  const fb = await getFirebase();
  if (fb && fb.auth.currentUser && !fb.auth.currentUser.isAnonymous) {
    try {
      const { fs, db } = fb;
      const snap = await fs.getDocs(fs.collection(db, "sessions"));
      for (const d of snap.docs) {
        const s = d.data() as Session;
        if (s.eventChunks) {
          const chunks = await fs.getDocs(fs.collection(db, "sessions", s.id, "events"));
          s.events = chunks.docs
            .map((c) => c.data() as { i: number; events: Session["events"] })
            .sort((a, b) => a.i - b.i)
            .flatMap((c) => c.events);
        }
        const local = byId.get(s.id);
        if (!local || STATUS_RANK[s.status] >= STATUS_RANK[local.status]) byId.set(s.id, s);
      }
    } catch (err) {
      remoteError = String(err);
    }
  }
  const sessions = [...byId.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return { sessions, remoteError };
}

/** On reload mid-session: mark the previous unfinished session abandoned. */
export async function markPreviousAbandoned(): Promise<void> {
  const id = lsGet<string | null>(KEYS.current, null);
  if (!id) return;
  lsRemove(KEYS.current);
  const prev = localSessions().find((s) => s.id === id);
  if (prev && prev.status !== "complete" && prev.status !== "abandoned") {
    await saveSession({ ...prev, status: "abandoned" });
  }
}

export function setCurrentSession(id: string | null): void {
  if (id) lsSet(KEYS.current, id);
  else lsRemove(KEYS.current);
}

// ---------------------------------------------------------------- config

export async function getSettings(): Promise<Settings> {
  const local = { ...DEFAULT_SETTINGS, ...lsGet<Partial<Settings>>(KEYS.settings, {}) };
  const fb = await getFirebase();
  if (!fb) return local;
  try {
    await ensureUser(fb);
    const snap = await fb.fs.getDoc(fb.fs.doc(fb.db, "config", "settings"));
    if (snap.exists()) {
      const remote = { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<Settings>) };
      lsSet(KEYS.settings, remote);
      return remote;
    }
  } catch {
    /* offline or not allowed: fall back to local */
  }
  return local;
}

export async function saveSettings(s: Settings): Promise<string | undefined> {
  lsSet(KEYS.settings, s);
  const fb = await getFirebase();
  if (!fb) return;
  try {
    await fb.fs.setDoc(fb.fs.doc(fb.db, "config", "settings"), s);
  } catch (err) {
    return String(err);
  }
}

export function localBlocks(): BlockQueues {
  return lsGet<BlockQueues>(KEYS.blocks, { ios: [], android: [], other: [] });
}

export function saveLocalBlocks(q: BlockQueues): void {
  lsSet(KEYS.blocks, q);
}

export async function resetBlocks(): Promise<string | undefined> {
  const empty: BlockQueues = { ios: [], android: [], other: [] };
  saveLocalBlocks(empty);
  const fb = await getFirebase();
  if (!fb) return;
  try {
    await fb.fs.setDoc(fb.fs.doc(fb.db, "config", "blocks"), { queues: empty });
  } catch (err) {
    return String(err);
  }
}

// ---------------------------------------------------------------- researcher auth

export async function researcherSignIn(email: string, password: string): Promise<void> {
  const fb = await getFirebase();
  if (!fb) return;
  await fb.authMod.signInWithEmailAndPassword(fb.auth, email, password);
}

export async function researcherSignOut(): Promise<void> {
  const fb = await getFirebase();
  if (fb) await fb.authMod.signOut(fb.auth);
}

export async function researcherEmail(): Promise<string | null> {
  const fb = await getFirebase();
  const u = fb?.auth.currentUser;
  return u && !u.isAnonymous ? u.email : null;
}
