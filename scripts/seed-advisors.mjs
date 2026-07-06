// One-off script to create the four advisor accounts in Supabase Auth.
//
// Usage:
//   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... ADVISOR_PASSWORD=... node scripts/seed-advisors.mjs
//
// Run this once against your Supabase project after applying the migrations
// in supabase/migrations. Each advisor gets an account named
// "<firstname>@caseload.local"; a profile row is created automatically by
// the on_auth_user_created trigger.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ADVISOR_PASSWORD;

if (!url || !serviceRoleKey || !password) {
  console.error(
    "Missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADVISOR_PASSWORD",
  );
  process.exit(1);
}

const advisors = ["Kyle", "Charles", "Elliott", "Aroosa"];

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const name of advisors) {
  const email = `${name.toLowerCase()}@caseload.local`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (error) {
    console.error(`Failed to create ${name} (${email}):`, error.message);
  } else {
    console.log(`Created advisor ${name} -> ${email} (id: ${data.user.id})`);
  }
}
