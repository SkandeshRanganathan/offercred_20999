import { generateAllCompanyCredentialSignatures } from "./signatureGenerator.js";

const email = "kishoreganapathy2005@gmail.com";
const password = "123456";

const result = generateAllCompanyCredentialSignatures(email, password);
console.log(JSON.stringify(result));


