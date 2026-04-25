import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = "supabase/migrations";
const failures = [];
const latestFunctions = new Map();

function readSqlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({ file, content: readFileSync(join(dir, file), "utf8") }));
}

function collectLatestFunctionDefinitions() {
  const functionRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)\s*\([\s\S]*?\n\s*(?:\$function\$|\$\$)\s*;/gi;

  for (const { file, content } of readSqlFiles(migrationsDir)) {
    for (const match of content.matchAll(functionRegex)) {
      latestFunctions.set(match[1], { file, definition: match[0] });
    }
  }
}

function hasOwnerOrAdminGuard(definition) {
  return /auth\.uid\(\)\s*=\s*(?:p\.)?id/i.test(definition)
    || /auth\.uid\(\)\s*=\s*_user_id/i.test(definition)
    || /has_role\s*\(\s*auth\.uid\(\)\s*,\s*'admin'/i.test(definition);
}

function scanSecurityDefinerProfileAccess() {
  const sensitiveFields = /\b(security_email|phone_number|phone_normalized)\b/i;
  const sensitiveReturn = /RETURNS\s+TABLE\s*\([^)]*\b(security_email|phone_number|phone_normalized)\b/i;
  const phoneFallback = /COALESCE\s*\([^;]*\bphone_number\b/ims;

  for (const [name, { file, definition }] of latestFunctions) {
    if (!/SECURITY\s+DEFINER/i.test(definition)) continue;
    if (!/\bprofiles\b/i.test(definition)) continue;

    if (sensitiveReturn.test(definition)) {
      failures.push(`${file}: ${name} returns sensitive profile fields from a SECURITY DEFINER function.`);
    }

    if (phoneFallback.test(definition)) {
      failures.push(`${file}: ${name} may leak phone_number as a display-name fallback.`);
    }

    if (/\bsecurity_email\b/i.test(definition) && !hasOwnerOrAdminGuard(definition)) {
      failures.push(`${file}: ${name} reads security_email without an owner/admin guard.`);
    }

    if (/SELECT[\s\S]{0,300}\b(phone_number|phone_normalized)\b/i.test(definition)
        && !/normalize_contact_phone/i.test(definition)
        && !hasOwnerOrAdminGuard(definition)) {
      failures.push(`${file}: ${name} reads phone fields without an owner/admin guard.`);
    }
  }
}

function scanEdgeFunctionsForRawSensitiveProfileResponses() {
  const functionsDir = "supabase/functions";
  if (!existsSync(functionsDir)) return;

  for (const functionName of readdirSync(functionsDir)) {
    const indexPath = join(functionsDir, functionName, "index.ts");
    if (!existsSync(indexPath)) continue;

    const content = readFileSync(indexPath, "utf8");
    if (!/from\(["']profiles["']\)/.test(content)) continue;

    const sensitiveSelect = /\.select\(["'`][^"'`]*(security_email|phone_number|phone_normalized)[^"'`]*["'`]\)/i;
    const isAdminFunction = /admin|role.*admin|admin role required/i.test(content);

    if (sensitiveSelect.test(content) && !isAdminFunction) {
      failures.push(`${indexPath}: non-admin function selects sensitive profile fields.`);
    }
  }
}

collectLatestFunctionDefinitions();
scanSecurityDefinerProfileAccess();
scanEdgeFunctionsForRawSensitiveProfileResponses();

if (failures.length > 0) {
  console.error("Security scan failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Security scan passed: no sensitive profile leaks detected in active SECURITY DEFINER functions.");
