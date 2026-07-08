-- Migration v7: notifications table
-- Run in Supabase SQL Editor

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient   text not null,        -- 'admin' or client phone number
  title       text not null,
  body        text,
  order_id    uuid,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table notifications enable row level security;

create policy "service_role_all_notifications"
  on notifications for all to service_role
  using (true) with check (true);

create index notifications_recipient_idx on notifications(recipient);
create index notifications_read_idx      on notifications(recipient, read);

-- Enable realtime
alter publication supabase_realtime add table notifications;
