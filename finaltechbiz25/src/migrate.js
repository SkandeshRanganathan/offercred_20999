import fs from "node:fs";
import path from "node:path";
import { query, pool } from "./db.js";

async function migrate() {
  const schemaPath = path.join(process.cwd(), "src", "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  await query(sql);
}

migrate()
  .then(async () => {
    console.log("Migration complete");
    await pool.end();
  })
  .catch(async (err) => {
    console.error("Migration failed:", err);
    await pool.end();
    process.exit(1);
  });


