# Beo lesson-specific AI assignment review plan

## Purpose

The review assistant must judge only the technique taught in the submitted lesson. It prepares a draft for Benjamin Odeke; it does not publish scores or feedback directly to students.

## Required lesson context

For the assignment's `lesson_code`, load:

- `lessons.track`
- `lessons.week_number`
- `lessons.title`
- `lessons.notes`
- `lessons.assignment_instructions`
- The three `quiz_questions.question_text` values for that lesson
- The assignment image and, for Discovery, the student's written response

Do not rely on `profiles.track`, because students can own multiple tracks. The lesson record is the source of truth.

## Prompt contract

The generated prompt must identify Beo School of Art Vol.1, Benjamin Odeke, track, week, lesson title, lesson notes, assignment instructions, and quiz concepts. It must explicitly say:

- Review against this lesson only.
- Do not penalise skills not yet covered.
- Give each of five criteria a score from 1 to 3.
- `1` means needs significant work, `2` means on the right track, and `3` means nailed it.
- Explain every score in one sentence using language a child can understand.
- Return one lesson-specific priority fix.
- Return one specific positive callout.
- Return a review-call focus of no more than two sentences.

The model must return validated JSON rather than free-form text.

## Discovery rubric

Use for D1–D7:

1. Observation accuracy.
2. Written response quality.
3. Assignment completion.
4. Connection to the lesson.
5. Effort and detail.

Discovery requires a written-response input in addition to an optional supporting image. Add `assignments.written_response` and update the student submission form before enabling this rubric.

## Drawing criteria by week

| Week | Criterion 1 | Criterion 2 | Criterion 3 |
|---|---|---|---|
| 1 | Mark confidence | Variety of marks | Page coverage |
| 2 | Style identification | Basic shape accuracy | Observational effort |
| 3 | Pencil grade variety | Value difference | Labelling accuracy |
| 4 | Shadow placement | Cast shadow presence | Value range |
| 5 | Technique differentiation | Hatching consistency | Contour accuracy |
| 6 | Blending smoothness | Value preservation | Tool control |
| 7 | Light direction consistency | Reflected light | Darkest-to-lightest graduation |
| 8 | Observation accuracy | Shape accuracy | Detail density |
| 9 | Basic shape simplification | Proportion relationships | Construction-line evidence |
| 10 | Grid accuracy | Content transfer | Overall proportion |
| 11 | Oval accuracy | Guideline placement | Feature placement |
| 12 | Overall skill integration | Darkest-dark presence | Finish quality |

Drawing criterion 4 is assignment completion. Criterion 5 is overall observation: whether the drawing shows direct observation rather than invention.

Each criterion's full wording and examples must be stored in a versioned server-side rubric object, based on the approved curriculum text supplied by Benjamin.

## Painting criteria by week

| Week | Criterion 1 | Criterion 2 | Criterion 3 |
|---|---|---|---|
| 1 | Material identification | Starter-colour awareness | Preparation evidence |
| 2 | Style attempt | Colour intention | Written reasoning |
| 3 | Medium identification | Test-stroke quality | Brush-loading evidence |
| 3.5 | Surface identification | Priming awareness | Test-stroke surface response |
| 4 | Sketch lightness | Proportion accuracy | Composition placement |
| 5 | Brushstroke direction | Stroke confidence | Variety evidence |
| 6 | Blend smoothness | Colour-identity preservation | Overworking signs |
| 7 | Colour accuracy | White usage | Dominant-colour control |
| 8 | Context awareness | Observation accuracy | Written insight |
| 9 | Drying-time plan | Paint-type accuracy | Layer planning |
| 10 | Layer separation | Value range | Darkest-value commitment |
| 11 | Reflection depth | Self-assessment accuracy | Goal specificity |
| 12 | Five-layer evidence | Light-and-dark range | Subject recognition |

Painting criterion 4 is assignment completion. Criterion 5 is layer awareness: visible evidence that the student understood the layer or technique taught that week.

`P3.5` must use the lesson's actual `week_number` and lesson code safely; do not parse it as a normal integer lesson sequence.

## Suggested structured result

```json
{
  "rubric_version": "beo-v1",
  "model": "configured-model-id",
  "criteria": [
    { "name": "Criterion name", "score": 1, "reason": "Child-friendly explanation." }
  ],
  "priority_fix": "One specific next action.",
  "positive_callout": "One specific strength.",
  "call_focus": "What Benjamin should discuss.",
  "status": "draft"
}
```

Validate the response before saving. Reject missing criteria, scores outside 1–3, or unexpected fields.

## Data and workflow additions

- Add `assignments.written_response`.
- Add an `assignment_ai_reviews` table containing assignment ID, rubric version, model ID, structured result, token/cost metadata, status, error, generated timestamp, and Benjamin's approval timestamp.
- Trigger draft generation after a successful assignment submission, not before the upload is stored.
- Use a Supabase Edge Function to gather authorised data and call the model, or call a protected Next.js endpoint if the selected SDK/runtime requires Node.js.
- Keep provider credentials server-side in `ANTHROPIC_API_KEY`.
- Add retry limits and an admin-visible failure state.
- Add an “Apply as feedback” action that copies an approved/edited draft into the existing assignment feedback field.

## Safety and quality gates

- Obtain clear consent before sending student work to an external AI provider.
- Do not use student submissions for training by default.
- Strip unnecessary personal information from the model prompt.
- Record model and rubric versions for every draft.
- Set per-review image size, token, timeout, and monthly-spend limits.
- Benchmark the rubric against Benjamin's own reviews before release.
- Audit results across age groups, tracks, skin tones in photographed portraits, media quality, and device/camera conditions.
- Benjamin remains accountable for the final feedback and review call.
