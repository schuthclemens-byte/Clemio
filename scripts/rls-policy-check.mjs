import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const connectionString = process.env.RLS_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const scriptPath = fileURLToPath(import.meta.url).replace(`${process.cwd()}/`, "");

const query = `
select coalesce(json_agg(row_to_json(p) order by tablename, policyname), '[]'::json)
from (
  select
    schemaname,
    tablename,
    policyname,
    cmd,
    roles::text as roles,
    coalesce(qual, '') as qual,
    coalesce(with_check, '') as with_check
  from pg_policies
  where schemaname = 'public'
) p;
`;

const matrix = {
  contact_submissions: {
    allowCommands: ["SELECT", "UPDATE", "DELETE"],
    denyCommands: ["INSERT"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "UPDATE", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "DELETE", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
    ],
  },
  profiles: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "auth.uid() = id" },
      { cmd: "INSERT", roles: "authenticated", with_check: "auth.uid() = id" },
      { cmd: "UPDATE", roles: "authenticated", qual: "auth.uid() = id" },
      { cmd: "DELETE", roles: "authenticated", qual: "auth.uid() = id" },
    ],
  },
  reports: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "SELECT", roles: "authenticated", qual: "auth.uid() = reported_by" },
      { cmd: "INSERT", roles: "authenticated", with_check: "auth.uid() = reported_by" },
      { cmd: "UPDATE", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "DELETE", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
    ],
  },
  user_roles: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "SELECT", roles: "authenticated", qual: "auth.uid() = user_id" },
      { cmd: "INSERT", roles: "authenticated", with_check: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "UPDATE", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)", with_check: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "DELETE", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
    ],
  },
  messages: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "is_conversation_member(conversation_id, auth.uid())" },
      { cmd: "INSERT", roles: "authenticated", with_check: "auth.uid() = sender_id", with_check_also: "is_conversation_member(conversation_id, auth.uid())" },
      { cmd: "UPDATE", roles: "authenticated", qual: "auth.uid() = sender_id", qual_also: "created_at >", with_check: "is_conversation_member(conversation_id, auth.uid())" },
      { cmd: "DELETE", roles: "authenticated", qual: "auth.uid() = sender_id", qual_also: "created_at >" },
    ],
  },
  conversations: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "is_conversation_member(id, auth.uid())" },
      { cmd: "INSERT", roles: "authenticated", with_check: "auth.uid() = created_by" },
      { cmd: "UPDATE", roles: "authenticated", qual: "is_conversation_member(id, auth.uid())" },
      { cmd: "DELETE", roles: "authenticated", qual: "auth.uid() = created_by" },
    ],
  },
  conversation_members: {
    allowCommands: ["SELECT", "INSERT", "DELETE"],
    denyCommands: ["UPDATE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "is_conversation_member(conversation_id, auth.uid())" },
      { cmd: "INSERT", roles: "authenticated", with_check: "created_by = auth.uid()" },
      { cmd: "DELETE", roles: "authenticated", qual: "user_id = auth.uid()" },
    ],
  },
  chat_invitations: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "auth.uid() = invited_by", qual_also: "auth.uid() = invited_user_id" },
      { cmd: "INSERT", roles: "authenticated", with_check: "auth.uid() = invited_by" },
      { cmd: "UPDATE", roles: "authenticated", qual: "auth.uid() = invited_user_id" },
      { cmd: "DELETE", roles: "authenticated", qual: "auth.uid() = invited_by", qual_also: "auth.uid() = invited_user_id" },
    ],
  },
  blocked_users: {
    allowCommands: ["SELECT", "INSERT", "DELETE"],
    denyCommands: ["UPDATE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "auth.uid() = blocked_by" },
      { cmd: "SELECT", roles: "authenticated", qual: "auth.uid() = user_id" },
      { cmd: "INSERT", roles: "authenticated", with_check: "auth.uid() = blocked_by" },
      { cmd: "DELETE", roles: "authenticated", qual: "auth.uid() = blocked_by" },
    ],
  },
  voice_consents: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "auth.uid() = voice_owner_id", qual_also: "auth.uid() = granted_to_user_id" },
      { cmd: "INSERT", roles: "authenticated", with_check: "auth.uid() = voice_owner_id" },
      { cmd: "UPDATE", roles: "authenticated", qual: "auth.uid() = voice_owner_id", with_check: "auth.uid() = voice_owner_id" },
      { cmd: "DELETE", roles: "authenticated", qual: "auth.uid() = voice_owner_id" },
    ],
  },
  voice_profiles: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "auth.uid() = user_id" },
      { cmd: "INSERT", roles: "authenticated", with_check: "auth.uid() = user_id" },
      { cmd: "UPDATE", roles: "authenticated", qual: "auth.uid() = user_id" },
      { cmd: "DELETE", roles: "authenticated", qual: "auth.uid() = user_id" },
    ],
  },
  push_subscriptions: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "auth.uid() = user_id" },
      { cmd: "SELECT", roles: "service_role", qual: "true" },
      { cmd: "INSERT", roles: "authenticated", with_check: "auth.uid() = user_id" },
      { cmd: "UPDATE", roles: "authenticated", qual: "auth.uid() = user_id", with_check: "auth.uid() = user_id" },
      { cmd: "DELETE", roles: "authenticated", qual: "auth.uid() = user_id" },
    ],
  },
  app_settings: {
    allowCommands: ["SELECT", "INSERT", "UPDATE", "DELETE"],
    required: [
      { cmd: "SELECT", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "SELECT", roles: "anon", qual: "key = 'launch_mode'::text" },
      { cmd: "INSERT", roles: "authenticated", with_check: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "UPDATE", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)", with_check: "has_role(auth.uid(), 'admin'::app_role)" },
      { cmd: "DELETE", roles: "authenticated", qual: "has_role(auth.uid(), 'admin'::app_role)" },
    ],
  },
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\(+/g, "(")
    .replace(/\)+/g, ")")
    .trim();
}

function includesExpression(actual, expected) {
  if (!expected) return true;
  return normalize(actual).includes(normalize(expected));
}

function includesRole(actual, expectedRole) {
  if (!expectedRole) return true;
  return String(actual || "").includes(expectedRole);
}

function annotationEscape(value) {
  return String(value)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

function findLine(content, matcher) {
  const lines = content.split("\n");
  const index = lines.findIndex((line) => matcher.test(line));
  return index >= 0 ? index + 1 : 1;
}

function getMatrixLocation(table) {
  const content = readFileSync(scriptPath, "utf8");
  return {
    file: scriptPath,
    line: findLine(content, new RegExp(`^\\s*${escapeRegExp(table)}\\s*:`)),
  };
}

function getPolicyLocations() {
  const locations = new Map();
  const dir = "supabase/migrations";
  if (!existsSync(dir)) return locations;

  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    const filePath = join(dir, file);
    const content = readFileSync(filePath, "utf8");
    const policyRegex = /CREATE\s+POLICY\s+(?:"([^"]+)"|([^\s]+))[\s\S]*?ON\s+public\.([a-zA-Z0-9_]+)/gi;

    for (const match of content.matchAll(policyRegex)) {
      const policyname = match[1] || match[2];
      const table = match[3];
      const before = content.slice(0, match.index);
      locations.set(`${table}:${policyname}`, {
        file: filePath,
        line: before.split("\n").length,
      });
    }
  }

  return locations;
}

const psqlArgs = connectionString ? [connectionString, "-At", "-c", query] : ["-At", "-c", query];
const result = spawnSync("psql", psqlArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

if (result.status !== 0) {
  const location = getMatrixLocation("contact_submissions");
  const message = "RLS policy check failed: database connection unavailable or query failed. Set RLS_DATABASE_URL as a GitHub secret, or run with PGHOST/PGUSER/PGDATABASE available.";
  console.error(`::error file=${location.file},line=${location.line},title=RLS database connection::${annotationEscape(message)}`);
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

const policies = JSON.parse(result.stdout.trim() || "[]");
const byTable = new Map();
for (const policy of policies) {
  if (!byTable.has(policy.tablename)) byTable.set(policy.tablename, []);
  byTable.get(policy.tablename).push(policy);
}

const policyLocations = getPolicyLocations();
const failures = [];

function policyLocation(policy) {
  return policyLocations.get(`${policy.tablename}:${policy.policyname}`) || getMatrixLocation(policy.tablename);
}

function addFailure({ table, cmd, policy, message }) {
  const location = policy ? policyLocation(policy) : getMatrixLocation(table);
  failures.push({
    file: location.file,
    line: location.line,
    title: `RLS ${table}${cmd ? ` ${cmd}` : ""}`,
    message: policy ? `${message} Policy: ${policy.policyname}` : message,
  });
}

for (const [table, expectation] of Object.entries(matrix)) {
  const tablePolicies = byTable.get(table) || [];
  if (tablePolicies.length === 0) {
    addFailure({ table, message: `${table}: no RLS policies found` });
    continue;
  }

  for (const deniedCommand of expectation.denyCommands || []) {
    const denied = tablePolicies.filter((policy) => policy.cmd === deniedCommand);
    for (const policy of denied) {
      addFailure({ table, cmd: deniedCommand, policy, message: `${table}: ${deniedCommand} policy exists but matrix denies it.` });
    }
  }

  for (const policy of tablePolicies) {
    if (!expectation.allowCommands.includes(policy.cmd)) {
      addFailure({ table, cmd: policy.cmd, policy, message: `${table}: unexpected ${policy.cmd} policy.` });
    }
    if (policy.roles.includes("anon") && table !== "app_settings") {
      addFailure({ table, cmd: policy.cmd, policy, message: `${table}: anon role is not allowed by matrix.` });
    }
  }

  for (const required of expectation.required) {
    const match = tablePolicies.find((policy) =>
      policy.cmd === required.cmd
      && includesRole(policy.roles, required.roles)
      && includesExpression(policy.qual, required.qual)
      && includesExpression(policy.qual, required.qual_also)
      && includesExpression(policy.with_check, required.with_check)
      && includesExpression(policy.with_check, required.with_check_also)
    );

    if (!match) {
      const expectedParts = [
        `role=${required.roles}`,
        required.qual ? `using includes "${required.qual}"` : null,
        required.qual_also ? `using also includes "${required.qual_also}"` : null,
        required.with_check ? `check includes "${required.with_check}"` : null,
        required.with_check_also ? `check also includes "${required.with_check_also}"` : null,
      ].filter(Boolean).join("; ");
      addFailure({ table, cmd: required.cmd, message: `${table}: missing required ${required.cmd} policy (${expectedParts}).` });
    }
  }
}

if (failures.length > 0) {
  console.error(`RLS policy matrix check failed with ${failures.length} issue(s).`);
  for (const failure of failures) {
    console.error(`::error file=${failure.file},line=${failure.line},title=${annotationEscape(failure.title)}::${annotationEscape(failure.message)}`);
    console.error(`- ${failure.file}:${failure.line} ${failure.message}`);
  }
  process.exit(1);
}

console.log(`RLS policy matrix check passed for ${Object.keys(matrix).length} tables.`);
