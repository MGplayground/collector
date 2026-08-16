-- Applied to project oidnhbmhjzcrvyjjfmes on 2026-08-16.
-- Public bucket: public CDN URLs, writes restricted to authenticated.
-- 5 MB cap enforces client-side compression server-side.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-images', 'card-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "authenticated insert card-images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'card-images');

create policy "authenticated update card-images"
  on storage.objects for update to authenticated
  using (bucket_id = 'card-images');

create policy "authenticated delete card-images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'card-images');

create policy "public read card-images"
  on storage.objects for select to public
  using (bucket_id = 'card-images');
