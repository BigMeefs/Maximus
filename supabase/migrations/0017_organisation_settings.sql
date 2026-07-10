-- Organisation Settings — a singleton row future deployments edit to
-- rebrand the app for a different organisation/contract without touching
-- code: organisation name, application name, logo, and the two brand
-- colours applied to the shared chrome (logo mark, nav/login primary
-- buttons — see README for the exact scope of what the colours affect).

create table organisation_settings (
  id uuid primary key default gen_random_uuid(),
  org_name text not null default 'Maximus UK',
  app_name text not null default 'Max Self Employment Hub',
  logo_path text,
  logo_name text,
  primary_color text not null default '#4f46e5',
  secondary_color text not null default '#0f172a',
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table organisation_settings disable row level security;

create trigger organisation_settings_set_updated_at
  before update on organisation_settings
  for each row execute function set_updated_at();

-- Singleton seed row, matching the app's existing default branding exactly
-- (indigo-600 / slate-900), so nothing visibly changes until an admin
-- deliberately edits it.
insert into organisation_settings default values;

-- Public bucket: a logo is not sensitive, and needs to render on every page
-- (including the public Participant Portal) without a signed-URL round
-- trip per request.
insert into storage.buckets (id, name, public)
values ('organisation-branding', 'organisation-branding', true)
on conflict (id) do nothing;

create policy "Open access to organisation branding"
  on storage.objects for all
  to anon, authenticated
  using (bucket_id = 'organisation-branding')
  with check (bucket_id = 'organisation-branding');
