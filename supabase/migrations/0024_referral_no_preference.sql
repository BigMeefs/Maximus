-- Referrals: support "No preference" submissions, and drop the external
-- form's separate "Participant Name" field down to exactly Advisor Name /
-- Participant ENG / Business Idea.
--
-- The external referral page no longer uses per-advisor token links —
-- every submitter now picks an advisor (or "No preference") from a list on
-- one shared page. "No preference" is stored as advisor_id/advisor_name
-- both NULL (an internal representation only; the external UI never shows
-- the word NULL, "unassigned", or "shared pool" — see
-- src/components/portal/referral-flow.tsx). These referrals appear in
-- every advisor's Referrals tab as a shared pool until one of them accepts
-- it, at which point it's assigned to whichever advisor accepted.
--
-- participant_name is made nullable rather than dropped: a real referral
-- already exists with a real value in that column, and this project's
-- data-preservation rules mean an existing value never gets discarded.
-- New submissions simply won't populate it going forward.

alter table referrals alter column advisor_id drop not null;
alter table referrals alter column advisor_name drop not null;
alter table referrals alter column participant_name drop not null;
