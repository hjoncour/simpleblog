import React from 'react';
import {buildHtmlPayload} from './sanitize.js';
import {normalizeComponentBlock, resolveRegisteredComponent} from './registry.js';
import {
  mergePresentation,
  resolveGalleryPresentation,
  resolveTablePresentation,
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
  TableAlign,
  TablePresentation,
  TableSortDirection,
  VideoBlockObject,
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

interface TableCellDescriptor {
  text: string;
  sortValue?: string | number;
  header: boolean;
  align?: TableAlign;
  colSpan?: number;
  rowSpan?: number;
  presentation?: Presentation;
}

interface TableRowDescriptor {
  index: number;
  cells: TableCellDescriptor[];
  presentation?: Presentation;
}

interface TableSortState {
  column: number;
  direction: TableSortDirection;
}

interface TableRenderOptions {
  align: Array<TableAlign | undefined>;
  context: RendererContext;
  resolvePart: (slot: keyof TablePresentation) => Presentation | undefined;
  sort?: TableSortState | null;
  onSort?: (column: number) => void;
}

interface TableModel {
  id: string;
  caption?: string;
  head: TableRowDescriptor | null;
  body: TableRowDescriptor[];
  foot: TableRowDescriptor | null;
  presentation?: Presentation;
  options: TableRenderOptions;
}

interface SortableTableProps {
  model: TableModel;
  initialSort: TableSortState | null;
}

type TableSection = 'head' | 'body' | 'foot';

const RESERVED_KEYS = new Set(['className', 'component', 'presentation', 'props', 'style']);
const TABLE_ALIGNMENTS = new Set(['left', 'center', 'right']);
const DEFAULT_ID_PREFIX = 'simpleblog';

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

function unknownBlock(block: unknown, index: number, id: string, theme: RichContentTheme | undefined, renderUnknown?: (block: unknown, index: number) => React.ReactNode): React.ReactNode {
  if (renderUnknown) {
    return renderUnknown(block, index);
  }

  const presentation = resolveThemePresentation(theme, 'unknown');

  return (
    <p
      className={presentation?.className}
      id={id}
      style={presentation?.style as React.CSSProperties | undefined}
    >
      Unrecognized block {JSON.stringify(block)}
    </p>
  );
}

function resolveAsset(value: string, context: RendererContext): string {
  return context.resolveAsset ? context.resolveAsset(value) : value;
}

function normalizeImageDescriptor(value: unknown, context: RendererContext): ImageDescriptor | null {
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

function renderTextElement(key: string, value: unknown, id: string, slot: 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span', context: RendererContext, theme: RichContentTheme | undefined): React.ReactNode {
  const presentation = resolveThemePresentation(theme, slot);
  return React.createElement(key, {
    className: presentation?.className,
    id,
    style: presentation?.style as React.CSSProperties | undefined,
    dangerouslySetInnerHTML: buildHtmlPayload(value, context.htmlMode, context.sanitizeOptions),
  });
}

function renderImage(value: unknown, id: string, context: RendererContext, theme: RichContentTheme | undefined): React.ReactNode {
  const image = normalizeImageDescriptor(value, context);
  if (!image) {
    return null;
  }

  const presentation = mergePresentation(resolveThemePresentation(theme, 'img'), image.presentation);

  return (
    <img
      alt={image.alt}
      className={presentation?.className}
      id={id}
      src={image.src}
      style={presentation?.style as React.CSSProperties | undefined}
    />
  );
}

function renderGalleryItem(item: GalleryItem, index: number, id: string, context: RendererContext, theme: RichContentTheme | undefined): React.ReactNode {
  const image = normalizeImageDescriptor(item, context);
  if (!image) {
    return null;
  }

  const presentation = mergePresentation(resolveGalleryPresentation(theme, 'item'), image.presentation);

  return (
    <img
      alt={image.alt}
      className={presentation?.className}
      id={id}
      key={`gallery-item-${index}`}
      src={image.src}
      style={presentation?.style as React.CSSProperties | undefined}
    />
  );
}

function renderGallery(value: unknown, id: string, context: RendererContext, theme: RichContentTheme | undefined): React.ReactNode {
  const items = Array.isArray(value) ? value : [];
  if (items.length === 0) {
    return null;
  }

  const presentation = resolveGalleryPresentation(theme, 'wrapper');

  return (
    <div className={presentation?.className} id={id} style={presentation?.style as React.CSSProperties | undefined}>
      {items.map((item, itemIndex) => renderGalleryItem(item as GalleryItemObject | string, itemIndex, `${id}-item-${itemIndex}`, context, theme))}
    </div>
  );
}

function renderVideo(value: unknown, id: string, context: RendererContext, theme: RichContentTheme | undefined): React.ReactNode {
  const descriptor: VideoBlockObject | null = typeof value === 'string' ? {src: value} : isPlainObject(value) ? (value as VideoBlockObject) : null;
  if (!descriptor) {
    return null;
  }

  const source = typeof descriptor.src === 'string' ? descriptor.src : typeof descriptor.video === 'string' ? descriptor.video : null;
  if (!source) {
    return null;
  }

  const autoPlay = descriptor.autoplay === true;
  const presentation = mergePresentation(resolveThemePresentation(theme, 'video'), presentationFromBlock(descriptor as Record<string, unknown>));

  return (
    <video
      autoPlay={autoPlay}
      className={presentation?.className}
      controls={descriptor.controls ?? !autoPlay}
      id={id}
      loop={descriptor.loop === true}
      muted={descriptor.muted ?? autoPlay}
      playsInline={descriptor.playsInline ?? true}
      poster={typeof descriptor.poster === 'string' ? resolveAsset(descriptor.poster, context) : undefined}
      preload={descriptor.preload ?? 'metadata'}
      src={resolveAsset(source, context)}
      style={presentation?.style as React.CSSProperties | undefined}
    />
  );
}

function renderListItem(item: ListItem, index: number, id: string, context: RendererContext, theme: RichContentTheme | undefined): React.ReactNode {
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
      id={id}
      key={`list-item-${index}`}
      style={presentation?.style as React.CSSProperties | undefined}
    />
  );
}

function renderList(value: unknown, id: string, slot: 'ul' | 'ol', context: RendererContext, theme: RichContentTheme | undefined): React.ReactNode {
  const items = Array.isArray(value) ? value : [];
  if (items.length === 0) {
    return null;
  }

  const presentation = resolveThemePresentation(theme, slot);

  return React.createElement(slot, {
    className: presentation?.className,
    id,
    style: presentation?.style as React.CSSProperties | undefined,
  }, items.map((item, itemIndex) => renderListItem(item as ListItemObject | string, itemIndex, `${id}-item-${itemIndex}`, context, theme)));
}

function normalizeTableAlign(value: unknown): TableAlign | undefined {
  return typeof value === 'string' && TABLE_ALIGNMENTS.has(value) ? (value as TableAlign) : undefined;
}

function normalizeTableSpan(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 1 ? value : undefined;
}

// Malformed cells render empty instead of being dropped, so the remaining cells keep their columns.
function normalizeTableCell(value: unknown): TableCellDescriptor {
  if (typeof value === 'string' || typeof value === 'number') {
    return {text: String(value), header: false};
  }

  if (!isPlainObject(value)) {
    return {text: '', header: false};
  }

  return {
    text: typeof value.text === 'string' || typeof value.text === 'number' ? String(value.text) : '',
    sortValue: typeof value.sortValue === 'string' || typeof value.sortValue === 'number' ? value.sortValue : undefined,
    header: value.header === true,
    align: normalizeTableAlign(value.align),
    colSpan: normalizeTableSpan(value.colSpan),
    rowSpan: normalizeTableSpan(value.rowSpan),
    presentation: presentationFromBlock(value),
  };
}

function normalizeTableRow(value: unknown, index = 0): TableRowDescriptor | null {
  if (Array.isArray(value)) {
    return {index, cells: value.map(normalizeTableCell)};
  }

  if (!isPlainObject(value) || !Array.isArray(value.cells)) {
    return null;
  }

  return {index, cells: value.cells.map(normalizeTableCell), presentation: presentationFromBlock(value)};
}

function normalizeTableRows(value: unknown): TableRowDescriptor[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((row, rowIndex) => normalizeTableRow(row, rowIndex)).filter((row): row is TableRowDescriptor => row !== null && row.cells.length > 0);
}

function tableSortValue(row: TableRowDescriptor, column: number): string | number {
  let cursor = 0;
  const cell = row.cells.find((candidate) => {
    const matches = cursor === column;
    cursor += candidate.colSpan ?? 1;
    return matches;
  });
  if (!cell) {
    return '';
  }

  if (typeof cell.sortValue === 'number') {
    return cell.sortValue;
  }

  const text = (cell.sortValue ?? cell.text).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/<[^>]*>/g, '').trim();
  return text.length > 0 && Number.isFinite(Number(text)) ? Number(text) : text;
}

// Empty cells stay at the bottom in both directions.
function sortTableRows(rows: TableRowDescriptor[], sort: TableSortState): TableRowDescriptor[] {
  const direction = sort.direction === 'asc' ? 1 : -1;

  return rows.map((row) => ({row, value: tableSortValue(row, sort.column)})).sort((left, right) => {
    if (left.value === '' || right.value === '') {
      return left.value === right.value ? left.row.index - right.row.index : left.value === '' ? 1 : -1;
    }

    const compared = typeof left.value === 'number' && typeof right.value === 'number' ? left.value - right.value : String(left.value).localeCompare(String(right.value), undefined, {numeric: true, sensitivity: 'base'});
    return compared === 0 ? left.row.index - right.row.index : compared * direction;
  }).map((entry) => entry.row);
}

function renderTableRow(row: TableRowDescriptor, id: string, section: TableSection, {align, context, resolvePart, sort, onSort}: TableRenderOptions): React.ReactNode {
  const presentation = mergePresentation(resolvePart('tr'), row.presentation);
  let column = 0;

  const cells = row.cells.map((cell, cellIndex) => {
    const isHeader = section === 'head' || cell.header;
    const cellColumn = column;
    const cellAlign = cell.align ?? align[cellColumn];
    const cellPresentation = mergePresentation(resolvePart(isHeader ? 'th' : 'td'), cellAlign ? {style: {textAlign: cellAlign}} : undefined, cell.presentation);
    const cellId = `${id}-cell-${cellIndex}`;
    const html = buildHtmlPayload(cell.text, context.htmlMode, context.sanitizeOptions);
    column += cell.colSpan ?? 1;

    if (section === 'head' && onSort) {
      const direction = sort?.column === cellColumn ? sort.direction : null;
      const button = resolvePart('sortButton');
      const indicator = mergePresentation(resolvePart('sortIndicator'), direction ? undefined : {style: {opacity: 0.35}});

      return (
        <th aria-sort={direction ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'} className={cellPresentation?.className} colSpan={cell.colSpan} id={cellId} key={`table-cell-${cellIndex}`} rowSpan={cell.rowSpan} scope="col" style={cellPresentation?.style as React.CSSProperties | undefined}>
          <button className={button?.className} id={`${cellId}-sort`} onClick={() => onSort(cellColumn)} style={button?.style as React.CSSProperties | undefined} type="button">
            <span dangerouslySetInnerHTML={html} id={`${cellId}-label`} />
            <span aria-hidden="true" className={indicator?.className} id={`${cellId}-sort-indicator`} style={indicator?.style as React.CSSProperties | undefined}>{direction === 'asc' ? '▲' : direction === 'desc' ? '▼' : '↕'}</span>
          </button>
        </th>
      );
    }

    return React.createElement(isHeader ? 'th' : 'td', {
      className: cellPresentation?.className,
      colSpan: cell.colSpan,
      dangerouslySetInnerHTML: html,
      id: cellId,
      key: `table-cell-${cellIndex}`,
      rowSpan: cell.rowSpan,
      scope: isHeader ? (section === 'head' ? 'col' : 'row') : undefined,
      style: cellPresentation?.style as React.CSSProperties | undefined,
    });
  });

  return <tr className={presentation?.className} id={id} key={id} style={presentation?.style as React.CSSProperties | undefined}>{cells}</tr>;
}

function renderTableModel({id, caption, head, body, foot, presentation, options}: TableModel): React.ReactNode {
  const {context, resolvePart} = options;
  const wrapper = resolvePart('wrapper');
  const table = mergePresentation(resolvePart('table'), presentation);
  const captionPresentation = resolvePart('caption');
  const thead = resolvePart('thead');
  const tbody = resolvePart('tbody');
  const tfoot = resolvePart('tfoot');

  return (
    <div className={wrapper?.className} id={`${id}-wrapper`} style={wrapper?.style as React.CSSProperties | undefined}>
      <table className={table?.className} id={id} style={table?.style as React.CSSProperties | undefined}>
        {caption ? <caption className={captionPresentation?.className} dangerouslySetInnerHTML={buildHtmlPayload(caption, context.htmlMode, context.sanitizeOptions)} id={`${id}-caption`} style={captionPresentation?.style as React.CSSProperties | undefined} /> : null}
        {head ? (
          <thead className={thead?.className} id={`${id}-head`} style={thead?.style as React.CSSProperties | undefined}>
            {renderTableRow(head, `${id}-head-row`, 'head', options)}
          </thead>
        ) : null}
        {body.length > 0 ? (
          <tbody className={tbody?.className} id={`${id}-body`} style={tbody?.style as React.CSSProperties | undefined}>
            {body.map((row) => renderTableRow(row, `${id}-row-${row.index}`, 'body', options))}
          </tbody>
        ) : null}
        {foot ? (
          <tfoot className={tfoot?.className} id={`${id}-foot`} style={tfoot?.style as React.CSSProperties | undefined}>
            {renderTableRow(foot, `${id}-foot-row`, 'foot', options)}
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

// Clicking a header cycles ascending, descending, then back to the declared row order.
function SortableTable({model, initialSort}: SortableTableProps) {
  const [sort, setSort] = React.useState<TableSortState | null>(initialSort);

  const onSort = (column: number) => {
    setSort((current) => {
      if (!current || current.column !== column) {
        return {column, direction: 'asc'};
      }
      return current.direction === 'asc' ? {column, direction: 'desc'} : null;
    });
  };

  return <>{renderTableModel({...model, body: sort ? sortTableRows(model.body, sort) : model.body, options: {...model.options, sort, onSort}})}</>;
}

function renderTable(value: unknown, id: string, context: RendererContext, theme: RichContentTheme | undefined): React.ReactNode {
  const descriptor = Array.isArray(value) ? {rows: value} : isPlainObject(value) ? value : null;
  if (!descriptor) {
    return null;
  }

  const head = normalizeTableRow(descriptor.headers);
  const body = normalizeTableRows(descriptor.rows);
  const foot = normalizeTableRow(descriptor.footer);
  if (!head && !foot && body.length === 0) {
    return null;
  }

  const overrides = isPlainObject(descriptor.presentation) ? descriptor.presentation : {};
  const resolvePart = (slot: keyof TablePresentation): Presentation | undefined => {
    const override = overrides[slot];
    return mergePresentation(resolveTablePresentation(theme, slot), isPlainObject(override) ? presentationFromBlock(override) : undefined);
  };
  const model: TableModel = {
    id: typeof descriptor.id === 'string' && descriptor.id.length > 0 ? descriptor.id : id,
    caption: typeof descriptor.caption === 'string' && descriptor.caption.length > 0 ? descriptor.caption : undefined,
    head,
    body,
    foot,
    presentation: presentationFromBlock(descriptor),
    options: {
      align: Array.isArray(descriptor.align) ? descriptor.align.map(normalizeTableAlign) : [],
      context,
      resolvePart,
    },
  };

  if (descriptor.sortable !== true || !head) {
    return renderTableModel(model);
  }

  const sort = isPlainObject(descriptor.sort) && typeof descriptor.sort.column === 'number' ? descriptor.sort : null;
  return <SortableTable initialSort={sort ? {column: sort.column as number, direction: sort.direction === 'desc' ? 'desc' : 'asc'} : null} model={model} />;
}

export function renderContentBlock({block, index, components, legacyComponents, theme, context, renderUnknown}: RenderBlockOptions): React.ReactNode {
  const blockId = `${context.idPrefix ?? DEFAULT_ID_PREFIX}-block-${index}`;
  const normalizedComponent = normalizeComponentBlock(block, legacyComponents, context);

  if (normalizedComponent) {
    const resolved = resolveRegisteredComponent(components, normalizedComponent.component);
    if (!resolved) {
      return unknownBlock(block, index, `${blockId}-unknown`, theme, renderUnknown);
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
      <div className={presentation?.className} id={`${blockId}-component`} style={presentation?.style as React.CSSProperties | undefined}>
        <Component {...props} />
      </div>
    );
  }

  if (!isPlainObject(block)) {
    return unknownBlock(block, index, `${blockId}-unknown`, theme, renderUnknown);
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
            {renderTextElement(key, value, `${blockId}-${key}`, key, context, theme)}
          </React.Fragment>
        );
      case 'ul':
      case 'ol':
        return <React.Fragment key={reactKey}>{renderList(value, `${blockId}-${key}`, key, context, theme)}</React.Fragment>;
      case 'img':
        return <React.Fragment key={reactKey}>{renderImage(value, `${blockId}-img`, context, theme)}</React.Fragment>;
      case 'video':
        return <React.Fragment key={reactKey}>{renderVideo(value, `${blockId}-video`, context, theme)}</React.Fragment>;
      case 'table':
        return <React.Fragment key={reactKey}>{renderTable(value, `${blockId}-table`, context, theme)}</React.Fragment>;
      case 'imgs':
        return <React.Fragment key={reactKey}>{renderGallery(value, `${blockId}-imgs`, context, theme)}</React.Fragment>;
      default:
        return <React.Fragment key={reactKey}>{unknownBlock({[key]: value}, index, `${blockId}-unknown-${key}`, theme, renderUnknown)}</React.Fragment>;
    }
  });

  if (!blockPresentation) {
    return <>{renderedEntries}</>;
  }

  return (
    <div className={blockPresentation.className} id={`${blockId}-group`} style={blockPresentation.style as React.CSSProperties | undefined}>
      {renderedEntries}
    </div>
  );
}
