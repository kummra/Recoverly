/**
 * What a person last chose to share with a team (the name they gave and which sections they
 * ticked), kept on this device only so that "Send an update" does not quietly replace their
 * chosen name with a blank one. It is a convenience: nothing here is ever sent anywhere on its
 * own, and the team receives only what is sent when the person presses the button.
 *
 * It is forgotten when the person stops sharing, leaves the programme or deletes their account
 * (a device-only value is out of the server's reach, so those flows must clear it), and whatever is
 * read back is re-checked, because storage can be edited.
 */
import { normaliseCode } from "@/lib/programme";
import { SHARE_LIMITS, SHARE_SECTIONS, type ShareSection } from "@/lib/share";

const PREFIX = "recoverly:workspace-prefs:";

export type WorkspacePrefs = { label: string; sections: ShareSection[] };

function key(uid: string, code: string): string {
  return `${PREFIX}${uid}:${code}`;
}

export function loadWorkspacePrefs(uid: string, code: string): WorkspacePrefs | null {
  const clean = normaliseCode(code);
  if (!uid || !clean) return null;
  try {
    const raw = window.localStorage.getItem(key(uid, clean));
    const data = raw ? (JSON.parse(raw) as { label?: unknown; sections?: unknown }) : null;
    if (!data || typeof data !== "object" || !Array.isArray(data.sections)) return null;
    const sections = SHARE_SECTIONS.filter((section) => (data.sections as unknown[]).includes(section));
    const label = typeof data.label === "string" ? data.label.slice(0, SHARE_LIMITS.labelMax) : "";
    return sections.length > 0 ? { label, sections } : null;
  } catch {
    return null;
  }
}

export function saveWorkspacePrefs(uid: string, code: string, prefs: WorkspacePrefs): boolean {
  const clean = normaliseCode(code);
  if (!uid || !clean) return false;
  try {
    window.localStorage.setItem(key(uid, clean), JSON.stringify({ label: prefs.label.slice(0, SHARE_LIMITS.labelMax), sections: prefs.sections }));
    return true;
  } catch {
    return false;
  }
}

/** Forget them for one team, or (no code) for every team this person has chosen anything for. Never throws. */
export function clearWorkspacePrefs(uid: string, code?: string): void {
  try {
    if (code) {
      const clean = normaliseCode(code);
      if (clean) window.localStorage.removeItem(key(uid, clean));
      return;
    }
    const prefix = `${PREFIX}${uid}:`;
    const stale: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const name = window.localStorage.key(i);
      if (name && name.startsWith(prefix)) stale.push(name);
    }
    for (const name of stale) window.localStorage.removeItem(name);
  } catch {
    /* nothing stored, or storage unavailable: nothing to remove */
  }
}
