import { spawnSync } from "node:child_process";

const connectionString = process.env.RLS_DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

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

const psqlArgs = connectionString ? [connectionString, "-At", "-c", query] : ["-At", "-c", query];
const result = spawnSync("psql", psqlArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

if (result.status !== 0) {
  console.error("RLS policy check failed: database connection unavailable or query failed.");
  console.error("Set RLS_DATABASE_URL as a GitHub secret, or run with PGHOST/PGUSER/PGDATABASE available.");
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(1);
}

const policies = JSON.parse(result.stdout.trim() || "[]");
const byTable = new Map();
for (const policy of policies) {
  if (!byTable.has(policy.tablename)) byTable.set(policy.tablename, []);
  byTable.get(policy.tablename).push(policy);
}

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

const failures = [];

for (const [table, expectation] of Object.entries(matrix)) {
  const tablePolicies = byTable.get(table) || [];
  if (tablePolicies.length === 0) {
    failures.push(`${table}: no RLS policies found`);
    continue;
  }

  for (const deniedCommand of expectation.denyCommands || []) {
    const denied = tablePolicies.filter((policy) => policy.cmd === deniedCommand);
    if (denied.length > 0) {
      failures.push(`${table}: ${deniedCommand} policy exists but matrix denies it (${denied.map((p) => p.policyname).join(", ")})`);
    }
  }

  for (const policy of tablePolicies) {
    if (!expectation.allowCommands.includes(policy.cmd)) {
      failures.push(`${table}: unexpected ${policy.cmd} policy '${policy.policyname}'`);
    }
    if (policy.roles.includes("anon") && table !== "app_settings") {
      failures.push(`${table}: anon role is not allowed by matrix in '${policy.policyname}'`);
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
      failures.push(`${table}: missing required ${required.cmd} policy for ${required.roles}`);
    }
  }
}

if (failures.length > 0) {
  console.error("RLS policy matrix check failed:\n" + failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(`RLS policy matrix check passed for ${Object.keys(matrix).length} tables.`);
