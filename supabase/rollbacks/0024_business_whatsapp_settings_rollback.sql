-- Rollback Contact & WhatsApp settings V1

drop function if exists public.v3_get_public_business_contact(text);
drop function if exists public.v3_update_business_contact_settings(uuid, text);
drop function if exists public.v3_get_business_contact_settings(uuid);

alter table public.businesses
  drop column if exists whatsapp_number;

notify pgrst, 'reload schema';
