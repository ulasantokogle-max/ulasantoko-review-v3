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

Ratings 4–5 can continue to Google Review.

Ratings 1–3 are stored privately as feedback and are not posted as public Google reviews.

## Analytics

Raw interaction events store `occurred_at` and `timezone`. Dashboard aggregations derive hourly, daily, weekly, and monthly views from raw events.

## Privacy

Feedback containing name/phone is private and protected by RLS. Public card access exposes only published landing content.
