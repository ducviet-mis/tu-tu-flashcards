# Fixed Everyday Topics Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans; one final fresh-context reviewer.

**Goal:** The notebook's Chủ đề tab opens fixed everyday English vocabulary decks with complete word lists, pronunciation, flashcards and matching.

**Architecture:** A compact static catalog packages selected everyday Linguabase categories intersected with the existing Kaikki vocabulary. Topic membership and card content are immutable in the UI; learner memory status is stored separately from personal notebook days. Reuse the existing study engine through explicit topic-session adapters, never create hidden personal days or silently change review queues.

**Tech Stack:** Existing classic JavaScript, HTML/CSS, Node tests and Python data preparation. No new runtime service or dependency.

**Spec:** User request in this conversation, 2026-10-24: many everyday English topics; click a topic to list all words and study flashcards or matching; fixed vocabulary with no add-to-topic button; same visual style, mobile and desktop. Earlier user explicitly requests simplicity, no curriculum/level/course expansion.

## Global Constraints
- Preserve personal notebook days, review scheduling, auth, Kaikki exclusivity, Be Vietnam Pro, themes and rounded bottom menu.
- No add, edit or delete vocabulary actions in fixed topics; no vocabulary auto-copy into personal days.
- All fixed card meanings come from Kaikki; topic membership comes from Linguabase with attribution/provenance.
- No push, commit, publication or secret/config changes.
- User has already selected the source and interaction; proceed with routine implementation decisions without another approval round.

## Review Focus
- Topic sessions must not update a same-named personal word or create a personal day.
- Slow downloads and invalid topic routes must never overwrite another page or open a stale study session.
- Matching uses manageable rounds, supports the whole deck across rounds, and treats equal meanings fairly.
- Closing, retrying and switching study modes must retain the correct topic and memory progress.
- Every listed fixed word has a source-derived compact meaning and stable ID; missing examples/audio remain honest.

### Task 1: Fixed catalog and provider
Files: tools/build-topics.py, data/topics/*, assets/js/topics.js, tests/topics.test.cjs, tests/topics-build.test.py.
- [x] Inspect actual Linguabase category files, select everyday themes, retain source hashes and licensing.
- [x] Write failing data/provider tests: fixed membership, unique IDs, trusted source data, retry on failure, valid Kaikki meanings, no legacy provider requests.
- [x] Build a compact static catalog with Vietnamese topic labels, English source labels and immutable card snapshots.
- [x] Run data/provider tests RED→GREEN.

### Task 2: Topic browsing and study adapters
Files: assets/js/features/topics.js, features/notebook.js, navigation.js, features/home.js, features/study.js, events.js, assets/css/topics.css, index.html, tests/dom-check.cjs.
- [x] Write failing DOM tests for fixed catalog/detail, full word list, no add/edit controls, search, direct links and retry.
- [x] Show fixed topics in the existing Chủ đề tab; keep optional personal-topic labels available as a separate personal view without mixing fixed membership.
- [x] Add topic flashcard and matching sessions that reuse existing controls with separate progress storage and no personal-day mutations.
- [x] Test route changes during loading, stale actions, completing/retrying/closing study, reload progress and round coverage RED→GREEN.

### Task 3: Packaging and verification
Files: tools/update-cache.py, tools/build-web.cjs, sw.js if required, docs/CHU-DE.md, README.md, tests/package.test.cjs.
- [x] Include the small topic catalog/provenance in active offline resources and production output.
- [x] Run full tests and production build; document that real browser/mobile checks were unavailable.
- [x] Request final independent review; fix consequential findings and document limitations.
- [x] Sync verified changes to the existing tu-tu-web mirror without touching configuration (byte comparison in work/topics/sync.py).

## Execution ledger
- Baseline HEAD: 106ba055e94e86675a1c96793c8d26d86815db20; checkout clean.
- Ruling: use existing user delivery checkout and inline execution, matching established workflow; no git history mutations.
- Pre-flight: catalog provider exposes load() -> {version,revision,topics:[{id,title,sourceLabel,words:[]}]} and progress helpers; browsing/study consume those same snapshots; packaging caches the same versioned files. No incompatible interfaces found.

- Task1 complete: genuine Linguabase category archive SHA389a71b33855c2eef46dda490d9644dc153496fccd0f119684625cecb450128d downloaded outside repo. 55 fixed everyday decks; contextual Kaikki sense selection and explicit inflection resolution. Builder/provider tests observed RED then GREEN.
- Task2 complete: read-only browsing, full word lists, search, pronunciation and separate topic-session progress; personal-label views remain under view=personal. Initial DOM tests RED→GREEN; slow deep-link study transition regression reproduced then fixed.
- Data quality check found grammatical form glosses and wrong homograph senses; explicit source lemma resolution and reviewed context cues now select real Kaikki senses or omit uncertain cards. No generated translation added.
- Full suite136/136 passed before final data-quality/route refinements. New assertions cover unchanged personal store, complete match-round coverage, missed-word retry and stale requests. Final run after the review fixes: 141/141 Node tests passed, including seven Python builder cases through the Node wrapper, no failures/skips; npm run build passed.
- Browser QA blocked: CUA returned apps=[], browsers=[]; do not claim real-device screenshot or audio verification.

- Final independent review completed once; no Critical issues. The consequential findings were (1) personal routes could reuse same-date topic-origin sessions and (2) broad source membership/first-sense selection admitted unrelated homographs. One fix pass added origin checks for flip/match/result, reviewed source-member selections and mandatory whole-word Vietnamese context checks. A topic-close accessibility label was corrected too. Regression tests reproduced the route and context failures before the fixes; final full suite passes.
- Final catalog: 55 everyday topics, 1,018 cards (941 distinct card IDs), catalog 594,910 bytes, revision 090e342bd6856807; original large source archive remains outside deployment. Meanings remain source-derived; context mismatches are omitted.
- Source precache fingerprint 77938e15dc45e08f includes all topic UI/data resources; production build 45063ec5c43c6208 succeeded. Production fingerprint differs because the existing build generates public Supabase configuration from deployment environment. No config or auth setup changed in source.
- Verification limits: tests simulate DOM and service-worker behavior, not real installation/update or visual/audio behavior on actual devices. No claim of exhaustive linguistic accuracy or independent legal certification; source and Commons attribution links are preserved.
- No commit, push or publication performed. Final changes remain in the existing user checkout and delivery mirror; no separate development branch was created.
