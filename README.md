# simpleblog

`simpleblog` is a small ESM-first library for sites that keep their content in local JSON but want reusable collection logic and a portable React renderer for rich content blocks.

It is designed for setups like:

- content stays inside the app repo
- JSON remains simple and ad hoc
- routing and page shells stay app-specific
- query logic and rich-content rendering move into a shared package

## Install

```bash
npm install simpleblog
```

The core package works without React. `simpleblog/react` expects `react >= 18`.

## Core Usage

```ts
import {createCollection} from 'simpleblog';

const posts = createCollection({
  name: 'posts',
  identity: 'slug',
  load: async (locale: string) => {
    const module = await import(`./content/${locale}/posts.json`);
    return module.default;
  },
  defaultSort: {by: 'date', direction: 'desc'},
  recentSort: {by: 'date', direction: 'desc'},
  searchFields: ['title', 'preview', 'tags', 'content'],
  defaultTagMode: 'or',
});

const allPosts = await posts.list({locale: 'en'});
const recentPosts = await posts.recent({locale: 'en', limit: 4});
const currentPost = await posts.get('hello-world', {locale: 'en'});
```

## React Renderer

Built-in blocks can stay ad hoc:

```json
[
  {"h2": "Hello"},
  {"p": "Lorem ipsum dolor sit amet.\n[Read more](https://example.com)"},
  {"img": "https://picsum.photos/1200/600"}
]
```

Custom components use an explicit shape:

```json
[
  {
    "component": "demoCallout",
    "props": {
      "title": "Lorem ipsum",
      "body": "Dolor sit amet"
    },
    "presentation": {
      "className": "my-callout",
      "style": {
        "marginTop": "1.5rem"
      }
    }
  }
]
```

```tsx
import {RichContentRenderer, createComponentRegistry} from 'simpleblog/react';

const components = createComponentRegistry({
  demoCallout: DemoCallout,
});

<RichContentRenderer content={post.content} components={components} />;
```

## Styling

Styling merges in this order:

1. library defaults
2. app-level theme overrides
3. per-block `presentation` for custom components or `className` / `style` for ad hoc built-ins

The renderer supports both `className` and inline `style`.

## HTML Safety

HTML is sanitized by default. Trusted HTML is available via `htmlMode="trusted"` when the content source is fully trusted.

## Examples

Example JSON lives in [examples/posts.en.json](./examples/posts.en.json) and [examples/projects.en.json](./examples/projects.en.json).

## Automated Releases

The GitHub Actions workflow in [.github/workflows/release.yaml](./.github/workflows/release.yaml) publishes on pushes to `master` when the version in `package.json` has changed.

It assumes your existing versioning flow already updates both `package.json` and `ssmver.toml`. The workflow validates that those versions match, skips publish when the version did not change, and skips republishing if that version is already on npm.

To enable publishing:

1. In npm package settings, add a trusted publisher for this GitHub repository and `.github/workflows/release.yaml`.
