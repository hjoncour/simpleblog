import type {IOptions} from 'sanitize-html';

export type StyleObject = Record<string, unknown>;

export interface Presentation {
  className?: string;
  style?: StyleObject;
}

export interface GalleryPresentation {
  wrapper?: Presentation;
  item?: Presentation;
}

export interface TablePresentation {
  wrapper?: Presentation;
  table?: Presentation;
  caption?: Presentation;
  thead?: Presentation;
  tbody?: Presentation;
  tfoot?: Presentation;
  tr?: Presentation;
  th?: Presentation;
  td?: Presentation;
  sortButton?: Presentation;
  sortIndicator?: Presentation;
}

export interface RichContentTheme {
  root?: Presentation;
  section?: Presentation;
  h1?: Presentation;
  h2?: Presentation;
  h3?: Presentation;
  p?: Presentation;
  div?: Presentation;
  span?: Presentation;
  ul?: Presentation;
  ol?: Presentation;
  li?: Presentation;
  img?: Presentation;
  video?: Presentation;
  gallery?: GalleryPresentation;
  table?: TablePresentation;
  component?: Presentation;
  unknown?: Presentation;
}

export interface ComponentBlock {
  component: string;
  props?: Record<string, unknown>;
  presentation?: Presentation;
}

export interface GalleryItemObject {
  img?: string;
  src?: string;
  alt?: string;
  className?: string;
  style?: StyleObject;
}

export type GalleryItem = string | GalleryItemObject;

export interface ListItemObject {
  text?: string;
  li?: string;
  className?: string;
  style?: StyleObject;
}

export type ListItem = string | ListItemObject;

export interface VideoBlockObject {
  src?: string;
  video?: string;
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'auto' | 'metadata' | 'none';
  className?: string;
  style?: StyleObject;
}

export type VideoBlock = string | VideoBlockObject;

export type TableAlign = 'left' | 'center' | 'right';

export type TableSortDirection = 'asc' | 'desc';

export interface TableSort {
  column: number;
  direction?: TableSortDirection;
}

export interface TableCellObject {
  text?: string | number;
  sortValue?: string | number;
  header?: boolean;
  align?: TableAlign;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
  style?: StyleObject;
}

export type TableCell = string | number | TableCellObject;

export interface TableRowObject {
  cells?: TableCell[];
  className?: string;
  style?: StyleObject;
}

export type TableRow = TableCell[] | TableRowObject;

export interface TableBlockObject {
  id?: string;
  caption?: string;
  headers?: TableRow;
  rows?: TableRow[];
  footer?: TableRow;
  align?: TableAlign[];
  sortable?: boolean;
  sort?: TableSort;
  presentation?: TablePresentation;
  className?: string;
  style?: StyleObject;
}

export type TableBlock = TableRow[] | TableBlockObject;

export interface RendererContext {
  idPrefix?: string;
  resolveAsset?: (asset: string) => string;
  htmlMode: 'sanitize' | 'trusted';
  sanitizeOptions?: IOptions;
  theme?: RichContentTheme;
}

export interface RegisteredComponentDefinition<Props extends Record<string, unknown> = Record<string, unknown>> {
  Component: (props: Props) => unknown;
  mapProps?: (props: Record<string, unknown>, context: RendererContext, block: ComponentBlock) => Props;
}

export type RegisteredComponent =
  | ((props: any) => unknown)
  | RegisteredComponentDefinition<any>;

export type ComponentRegistry = Record<string, RegisteredComponent>;

export interface LegacyComponentDefinition {
  component: string;
  mapProps?: (value: unknown, block: Record<string, unknown>, context: RendererContext) => Record<string, unknown>;
  presentation?: Presentation;
}

export type LegacyComponentRegistry = Record<string, string | LegacyComponentDefinition>;

export interface RichContentRendererProps {
  content?: unknown[];
  components?: ComponentRegistry;
  legacyComponents?: LegacyComponentRegistry;
  theme?: RichContentTheme;
  htmlMode?: 'sanitize' | 'trusted';
  sanitizeOptions?: IOptions;
  className?: string;
  style?: StyleObject;
  idPrefix?: string;
  resolveAsset?: (asset: string) => string;
  renderUnknown?: (block: unknown, index: number) => unknown;
}
