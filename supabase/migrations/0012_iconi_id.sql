-- Iconi ID — the participant's reference number in Iconi (the org's
-- primary case management system). Nullable (existing participants won't
-- have one yet) but unique when present.

alter table participants
  add column iconi_id text;

create unique index participants_iconi_id_key
  on participants (iconi_id)
  where iconi_id is not null;
