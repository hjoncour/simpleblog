import type {
  ContentEntry,
  QueryOptions,
  QuerySettings,
  SearchField,
  SortOption,
  SortSpec,
  TagMode,
} from './types.js';

const SEARCHABLE_BLOCK_KEYS = new Set(['title', 'preview', 'tags', 'content']);
const IGNORED_CONTENT_KEYS = new Set(['style', 'className', 'presentation']);

export const DEFAULT_SEARCH_FIELDS: Array<SearchField<ContentEntry>> = ['title', 'preview', 'tags', 'content'];
export const DEFAULT_TAG_MODE: TagMode = 'or';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function valueLooksLikeDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value);
}

function comparableValue(value: unknown): string | number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    if (valueLooksLikeDate(value)) {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return normalizeText(value);
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return '';
}

function compareUnknown(left: unknown, right: unknown): number {
  const comparableLeft = comparableValue(left);
  const comparableRight = comparableValue(right);

  if (typeof comparableLeft === 'number' && typeof comparableRight === 'number') {
    return comparableLeft - comparableRight;
  }

  return String(comparableLeft).localeCompare(String(comparableRight));
}

function resolveSortValue<TEntry extends ContentEntry>(entry: TEntry, by: SortSpec<TEntry>['by']): unknown {
  if (!by) {
    return null;
  }

  if (typeof by === 'function') {
    return by(entry);
  }

  return entry[by];
}

function resolveComparator<TEntry extends ContentEntry>(
  sort?: SortOption<TEntry>,
): ((left: TEntry, right: TEntry) => number) | null {
  if (!sort) {
    return null;
  }

  if (typeof sort === 'function') {
    return sort;
  }

  if (typeof sort.compare === 'function') {
    return sort.compare;
  }

  const direction = sort.direction === 'asc' ? 1 : -1;

  return (left: TEntry, right: TEntry) => {
    const leftValue = resolveSortValue(left, sort.by);
    const rightValue = resolveSortValue(right, sort.by);
    return compareUnknown(leftValue, rightValue) * direction;
  };
}

function collectContentText(value: unknown): string[] {
  if (value == null) {
    return [];
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectContentText(item));
  }

  if (isPlainObject(value)) {
    return Object.entries(value)
      .filter(([key]) => !IGNORED_CONTENT_KEYS.has(key))
      .flatMap(([, item]) => collectContentText(item));
  }

  return [];
}

function resolveSearchFieldValues<TEntry extends ContentEntry>(
  entry: TEntry,
  field: SearchField<TEntry>,
): string[] {
  if (typeof field === 'function') {
    return collectContentText(field(entry));
  }

  if (SEARCHABLE_BLOCK_KEYS.has(String(field))) {
    if (field === 'content') {
      return collectContentText(entry.content);
    }

    if (field === 'tags') {
      return collectContentText(entry.tags ?? []);
    }
  }

  return collectContentText(entry[field]);
}

function matchesSearch<TEntry extends ContentEntry>(
  entry: TEntry,
  search: string,
  searchFields: SearchField<TEntry>[],
): boolean {
  const normalizedSearch = normalizeText(search);
  if (!normalizedSearch) {
    return true;
  }

  return searchFields.some((field) =>
    resolveSearchFieldValues(entry, field)
      .map((value) => normalizeText(value))
      .some((value) => value.includes(normalizedSearch)),
  );
}

function matchesTags(entryTags: string[] | undefined, tags: string[], tagMode: TagMode): boolean {
  if (tags.length === 0) {
    return true;
  }

  const normalizedEntryTags = (entryTags ?? []).map((tag) => normalizeText(tag));
  const normalizedRequestedTags = tags.map((tag) => normalizeText(tag));

  if (tagMode === 'and') {
    return normalizedRequestedTags.every((tag) => normalizedEntryTags.includes(tag));
  }

  return normalizedRequestedTags.some((tag) => normalizedEntryTags.includes(tag));
}

export function sortEntries<TEntry extends ContentEntry>(
  entries: readonly TEntry[],
  sort?: SortOption<TEntry>,
): TEntry[] {
  const comparator = resolveComparator(sort);
  if (!comparator) {
    return [...entries];
  }

  return [...entries].sort(comparator);
}

export function queryEntries<TEntry extends ContentEntry>(
  entries: readonly TEntry[],
  query: QueryOptions<TEntry> = {},
  settings: QuerySettings<TEntry> = {},
): TEntry[] {
  const searchFields = query.searchFields ?? settings.searchFields ?? (DEFAULT_SEARCH_FIELDS as SearchField<TEntry>[]);
  const tagMode = query.tagMode ?? settings.defaultTagMode ?? DEFAULT_TAG_MODE;
  const sort = query.sort ?? settings.defaultSort;

  let filtered = [...entries];

  if (query.filter) {
    filtered = filtered.filter(query.filter);
  }

  if (query.search) {
    filtered = filtered.filter((entry) => matchesSearch(entry, query.search ?? '', searchFields));
  }

  if (query.tags && query.tags.length > 0) {
    filtered = filtered.filter((entry) => matchesTags(entry.tags, query.tags ?? [], tagMode));
  }

  filtered = sortEntries(filtered, sort);

  if (typeof query.limit === 'number') {
    return filtered.slice(0, Math.max(query.limit, 0));
  }

  return filtered;
}
