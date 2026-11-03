-- Add planning inquiries without changing table access, consent, or service availability.
alter table public.contact_submissions drop constraint contact_submissions_category_check;
alter table public.contact_submissions add constraint contact_submissions_category_check
 check (category in ('general','flooding','evidence','correction','sponsorship','story','meeting_alerts','privacy','storm_cleanup_planning'));
