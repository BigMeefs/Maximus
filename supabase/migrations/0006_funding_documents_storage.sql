-- Storage bucket for funding application documents/receipts.

insert into storage.buckets (id, name, public)
values ('funding-documents', 'funding-documents', false)
on conflict (id) do nothing;

create policy "Open access to funding documents"
  on storage.objects for all
  to anon, authenticated
  using (bucket_id = 'funding-documents')
  with check (bucket_id = 'funding-documents');
