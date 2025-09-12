import fs from "node:fs";
import path from "node:path";

const companiesPath = path.join(process.cwd(), "src", "companies.json");

function loadCompanies() {
  try {
    const raw = fs.readFileSync(companiesPath, "utf-8");
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // Normalize keys from provided schema (Name/CIN/Status/Address/Website)
    return list.map((entry) => ({
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

function normalizeString(value) {
  return (value || "").toString().trim().toUpperCase();
}

function findCompanyByCinOrName(companies, cinOrName) {
  const needle = normalizeString(cinOrName);
  return companies.find((c) =>
    normalizeString(c.cin) === needle || normalizeString(c.name) === needle
  );
}

export function isCompanyVerified(cinOrName) {
  const companies = loadCompanies();
  const company = findCompanyByCinOrName(companies, cinOrName);
  if (!company) return { ok: false, reason: "COMPANY_NOT_FOUND" };
  const status = normalizeString(company.status);
  const active = status === "ACTIVE" || status === "VERIFIED" || status === "APPROVED";
  return { ok: active, company };
}

export function getCompany(cinOrName) {
  const companies = loadCompanies();
  const company = findCompanyByCinOrName(companies, cinOrName);
  return company || null;
}


