const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** "SN-" + 5 characters without look-alikes (no I, O, 0, 1). */
export function makeParticipantId(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let out = "SN-";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const PARTICIPANT_ID_RE = /^SN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/;
