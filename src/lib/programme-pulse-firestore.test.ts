import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import { PULSE_COLLECTION, firestorePulseStore } from "@/lib/programme-pulse-firestore";

function fakeFirestore(existing?: Record<string, unknown>) {
  const set = vi.fn(async () => undefined);
  const docPath: string[] = [];
  const db = {
    collection(name: string) {
      docPath.push(name);
      return {
        doc(id: string) {
          docPath.push(id);
          return { set, async get() { return { exists: existing !== undefined, data: () => existing }; } };
        }
      };
    }
  };
  return { db: db as unknown as Firestore, set, docPath };
}

describe("firestorePulseStore", () => {
  it("adds one to a month's count for an answer with an atomic increment, merged into the programme's document", async () => {
    const { db, set, docPath } = fakeFirestore();
    await firestorePulseStore(db).add("ACMELOGI26", "2026-11", 4);
    expect(docPath).toEqual([PULSE_COLLECTION, "ACMELOGI26"]);
    const [data, options] = set.mock.calls[0] as unknown as [Record<string, unknown>, unknown];
    expect(options).toEqual({ merge: true });
    expect(data).toEqual({ months: { "2026-11": { a4: FieldValue.increment(1) } } });
  });

  it("writes only that number: no timestamp, no person, no list", async () => {
    const { db, set } = fakeFirestore();
    await firestorePulseStore(db).add("ACMELOGI26", "2026-11", 2);
    const [data] = set.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(Object.keys(data)).toEqual(["months"]);
    expect(Object.keys(data.months as object)).toEqual(["2026-11"]);
    expect(Object.keys((data.months as Record<string, object>)["2026-11"])).toEqual(["a2"]);
  });

  it("reads a programme's counts, keeping only well-formed ones, and nothing for a programme with no document", async () => {
    const { db } = fakeFirestore({ months: { "2026-11": { a1: 1, a5: 9 }, junk: { a1: 3 } }, stray: "ignored" });
    expect(await firestorePulseStore(db).read("ACMELOGI26")).toEqual({ "2026-11": [1, 0, 0, 0, 9] });
    expect(await firestorePulseStore(fakeFirestore(undefined).db).read("ACMELOGI26")).toEqual({});
  });
});
