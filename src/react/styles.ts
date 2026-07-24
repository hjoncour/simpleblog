import type {CSSProperties} from 'react';
import type {GalleryPresentation, Presentation, RichContentTheme, StyleObject} from './types.js';

const HEADING_MARGIN = '0 0 0.5rem';
const BODY_MARGIN = '0 0 0.5rem';

export const DEFAULT_THEME: Required<Omit<RichContentTheme, 'gallery'>> & {gallery: Required<GalleryPresentation>} = {
  root: {},
  section: {
    style: {
      marginBottom: '1.5rem',
    },
  },
  h1: {
    style: {
      fontSize: '1.875rem',
      fontWeight: 700,
      margin: HEADING_MARGIN,
    },
  },
  h2: {
    style: {
      fontSize: '1.5rem',
      fontWeight: 700,
      margin: HEADING_MARGIN,
    },
  },
  h3: {
    style: {
      fontSize: '1.25rem',
      fontWeight: 700,
      margin: HEADING_MARGIN,
    },
  },
  p: {
    style: {
      margin: BODY_MARGIN,
      whiteSpace: 'pre-wrap',
    },
  },
  div: {
    style: {
      margin: BODY_MARGIN,
    },
  },
  span: {
    style: {
      marginBottom: '0.5rem',
      display: 'inline-block',
      whiteSpace: 'pre-wrap',
    },
  },
  ul: {
    style: {
      margin: BODY_MARGIN,
      paddingLeft: '1.25rem',
      listStyleType: 'disc',
    },
  },
  ol: {
    style: {
      margin: BODY_MARGIN,
      paddingLeft: '1.25rem',
      listStyleType: 'decimal',
    },
  },
  li: {
    style: {
      marginBottom: '0.25rem',
    },
  },
  img: {
    style: {
      display: 'block',
      margin: '1rem 0',
      maxWidth: '100%',
      borderRadius: '0.5rem',
    },
  },
  video: {
    style: {
      display: 'block',
      margin: '1rem 0',
      maxWidth: '100%',
      height: 'auto',
      borderRadius: '0.5rem',
    },
  },
  gallery: {
    wrapper: {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
      },
    },
    item: {
      style: {
        display: 'block',
        maxWidth: '100%',
        minWidth: 0,
        flex: '1 1 0',
        objectFit: 'contain',
        borderRadius: '0.5rem',
      },
    },
  },
  component: {
    style: {
      margin: '1.5rem 0',
    },
  },
  unknown: {
    style: {
      margin: BODY_MARGIN,
      color: '#6b7280',
      fontStyle: 'italic',
      whiteSpace: 'pre-wrap',
    },
  },
};

export function mergeClassNames(...values: Array<string | undefined>): string | undefined {
  const merged = values.filter(Boolean).join(' ').trim();
  return merged.length > 0 ? merged : undefined;
}

export function mergeStyles(...values: Array<StyleObject | undefined>): StyleObject | undefined {
  const merged = Object.assign({}, ...values.filter(Boolean));
  return Object.keys(merged).length > 0 ? merged : undefined;
}

export function mergePresentation(...values: Array<Presentation | undefined>): Presentation | undefined {
  const className = mergeClassNames(...values.map((value) => value?.className));
  const style = mergeStyles(...values.map((value) => value?.style));

  if (!className && !style) {
    return undefined;
  }

  return {className, style};
}

export function resolveThemePresentation(theme: RichContentTheme | undefined, slot: keyof Omit<RichContentTheme, 'gallery'>): Presentation | undefined {
  return mergePresentation(DEFAULT_THEME[slot], theme?.[slot]);
}

export function resolveGalleryPresentation(theme: RichContentTheme | undefined, slot: keyof GalleryPresentation): Presentation | undefined {
  return mergePresentation(DEFAULT_THEME.gallery[slot], theme?.gallery?.[slot]);
}
