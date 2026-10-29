# Notebook typing and autosave regression — 2026-10-29

## Report and cause

Reviewed the user's chat screenshot and sampled the supplied 20-second video. The Notebook body could accept pasted text but typing was interrupted; title input also depended on delayed save responses.

Notebook `onContentChange` previously sent a full remote save per keystroke, with no immediate local draft. Each asynchronous response replaced the parent note. Older responses could therefore replace a newer editor document or title. The Tiptap prop-sync effect used `setContent` with the v3 default `emitUpdate: true`, producing another edit/save when loading normalized or stale HTML. Save indicators also acknowledged a timer rather than an actual successful write.

## Change

- Keep immediate local drafts for notebook text, title and metadata. Debounce network writes and serialize each note's writes; a completed older request cannot acknowledge a newer draft. Failed saves retain the draft in the current notebook session and expose Retry.
- Flush pending writes when switching notes or leaving the notebook; warn on browser close/reload while unsaved drafts remain. This is not an offline storage feature: drafts are not guaranteed to survive a forced browser close, and a failed write after leaving the notebook is not durable offline storage.
- Use stable UUIDs for newly created/duplicated notebook notes and templates, so the first insert cannot change the selected identity or create duplicate rows while the user is already editing.
- Do not publish in-progress IME composition. Publish the final committed text, and use non-emitting `setContent` for external content loads. Isolate the editor/timers by notebook note ID and review trade ID.
- Keep trash operations in the same write sequence, preventing an earlier pending edit from restoring a trashed note.

## Verification

- 58 Node regression tests passed, including five new executable autosave tests: coalescing, slow saves/newer drafts, failure/retry, document isolation, and duplicate save notifications.
- Production Vite build passed. TypeScript retains the existing 45 diagnostics; no diagnostics in the changed modules. Existing bundle-size/import warnings remain.
- Browser acceptance used actual TradingPlans and NotesPanel components with an isolated local persistence fixture, 1.2-second save latency and a failure switch. Tested sequential typing, typing in the middle of existing text, controlled title edits, composition lasting longer than the save debounce, immediate switching between two notes, new-note editing during the initial save, failed save/retry, paste and undo, and light/dark rendering. Saved fixture contents matched the final text and document IDs; a new note retained one UUID. Loading a note did not start an edit/save feedback loop.
- IME events were simulated in the browser fixture; native Windows IME software from the user's video was not available here. No real user's notes were edited during acceptance. No Supabase schema, policies, permissions, secrets or historical data migration changed.
- Local screenshot: `../output/notebook-input-fixed-2026-10-29.png` in the parent workspace. QA fixture files are ignored by Git and Vercel and are not production code.

User authorized repair and production publication. Exact production deployment and post-release checks are recorded in the parent workspace STATUS.md after release.
