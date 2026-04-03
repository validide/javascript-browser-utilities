# JavaScript Browser Utilities

Welcome to the documentation for JavaScript Browser Utilities.

This site provides usage information, API docs and demo pages for the library.

## Quick links

- API reference: /api/
- Demo pages: /demo/

Demo files are in docs/demo/. The default local dev command now opens the demo page directly.

## Local development

Run the demo site locally with:

```
npm run dev
```

Run the docs site locally with:

```
npm run docs:dev
```

TypeDoc output (API docs) is generated to `docs/public/api-docs` by the project's `typedoc.json` configuration.

## Contributing

If you make changes to the public API, update the TypeDoc output by running `npm run docs:build` (this runs `typedoc` then `vitepress build`).
