# Profile and avatar dropdown implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement the authorized update in this session. Track each task below.

**Goal:** Apply the supplied V3 profile and avatar dropdown design to the existing app, in both themes and at desktop/mobile sizes.

**Architecture:** Keep authentication in account.js, add a focused account-menu.js for the header disclosure, and profile.js for the profile/settings composition. Reuse existing preference storage and Supabase Auth; do not introduce a backend or new dependencies.

**Tech Stack:** Static HTML, CSS, deferred browser JavaScript, Node test runner.

**Spec:** The user's Flashcard Từ Vựng (5).html reference: V3 A4/A5 and D9/D10, plus their light variants. This plan records the scoped design below.

## Global constraints and scoped design

- Preserve the existing rounded five-slot bottom navigation on desktop and mobile.
- Use bundled Be Vietnam Pro for every text surface and control, including the new UI.
- Avatar opens a dismissible dropdown with real user identity, profile/settings links, immediate theme selection, help and sign-out. Guests see sign-in/register entries.
- Use a yellow initial avatar and a purple identity card, rounded fields and grouped setting rows. Desktop shows two columns; mobile provides information/settings section links.
- Keep profile saving and preference saving independent and explicit; show actual pending, success and error states.
- Only show verified/joined labels when supported by actual account data. Do not copy mock sync/device counts or add inactive reminder/delete/upload controls.
- Profile supports name editing, read-only email and a real password-reset email action. Existing preferences, backup, manual cloud connection and PWA actions remain available to guests.

## Review focus

- Long or malicious names/emails remain readable and escaped.
- Keyboard and outside-click dismissal return focus appropriately; navigation closes the dropdown.
- Auth errors and navigation during a save do not update a different account or unrelated page.
- Theme changes preserve unfinished preference edits and survive reload.
- Narrow and short viewports keep the dropdown scrollable and controls usable in both themes.

## Tasks

- [x] Add behavior tests in tests/dom-check.cjs for disclosure, guest/account state, theme persistence, profile validation and failed/late saves; observe failures before implementation.
- [x] Add assets/js/features/account-menu.js; update index.html/header and account.js to render real identity and manage disclosure. Verify tests for menu/keyboard/navigation.
- [x] Add assets/js/features/profile.js; compose independent profile and preference forms and grouped application actions. Refactor settings.js to share theme controls/storage and retain current IDs and preference behavior. Verify profile/settings tests.
- [x] Add assets/css/profile.css and account-menu.css, preserve navigation.css geometry, audit font declarations and apply responsive light/dark styles.
- [x] Regenerate precache; run the full suite with concurrency 1, build, inspect diff and perform browser checks where available. Mirror changed application files into tu-tu-web.

Changes remain uncommitted so the user can review and push them.

## Verification record

- Behavior tests observed failing before implementation, including auth restoration, stale save and PWA draft protection.
- Full suite: 107 tests pass, 0 failures. Build passes.
- Headless Chrome: 320, 390, 768 and 1280 px, light/dark, screenshots inspected. No horizontal overflow; dropdown bounds and Escape verified.
- Font audit covers home, notebook, review, progress, settings, login and registration. Short 320×480 viewport and Help-to-settings navigation pass.
- Independent review found one Help navigation issue; fixed and covered by a regression test.
- Runtime limitation: localhost networking was unavailable to the test browser, so tests served the same local files using browser request interception. Real Supabase account flows were exercised through the existing Auth adapter tests, not a live account.
