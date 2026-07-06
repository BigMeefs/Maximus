-- Storage buckets for business plan documents and evidence library files.
-- Objects are stored under a path of "<advisor_id>/<participant_id>/<filename>"
-- so RLS can restrict access to the owning advisor.

insert into storage.buckets (id, name, public)
values ('business-plans', 'business-plans', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('evidence-files', 'evidence-files', false)
on conflict (id) do nothing;

create policy "Advisors manage their own business plan files"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'business-plans' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'business-plans' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Advisors manage their own evidence files"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'evidence-files' and (storage.foldername(name))[1] = auth.uid()::text);
