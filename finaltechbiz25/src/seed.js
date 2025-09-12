import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { query, pool } from "./db.js";

async function seed() {
  const companiesPath = path.join(process.cwd(), "src", "companies.json");
  if (fs.existsSync(companiesPath)) {
    const raw = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));
    const companies = Array.isArray(raw)
      ? raw.map((entry) => ({
          name: (entry.Name ?? entry.name ?? "").toString().trim() || null,
          cin: (entry.CIN ?? entry.cin ?? "").toString().trim() || null,
          status: (entry.Status ?? entry.status ?? "").toString().trim() || null,
          url: (entry.Website ?? entry.website ?? entry.url ?? "").toString().trim() || null,
          address: (entry.Address ?? entry.address ?? "").toString().trim() || null,
        }))
      : [];
    for (const c of companies) {
      await query(
        `insert into companies(name, cin, status, url, address)
         values ($1,$2,$3,$4,$5)
         on conflict (cin) do update set name=excluded.name, status=excluded.status, url=excluded.url, address=excluded.address`,
        [c.name || null, c.cin || null, c.status || null, c.url || null, c.address || null]
      );
    }
    console.log(`Seeded ${companies.length} companies`);
  }

  // Create a demo student and recruiter
  const studentPass = await bcrypt.hash("student123", 10);
  const recruiterPass = await bcrypt.hash("recruiter123", 10);
  await query(
    `insert into users(email, password_hash, role, verified, full_name)
     values ($1,$2,'student',true,$3)
     on conflict (email) do nothing`,
    ["student@example.com", studentPass, "Demo Student"]
  );
  await query(
    `insert into users(email, password_hash, role, verified, full_name, company_cin)
     values ($1,$2,'recruiter',true,$3,$4)
     on conflict (email) do nothing`,
    ["recruiter@example.com", recruiterPass, "Demo Recruiter", "DEMO-CIN-001"]
  );
}

seed()
  .then(async () => {
    console.log("Seed complete");
    await pool.end();
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await pool.end();
    process.exit(1);
  });


