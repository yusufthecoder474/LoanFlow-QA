import { readFile } from "node:fs/promises";
import { db } from "../server/db";
// One transactional, idempotent initial migration for this small demo.
const client = await db.connect();
try {
  await client.query("BEGIN");
  for (const file of ["001_initial.sql", "002_idempotency.sql"]) {
    await client.query(await readFile(`db/migrations/${file}`, "utf8"));
  }
  await client.query("COMMIT");
  console.log("Migration applied");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
  await db.end();
}
