# V3 Architecture

## Hard isolation

V3 never imports V1/V2 database tables or application modules.

Runtime boundaries:

GitHub repo -> V3
Supabase -> V3
Vercel -> V3
Domain -> V3

## Card flow

Admin creates/provisions card -> card gets QR/NFC configuration and activation PIN -> customer activates with PIN -> customer edits landing draft -> preview -> publish.

QR/NFC configuration is not exposed in the customer landing editor.

## Review flow

Card view -> rating interaction.

Google Review is an independent option available before and after every rating.

Private feedback accepts 1–5 stars as an optional, separate form. It never blocks or redirects the Google Review option. Internal ratings are not Google ratings.

## Analytics

Raw interaction events store `occurred_at` and `timezone`. Dashboard aggregations derive hourly, daily, weekly, and monthly views from raw events.

## Privacy

Feedback containing name/phone is private and protected by RLS. Public card access exposes only published landing content.

Google Places quota reservations are server-only after migration 0046. Business access and throttling use the caller's JWT; the secret server client only reserves the global quota. It never reads or writes customer content.
