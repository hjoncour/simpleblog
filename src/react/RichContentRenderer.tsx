import React from 'react';
import {renderContentBlock} from './builtins.js';
import {mergePresentation, resolveThemePresentation} from './styles.js';
import type {RichContentRendererProps, RendererContext} from './types.js';

export function RichContentRenderer({content = [], components = {}, legacyComponents, theme, htmlMode = 'sanitize', sanitizeOptions, className, style, idPrefix = 'simpleblog', resolveAsset, renderUnknown}: RichContentRendererProps) {
  const context: RendererContext = {
    idPrefix,
    resolveAsset,
    htmlMode,
    sanitizeOptions,
    theme,
  };

  const rootPresentation = mergePresentation(resolveThemePresentation(theme, 'root'), {className, style});
  const sectionPresentation = resolveThemePresentation(theme, 'section');

  return (
    <div className={rootPresentation?.className} id={`${idPrefix}-root`} style={rootPresentation?.style as React.CSSProperties | undefined}>
      {content.map((block, index) => (
        <div
          className={sectionPresentation?.className}
          id={`${idPrefix}-block-${index}`}
          key={`simpleblog-block-${index}`}
          style={sectionPresentation?.style as React.CSSProperties | undefined}
        >
          {renderContentBlock({
            block,
            index,
            components,
            legacyComponents,
            theme,
            context,
            renderUnknown: renderUnknown as ((block: unknown, index: number) => React.ReactNode) | undefined,
          })}
        </div>
      ))}
    </div>
  );
}
