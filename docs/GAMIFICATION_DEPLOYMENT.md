# Gamification deployment

## What ships

- Studio XP, Gold Brushes, six artist levels and forgiving weekly rhythm.
- Deduplicated server-side rewards for challenges, quizzes, assignments, reviews, completed lessons and certificates.
- Historical reward backfill for existing students.
- One approved Studio Challenge per seeded lesson, sourced from the verified first quiz question and kept separate from certificate requirements.
- Correction-round teaching and protected server-side scoring.
- My Studio Journey, current quest, achievements and progress path.
- Private Personal Studio with every assignment framed automatically.
- Purchasable frames, wall themes, decor and three usable practice packs.
- Certificate Wall and track completion rewards.
- Benjamin's `/admin/gamification` control room for the feature switch, manual audited recognition, shop pricing and challenge rewards/status.

## Deploy

1. Push the local commit and allow Vercel to build it.
2. In Supabase SQL Editor, run `supabase/migrations/20260804_gamified_personal_studio.sql` once.
3. Open `/admin/gamification`. Confirm the game is active and `Challenges ready` shows `32/32`.
4. Test one student lesson: complete the Studio Challenge, submit the quiz, upload work, then mark the assignment reviewed as Benjamin.
5. Open that student's Journey and Personal Studio. Confirm the balances, assignment frame, review state and next quest all agree.

No new environment variables are required.

## Database verification

Run these read-only checks after the migration:

```sql
select * from public.gamification_backfill_audit order by student_id;

select
  count(distinct l.lesson_code) as total_lessons,
  count(distinct c.lesson_code) filter (where c.approved and c.active) as live_challenges
from public.lessons l
left join public.lesson_game_challenges c on c.lesson_code = l.lesson_code;

select
  count(*) filter (where lifetime_xp < 0 or gold_brush_balance < 0) as invalid_balances,
  count(*) as artist_profiles
from public.gamification_profiles;

select dedupe_key, count(*)
from public.reward_ledger
group by dedupe_key
having count(*) > 1;
```

Expected: 32 lessons and 32 live challenges, zero invalid balances, and no duplicate ledger rows.

## Rollback switch

Use the master switch at `/admin/gamification` to pause new rewards, lesson challenges and Reward Shop purchases. Existing XP, currency, assignments, items and studio displays remain intact. This is the safe operational rollback; do not drop the tables after students have earned rewards.
