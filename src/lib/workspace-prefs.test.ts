import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearWorkspacePrefs, loadWorkspacePrefs, saveWorkspacePrefs } from "@/lib/workspace-prefs";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    data,
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k)
  };
}

beforeEach(() => vi.stubGlobal("window", { localStorage: fakeStorage() }));
afterEach(() => vi.unstubAllGlobals());

describe("what a person last chose to share with a team, kept on this device", () => {
  it("is stored per person and per team, and read back as the same choices", () => {
    expect(saveWorkspacePrefs("u1", "clinica26", { label: "Asha K", sections: ["progress", "cravings"] })).toBe(true);
    expect(loadWorkspacePrefs("u1", "CLINICA26")).toEqual({ label: "Asha K", sections: ["progress", "cravings"] });
    expect(loadWorkspacePrefs("u2", "CLINICA26")).toBeNull();
    expect(loadWorkspacePrefs("u1", "CLINICB26")).toBeNull();
  });

  it("re-checks what storage holds: unknown sections are dropped, the name is cut to size, junk is ignored", () => {
    const storage = (window as unknown as { localStorage: ReturnType<typeof fakeStorage> }).localStorage;
    storage.setItem("recoverly:workspace-prefs:u1:CLINICA26", JSON.stringify({ label: "x".repeat(200), sections: ["progress", "bogus", "plans"] }));
    expect(loadWorkspacePrefs("u1", "CLINICA26")).toEqual({ label: "x".repeat(40), sections: ["progress", "plans"] });
    for (const junk of ["not json", "null", "[]", JSON.stringify({ label: "a", sections: [] }), JSON.stringify({ label: "a", sections: ["bogus"] }), JSON.stringify({ label: "a" })]) {
      storage.setItem("recoverly:workspace-prefs:u1:CLINICA26", junk);
      expect(loadWorkspacePrefs("u1", "CLINICA26"), junk).toBeNull();
    }
  });

  it("is forgotten for one team, or for all of a person's teams, and nobody else's", () => {
    saveWorkspacePrefs("u1", "CLINICA26", { label: "A", sections: ["progress"] });
    saveWorkspacePrefs("u1", "CLINICB26", { label: "B", sections: ["progress"] });
    saveWorkspacePrefs("u2", "CLINICA26", { label: "C", sections: ["progress"] });
    clearWorkspacePrefs("u1", "CLINICA26");
    expect(loadWorkspacePrefs("u1", "CLINICA26")).toBeNull();
    expect(loadWorkspacePrefs("u1", "CLINICB26")).not.toBeNull();
    clearWorkspacePrefs("u1");
    expect(loadWorkspacePrefs("u1", "CLINICB26")).toBeNull();
    expect(loadWorkspacePrefs("u2", "CLINICA26")).not.toBeNull();
  });

  it("says so when the browser refuses to store, and never throws when storage is unavailable", () => {
    vi.stubGlobal("window", { localStorage: { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("blocked"); }, length: 0, key: () => null } });
    expect(saveWorkspacePrefs("u1", "CLINICA26", { label: "A", sections: ["progress"] })).toBe(false);
    expect(loadWorkspacePrefs("u1", "CLINICA26")).toBeNull();
    expect(() => clearWorkspacePrefs("u1", "CLINICA26")).not.toThrow();
    expect(() => clearWorkspacePrefs("u1")).not.toThrow();
  });
});
