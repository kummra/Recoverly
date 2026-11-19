/**
 * Who is the owner of Recoverly: the people who may approve organisations' words, confirm what kind of
 * organisation each is, and switch a manually invoiced plan on or off. A plain allowlist of Firebase uids in the
 * `OWNER_UIDS` environment variable (comma separated). Unset means nobody: the owner pages fail closed.
 */
type Env = Record<string, string | undefined>;

export function ownerUids(env: Env = process.env): string[] {
  return (env.OWNER_UIDS ?? "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
}

export function isOwner(uid: string | null | undefined, env: Env = process.env): boolean {
  return typeof uid === "string" && uid !== "" && ownerUids(env).includes(uid);
}
