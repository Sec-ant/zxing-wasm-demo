# Solid Glass

The `solid-glass.css` theme and React/Base UI components in `../components/ui/` are vendored from the local Helianthus example, which vendors [deeplethe/solid-glass](https://github.com/deeplethe/solid-glass). The original MIT copyright and license are retained in `SOLID-GLASS-LICENSE`. Component source adaptations resolve `cn` and sibling imports locally. `SelectField` composes the upstream Select. The application imports these components directly; there is no Svelte bridge or SSR.

Typography, workspace geometry and density rules live in `../index.css`.

# Flexoki

`flexoki-palette.css` is the official [Flexoki](https://stephango.com/flexoki) palette by Steph Ango, licensed under MIT; its copyright and terms are retained in `FLEXOKI-LICENSE`. `flexoki.css` maps the palette to the application and Solid Glass semantic tokens. The original component material remains in `solid-glass.css`.
