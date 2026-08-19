-- Applied to project oidnhbmhjzcrvyjjfmes on 2026-08-17.
--
-- Reordering photos from the client meant upserting whole rows, which sends
-- storage_path back and can overwrite it from a stale local copy. Individual
-- updates are not an option either: positions collide mid-swap, and the
-- deferrable constraint only helps inside one transaction.
--
-- This does the renumber in a single statement, taking only the ids.
create or replace function resale_reorder_photos(photo_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.resale_photos p
     set position = ordering.idx - 1
    from unnest(photo_ids) with ordinality as ordering(id, idx)
   where p.id = ordering.id
     and p.owner_id = auth.uid();
end;
$$;
