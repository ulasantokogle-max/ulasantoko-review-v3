-- UlasanToko Review V3
-- Allow authenticated dashboard users to read feedback rows subject to existing RLS policy.

grant select on table public.feedback_submissions to authenticated;
