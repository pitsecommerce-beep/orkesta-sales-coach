-- Fix: replace restrictive "authenticated only" policies with open access
-- for this internal tool (no auth layer).
-- Run this in the Supabase SQL Editor.

-- Drop existing policies
drop policy if exists "auth_all" on sellers;
drop policy if exists "auth_all" on products;
drop policy if exists "auth_all" on clients;
drop policy if exists "auth_all" on calls;

-- Full access for all (anon + authenticated) — appropriate for internal tools
create policy "open_access" on sellers for all using (true) with check (true);
create policy "open_access" on products for all using (true) with check (true);
create policy "open_access" on clients for all using (true) with check (true);
create policy "open_access" on calls for all using (true) with check (true);
