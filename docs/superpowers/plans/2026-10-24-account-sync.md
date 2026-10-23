# Account learning-data synchronization

Root cause at baseline 6c4075b: Auth updates identity only; five browser-local stores have no account scope or cloud transport. Activity is incremented only in localStorage. Existing normalized Supabase tables are not used by the app.

Authorized scope: fix desktop/mobile consistency for saved words, schedules, actual review counts/streak, fixed topic progress, preferences and recent lookups; preserve current UI and guest/offline use. No dictionary upload, manual backup UI, commit or deployment.

Implementation:
1. Add tested account-scoped durable cache and three-way merge. Preserve legacy browser data once for the first signed-in account; prevent guest/other-account reuse. Keep unsent edits and review IDs after logout/reload.
2. Reuse the seven Vietnamese Supabase tables with an additive SQL migration: account revision, per-topic progress, word source metadata and recent lookups. Atomic RPCs authenticate auth.uid(), compare account revision, save a complete merged snapshot, and insert immutable review IDs once. Preserve existing rows and history. Existing activity imports use max per day, not summation of copied legacy aggregates.
3. Wire all learning writes and Auth lifecycle; defer cloud work outside Auth callback; refresh on focus/online/visible polling; isolate stale responses; show honest automatic-save status. Keep active study/forms intact on background refresh, close old-account interactions on user switch.
4. Verify two independent devices, 11 legacy reviews, concurrent offline edits, idempotent retries, deletes, account switch/stale response, failure/recovery, SQL transaction/RLS behavior, full tests/cache/build. Sync delivery mirror and provide SQL setup needed on the user's Supabase project.

Deployment constraint: no Supabase connector/database credentials available. Prepare and locally verify migration; user must run SQL and publish source. Do not claim live account data is already repaired.


## Completion evidence
- The final npm test log confirms 163/163 passing tests with no failures or skips. Includes actual PGlite PostgreSQL migration execution/rerun, RLS and anonymous/direct-write denial, transactional rollback, CAS conflicts, metadata round-trip, 11-review migration, review idempotency and concurrent per-word counts.
- Final npm run build completed with production fingerprint ca95136ac9236371. Source precache fingerprint 9310d9d257f8d027; production differs because public Supabase configuration is generated at build time. Source configuration was not changed. git diff --check passed.
- One independent review found three Important issues: acknowledged review replay after response loss could roll back newer progress; focused old-account forms could remain after identity change; concurrent per-word counts could be overwritten. Regression tests observed RED then GREEN; receipt acknowledgements, forced identity-change rendering and server-side unseen-event increments address these findings.
- Further regression coverage protects a journal removed by another tab during enumeration. Fresh Auth profile metadata is fetched outside Auth callbacks without discarding an edited name. Unchanged-version replies avoid repeatedly downloading the complete notebook.
- Runtime paths, additive SQL migration, setup guide and updated existing documentation are saved in the main Git checkout; source changes are copied byte-for-byte to the existing delivery mirror. No commit, push or live SQL execution was performed.
- The command environment temporarily broke on an invalid Windows /workspace URI after the final test/build commands were launched. After environment recovery, both completed logs were read and confirmed; no test/build failure remained hidden by that interruption.
- Declined review scopes remain explicit: actual Supabase project configuration/live permissions, deployment, and physical desktop/mobile UI/network behavior cannot be verified without those environments. Local PostgreSQL tests cover the SQL contract, not the user's live project. The guide identifies the SQL and deployment steps needed before the running website changes.
