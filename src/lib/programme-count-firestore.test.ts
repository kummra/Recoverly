import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";

import { COUNTS_COLLECTION, firestoreCountStore } from "@/lib/programme-count-firestore";

function fakeFirestore(existing?: Record<string, unknown>) {
  const set = vi.fn(async () => undefined);
  const docPath: string[] = [];
  const db = {
    collection(name: string) {
      docPath.push(name);
      return {
        doc(id: string) {
          docPath.push(id);
          return {
            set,
            async get() {
              return { exists: existing !== undefined, data: () => existing };
            }
          };
        }
      };
    }
  };
  return { db: db as unknown as Firestore, set, docPath };
}

describe("firestoreCountStore", () => {
  it("adds one to a month's total with an atomic increment, merged into the programme's document", async () => {
    const { db, set, docPath } = fakeFirestore();
    await firestoreCountStore(db).increment("ACMELOGI26", "2026-11");
    expect(docPath).toEqual([COUNTS_COLLECTION, "ACMELOGI26"]);
    expect(set).toHaveBeenCalledTimes(1);
    const [data, options] = set.mock.calls[0] as unknown as [Record<string, unknown>, unknown];
    expect(options).toEqual({ merge: true });
    expect(data).toEqual({ active: { "2026-11": FieldValue.increment(1) } });
  });

  it("writes only the number: no timestamp, no person, no list", async () => {
    const { db, set } = fakeFirestore();
    await firestoreCountStore(db).increment("ACMELOGI26", "2026-11");
    const [data] = set.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(Object.keys(data)).toEqual(["active"]);
    expect(Object.keys(data.active as object)).toEqual(["2026-11"]);
  });

  it("reads a programme's monthly totals, keeping only well-formed ones", async () => {
    const { db } = fakeFirestore({ active: { "2026-11": 31, "2026-10": 7, junk: 5, "2026-09": "x" }, stray: "ignored" });
    expect(await firestoreCountStore(db).read("ACMELOGI26")).toEqual({ "2026-11": 31, "2026-10": 7 });
  });

  it("reads nothing for a programme with no document yet", async () => {
    const { db } = fakeFirestore(undefined);
    expect(await firestoreCountStore(db).read("ACMELOGI26")).toEqual({});
  });
});
