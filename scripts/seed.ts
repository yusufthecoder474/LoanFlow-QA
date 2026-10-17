import { db } from "../server/db";
import { hash } from "../server/password";
// Explicit reset: ONLY the dedicated synthetic demo database. Never use a real data database.
const client = await db.connect();
try {
  await client.query("BEGIN");
  await client.query("TRUNCATE sessions, loans, users CASCADE");
  for (const [id, name, role, scope] of [
    ["alice", "Alice Demo", "APPLICANT", "NORTH"],
    ["bob", "Bob Demo", "APPLICANT", "SOUTH"],
    ["officer-north", "North Officer", "OFFICER", "NORTH"],
    ["officer-south", "South Officer", "OFFICER", "SOUTH"],
  ])
    await client.query("INSERT INTO users VALUES ($1,$2,$3,$4,$5)", [
      id,
      name,
      role,
      scope,
      hash("Demo123!", id),
    ]);
  await client.query("COMMIT");
  console.log("Four synthetic accounts seeded");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await db.end();
}
