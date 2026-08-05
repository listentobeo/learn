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

1. Create a Supabase project and run `supabase/schema.sql` in the SQL editor, then run every file in `supabase/migrations` in filename order. Existing projects can run only migrations that have not already been applied.
2. Run `supabase/seed_original_curriculum.sql` to load the 32 original lessons and all 96 ordered quiz questions.
3. Add the environment variables from `.env.example`.
4. In Paystack, set the webhook to `https://learn.beoarts.com/api/paystack/webhook`.
   Enable international card payments on the Paystack business. Every transaction is charged and settled in NGN; non-Nigerian visitors are restricted to card checkout and see a display-only USD estimate.
   Guided monthly enrollment creates a three-payment NGN Paystack subscription automatically. Existing plan codes may optionally be supplied through the two `PAYSTACK_*_MONTHLY_PLAN_CODE_NGN` variables.
5. Add each unlisted YouTube video ID, lesson notes, and assignment instructions in Supabase.
6. Promote Benjamin’s profile to `admin` with the final SQL statement in the schema.
7. Configure Resend and verify the `alerts.beoarts.com` sending domain. Set `RESEND_FROM_EMAIL` to `Beo School of Art <school@alerts.beoarts.com>`. Optionally configure WhatsApp Cloud API; students choose their notification channels from Settings.
8. Run `supabase/migrations/20260729_school_completion_and_operations.sql`.
9. Deploy the `check-completion` and `school-automation` Supabase Edge Functions if Supabase Database Webhooks or Supabase scheduling will be used. The included Vercel cron is an alternative daily scheduler.
10. Add `CERTIFICATE_GENERATION_SECRET`, `CERTIFICATE_BASE_URL`, and `CRON_SECRET`. Use long random secret values and use the same values in the matching Edge Function secrets. The completion webhook itself does not award certificates: both the Edge Function and protected application endpoint independently verify full-track completion.
11. Run `supabase/migrations/20260804_gamified_personal_studio.sql` to launch Studio XP, Gold Brushes, Personal Studios, the Reward Shop, achievements, historical backfill and Benjamin's reward controls.
12. Run `supabase/migrations/20260805_quiz_rewards_and_immersive_studio.sql` to move rewards fully into quiz completion/corrections, retire the separate pre-quiz challenge, and enable persistent three-wall room layouts.
13. Run `supabase/migrations/20260806_real_3d_studio_and_score_rewards.sql` to enable the WebGL room, secure frame transforms and score-based quiz reward milestones.

The future mentorship and AI shadow-learning work are recorded in `docs/SCHOOL_ROADMAP.md`.

Gamification deployment and verification steps are in `docs/GAMIFICATION_DEPLOYMENT.md`.

The real 3D room, controls and persistence model are documented in `docs/REAL_3D_STUDIO.md`.

Quiz answers are scored server-side, Paystack webhooks are signature-verified, private assignment uploads use signed URLs, certificates require completion of a full track, and RLS isolates each student’s data.
