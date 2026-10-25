# Gõ từ và Nghe gõ implementation plan

> Execute inline using executing-plans; user supplied authoritative HTML and requested implementation.

**Goal:** Implement functional typing/listening games with the supplied 14 HTML screens, retaining Be Vietnam Pro and existing rounded navigation.
**Architecture:** Pure answer normalization plus focused typing-study renderer/controller; reuse existing day/topic/review sessions and account grading. Full page nonmodal study surface keeps current floating navigation operable.
**Tech Stack:** Existing static JS/CSS, native speech/audio; no dependencies or database migration.
**Spec:** User ZIP `tu-tu-game-ui.zip` (14 HTML files) in work/game-ui/references/html.

## Global constraints
- Match mobile/desktop geometry, colors, badges, input, feedback and result compositions from supplied HTML.
- Be Vietnam Pro overrides sample fonts. Keep existing floating capsule navigation byte-for-byte.
- Dynamic words, counts, streak, examples and due dates replace sample literals.
- Wrong/skipped answers enter today's review; correct answers use existing 1/3/7/14/30 intervals.
- No commits/push/deployment; user performs these separately. Modify existing working copy and mirror deliverable.

## Review focus
- Composition/Enter, blank submissions, double clicks must not double grade.
- Mixed origins with duplicate IDs must preserve the correct day/topic/account.
- Listen prompt must not reveal English before feedback; audio rates must not change preferences.
- Back/navigation/account changes must stop audio and remove game surface.
- Long phrases, 320px screens and keyboard-sized viewports must scroll without menu overlap.

## Task 1: Typing contract and account integration
- [x] Write failing pure normalization tests (case, whitespace, curly apostrophes, punctuation, empty input).
- [x] Write failing DOM scenarios: day grading once, topic skipped state, mixed review origins, replay/close and listening hints.
- [x] Verify RED, implement focused typing-engine.js and typing-study.js; extend day/topic/global routes and entry buttons.
- [x] Verify GREEN and existing suite.

## Task 2: Reference interface
- [x] Build typing-games.css from reference dimensions and colors; responsive game, feedback and result.
- [x] Use nonmodal game surface; preserve menu and font, accessible live feedback, form submission and focus.
- [x] Extend speech rate override and offline/unavailable feedback without account setting mutation.
- [x] Run real Chrome at 320/390/768/1280px both themes, with full flows and reference screenshots.

## Task 3: Delivery
- [x] Fresh independent review, reproduce/fix material findings.
- [x] Full test suite, build, cache update, diff check.
- [x] Mirror modified files byte-for-byte to tu-tu-web; report implementation and live-deployment limitation.

## Execution ledger
- Initial repository clean. Existing modes flip/match only; topic/day/global share gradeStudyWord and ReviewEngine.
- Reference says missed words tomorrow, but established scheduler is today: retain visual treatment and render actual due date.
- Mobile fixed 390x844 artwork becomes responsive scrollable layout with bottom space for existing capsule; desktop uses max-width1120 and two columns.

- Engine/DOM RED recorded in work/game-ui/*-red.log; engine + 8 flow tests now GREEN.
- IME composition RED→GREEN; account switch private game DOM RED→GREEN; first-letter hint after wrong guess RED→GREEN.
- Chrome browser-current.log: 16 game screens, 8 feedback/result screens, Be Vietnam Pro, responsive/keyboard viewport, middle + and Home menu navigation, no page errors.
- First full suite 191/191 passed. Final tests/build await review completion.

- Final independent reviewer /root/review_typing_games: no outstanding actionable bugs (latest bytes include feedback status/heading).
- Final npm test: 193/193 passed, 0 failures/skips; suite-review.log.
- Git diff --check clean. No live deployment or SQL mutation performed.
