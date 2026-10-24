# Day detail UI implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Apply the four supplied day-detail light/dark mobile/desktop references while keeping Be Vietnam Pro and the existing rounded navigation.

**Architecture:** Replace the legacy three-column daily dashboard with a dedicated responsive day layout. Keep all word persistence, editing, pronunciation, autocomplete and study engines; add transient view filters without changing account data or SQL.

**Tech Stack:** Existing static HTML/CSS/JavaScript, Node test harness and local Chrome/Playwright.

**Spec:** User's four day-detail HTML exports from 24/10/2026, extracted to `work/day-ui/references/reference-1..4`.

## Global constraints

- Desktop: purple date/progress card, paired study buttons and compact add form on left; searchable divided vocabulary list on right.
- Mobile: the same sections in one column, with pronunciation and an expandable word actions menu.
- Keep Be Vietnam Pro, current global header and rounded bottom navigation in both themes.
- All displayed dates and totals come from the selected day, including historical and empty dates.
- Preserve adding, duplicate detection, topic/example fields, bulk import, edit/delete/undo, pronunciation, study and account isolation.
- Filter controls cover existing all/unknown/known word states. The reference's star controls are omitted because favorites are not part of the existing data model; avoid introducing a separate persistence feature in a UI change.
- The Tra button reuses dictionary autocomplete to fill the current form, so historical-day additions never use the dictionary's save-to-today action.
- Preserve pending Google login and topic-detail work. No commit, push, deployment or SQL changes.

## Review focus

- 320 px width, long IPA/meaning and on-screen keyboard: fields and actions fit without clipping.
- Empty/historical dates: no fake sample counts, wrong weekday or accidental save to today.
- Filters/search do not alter remembered state, review history or study membership.
- Filters are reset across dates/accounts; private search text cannot leak to another account.
- Missing audio/IPA and delayed autocomplete: existing fallback and stale-response protection survive.

### Task 1: Day detail layout and view controls

**Files:** Modify `assets/js/features/days.js`, `index.html`, `tests/dom-check.cjs`; create `assets/css/day-detail.css`.

**Interfaces:** `renderDayBase()` renders the selected day; `renderWords()` applies transient filters/query and updates totals. Existing add form IDs and word/study data-actions remain unchanged; `day-filter` and `day-lookup` are local view actions.

- [x] Add meaningful tests for filtering and unaccented Vietnamese queries without data changes, day/account scope, historic-day entry and the Tra suggestion flow. Watch the newly specified behavior fail.
- [x] Replace the day layout and add scoped theme-aware CSS. Preserve optional topic/examples in a disclosure, keyboard suggestions, edit/delete/undo and study controls.
- [x] Run focused and existing day/study tests, then check Chrome at 320/390/768/1024/1440 px in light and dark with actual add/edit/delete/filter/study operations and overflow/font checks.
- [x] Independent review of only this task's files/diff; fix concrete material issues if found.
- [x] Regenerate precache, run `npm test`, `npm run build`, `git diff --check`, and mirror changed files to `outputs/tu-tu-web` with byte verification.


## Completion evidence

- Four new behavioral tests failed before implementation (missing filters/lookup/progress) and now pass, covering unaccented Vietnamese lookup, unmodified study membership, historic-day form writes and account isolation.
- Chrome passed all 10 width/theme combinations (320, 390, 768, 1024, 1440 px; light/dark). Be Vietnam Pro loads; no horizontal overflow; actual filter/search, mobile menu, edit/delete/undo, historic add, dictionary suggestions, bulk, flashcards and matching work. Long words/IPA/meanings wrap.
- Browser guard reproduced inherited list viewport clipping at 768 px. Resetting max-height/overflow in the new scoped stylesheet fixed hidden rows and clipped row-menu controls; the same browser guard passes.
- Full suite after the CSS fix: 175/175 passing, zero failures or skips.
- Independent reviewer found no concrete issues in this task's scoped changes.
- Production build: `282955222acf20d9`; source precache: `f37caeac0bc31f03`.
- No commit, push, deployment or database mutation performed.
