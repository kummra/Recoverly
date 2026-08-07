// Exercise every firebase-admin API the app actually uses, against real Firebase.
import fs from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const env = {};
for (const line of fs.readFileSync(".env.local","utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g,"");
}
const app = getApps().length ? getApps()[0] : initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});
console.log("[ok] initializeApp + credential.cert");

const auth = getAuth(app);
const users = await auth.listUsers(1);
console.log("[ok] auth.listUsers ->", users.users.length, "user(s)");

const db = getFirestore(app);
const ref = db.collection("__admin_verify__").doc("probe");
await ref.set({ at: FieldValue.serverTimestamp(), n: 1 });
console.log("[ok] doc.set + FieldValue.serverTimestamp");
const snap = await ref.get();
console.log("[ok] doc.get -> exists =", snap.exists);
await ref.update({ n: 2 });
console.log("[ok] doc.update");
const added = await db.collection("__admin_verify__").doc("probe").collection("kids").add({ x: 1 });
console.log("[ok] collection.add ->", added.id.slice(0, 6) + "…");
await db.recursiveDelete(db.collection("__admin_verify__").doc("probe"));
console.log("[ok] recursiveDelete (used by account deletion)");
const gone = await ref.get();
console.log("[ok] cleanup verified, exists =", gone.exists);
console.log("=== firebase-admin 14 + uuid override: ALL APP APIs WORK ===");
process.exit(0);
