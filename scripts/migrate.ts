import { readFile } from "node:fs/promises";
import { db } from "../server/db";
// One transactional, idempotent initial migration for this small demo.
const client = await db.connect();
try {
  await client.query("BEGIN");
  await client.query(await readFile("db/migrations/001_initial.sql", "utf8"));
  await client.query("COMMIT");
  console.log("Migration applied");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await db.end();
}
