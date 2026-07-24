import type {ContentEntry, EntryIdentityStrategy} from './types.js';

function normalizeEntryKey(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

export function getEntryKey<TEntry extends ContentEntry>(entry: TEntry, identity: EntryIdentityStrategy<TEntry>): string | null {
  if (typeof identity === 'function') {
    return normalizeEntryKey(identity(entry));
  }

  return normalizeEntryKey(entry[identity]);
}
