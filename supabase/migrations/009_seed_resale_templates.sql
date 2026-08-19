-- Applied to project oidnhbmhjzcrvyjjfmes on 2026-08-17.
--
-- There is no template authoring UI yet, so the composer would otherwise open
-- with an empty picker. These are starting points, editable in the database
-- until authoring exists.
--
-- Placeholders resolve against resale_items.attributes. One with no value is
-- stripped by render() and reported as a gap rather than an error, so a
-- template may safely reference an optional field.

insert into resale_templates (owner_id, name, category, title_template, description_template, hashtags)
select
  (select id from auth.users order by created_at limit 1),
  t.name, t.category, t.title_template, t.description_template, t.hashtags
from (values
  ('Clothing — standard', 'clothing',
   '{{brand}} {{name}} — {{size}}',
   E'{{colour}} {{material}}.\n\nCondition: {{condition}}. Measurements: pit to pit {{pit_to_pit}}cm, length {{length}}cm.\n\nPosted next working day, sent tracked.',
   array['vintage','secondhand','thrifted','streetwear','preloved']),
  ('Cards — single', 'cards',
   '{{name}} {{number}} — {{set}}',
   E'{{set}} {{number}}.\n\nCondition: {{condition}}. {{condition_detail}}\n\nSent in a penny sleeve and toploader, tracked.',
   array['pokemoncards','tcg','cardcollector','vintagecards','pokemon']),
  ('Sealed — product', 'sealed',
   '{{name}} — {{set}} sealed',
   E'Factory sealed {{set}}, {{language}}.\n\nStored away from light and heat. Sent double boxed and tracked.',
   array['sealed','pokemontcg','boosterbox','tcg','collectibles']),
  ('Simple', 'other',
   '{{name}}',
   E'Condition: {{condition}}.\n\nPosted next working day, sent tracked.',
   array['secondhand','preloved'])
) as t(name, category, title_template, description_template, hashtags)
where exists (select 1 from auth.users);
