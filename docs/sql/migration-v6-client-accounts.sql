-- Migration v6: client tracking accounts
-- Run in Supabase SQL Editor

create table if not exists customer_accounts (
  phone              text primary key,
  access_code        text not null,
  session_token      text,
  session_expires_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table customer_accounts enable row level security;

create policy "service_role_all_customer_accounts"
  on customer_accounts for all to service_role
  using (true) with check (true);

create or replace function customer_accounts_set_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger customer_accounts_updated_at
  before update on customer_accounts
  for each row execute function customer_accounts_set_updated_at();
