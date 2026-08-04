# Beo School of Art gamification build plan

## Goal

Build a mobile-first learning game that makes students look forward to each lesson while keeping every reward tied to real artistic progress.

The centre of the experience is a private Personal Studio. Every submitted assignment appears on the student's studio wall in a basic frame. Students earn permanent Studio XP and spend Gold Brushes on upgraded frames, studio themes, decor and useful bonus learning resources.

Gamification must never replace the curriculum, change certificate requirements, create public competition, or allow students to buy their way past lessons.

## Locked product rules

- Studio XP is permanent and determines the student's artist level. It is never spent or lost.
- Gold Brushes are spendable and cannot become negative.
- Rewards are granted by trusted server-side events, never by values supplied from the browser.
- Each qualifying event can award rewards only once, including quiz retakes.
- Every submitted assignment appears on the studio wall with a free basic frame.
- Unreviewed work displays `Awaiting review`; reviewed work displays Benjamin's completion mark and feedback access.
- Premium frames change presentation only. They never change scores, lesson access or review priority.
- Core lessons, quizzes, assignments, feedback and certificates never require Gold Brushes.
- No public leaderboard, paid loot box, XP loss or daily-streak punishment.
- The Personal Studio is private in the first release. Public sharing requires a later privacy review.
- The existing full-track certificate rules remain unchanged.

## Student game loop

```text
Open current quest
    -> Watch the lesson
    -> Play the lesson Studio Challenge
    -> Complete the quiz and correction round
    -> Submit practical work
    -> See the work enter the studio wall
    -> Receive Benjamin's review
    -> Earn XP, Gold Brushes and mastery progress
    -> Upgrade the studio and continue to the next quest
```

## Student-facing surfaces

### My Studio Journey

The existing Progress page becomes the learning map and shows:

- current artist level and lifetime Studio XP;
- available Gold Brushes;
- the current quest and next meaningful action;
- a visual lesson path for the selected track;
- completed, current, locked and awaiting-review lesson states;
- earned skill badges;
- weekly practice rhythm;
- links to the Personal Studio and Reward Shop;
- certificate progress without changing its requirements.

### Personal Studio

Create `/studio` as a responsive two-dimensional studio, designed for phones first rather than as a heavy 3D game.

The first version contains:

- a gallery wall containing every submitted assignment;
- a free basic frame for every work;
- premium purchased frames that can be applied per assignment;
- assignment status and lesson code plaques;
- signed private image URLs generated for the logged-in student;
- Drawing, Painting and Discovery filters;
- Benjamin's feedback link on reviewed work;
- wall themes, shelves, easels and decorative inventory;
- a Certificate Wall for completed tracks;
- empty states that explain how to add the first artwork.

Use a responsive slot/grid layout initially. Free-position drag and resize can be added only after the mobile grid is stable and accessible.

### Reward Shop

The shop is part of the studio and contains clear, non-random purchases.

Initial catalog:

- six premium assignment frames;
- three wall or studio themes;
- six studio decorations;
- portrait and object reference packs;
- drawing prompt decks;
- colour palette cards;
- bonus practice challenges;
- track-preview activities.

Every item shows its Gold Brush cost, artist-level requirement, ownership state and whether it is equipped.

### Lesson completion celebration

After a meaningful milestone, show a short branded result panel containing:

- milestone completed;
- XP and Gold Brushes earned;
- artist-level progress;
- badge or item unlocked;
- current assignment/review state;
- one clear next action.

Animations must respect reduced-motion preferences and remain subtle enough for the Beo brand.

## Reward economy

Recommended starting values:

| Event | Studio XP | Gold Brushes |
|---|---:|---:|
| First Studio Challenge completion | 20 | 5 |
| First quiz submission for a lesson | 20 | 5 |
| First correction round completion | 10 | 3 |
| Assignment submitted | 40 | 10 |
| Assignment reviewed | 60 | 15 |
| Lesson fully completed | 50 | 15 |
| Mastery Challenge completed | 80 | 25 |
| Track completed | 300 | 100 |

Initial shop pricing should allow a student to purchase a simple frame after one lesson and save for larger themes or learning packs over several lessons.

Suggested artist levels:

1. Curious Observer
2. Mark Maker
3. Skill Builder
4. Developing Artist
5. Studio Artist
6. Beo Graduate

Level thresholds and reward prices must be stored as configurable school data so they can be tuned without rewriting application logic.

## Learning games

Build reusable challenge engines driven by Supabase configuration rather than 32 unrelated hard-coded games.

### Initial challenge types

1. `multiple_visual_choice`: select the correct image, tool, mark or correction.
2. `sequence`: arrange drawing or painting steps in the correct order.
3. `sort_match`: match tools, values, colours, techniques or concepts.
4. `value_order`: arrange tonal values from lightest to darkest.

Later challenge types:

- colour mixing;
- light and shadow placement;
- proportion and grid correction;
- image hotspot identification;
- layer building;
- timed observation.

Each challenge must contain a lesson-specific explanation. Incorrect answers create a correction round; they do not remove XP or shame the student. Challenge completion is educational reinforcement and does not become a certificate requirement.

Every three or four lessons can end with a Mastery Challenge that combines previously taught skills. It must never assess techniques from later lessons.

## Supabase foundation

### `gamification_profiles`

- `student_id` primary key;
- cached `lifetime_xp`;
- cached `gold_brush_balance`;
- `current_level`;
- weekly streak fields;
- timestamps.

### `reward_ledger`

Immutable audit history:

- student;
- event type;
- related entity type and ID;
- XP delta;
- Gold Brush delta;
- unique deduplication key;
- metadata;
- timestamp.

Balances are updated transactionally with ledger inserts.

### `studio_catalog_items`

- stable item key;
- category: frame, theme, decor, resource or challenge;
- name and description;
- Gold Brush price;
- minimum level;
- visual/configuration data;
- active and sort-order fields.

### `student_inventory`

- student;
- catalog item;
- acquisition source;
- purchase ledger reference;
- acquired timestamp;
- unique ownership constraint for non-consumable items.

### `student_studios`

- student primary key;
- selected wall theme;
- selected room configuration;
- updated timestamp.

### `studio_displays`

- student;
- assignment;
- equipped frame item;
- wall slot;
- optional layout configuration;
- unique assignment display constraint.

### `lesson_game_challenges`

- lesson code;
- challenge type;
- prompt;
- version;
- JSON configuration;
- explanation;
- reward values;
- approval and active state.

### `game_attempts`

- student;
- challenge and version;
- submitted response;
- score/result;
- correction-completed state;
- reward ledger reference;
- timestamps.

### `achievements` and `student_achievements`

Store badge definitions separately from earned badge records with unique award constraints.

## Server-side operations

Create secure database functions or protected server endpoints for:

- `award_gamification_event`: validate event type, insert a deduplicated ledger event and update balances atomically;
- `purchase_studio_item`: lock the balance, verify price/level/ownership, debit Gold Brushes and add inventory atomically;
- `equip_studio_item`: verify ownership before changing the studio;
- `place_assignment_display`: verify assignment ownership and frame ownership;
- `submit_game_challenge`: score only against server-side challenge configuration and award once;
- `rebuild_gamification_profile`: safely recalculate cached totals from the ledger.

Integrate reward events into the existing trusted flows:

- quiz submission;
- assignment upload;
- admin assignment review completion;
- game challenge completion;
- certificate/track completion.

Do not award points for merely opening a page or starting a video. Video completion can be considered later only if reliable player events and abuse controls are added.

## Existing-student backfill

The system must recognise work completed before gamification launches.

Create an idempotent backfill that awards historical events for:

- first quiz submission per lesson;
- assignment submission;
- reviewed assignment;
- fully completed lessons;
- existing certificates.

The backfill must use the same deduplication keys as live rewards, produce an audit report and never double-award when rerun.

Existing assignments must automatically receive a basic wall display.

## Admin controls

Extend the admin area with:

- economy summary and event audit log;
- reward catalog management;
- item activation and price controls;
- challenge editor and preview;
- challenge approval/versioning;
- failed reward-event visibility;
- student balance and inventory inspection;
- manual adjustment with mandatory reason and audit trail;
- feature flag and rollout controls.

Benjamin should not need to manually award normal XP or place student assignments on walls.

## Security and privacy

- Students can read only their own profile, ledger, inventory, studio, attempts and displays.
- Catalog and approved challenge definitions are readable by authenticated students.
- Purchases and awards run through protected functions; direct client balance updates are forbidden.
- Assignment images remain in the private Storage bucket and use short-lived signed URLs.
- Students cannot display another student's assignment or equip an unowned item.
- Admin manual adjustments require a reason and remain permanently auditable.
- Rate-limit challenge submission and purchase endpoints.
- Never trust client-supplied prices, rewards, scores or ownership claims.

## Accessibility and mobile requirements

- Full functionality at 320px width and above.
- Touch targets at least 44px.
- Keyboard-accessible games and shop controls.
- Text alternatives for visual challenges where pedagogically possible.
- Reduced-motion mode.
- No autoplaying sound; optional sound effects default off.
- Low-bandwidth assignment thumbnails and lazy loading.
- Studio must remain usable without drag-and-drop.

## Build phases

### Phase 1: data and economy foundation

- Add migrations, RLS, indexes, catalog seeds and transactional functions.
- Add the reward service and level calculation.
- Add idempotent historical backfill and verification queries.
- Add tests for duplicate rewards, negative balances and cross-student access.

### Phase 2: live reward integration

- Award quiz, assignment, review, lesson and certificate events.
- Add current quest calculation.
- Expose the student's economy summary.
- Confirm quiz retakes cannot farm rewards.

### Phase 3: Personal Studio

- Build `/studio` and add it to student navigation.
- Display every assignment in a basic frame.
- Add status plaques, track filters, signed thumbnails and feedback links.
- Add the Certificate Wall and responsive mobile layout.

### Phase 4: Reward Shop and customisation

- Seed initial frames, themes, decor and learning rewards.
- Build purchase, inventory, equip and frame-assignment flows.
- Add balance feedback and transaction history.
- Verify atomic purchasing under repeated taps and slow networks.

### Phase 5: My Studio Journey

- Redesign Progress into the track map.
- Add artist levels, currency balance, current quest, lesson states and badges.
- Add milestone celebration panels and level-up states.

### Phase 6: reusable learning-game engine

- Build the first four challenge types.
- Add server-side scoring, correction rounds and attempt history.
- Connect games to lessons without changing certification rules.
- Add the challenge authoring and approval interface.

### Phase 7: curriculum game content

- Create and review at least one approved challenge for all 32 lessons.
- Add Mastery Challenges at agreed curriculum intervals.
- Verify every challenge assesses only already-taught concepts.
- Complete Benjamin's content-accuracy approval pass.

### Phase 8: achievements and weekly rhythm

- Add skill badges and the Studio Cabinet.
- Add forgiving weekly practice streaks and a grace rule.
- Add mastery rewards and track-completion studio upgrades.

### Phase 9: quality assurance and rollout

- Run economy, security, RLS, accessibility, mobile and performance tests.
- Test historical and new students across all three tracks.
- Test low-bandwidth images, retries and concurrent purchases.
- Launch behind a school feature flag.
- Review real student behaviour and adjust prices/rewards without resetting earned progress.

## Definition of done

The gamification goal is complete only when:

- existing and new students have accurate, non-duplicated balances;
- every submitted assignment appears privately in the student's studio;
- basic and purchased frames can be applied reliably;
- the shop prevents overspending and duplicate ownership;
- all trusted learning events award exactly once;
- Studio Journey reflects the real selected track and current next action;
- all 32 lessons have an approved educational challenge;
- correction rounds teach missed concepts;
- badges, levels, weekly rhythm and celebrations work on mobile;
- Benjamin can manage the system without routine manual awards;
- lesson drip, payments, feedback and certificate completion remain unchanged;
- automated tests and a complete student journey pass for Drawing, Painting and Discovery.

