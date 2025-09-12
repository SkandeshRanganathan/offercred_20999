import express from "express";
import { getCompany, isCompanyVerified } from "../companyVerifier.js";
import fs from "node:fs";
import path from "node:path";

const router = express.Router();

function loadAllCompaniesNormalized() {
  const companiesPath = path.join(process.cwd(), "src", "companies.json");
  if (!fs.existsSync(companiesPath)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));
    if (!Array.isArray(raw)) return [];
    return raw.map((entry) => ({
      name: (entry.Name ?? entry.name ?? "").toString().trim(),
      cin: (entry.CIN ?? entry.cin ?? "").toString().trim(),
      status: (entry.Status ?? entry.status ?? "").toString().trim(),
      address: (entry.Address ?? entry.address ?? "").toString().trim(),
      url: (entry.Website ?? entry.website ?? entry.url ?? "").toString().trim(),
    }));
  } catch (e) {
    return [];
  }
}

router.get("/verified", (req, res) => {
  const companies = loadAllCompaniesNormalized();
  const verified = companies.filter((c) => {
    const status = (c.status || "").toUpperCase();
    return status === "ACTIVE" || status === "VERIFIED" || status === "APPROVED";
  });
  res.json({ companies: verified });
});

export default router;


