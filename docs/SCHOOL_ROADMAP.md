# Beo School of Art platform roadmap

## Current platform foundation

- Supabase email/password authentication with student and admin roles.
- Drawing, Painting, and Discovery enrollment through Paystack.
- Students can own multiple tracks and switch between them without losing progress.
- NGN settlement for every country; international students use card-only checkout with a display-only USD estimate.
- Full payments, three-payment guided subscriptions, renewal status handling, and subscription management from Settings.
- Weekly lesson drip for Drawing and Painting; immediate access for Discovery.
- Configurable track welcome videos with no quiz or assignment.
- Lesson videos, notes, quiz attempts/retakes, private assignment uploads, and assignment review status.
- Benjamin can mark work as seen, hold a WhatsApp review call, save feedback, and mark the review complete.
- Student/parent-readable feedback, mobile navigation, real admin statistics, student records, and protected admin settings.

## Phase 1 — final curriculum and self-learning quizzes

- Import the final workbook lesson notes, questions, correct answers, and teaching explanations.
- Show verified correct answers and explanations after submission once Benjamin supplies the approved answer key.
- Let students continue after reviewing corrections or retake the quiz.
- Preserve every attempt while using the latest attempt for progress reporting.
- Confirm that P3.5 and every other required lesson count toward track completion.

## Phase 2 — certificate and track completion system

### Completion rule

A track is complete only when:

- Every lesson in that track has at least one quiz submission from the student.
- Every lesson in that track has an assignment with `reviewed = true`.
- The welcome video is not a lesson and does not count toward completion.

Completion must be checked after both events:

- An assignment changes from unreviewed to reviewed.
- A quiz submission is created.

Checking assignments alone is insufficient because a student may submit their final quiz after the final assignment was reviewed.

### Supabase foundation

- Add `certificates` with one certificate per student and track:
  - `id`, `student_id`, `track`, `file_path`, `file_url`, `certificate_code`, `issued_at`.
- Add a public `certificates` Storage bucket limited to PDF files and 5 MB.
- Add safe RLS policies: students read their own certificate; public verification exposes only the verification fields, not private student or storage records.
- Configure a Supabase Database Webhook to invoke the `check-completion` Edge Function. Edge Functions do not fire from table updates without the webhook configuration.

### Completion Edge Function

- Create `supabase/functions/check-completion`.
- Receive the student and track affected by the quiz or reviewed assignment.
- Count distinct required lesson codes, distinct quiz-completed lesson codes, and distinct reviewed-assignment lesson codes.
- Generate only when all three counts match and no certificate already exists.
- Call the protected certificate-generation endpoint using an internal shared secret.
- Make the process idempotent through `unique (student_id, track)`.

### PDF generation

- Create protected `POST /api/certificate/generate`.
- Accept `student_id` and `track`; never expose this endpoint as an unrestricted public generator.
- Recheck completion server-side before issuing.
- Render the Beo certificate with student name, track, completion month/year, unique certificate code, Benjamin Odeke, and the public verification URL.
- Prefer `@react-pdf/renderer` for the deployed Next.js environment; it avoids shipping a serverless Chromium binary. Puppeteer remains an option if the hosting runtime is configured for it.
- Upload the PDF to `certificates/{student_id}/{track}-{certificate_code}.pdf`.
- Insert the certificate record and return its public download URL.

### Email delivery

- After storage succeeds, send through Resend.
- Subject: `🎨 Your Beo School of Art Certificate is ready, [First Name]`.
- Include the completion message, certificate code, dashboard link, Benjamin Odeke’s signature, and the PDF attachment.
- Record delivery failure separately so email can be retried without generating a second certificate.

### Student and public surfaces

- Show a gold Download Certificate card on the selected track dashboard when a certificate exists.
- Display its certificate code and verification link.
- Build public `/verify/[certificate_code]` showing valid status, student name, track, completion month/year, and Beo Art Studio issuer details.
- Show a clear invalid/not-found result for unknown codes.

### Certificate environment variables

- `RESEND_API_KEY`
- `CERTIFICATE_BASE_URL=https://learn.beoarts.com/verify`
- `CERTIFICATE_GENERATION_SECRET` for authenticated Edge Function to Next.js communication.

## Phase 3 — school automation

- Weekly lesson-unlock emails and WhatsApp notifications.
- Assignment-due, missing-submission, submission-seen, feedback-ready, and review-call reminders.
- Structured review-call scheduling; the current WhatsApp link is the lightweight first version.
- Subscription renewal and failed-payment reminders.
- Parent-readable progress summaries and feedback history.
- Retry logs and an admin automation-status screen so failed messages are visible.

## Phase 4 — progression and mentorship

- Locked mentorship path available only to eligible graduates or invited students.
- Completion/certificate status becomes one eligibility input.
- Separate mentorship enrollment, content access, payment, and scheduling rules.

## Phase 5 — assisted assignment review

- Implement the dynamic, lesson-specific review system in [`AI_REVIEW_SPEC.md`](./AI_REVIEW_SPEC.md).
- On submission, load the lesson title, notes, assignment instructions, week number, track, and three quiz concepts from Supabase.
- Select the exact Drawing or Painting criteria for that week; use the constant Discovery rubric for D1–D7.
- Score only skills already taught by that point in the curriculum. Never penalise a student for a later technique.
- Add a written-response field and database column for Discovery assignments; its rubric cannot work correctly with the current image-only submission.
- Send the lesson context, selected rubric, written response where applicable, and submitted image to the configured vision-capable Claude model.
- Store structured draft results: five criterion scores, child-friendly reasons, priority fix, positive callout, and review-call focus.
- Show AI results only to Benjamin in the admin review panel. Benjamin edits/approves them before any feedback reaches the student or parent.
- Keep manual review fully usable whenever the AI provider is unavailable.
- Train or fine-tune only after enough Benjamin-approved examples exist.
- Define student/parent consent, training-data boundaries, retention, deletion, privacy, model versioning, cost limits, and quality-control rules before activation.
