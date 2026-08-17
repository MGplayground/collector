-- Applied to project oidnhbmhjzcrvyjjfmes on 2026-08-16.
-- Separates form (item_type) from grading (is_raw), which were conflated.
-- Reversible: alter table items drop column item_type;

alter table items
  add column item_type text not null default 'card'
  check (item_type in ('card', 'booster_pack', 'booster_box', 'sealed_other'));

-- the one seed row that is sealed product, not a raw card
update items
   set item_type = 'booster_box'
 where name = 'Riftbound Vendetta Booster Box';
