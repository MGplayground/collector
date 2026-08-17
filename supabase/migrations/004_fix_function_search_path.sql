-- Not yet applied to project oidnhbmhjzcrvyjjfmes.
-- Pins search_path on the updated_at trigger function (lint
-- 0011_function_search_path_mutable), which currently resolves unqualified names
-- against whatever search_path the calling role happens to have.
--
-- Honest scope: this one is hardening, not a live hole. The body references only
-- now() and NEW, and pg_catalog is implicitly searched ahead of search_path, so
-- now() cannot be shadowed by a schema planted earlier on the path (verified
-- both ways against a scratch cluster). The function is also SECURITY INVOKER,
-- so a caller gains nothing by influencing it. What pinning buys is that the
-- next line added to this body — a lookup of a table, a cast, a non-catalog
-- operator — cannot silently start resolving somewhere unintended.
--
-- Reversible: alter function public.update_updated_at() reset search_path;

-- create or replace keeps the function's oid, so the existing items_updated_at
-- trigger keeps pointing at it: no trigger drop, and no window in which updates
-- to items stop stamping updated_at. The body is unchanged from 001 apart from
-- case, and re-running this file is a no-op.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
