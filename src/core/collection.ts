import {getEntryKey} from './identity.js';
import {DEFAULT_SEARCH_FIELDS, DEFAULT_TAG_MODE, queryEntries} from './query.js';
import type {
  Collection,
  CollectionConfig,
  ContentEntry,
  EntryIdentityStrategy,
  ListEntriesOptions,
  SearchField,
  SortOption,
  TagMode,
} from './types.js';

const DEFAULT_SORT: SortOption<ContentEntry> = {by: 'date', direction: 'desc'};

function withDefaults<TEntry extends ContentEntry>(config: CollectionConfig<TEntry>): Required<Omit<CollectionConfig<TEntry>, 'load'>> & Pick<CollectionConfig<TEntry>, 'load'> {
  const identity = (config.identity ?? 'id') as EntryIdentityStrategy<TEntry>;
  const defaultSort = (config.defaultSort ?? DEFAULT_SORT) as SortOption<TEntry>;
  const recentSort = (config.recentSort ?? defaultSort) as SortOption<TEntry>;
  const searchFields = (config.searchFields ?? DEFAULT_SEARCH_FIELDS) as SearchField<TEntry>[];
  const defaultTagMode = (config.defaultTagMode ?? DEFAULT_TAG_MODE) as TagMode;

  return {
    name: config.name ?? 'collection',
    load: config.load,
    identity,
    defaultSort,
    recentSort,
    searchFields,
    defaultTagMode,
  };
}

export function createCollection<TEntry extends ContentEntry>(config: CollectionConfig<TEntry>): Collection<TEntry> {
  const resolvedConfig = withDefaults(config);

  async function load(locale: string): Promise<TEntry[]> {
    const entries = await resolvedConfig.load(locale);
    return Array.isArray(entries) ? [...entries] : [];
  }

  async function list(options: ListEntriesOptions<TEntry>): Promise<TEntry[]> {
    const entries = await load(options.locale);
    return queryEntries(entries, options, resolvedConfig);
  }

  async function get(key: string | number, locale: string): Promise<TEntry | null> {
    const entries = await load(locale);
    const normalizedKey = String(key);
    return entries.find((entry) => getEntryKey(entry, resolvedConfig.identity) === normalizedKey) ?? null;
  }

  return {
    name: resolvedConfig.name,
    config: resolvedConfig,
    load,
    list,
    query: list,
    get: (key, options) => get(key, options.locale),
    recent: async ({locale, limit, sort}) =>
      list({
        locale,
        limit,
        sort: sort ?? resolvedConfig.recentSort,
      }),
    keyOf: (entry) => getEntryKey(entry, resolvedConfig.identity),
  };
}
