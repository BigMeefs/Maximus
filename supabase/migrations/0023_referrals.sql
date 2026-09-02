-- External Self-Employment Referral System — additive only.
--
-- A colleague without Hub access opens an advisor-specific public link and
-- submits a referral. It shows up in that advisor's new Referrals tab for
-- Accept/Reject. Mirrors the existing Participant Income Tracker Portal's
-- "public page, no nav, a Server Action does the write" shape
-- (src/app/portal, src/lib/actions/portal.ts) rather than inventing a new
-- pattern.
--
-- Security model: per the project's existing, deliberate convention (see
-- 0004_open_shared_access.sql and README "Security model"), row level
-- security stays disabled here too — the anon key already has full
-- read/write access to every other table in this database, and that
-- boundary is not being introduced for just this one table. Protection is
-- the same as the rest of the app: the public referral page's own code
-- only ever inserts one new referral row and never reads anything back.

-- ---------------------------------------------------------------------------
-- Advisor-specific referral link tokens — one opaque, unguessable token per
-- advisor, decoupled from the advisor's real id so it's safe to put in a
-- public URL. Kept in its own table rather than adding a column to the
-- existing `advisors` table.
-- ---------------------------------------------------------------------------
create table advisor_referral_tokens (
  advisor_id uuid primary key references advisors (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);

alter table advisor_referral_tokens disable row level security;

-- Backfill a token for every existing advisor so links work immediately.
insert into advisor_referral_tokens (advisor_id)
select id from advisors
on conflict (advisor_id) do nothing;

-- New advisors get a token automatically too.
create function create_advisor_referral_token() returns trigger as $$
begin
  insert into advisor_referral_tokens (advisor_id) values (new.id);
  return new;
end;
$$ language plpgsql;

create trigger advisors_create_referral_token
  after insert on advisors
  for each row execute function create_advisor_referral_token();

-- ---------------------------------------------------------------------------
-- Referrals
-- ---------------------------------------------------------------------------
create table referrals (
  id uuid primary key default gen_random_uuid(),
  advisor_id uuid not null references advisors (id),
  advisor_name text not null,
  participant_name text not null,
  participant_eng text not null,
  business_idea text not null,
  status text not null default 'new' check (status in ('new', 'accepted', 'rejected')),
  submitted_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_participant_id uuid references participants (id),
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index referrals_advisor_id_idx on referrals (advisor_id);
create index referrals_status_idx on referrals (status);

alter table referrals disable row level security;

create trigger referrals_set_updated_at
  before update on referrals
  for each row execute function set_updated_at();
