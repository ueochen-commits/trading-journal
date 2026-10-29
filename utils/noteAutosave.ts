export type NoteSaveStatus = 'unsaved' | 'saving' | 'saved' | 'error';

/** One writer per document. A completed request must never acknowledge a newer draft. */
export function createNoteAutosave<T extends { id: string }>(
  save: (draft: T) => Promise<unknown> | void,
  changed: () => void,
  delay = 1000,
) {
  const entries = new Map<string, {
    draft: T; version: number; savedVersion: number; status: NoteSaveStatus;
    timer?: ReturnType<typeof setTimeout>; running?: Promise<void>;
  }>();

  const flush = (id: string): Promise<void> => {
    const entry = entries.get(id);
    if (!entry) return Promise.resolve();
    clearTimeout(entry.timer);
    entry.timer = undefined;
    if (entry.running) return entry.running;
    if (entry.savedVersion === entry.version) return Promise.resolve();
    entry.running = (async () => {
      while (entry.savedVersion !== entry.version) {
        const version = entry.version;
        const draft = entry.draft;
        entry.status = 'saving';
        changed();
        try {
          await save(draft);
          entry.savedVersion = version;
        } catch {
          entry.status = 'error';
          changed();
          return; // Retain the latest draft for explicit retry, without a retry loop.
        }
      }
      entry.status = 'saved';
      changed();
    })().finally(() => { entry.running = undefined; });
    return entry.running;
  };

  return {
    stage(draft: T) {
      const previous = entries.get(draft.id);
      if (previous && JSON.stringify(previous.draft) === JSON.stringify(draft)) return;
      const entry = previous || { draft, version: 0, savedVersion: 0, status: 'saved' as NoteSaveStatus };
      entry.draft = draft;
      entry.version++;
      entry.status = 'unsaved';
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => { void flush(draft.id); }, delay);
      entries.set(draft.id, entry);
      changed();
    },
    flush,
    flushAll() { return Promise.all([...entries.keys()].map(flush)); },
    drafts() { return [...entries.values()].filter(e => e.status !== 'saved').map(e => e.draft); },
    status(id: string): NoteSaveStatus { return entries.get(id)?.status || 'saved'; },
  };
}
