-- Applied to project oidnhbmhjzcrvyjjfmes on 2026-08-17.
-- Same shape as the card-images bucket: public read, authenticated write,
-- 5 MB cap so an uncompressed upload fails loudly instead of eating the tier.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resale-photos', 'resale-photos', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "authenticated insert resale-photos"
  on storage.objects for insert to authenticated with check (bucket_id = 'resale-photos');
create policy "authenticated update resale-photos"
  on storage.objects for update to authenticated using (bucket_id = 'resale-photos');
create policy "authenticated delete resale-photos"
  on storage.objects for delete to authenticated using (bucket_id = 'resale-photos');
create policy "public read resale-photos"
  on storage.objects for select to public using (bucket_id = 'resale-photos');
