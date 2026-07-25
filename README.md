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
   For an existing project created before secure profile settings, also run `supabase/migrations/20260724_secure_profile_updates.sql`.
   For an existing project created before assignment feedback and welcome videos, also run `supabase/migrations/20260724_assignment_feedback_and_welcome_videos.sql`.
   For an existing project created before live inline checkout, also run `supabase/migrations/20260724_paystack_inline_and_subscriptions.sql`.
   To allow students to own and switch between multiple tracks, also run `supabase/migrations/20260724_multi_track_enrollments.sql`.
   To enable secure post-submission answer corrections, also run `supabase/migrations/20260725_secure_quiz_feedback.sql`.
2. Run `supabase/seed_original_curriculum.sql` to load the 32 original lessons and all 96 ordered quiz questions.
3. Add the environment variables from `.env.example`.
4. In Paystack, set the webhook to `https://learn.beoarts.com/api/paystack/webhook`.
   Enable international card payments on the Paystack business. Every transaction is charged and settled in NGN; non-Nigerian visitors are restricted to card checkout and see a display-only USD estimate.
   Guided monthly enrollment creates a three-payment NGN Paystack subscription automatically. Existing plan codes may optionally be supplied through the two `PAYSTACK_*_MONTHLY_PLAN_CODE_NGN` variables.
5. Add each unlisted YouTube video ID, lesson notes, and assignment instructions in Supabase.
6. Promote Benjamin’s profile to `admin` with the final SQL statement in the schema.
7. Configure WhatsApp Cloud API variables, or Resend variables for the email fallback.

The future automation, certificates, mentorship, and workbook-driven quiz work are recorded in `docs/SCHOOL_ROADMAP.md`.

Quiz answers are scored server-side, Paystack webhooks are signature-verified, private assignment uploads use signed URLs, and RLS isolates each student’s data.
