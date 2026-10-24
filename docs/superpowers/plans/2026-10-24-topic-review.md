# Unified topic review implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved scope, with test-driven-development and verification-before-completion.

**Goal:** Include studied topic cards in the shared review queue and persist the existing 1/3/7/14/30-day schedule per account.
**Architecture:** Upgrade topic progress values from legacy booleans to compact review records, accepting both formats. Catalog content stays static. One queue combines personal words with explicitly studied topic words and keeps each origin distinct. Extend the existing account-sync SQL additively; do not add words to personal notebooks.
**Spec:** User approved connecting topics and applying the explained schedule on 24/10/2026.
**Stack:** Existing static JavaScript/CSS, Supabase RPC, Node test runner, PGlite and local Chrome.

## Constraints and review focus

- New/unopened topic cards do not enter review. Legacy recorded booleans remain valid and enter once to establish a schedule; never invent an old review date.
- Successful reviews schedule +1, +3, +7, +14, +30 days from each due review; early extra practice preserves the next due date; failure resets to today.
- Topic/day words with the same ID or spelling keep independent state. Retry only missed entries from that session; do not expand into other topics.
- Account-scoped metadata survives reload, offline work, concurrent devices, CAS conflicts and acknowledged-response replay.
- Calendar boundaries, missing/failed catalog loads and navigation/account switches during downloads must be handled without overwriting the current view or private state.
- Preserve fixed deck membership, current UI/fonts and manual word editing behavior. No cloud access, push, deploy or destructive migration.

### Task 1: Persist topic schedules

Files: `assets/js/account-sync.js`, `assets/js/features/topics.js`, `assets/js/features/topic-study.js`, `assets/js/features/account-data.js`, `supabase/dong_bo_tai_khoan.sql`; tests in `tests/account-sync.test.cjs`, `tests/account-sync-sql.test.cjs`.

- [x] Add failing tests for schedule serialization across devices, failed-review intent and replay, and real PostgreSQL object/boolean compatibility, validation, idempotent counts and user isolation.
- [x] Accept/validate legacy booleans or review records, preserve records in merge/events, persist graded topic metadata and extend topic columns/RPCs additively. Keep old booleans readable.
- [x] Pass focused engine and real SQL tests.

### Task 2: Shared queue and study routing

Files: new `assets/js/features/review-queue.js`, `index.html`, `features/review.js`, `features/study.js`, `features/home.js`, `navigation.js`; tests in `tests/dom-check.cjs` and existing scheduling tests.

- [x] Reproduce topic failure missing from review; test reload, shared counts, same-ID origins, retry and delayed catalog navigation.
- [x] Build one queue/count source, load catalog only when needed with stale-view guards, route grades/retries back to each word's origin, and show the next scheduled date after an answer.
- [x] Pass focused DOM/schedule tests and Chrome checks on mobile/desktop in both themes.

### Task 3: Deliver and verify

- [x] Update the account setup guide with the required rerun of the updated SQL and clarify legacy-topic migration and review semantics.
- [x] Run full tests, production build, cache regeneration and diff checks; independent review and verified fixes if needed.
- [x] Mirror verified changes into `outputs/tu-tu-web`; report SQL step clearly. Do not commit/push/deploy.


## Completion evidence

- Topic-record serialization and replay tests were RED on boolean-only validation, then GREEN. Shared queue tests reproduced missing counts (0/0 instead of 1/1), same-ID origins and missing catalog loading before the queue implementation, then passed.
- Full final suite: **184/184 pass**, no failures/skips; real PGlite exercises idempotent SQL migration, boolean/object compatibility, account isolation, actual per-topic concurrent event counts and validation rollback.
- Chrome: 320/390/768/1280 px in light/dark, real topic failure → shared review → successful retry → tomorrow → reload. Personal notebook stays empty; long review text wraps; no page errors.
- Independent review identified three issues, all fixed with reproducing tests RED→GREEN: wrong matching replaced schedule records with booleans; legacy SQL false retained an invalid positive level; direct-link retry rendered a list instead of resuming study. Wrong matches now persist the reset record; legacy false normalizes level/due state while keeping counts/history; retry delegates to the current route. No deferred findings.
- Reviewer overstated the secondary deep-link failure (go already reroutes an unchanged hash); the reproduced extra retry/start step was still fixed by route-aware resumption.
- Production build **cc15904f7eacf919**, source cache **56587e0dd6d4441d**; diff check clean.
- User must rerun the complete updated `supabase/dong_bo_tai_khoan.sql` and deploy the new web version. No live Supabase mutation, commit, push or deployment performed.
