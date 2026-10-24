# Topic detail UI implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apply the four supplied mobile/desktop light/dark topic-detail HTML references, retaining Be Vietnam Pro and the existing rounded bottom navigation.

**Architecture:** Keep the fixed catalog and study engine. Render one responsive detail layout in `features/topics.js`, with theme-aware layout rules in `topics.css`. All totals and progress come from the selected deck and account topic progress.

**Tech Stack:** Existing static HTML, CSS, classic JavaScript, Node test harness; local Chrome/Playwright for visual checks.

**Spec:** User's four topic-detail HTML exports supplied on 24/10/2026; local reference copies in `work/topic-ui/references`. This plan applies their topic content layout; the existing global header and rounded bottom menu stay in use.

## Global constraints

- Keep Be Vietnam Pro for labels, titles, controls and IPA; load no reference fonts or React.
- Desktop: blue summary card, purple flashcards/yellow matching, known/unknown totals on left; single divided word list and search on right.
- Mobile: one column, compact summary, paired study buttons, same word list and pronunciation controls.
- Keep fixed topic membership, existing progress, audio attribution and study routes. Display actual counts, never the reference's sample 12/30.
- Keep previous uncommitted Google login work. No commit, push, deployment or database changes.

## Review focus

- 320 px screens and long topic titles: no horizontal overflow or clipped controls.
- Light/dark: list, back button, search and secondary text use active theme.
- Missing IPA/audio and long meanings: rows grow without colliding with pronunciation buttons.
- Filter and A–Z label: the displayed order and result total are accurate; deck content/study order stays intact.
- Returning after study or account refresh: summary and row markers reflect actual progress.

### Task 1: Render the responsive topic detail

**Files:** Modify `assets/js/features/topics.js`, `assets/css/topics.css`; verify using `tests/dom-check.cjs` and `work/topic-ui/browser-qa.cjs`.

**Interfaces:** `renderFixedTopic(deck)` renders the selected immutable deck; `renderFixedTopicWords(deck)` filters/sorts rows without mutating `deck.words`. Existing `topic-flip`, `topic-match`, `topic-speak`, `fixed-topic-search` stay compatible.

- [x] Add behavioral checks for A–Z display without deck mutation, accurate search totals, progress and audio after returning from study; confirm new behavior fails first.
- [x] Replace the detail-only markup, leaving catalog layout intact. Hide the duplicated catalog heading/tabs when opening a detail URL.
- [x] Replace old detail CSS with a two-column desktop layout (340–380 px summary column) and one-column mobile/tablet layout. Reuse existing theme variables and navigation.
- [x] Run focused topic tests. Check all four references visually and verify actual app at 320, 390, 768, 1024 and 1440 px in both themes, plus a long title and long word/meaning.
- [x] Run `python tools/update-cache.py`, `npm test`, `npm run build`, `git diff --check`; mirror changed files to `outputs/tu-tu-web` and verify identical bytes.

No git commit is included: the user requests push commands separately.


## Completion evidence

- Two new behavioral tests failed before implementation (unsorted display and missing accessible progress), then passed.
- Full suite: 171/171 passing, no failures or skips.
- Chrome: 320, 390, 768, 1024 and 1440 px, light and dark; loaded Be Vietnam Pro, zero horizontal overflow, 44 px audio targets, correct column placement and theme colors. Real search, flashcard and matching actions passed; long content wraps.
- Independent reviewer found no concrete issues; unrelated pending Google changes excluded from review.
- Production build succeeded (`bd3ed24a5c9789b3`); source precache regenerated (`ac6de38357d3ed45`).
- No commit, push or deployment performed.
