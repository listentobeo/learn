# Beo School of Art · Vol. 1

A mobile-first course platform built with Next.js, Supabase, Paystack, YouTube and WhatsApp/Email notifications.

## Start locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs in a polished demo mode when Supabase and Paystack keys are absent. Visit `/dashboard`, `/lesson/DR3`, and `/admin` to preview all major surfaces.

## Production setup

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor.
   For an existing project created before quiz retakes, also run `supabase/migrations/20260724_enable_quiz_retakes.sql`.
   For an existing project created before international pricing, also run `supabase/migrations/20260724_add_international_payments.sql`.
2. Add the environment variables from `.env.example`.
3. In Paystack, set the webhook to `https://learn.beoarts.com/api/paystack/webhook`.
   Enable international/USD payments on the Paystack business; non-Nigerian visitors are charged in USD and restricted to card checkout.
4. Add each unlisted YouTube video ID, lesson notes, assignments, and three quiz questions in Supabase.
5. Promote Benjamin’s profile to `admin` with the final SQL statement in the schema.
6. Configure WhatsApp Cloud API variables, or Resend variables for the email fallback.

Quiz answers are scored server-side, Paystack webhooks are signature-verified, private assignment uploads use signed URLs, and RLS isolates each student’s data.
