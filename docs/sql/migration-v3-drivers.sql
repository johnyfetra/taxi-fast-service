create table if not exists drivers (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  phone      text        not null,
  type       text        not null check (type in ('moto', 'velo')),
  status     text        not null default 'disponible'
             check (status in ('disponible', 'en_course', 'hors_ligne')),
  vehicle_id uuid        references vehicles(id) on delete set null,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger drivers_updated_at
  before update on drivers
  for each row execute function update_updated_at_column();

alter table drivers enable row level security;

create policy "admin_all_drivers" on drivers
  for all using (auth.role() = 'authenticated');

alter table orders
  add column if not exists driver_id uuid references drivers(id) on delete set null;

create index if not exists orders_driver_id_idx on orders(driver_id);
create index if not exists drivers_status_idx   on drivers(status);

alter publication supabase_realtime add table drivers;
