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

export interface RichContentTheme {
  root?: Presentation;
  section?: Presentation;
  h1?: Presentation;
  h2?: Presentation;
  h3?: Presentation;
  p?: Presentation;
  div?: Presentation;
  span?: Presentation;
  img?: Presentation;
  gallery?: GalleryPresentation;
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

export interface RendererContext {
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
  resolveAsset?: (asset: string) => string;
  renderUnknown?: (block: unknown, index: number) => unknown;
}
