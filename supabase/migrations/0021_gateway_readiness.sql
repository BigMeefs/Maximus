-- Gateway Readiness reform — the Hub must not imply advisors make Gainful
-- Self Employment decisions; Universal Credit does, via the Gateway
-- Outcome recorded on participants (gateway_outcome, added in 0020). The
-- old "Gainful Decision" sign-off (advisor recommendation + manager
-- approval + an internal Ready/Needs Further Evidence/Not Yet Ready
-- verdict) is retired along with that framing. What's left is purely an
-- advisor readiness checklist, renamed to match.

alter table gainful_assessments rename to gateway_readiness;

-- "Invoices Available" used to be read live from the (now UI-retired)
-- Gateway Assessment manual checklist; it becomes a direct manual item on
-- the readiness checklist instead, backfilled from that checklist's last
-- recorded value so nothing advisors already ticked is lost.
alter table gateway_readiness add column invoices_available boolean not null default false;

update gateway_readiness gr
set invoices_available = coalesce((
  select gci.is_complete from gateway_checklist_items gci
  where gci.participant_id = gr.participant_id and gci.item = 'Invoices Available'
), false);

-- Fold whatever advisors/managers had already recorded into a plain notes
-- field before the recommendation/approval columns are dropped, so none of
-- it is silently lost.
alter table gateway_readiness add column notes text;

update gateway_readiness
set notes = trim(both E'\n' from
  concat_ws(E'\n',
    case when advisor_recommendation is not null and advisor_recommendation <> '' then 'Advisor notes: ' || advisor_recommendation else null end,
    case when manager_notes is not null and manager_notes <> '' then 'Manager notes: ' || manager_notes else null end,
    case when manager_approval or overall_recommendation <> 'Not Yet Ready'
      then 'Historical internal recommendation (pre-reform): ' || overall_recommendation || case when manager_approval then ' (manager approved)' else '' end
      else null end
  )
)
where advisor_recommendation is not null
  or manager_notes is not null
  or manager_approval
  or overall_recommendation <> 'Not Yet Ready';

alter table gateway_readiness
  drop column advisor_recommendation,
  drop column manager_approval,
  drop column manager_notes,
  drop column overall_recommendation,
  drop column decision_date;

drop type gainful_recommendation;
