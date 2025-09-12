import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const companiesPath = path.join(process.cwd(), "src", "companies.json");

function loadCompaniesRaw() {
  try {
    const raw = JSON.parse(fs.readFileSync(companiesPath, "utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveCompaniesRaw(list) {
  fs.writeFileSync(companiesPath, JSON.stringify(list, null, 2));
}

export function ensureCompanyKeypairs() {
  const list = loadCompaniesRaw();
  let changed = false;
  for (const entry of list) {
    if (!entry.publicKeyPem || !entry.privateKeyPem) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
      entry.publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
      entry.privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
      changed = true;
    }
  }
  if (changed) saveCompaniesRaw(list);
}

export function getCompanyKeys(cinOrName) {
  const list = loadCompaniesRaw();
  const needle = (cinOrName || "").toString().trim().toUpperCase();
  const entry = list.find((e) => (e.CIN || "").toString().trim().toUpperCase() === needle || (e.Name || "").toString().trim().toUpperCase() === needle);
  if (!entry || !entry.publicKeyPem || !entry.privateKeyPem) return null;
  return { publicKeyPem: entry.publicKeyPem, privateKeyPem: entry.privateKeyPem };
}

export function signBufferWithCompanyPrivateKey(cinOrName, buffer) {
  const keys = getCompanyKeys(cinOrName);
  if (!keys) return null;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(buffer);
  signer.end();
  const signature = signer.sign(keys.privateKeyPem);
  return signature.toString("base64");
}

export function verifyBufferWithCompanyPublicKey(cinOrName, buffer, signatureBase64) {
  const keys = getCompanyKeys(cinOrName);
  if (!keys) return false;
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(buffer);
  verifier.end();
  const signature = Buffer.from(signatureBase64, "base64");
  return verifier.verify(keys.publicKeyPem, signature);
}

export function signCredentialsWithCompany(cinOrName, email, password) {
  const message = Buffer.from(`${email}\n${password}`, "utf-8");
  return signBufferWithCompanyPrivateKey(cinOrName, message);
}

export function verifyCredentialsWithCompany(cinOrName, email, password, signatureBase64) {
  const message = Buffer.from(`${email}\n${password}`, "utf-8");
  return verifyBufferWithCompanyPublicKey(cinOrName, message, signatureBase64);
}


