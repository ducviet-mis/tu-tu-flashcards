# Kaikki Trial Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. Keep the existing user project as the delivery target.

**Goal:** Make Kaikki the only active dictionary in Từ Từ while retaining FVDP and WordNet files for rollback.

**Architecture:** Build a versioned local snapshot from Kaikki/Wiktionary, a small searchable English/Vietnamese index and compressed detail shards loaded on demand. One provider drives lookup, autocomplete, meanings and pronunciation metadata; old providers must not be used as silent fallbacks. Saved user words and review progress remain intact.

**Tech Stack:** Existing static HTML/CSS/classic JavaScript, Node/Python build tools, Vercel static output and PWA cache.

**Spec:** User request in this conversation, 2026-10-23: try Kaikki, keep old dictionaries but hide/disable them so multiple providers do not operate simultaneously.

## Global Constraints
- No new account, paid API or continuously running laptop/server.
- Keep existing Be Vietnam Pro, rounded menu, auth/settings and saved study data.
- Preserve archived FVDP/WordNet on disk; exclude their scripts and runtime requests from the active flow.
- Do not invent missing translations, pronunciation, examples or relations. Label English-only definitions and device speech clearly.
- This trial does not create an automatically curated topic curriculum.

## Review Focus
- Slow/failed shard requests cannot replace a newer selected entry or discard a draft.
- A missing Kaikki field must not silently pull from an old dictionary.
- Same headword with different meanings retains source and sense when saved/reloaded.
- PWA updates and offline data must refer to the same dataset revision.
- Long definitions, quotations and Vietnamese text fit mobile and remain escaped.

### Task 1: Build and validate a reproducible snapshot
- [x] Inspect and download actual Kaikki extracts; record provenance and licensing.
- [x] Write and run failing tests for normalization, per-sense examples/relations, missing fields and duplicate headwords.
- [x] Add `tools/build-kaikki.py`, metadata, search index and detail shards. Validate real sample entries and report coverage without invented claims.

### Task 2: Activate the provider and dictionary UI
- [x] Write failing provider/DOM tests for exclusive source, Vietnamese search, stale requests, sense selection, audio/device fallback and persistence.
- [x] Add `assets/js/kaikki.js` provider and a focused Kaikki detail feature; keep existing search/autocomplete adapters working with the active index.
- [x] Save selected sense/example/IPA/provenance with cards. Retain user edits and existing schedules.
- [x] Remove old provider script refs; show one Kaikki source and genuine missing-field states.

### Task 3: Packaging, PWA and verification
- [x] Update build/precache/offline downloads to include only active dictionary artifacts; keep archived source files for rollback.
- [x] Adapt legacy tests to explicitly test archived data separately and add real Kaikki data tests.
- [x] Run full tests, production build and responsive browser QA if browser tooling is available.
- [x] Independent final review, apply important fixes, then copy verified files into the existing mirror without touching personal config.

## Execution ledger
- Planning: user explicitly authorizes a trial integration; no extra design confirmation is required.
- Ruling: work in the clean existing project checkout so the user can run their established GitHub commands; preserve a source snapshot and inspect the diff. No commit, push or publish without user instruction.

- Snapshot built: revision `3adca4856d26ed1a`, 119,032 headwords, 27 detail shards + 2.6 MB index, 59,318,274 compressed bytes. Coverage measured from every shard; source hashes and licensing recorded.
- RED→GREEN normalization/provider/DOM tests completed. Archived FVDP/WordNet tests are opt-in harness behavior only.
- Independent reviewer verified the index↔shard bijection, unique sense IDs, field limits, provider exclusivity and packaging. Fixed stale speech after navigation, pending-detail saves, retry loading, audio-only controls, metadata clearing when headword changes and custom meaning labels.
- Final full suite passed 127/127 after all runtime changes. Production build passed. Legacy dictionary files are byte-unchanged in git diff.
- Browser QA could not run: computer/browser inventory is empty in this session. DOM tests do not prove mobile layout or actual audio playback. Local HTTP request initially timed out; do not claim browser/host verification from server startup alone.
- Deferred by scope: curated topics, full million-entry English index, account vocabulary synchronization, independent linguistic audit, hosting publication. User asked for a reversible Kaikki trial.
