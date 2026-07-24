import sanitizeHtml, {type IOptions} from 'sanitize-html';

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

const DEFAULT_SANITIZE_OPTIONS: IOptions = {
  allowedTags: ['a', 'b', 'br', 'code', 'em', 'i', 'strong'],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
};

function mergeSanitizeOptions(options?: IOptions): IOptions {
  return {
    ...DEFAULT_SANITIZE_OPTIONS,
    ...options,
    allowedTags: options?.allowedTags ?? DEFAULT_SANITIZE_OPTIONS.allowedTags,
    allowedAttributes: {
      ...DEFAULT_SANITIZE_OPTIONS.allowedAttributes,
      ...options?.allowedAttributes,
    },
    allowedSchemes: options?.allowedSchemes ?? DEFAULT_SANITIZE_OPTIONS.allowedSchemes,
  };
}

function markdownLinksToHtml(value: string): string {
  return value.replace(
    MARKDOWN_LINK_PATTERN,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

function normalizeTextHtml(value: string): string {
  return markdownLinksToHtml(value).replace(/\n/g, '<br />');
}

export function buildHtmlPayload(value: unknown, mode: 'sanitize' | 'trusted', options?: IOptions): {__html: string} {
  const html = normalizeTextHtml(String(value ?? ''));

  if (mode === 'trusted') {
    return {__html: html};
  }

  return {
    __html: sanitizeHtml(html, mergeSanitizeOptions(options)),
  };
}
