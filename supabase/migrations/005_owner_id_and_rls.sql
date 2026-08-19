-- Applied to project oidnhbmhjzcrvyjjfmes on 2026-08-17.
--
-- Before this, every table had a single policy named "owner_all" granting ALL to
-- authenticated with no ownership check — harmless with one account, wrong the
-- moment a second person can log in.
--
-- Verified after applying, as the authenticated role: the owner still sees 5
-- items / 3 price_history / 7 release_calendar, and a different uuid sees 0.

alter table items            add column owner_id uuid references auth.users(id) on delete cascade;
alter table price_history    add column owner_id uuid references auth.users(id) on delete cascade;
alter table release_calendar add column owner_id uuid references auth.users(id) on delete cascade;

-- Single-account app at time of migration (checked: one row in auth.users).
update items            set owner_id = (select id from auth.users order by created_at limit 1);
update price_history    set owner_id = (select id from auth.users order by created_at limit 1);
update release_calendar set owner_id = (select id from auth.users order by created_at limit 1);

alter table items            alter column owner_id set not null;
alter table items            alter column owner_id set default auth.uid();
alter table price_history    alter column owner_id set not null;
alter table price_history    alter column owner_id set default auth.uid();
alter table release_calendar alter column owner_id set not null;
alter table release_calendar alter column owner_id set default auth.uid();

drop policy "owner_all" on items;
drop policy "owner_all" on price_history;
drop policy "owner_all" on release_calendar;

create policy "owner_rw" on items for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_rw" on price_history for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_rw" on release_calendar for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create index items_owner_id_idx            on items (owner_id);
create index price_history_owner_id_idx    on price_history (owner_id);
create index release_calendar_owner_id_idx on release_calendar (owner_id);

-- Client impact: none. owner_id defaults to auth.uid(), so inserts are unchanged.
