# Gamification deployment

## What ships

- Studio XP, Gold Brushes, six artist levels and forgiving weekly rhythm.
- Deduplicated server-side rewards for quizzes, corrections, assignments, reviews, completed lessons and certificates.
- Historical reward backfill for existing students.
- Quiz-led rewards for first completion, full-score mastery and mastered corrections, with protected server-side scoring.
- My Studio Journey, current quest, achievements and progress path.
- Private three-wall Personal Studio with swipe/arrow navigation and every assignment framed automatically.
- Purchasable frames, wall themes, decor and three usable practice packs.
- Certificate Wall and track completion rewards.
- Benjamin's `/admin/gamification` control room for the feature switch, manual audited recognition and shop pricing.

## Deploy

1. Push the local commit and allow Vercel to build it.
2. In Supabase SQL Editor, run `supabase/migrations/20260804_gamified_personal_studio.sql`, followed by `supabase/migrations/20260805_quiz_rewards_and_immersive_studio.sql`.
3. Open `/admin/gamification`. Confirm rewards are active and the shop-item count is populated.
4. Test one student lesson: submit the quiz, review its corrections, upload work, then mark the assignment reviewed as Benjamin.
5. Open that student's Journey and Personal Studio. Confirm the balances, assignment frame, review state and next quest all agree.

No new environment variables are required.

## Database verification

Run these read-only checks after the migration:

```sql
select * from public.gamification_backfill_audit order by student_id;

select
  count(*) filter (where lifetime_xp < 0 or gold_brush_balance < 0) as invalid_balances,
  count(*) as artist_profiles
from public.gamification_profiles;

select dedupe_key, count(*)
from public.reward_ledger
group by dedupe_key
having count(*) > 1;
```

Expected: zero invalid balances and no duplicate ledger rows.

## Rollback switch

Use the master switch at `/admin/gamification` to pause new rewards and Reward Shop purchases. Existing XP, currency, assignments, items and studio displays remain intact. This is the safe operational rollback; do not drop the tables after students have earned rewards.
