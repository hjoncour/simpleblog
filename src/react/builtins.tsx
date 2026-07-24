import React from 'react';
import {buildHtmlPayload} from './sanitize.js';
import {normalizeComponentBlock, resolveRegisteredComponent} from './registry.js';
import {
  mergePresentation,
  resolveGalleryPresentation,
  resolveThemePresentation,
} from './styles.js';
import type {
  ComponentRegistry,
  GalleryItem,
  GalleryItemObject,
  LegacyComponentRegistry,
  ListItem,
  ListItemObject,
  Presentation,
  RendererContext,
  RichContentTheme,
} from './types.js';

interface RenderBlockOptions {
  block: unknown;
  index: number;
  components: ComponentRegistry;
  legacyComponents?: LegacyComponentRegistry;
  theme?: RichContentTheme;
  context: RendererContext;
  renderUnknown?: (block: unknown, index: number) => React.ReactNode;
}

interface ImageDescriptor {
  src: string;
  alt: string;
  presentation?: Presentation;
}

const RESERVED_KEYS = new Set(['className', 'component', 'presentation', 'props', 'style']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function presentationFromBlock(block: Record<string, unknown>): Presentation | undefined {
  const className = typeof block.className === 'string' ? block.className : undefined;
  const style = isPlainObject(block.style) ? block.style : undefined;

  if (!className && !style) {
    return undefined;
  }

  return {className, style};
}

function unknownBlock(
  block: unknown,
  index: number,
  theme: RichContentTheme | undefined,
  renderUnknown?: (block: unknown, index: number) => React.ReactNode,
): React.ReactNode {
  if (renderUnknown) {
    return renderUnknown(block, index);
  }

  const presentation = resolveThemePresentation(theme, 'unknown');

  return (
    <p
      className={presentation?.className}
      style={presentation?.style as React.CSSProperties | undefined}
    >
      Unrecognized block {JSON.stringify(block)}
    </p>
  );
}

function resolveAsset(value: string, context: RendererContext): string {
  return context.resolveAsset ? context.resolveAsset(value) : value;
}

function normalizeImageDescriptor(
  value: unknown,
  context: RendererContext,
): ImageDescriptor | null {
  if (typeof value === 'string') {
    return {
      src: resolveAsset(value, context),
      alt: '',
    };
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const source = typeof value.src === 'string' ? value.src : typeof value.img === 'string' ? value.img : null;
  if (!source) {
    return null;
  }

  const className = typeof value.className === 'string' ? value.className : undefined;
  const style = isPlainObject(value.style) ? value.style : undefined;

  return {
    src: resolveAsset(source, context),
    alt: typeof value.alt === 'string' ? value.alt : '',
    presentation: className || style ? {className, style} : undefined,
  };
}

function renderTextElement(
  key: string,
  value: unknown,
  slot: 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span',
  context: RendererContext,
  theme: RichContentTheme | undefined,
): React.ReactNode {
  const presentation = resolveThemePresentation(theme, slot);
  return React.createElement(key, {
    className: presentation?.className,
    style: presentation?.style as React.CSSProperties | undefined,
    dangerouslySetInnerHTML: buildHtmlPayload(value, context.htmlMode, context.sanitizeOptions),
  });
}

function renderImage(
  value: unknown,
  context: RendererContext,
  theme: RichContentTheme | undefined,
): React.ReactNode {
  const image = normalizeImageDescriptor(value, context);
  if (!image) {
    return null;
  }

  const presentation = mergePresentation(resolveThemePresentation(theme, 'img'), image.presentation);

  return (
    <img
      alt={image.alt}
      className={presentation?.className}
      src={image.src}
      style={presentation?.style as React.CSSProperties | undefined}
    />
  );
}

function renderGalleryItem(
  item: GalleryItem,
  index: number,
  context: RendererContext,
  theme: RichContentTheme | undefined,
): React.ReactNode {
  const image = normalizeImageDescriptor(item, context);
  if (!image) {
    return null;
  }

  const presentation = mergePresentation(resolveGalleryPresentation(theme, 'item'), image.presentation);

  return (
    <img
      alt={image.alt}
      className={presentation?.className}
      key={`gallery-item-${index}`}
      src={image.src}
      style={presentation?.style as React.CSSProperties | undefined}
    />
  );
}

function renderGallery(
  value: unknown,
  context: RendererContext,
  theme: RichContentTheme | undefined,
): React.ReactNode {
  const items = Array.isArray(value) ? value : [];
  if (items.length === 0) {
    return null;
  }

  const presentation = resolveGalleryPresentation(theme, 'wrapper');

  return (
    <div className={presentation?.className} style={presentation?.style as React.CSSProperties | undefined}>
      {items.map((item, itemIndex) => renderGalleryItem(item as GalleryItemObject | string, itemIndex, context, theme))}
    </div>
  );
}

function renderListItem(
  item: ListItem,
  index: number,
  context: RendererContext,
  theme: RichContentTheme | undefined,
): React.ReactNode {
  const text = typeof item === 'string' ? item : typeof item.text === 'string' ? item.text : typeof item.li === 'string' ? item.li : null;
  if (text === null) {
    return null;
  }

  const itemPresentation = isPlainObject(item) ? presentationFromBlock(item) : undefined;
  const presentation = mergePresentation(resolveThemePresentation(theme, 'li'), itemPresentation);

  return (
    <li
      className={presentation?.className}
      dangerouslySetInnerHTML={buildHtmlPayload(text, context.htmlMode, context.sanitizeOptions)}
      key={`list-item-${index}`}
      style={presentation?.style as React.CSSProperties | undefined}
    />
  );
}

function renderList(
  value: unknown,
  slot: 'ul' | 'ol',
  context: RendererContext,
  theme: RichContentTheme | undefined,
): React.ReactNode {
  const items = Array.isArray(value) ? value : [];
  if (items.length === 0) {
    return null;
  }

  const presentation = resolveThemePresentation(theme, slot);

  return React.createElement(slot, {
    className: presentation?.className,
    style: presentation?.style as React.CSSProperties | undefined,
  }, items.map((item, itemIndex) => renderListItem(item as ListItemObject | string, itemIndex, context, theme)));
}

export function renderContentBlock({
  block,
  index,
  components,
  legacyComponents,
  theme,
  context,
  renderUnknown,
}: RenderBlockOptions): React.ReactNode {
  const normalizedComponent = normalizeComponentBlock(block, legacyComponents, context);

  if (normalizedComponent) {
    const resolved = resolveRegisteredComponent(components, normalizedComponent.component);
    if (!resolved) {
      return unknownBlock(block, index, theme, renderUnknown);
    }

    const props = resolved.mapProps
      ? resolved.mapProps(normalizedComponent.props ?? {}, context, normalizedComponent)
      : normalizedComponent.props ?? {};
    const presentation = mergePresentation(
      resolveThemePresentation(theme, 'component'),
      normalizedComponent.presentation,
    );
    const Component = resolved.Component as React.ComponentType<any>;

    return (
      <div className={presentation?.className} style={presentation?.style as React.CSSProperties | undefined}>
        <Component {...props} />
      </div>
    );
  }

  if (!isPlainObject(block)) {
    return unknownBlock(block, index, theme, renderUnknown);
  }

  const blockPresentation = presentationFromBlock(block);
  const contentEntries = Object.entries(block).filter(([key]) => !RESERVED_KEYS.has(key));

  if (contentEntries.length === 0) {
    return null;
  }

  const renderedEntries = contentEntries.map(([key, value], entryIndex) => {
    const reactKey = `${index}-${entryIndex}-${key}`;

    switch (key) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'p':
      case 'div':
      case 'span':
        return (
          <React.Fragment key={reactKey}>
            {renderTextElement(key, value, key, context, theme)}
          </React.Fragment>
        );
      case 'ul':
      case 'ol':
        return <React.Fragment key={reactKey}>{renderList(value, key, context, theme)}</React.Fragment>;
      case 'img':
        return <React.Fragment key={reactKey}>{renderImage(value, context, theme)}</React.Fragment>;
      case 'imgs':
        return <React.Fragment key={reactKey}>{renderGallery(value, context, theme)}</React.Fragment>;
      default:
        return <React.Fragment key={reactKey}>{unknownBlock({[key]: value}, index, theme, renderUnknown)}</React.Fragment>;
    }
  });

  if (!blockPresentation) {
    return <>{renderedEntries}</>;
  }

  return (
    <div className={blockPresentation.className} style={blockPresentation.style as React.CSSProperties | undefined}>
      {renderedEntries}
    </div>
  );
}
