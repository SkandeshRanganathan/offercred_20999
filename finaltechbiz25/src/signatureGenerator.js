import fs from "node:fs";
import path from "node:path";
import { signCredentialsWithCompany } from "./cryptoKeys.js";

function loadCompanies() {
  const companiesPath = path.join(process.cwd(), "src", "companies.json");
  try {
    const raw = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function generateAllCompanyCredentialSignatures(email, password) {
  const companies = loadCompanies();
  const items = [];
  const lines = [];
  for (const entry of companies) {
    const name = entry.Name || entry.name || "";
    const cin = entry.CIN || entry.cin || "";
    const key = cin || name;
    if (!key) continue;
    const signatureBase64 = signCredentialsWithCompany(key, email, password) || "";
    items.push({ name, cin, signatureBase64 });
    lines.push(`${name}\t${cin}\t${signatureBase64}`);
  }

  const outJson = path.join(process.cwd(), "src", "signatures.json");
  const outTxt = path.join(process.cwd(), "src", "signatures.txt");
  fs.writeFileSync(outJson, JSON.stringify({ email, items }, null, 2));
  fs.writeFileSync(outTxt, lines.join("\n"));
  return { jsonPath: outJson, txtPath: outTxt, count: items.length };
}


