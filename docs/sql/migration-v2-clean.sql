create table if not exists vehicles (
  id         uuid        primary key default gen_random_uuid(),
  type       text        not null check (type in ('moto', 'velo')),
  label      text        not null,
  plate      text,
  status     text        not null default 'disponible'
             check (status in ('disponible', 'en_course', 'maintenance', 'hors_service')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into vehicles (type, label, plate, status) values
  ('moto', 'Moto principale', 'MOTO-ZO-01', 'disponible'),
  ('velo', 'Vélo livraison',  'VELO-ZO-01', 'disponible')
on conflict do nothing;

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger vehicles_updated_at
  before update on vehicles
  for each row execute function update_updated_at_column();

alter table vehicles enable row level security;

create policy "admin_all_vehicles" on vehicles
  for all using (auth.role() = 'authenticated');

create table if not exists route_plans (
  id                 uuid    primary key default gen_random_uuid(),
  planned_date       date    not null,
  vehicle_id         uuid    references vehicles(id) on delete set null,
  order_sequence     uuid[]  not null,
  waypoints          jsonb   not null default '[]',
  total_distance_km  numeric,
  total_duration_min int,
  algorithm          text    not null default 'nearest_neighbor',
  created_at         timestamptz not null default now()
);

create index if not exists route_plans_date_idx on route_plans(planned_date desc);

alter table route_plans enable row level security;

create policy "admin_all_route_plans" on route_plans
  for all using (auth.role() = 'authenticated');

alter table orders
  add column if not exists vehicle_id   uuid references vehicles(id) on delete set null,
  add column if not exists admin_note   text check (length(admin_note) <= 200),
  add column if not exists completed_at timestamptz;

create index if not exists orders_customer_phone_idx on orders(customer_phone);
create index if not exists orders_vehicle_id_idx     on orders(vehicle_id);
create index if not exists orders_completed_at_idx   on orders(completed_at desc);
create index if not exists orders_service_status_idx on orders(service, status);

create or replace view v_daily_revenue as
select
  created_at::date as day,
  count(*) as order_count,
  count(*) filter (where service = 'taxi')    as taxi_count,
  count(*) filter (where service = 'colis')   as colis_count,
  count(*) filter (where service = 'courses') as courses_count,
  coalesce(sum(case when counter_offer is not null then counter_offer else price_offered end)
    filter (where status = 'done'), 0) as revenue_ar
from orders
group by created_at::date
order by day desc;

create or replace view v_monthly_revenue as
select
  date_trunc('month', created_at)::date as month,
  count(*) as order_count,
  coalesce(sum(case when counter_offer is not null then counter_offer else price_offered end)
    filter (where status = 'done'), 0) as revenue_ar
from orders
group by date_trunc('month', created_at)::date
order by month desc;

create or replace view v_customers as
select
  customer_phone,
  max(customer_name)                                   as customer_name,
  count(*)                                             as total_orders,
  count(*) filter (where status = 'done')              as completed_orders,
  coalesce(sum(case when counter_offer is not null then counter_offer else price_offered end)
    filter (where status = 'done'), 0)                 as total_revenue_ar,
  min(created_at) as first_order_at,
  max(created_at) as last_order_at
from orders
group by customer_phone
order by total_orders desc;

alter publication supabase_realtime add table vehicles;
