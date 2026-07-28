-- Restaurant site schema: menu + reservations.
-- Apply with the Supabase CLI (supabase db push) or the SQL editor.

create table if not exists menu_categories (
  id text primary key,
  name text not null,
  description text,
  sort_order integer not null default 0
);

create table if not exists menu_items (
  id text primary key,
  category_id text not null references menu_categories (id) on delete cascade,
  name text not null,
  description text not null default '',
  price numeric(8, 2) not null,
  is_featured boolean not null default false,
  is_available boolean not null default true,
  dietary_tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists reservations (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  email text not null,
  phone text not null default '',
  party_size integer not null check (party_size between 1 and 20),
  requested_date date not null,
  requested_time time not null,
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Row Level Security: menu is publicly readable; reservations are
-- insert-only for anonymous visitors (staff read them via the dashboard
-- or a service-role key).
alter table menu_categories enable row level security;

alter table menu_items enable row level security;

alter table reservations enable row level security;

create policy "menu categories are public" on menu_categories for
select
  using (true);

create policy "menu items are public" on menu_items for
select
  using (true);

create policy "anyone can request a reservation" on reservations for insert
with
  check (true);

-- Seed data (mirrors src/lib/menu-data.ts)
insert into
  menu_categories (id, name, description, sort_order)
values
  ('starters', 'Starters', 'Small plates to share while you settle in.', 1),
  ('mains', 'Mains', 'From the wood-fired oven and grill.', 2),
  ('desserts', 'Desserts', 'Made in-house every morning.', 3),
  ('drinks', 'Drinks', 'Cocktails, local drafts, and a focused wine list.', 4)
on conflict (id) do nothing;

insert into
  menu_items (id, category_id, name, description, price, is_featured, dietary_tags)
values
  ('burrata', 'starters', 'Burrata & Charred Tomatoes', 'Creamy burrata, blistered cherry tomatoes, basil oil, grilled sourdough.', 14, true, '{vegetarian}'),
  ('crispy-brussels', 'starters', 'Crispy Brussels Sprouts', 'Flash-fried, tossed with chili honey and toasted pecans.', 11, false, '{vegetarian,gluten-free}'),
  ('smoked-wings', 'starters', 'Oak-Smoked Wings', 'Dry-rubbed and smoked over oak, finished on the grill. Ranch or hot honey.', 13, false, '{gluten-free}'),
  ('margherita', 'mains', 'Margherita Pizza', 'San Marzano tomato, fresh mozzarella, basil, extra-virgin olive oil.', 16, true, '{vegetarian}'),
  ('short-rib', 'mains', 'Braised Short Rib', 'Red-wine braised beef short rib, creamy polenta, gremolata.', 28, true, '{gluten-free}'),
  ('grilled-salmon', 'mains', 'Cedar-Grilled Salmon', 'Atlantic salmon on a cedar plank, charred lemon, seasonal vegetables.', 26, false, '{gluten-free}'),
  ('mushroom-rigatoni', 'mains', 'Wild Mushroom Rigatoni', 'House rigatoni, roasted wild mushrooms, garlic cream, pecorino.', 21, false, '{vegetarian}'),
  ('butter-cake', 'desserts', 'Warm Butter Cake', 'Vanilla bean ice cream, salted caramel, candied pecans.', 10, false, '{vegetarian}'),
  ('affogato', 'desserts', 'Affogato', 'Double espresso poured over house-made gelato.', 8, false, '{vegetarian,gluten-free}'),
  ('old-fashioned', 'drinks', 'Smoked Old Fashioned', 'Bourbon, demerara, bitters, smoked tableside.', 14, false, '{}'),
  ('house-red', 'drinks', 'House Red / White', 'Rotating selection from small producers. Ask your server.', 11, false, '{}')
on conflict (id) do nothing;
