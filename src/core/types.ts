export type EntryKey = string | number;
export type SortDirection = 'asc' | 'desc';
export type TagMode = 'and' | 'or';
export type HtmlMode = 'sanitize' | 'trusted';
export type SearchFieldPreset = 'title' | 'preview' | 'tags' | 'content';

export interface ContentEntry {
  id?: EntryKey;
  slug?: string;
  title?: string;
  preview?: string;
  date?: string;
  tags?: string[];
  icon?: string;
  content?: unknown[];
  [key: string]: unknown;
}

export type EntryIdentityStrategy<TEntry> =
  | 'id'
  | 'slug'
  | keyof TEntry
  | ((entry: TEntry) => EntryKey | null | undefined);

export type SearchField<TEntry> =
  | SearchFieldPreset
  | keyof TEntry
  | ((entry: TEntry) => unknown);

export interface SortSpec<TEntry> {
  by?: keyof TEntry | SearchFieldPreset | ((entry: TEntry) => unknown);
  direction?: SortDirection;
  compare?: (left: TEntry, right: TEntry) => number;
}

export type SortOption<TEntry> = SortSpec<TEntry> | ((left: TEntry, right: TEntry) => number);

export interface QueryOptions<TEntry> {
  search?: string;
  searchFields?: SearchField<TEntry>[];
  tags?: string[];
  tagMode?: TagMode;
  sort?: SortOption<TEntry>;
  limit?: number;
  filter?: (entry: TEntry) => boolean;
}

export interface ListEntriesOptions<TEntry> extends QueryOptions<TEntry> {
  locale: string;
}

export interface GetEntryOptions {
  locale: string;
}

export interface RecentEntriesOptions<TEntry> {
  locale: string;
  limit?: number;
  sort?: SortOption<TEntry>;
}

export interface CollectionConfig<TEntry extends ContentEntry> {
  name?: string;
  load: (locale: string) => Promise<TEntry[]>;
  identity?: EntryIdentityStrategy<TEntry>;
  defaultSort?: SortOption<TEntry>;
  recentSort?: SortOption<TEntry>;
  searchFields?: SearchField<TEntry>[];
  defaultTagMode?: TagMode;
}

export interface Collection<TEntry extends ContentEntry> {
  readonly name: string;
  readonly config: Readonly<Required<Omit<CollectionConfig<TEntry>, 'load'>> & Pick<CollectionConfig<TEntry>, 'load'>>;
  load(locale: string): Promise<TEntry[]>;
  list(options: ListEntriesOptions<TEntry>): Promise<TEntry[]>;
  query(options: ListEntriesOptions<TEntry>): Promise<TEntry[]>;
  get(key: EntryKey, options: GetEntryOptions): Promise<TEntry | null>;
  recent(options: RecentEntriesOptions<TEntry>): Promise<TEntry[]>;
  keyOf(entry: TEntry): string | null;
}

export interface QuerySettings<TEntry extends ContentEntry> {
  defaultSort?: SortOption<TEntry>;
  searchFields?: SearchField<TEntry>[];
  defaultTagMode?: TagMode;
}
