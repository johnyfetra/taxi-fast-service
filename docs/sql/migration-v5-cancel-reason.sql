-- v5: Add cancellation_reason column + client_cancelled status
-- Run in Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Allow 'client_cancelled' in the status check constraint if one exists
-- If you have a CHECK constraint on status, update it:
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check
--   CHECK (status IN ('client_accepted','client_countered','client_cancelled','confirmed','in_progress','done','cancelled'));
