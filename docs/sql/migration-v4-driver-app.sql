alter table drivers
  add column if not exists pin_code          text,
  add column if not exists session_token     text,
  add column if not exists session_expires_at timestamptz;

alter table orders
  add column if not exists driver_status text
    check (driver_status in ('assigné','accepté','occupé','en_cours','livré','problème','rejeté'));

create index if not exists orders_driver_status_idx on orders(driver_status);
