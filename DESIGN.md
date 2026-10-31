---
name: "ZXing WASM Studio"
description: "A compact browser barcode workbench using Helianthus Solid Glass and Flexoki."
colors:
  background: "#FFFCF0"
  foreground: "#100F0F"
  panel: "rgb(242 240 229 / 88%)"
  card: "rgb(255 252 240 / 92%)"
  popover: "#FFFCF0"
  primary: "#AF3029"
  primary-foreground: "#FFFCF0"
  muted: "#E6E4D9"
  muted-foreground: "#575653"
  border: "#DAD8CE"
  glass-control: "rgb(255 252 240 / 86%)"
  field: "#FFFCF0"
  field-edge: "#CECDC3"
  focus-line: "#AF3029"
  destructive: "#942822"
  success: "#536907"
  glass-state: "#FFE1D5"
  dark-background: "#100F0F"
  dark-foreground: "#CECDC3"
  dark-panel: "rgb(28 27 26 / 88%)"
  dark-card: "rgb(28 27 26 / 96%)"
  dark-popover: "#1C1B1A"
  dark-primary: "#E8705F"
  dark-primary-foreground: "#261312"
  dark-muted: "#282726"
  dark-muted-foreground: "#9F9D96"
  dark-border: "#343331"
  dark-glass-control: "#282726"
  dark-field: "#282726"
  dark-field-edge: "#343331"
  dark-focus-line: "#E8705F"
  dark-destructive: "#F89A8A"
  dark-success: "#879A39"
  dark-glass-state: "#261312"
  symbol-paper: "#FFFFFF"
  detection-edge: "#101A24"
  detection-line: "#66A0C8"
typography:
  brand:
    fontFamily: "'Geist Variable', 'PingFang SC', sans-serif"
    fontSize: "18px"
    fontWeight: 620
    lineHeight: 1.5
    letterSpacing: "-0.035em"
  body:
    fontFamily: "'Geist Variable', 'PingFang SC', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "'Geist Variable', 'PingFang SC', sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  control:
    fontFamily: "'Geist Variable', 'PingFang SC', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  metadata:
    fontFamily: "'Geist Variable', 'PingFang SC', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "'Geist Mono Variable', ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  checkbox: "4px"
  inset: "8px"
  control: "0.7rem"
  pane: "12px"
  tab-tray: "0.875rem"
  filmstrip: "7px"
  circle: "50%"
spacing:
  micro: "4px"
  tight: "6px"
  inline: "8px"
  control-inline: "10px"
  compact: "12px"
  group: "16px"
  shell: "24px"
  artboard: "32px"
components:
  button-primary:
    backgroundColor: "color-mix(in oklch, var(--primary) var(--primary-solid), transparent)"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-glass:
    backgroundColor: "{colors.glass-control}"
    textColor: "{colors.foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    size: "32px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "4px 10px"
    height: "32px"
  textarea:
    backgroundColor: "{colors.field}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  navigation:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.tab-tray}"
    padding: "3px"
    height: "32px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pane}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pane}"
  select-trigger:
    backgroundColor: "{colors.field}"
    textColor: "{colors.foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 8px 8px 10px"
    height: "32px"
  filmstrip-item:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.filmstrip}"
  checkbox-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.checkbox}"
    size: "16px"
---

# Design System: ZXing WASM Studio

## Overview

**Creative North Star: "Solid Glass"**

ZXing WASM Studio uses the Helianthus Solid Glass material: compact warm paper and ink panes, inset fields and an actual image or generated symbol as the visual center. Light and dark retain the same hierarchy. Local Geist interface text and Geist Mono technical data keep a dense workbench legible.

The finish lives at the edges: an upper rim, fine perimeter and contact shadow. Pane faces stay quiet so source artwork, editable content and results carry the attention. Controls remain compact and complete; hierarchy comes from alignment, section boundaries, weight and tone.

**Key Characteristics:**

- Neutral glass with edge lighting, restrained translucency and a clear thickness hierarchy.
- Compact controls paired with a bounded, prominent image or symbol preview.
- Proportional interface text and monospaced technical values.
- One consistent control language across decoding, camera input and encoding.

This records the implemented React workbench in `src/App.tsx` and `src/index.css`, with the copied material in `src/styles/solid-glass.css`, the Flexoki mapping in `src/styles/flexoki.css` and shared controls in `src/components/ui`. `src/styles/NOTICE.md` records provenance and license. Unprefixed frontmatter colors describe the light `:root`; `dark-` colors describe `.dark`. CSS custom properties remain the implementation source of truth. The theme follows the saved choice, then the system preference. Surface-specific composition and behavior are recorded in `.impeccable/surfaces/src-app-tsx.md`.

## Colors

The interface uses the official [Flexoki](https://stephango.com/flexoki) palette by Steph Ango. Light mode uses Paper (#FFFCF0), warm base shades and ink (#100F0F); dark mode uses Black (#100F0F), base-950 surfaces and base-200 text. Red marks primary actions, focus and selected controls, green indicates success, and red identifies errors. Exact role values are in the frontmatter. `src/styles/flexoki-palette.css` retains the upstream palette; `src/styles/flexoki.css` maps it onto Solid Glass. Small text uses darker light-mode and brighter dark-mode steps where needed to retain contrast on secondary surfaces.

### Primary

- **Primary / Primary foreground:** the deep-red action pane with paper text in light mode, and warm red with dark ink in dark mode. The material mixes the primary fill with transparency rather than painting a flat swatch.
- **Success:** restrained green feedback dots.
- **Detection edge / Detection line:** a dark under-stroke and bright blue line around decoded geometry. These stay visible over image content in both themes.
- **Destructive:** errors and invalid field feedback, adjusted for the active theme.

### Neutral

- **Background / Foreground:** the opaque page and main interface ink.
- **Panel / Card / Popover:** increasing material thickness for inspectors, previews and floating controls.
- **Muted / Muted foreground:** tab trays, inactive image items, secondary notes and metadata.
- **Border:** internal section and metadata separators.
- **Glass control / Glass state:** compact clear controls and selected or held-open states.
- **Field / Field edge:** quiet inset editing surfaces and their perimeter.
- **Focus line:** red keyboard and active-field edge treatment.
- **Symbol paper:** fixed white substrate for generated barcode artwork in both themes.

**The Semantic Color Rule.** Use Flexoki red for primary actions, focus and selection; green for success and blue for detected geometry. Error text uses a separate red step and explicit error messages. Source artwork is data and may carry its own colors.

## Typography

**Interface Font:** Geist Variable, with PingFang SC and sans-serif fallbacks.
**Data Font:** Geist Mono Variable, with UI monospace and monospace fallbacks.

Both variable families are local Fontsource WOFF2 assets and use font-display swap. There is no recurring display type role. The wordmark is the largest interface text; panel titles and field labels use weight and placement rather than a size jump.

### Hierarchy

- **Brand:** compact wordmark (18px, 620, line-height 1.5) with tight tracking (-0.035em); the suffix uses normal weight and muted ink.
- **Title:** section headings, field labels and disclosure titles (14px, 500, line-height 1.5).
- **Body / Control:** interface prose, payloads and standard controls (14px, 400, line-height 1.5). The global font-inherit rule supplies button, input and textarea typography.
- **Metadata:** helper text, source status and data labels (12px, 400, line-height 1.5).
- **Mono:** HEX, JSON, dimensions and timing (12px, 400, line-height 1.5) with tabular numerals.

Footer and sample labels are subordinate exceptions (10–11px). Text representation diagnostics use an intentionally small mono rendering (8px, line-height 1, no letter spacing or ligatures) for continuous barcode geometry rather than prose reading.

**The Data Type Rule.** Use Geist Mono for bytes, dimensions, durations, HEX, JSON and source diagnostics. Keep instructions, payload text and control labels in Geist.

## Layout

The centered shell caps at (1440px) with horizontal padding (24px). A compact header (60px) aligns the wordmark, central workspace tabs and trailing icon tools. Main content starts below a small gap (16px). The general rhythm uses (4px), (8px), (12px) and (16px) spacing; fields use a tighter gap (6px).

Desktop pairs an inspector of `clamp(17.5rem, 22vw, 20rem)` with a flexible preview and gap (16px). Workspaces use `min(800px, calc(100svh - 128px))` height with a minimum (440px). Inspectors scroll internally. Toolbar and metadata rows stay around the bounded artboard; pane sections use padding (16px). Image content uses object-fit contain in an inset coordinate space, shared with its detection overlay.

Reader keeps parameters in a stable left inspector. Image URL, folder and upload controls belong to the source toolbar. Image URL opens a viewport-bounded Solid Glass popover without shifting the workspace; source-container width selects full labels (at least 576px), compact URL/Upload labels (480–576px), or two aligned rows (below 480px). Rescan keeps a disabled slot in the empty state. At widths of at least (1280px), source and output use separate columns and output is (300px) wide. At intermediate widths, a (250px) output dock sits below the source. Its own width controls internal columns: at least (600px) allows side-by-side content, while a narrow dock uses a full-width payload, compact metadata and full-width Diagnostics. Explicitly expanding Diagnostics reveals the first flags through local scrolling. Output scrolls independently in every state, so re-reading does not move parameters or resize the source pane.

At widths up to (800px), Reader DOM and visual order are source, output, parameters. Output retains a (340px) height and scrolls internally. Source metadata reserves two lines. Writer keeps preview first and inspector second. Shell padding becomes (16px); the header gives navigation its own full row. The artboard is (340px) high with padding (20px). At widths up to (380px), shell padding becomes (12px), the brand suffix hides, and lower-priority icon tools are omitted. These changes retain the default control height (32px).

At widths of at least (1280px), the encoding preview reserves a right diagnostic column (260px). Below that width, diagnostics follow the artboard within the preview pane; desktop overflow is bounded and mobile diagnostics use normal document flow. Generated artwork fits both dimensions, capped at (440px) on desktop and (300px) on mobile. Camera framing retains a (4:3) aspect ratio. Source-specific output and parameter ordering belong to the surface brief.

## Elevation & Depth

Solid Glass combines translucent neutral fills, backdrop blur and edge shadows. Panel, card and popover are progressively thicker. Panes use blur (26px), small clear controls use blur (14px); both themes use neutral blur without a saturation boost. Both themes keep an even ground. Shadows and highlights derive from Flexoki ink and paper, with no cool ambient tint.

### Shadow Vocabulary

- **Pane:** upper rim, inner edge, exterior hairline, contact shadow and diffuse lower shade.
- **Primary action:** upper rim, lower shade, inner line, contact shadow and a short lower lift. Pressing removes the lower lift.
- **Glass control:** upper rim, exterior hairline and short contact shadow.
- **Popover:** stronger perimeter and deeper lower lift than a card.
- **Inset well:** shade under the top lip and light along the lower edge of a tab tray or unchecked box.
- **Symbol:** diffuse shadow under the white image substrate.

Exact recipes are in the sidecar. Its generated color strips are swatch aids rather than additional application tokens. Standard controls retain their library focus treatment; the global fallback outline is (2px) with offset (3px). Fields strengthen their perimeter on focus. Disabled controls use opacity (0.5). Enabled button presses shift down (1px) where the Base UI button rule allows. Reduced motion removes animation and transitions. Reduced transparency removes pane blur and selects the copied stylesheet's opaque fills.

**The Edge Finish Rule.** Keep pane faces neutral. Express glass through the existing rim, hairline, blur and contact shadow, preserving panel, card and popover thickness.

## Shapes

Workspace panes have gentle, bounded corners (12px). Standard button, input and select radii resolve to the control radius (0.7rem); textareas receive that same radius through the material override. Tab trays use the library pane radius (0.875rem), with inset selected tabs using control corners. Checkboxes stay small squares (16px) with corners (4px). Filmstrip items use smaller corners (7px); generated symbol paper uses corners (4px). The fixed white image substrate carries the symbol, never a decorative mask.

Internal section dividers are single hairlines. Outer pane outlines are part of the shadow recipe rather than additional stacked borders. Detection polygons are unfilled; both their strokes use non-scaling geometry so zoom does not change the outline's screen weight.

## Components

### Buttons

Compact working controls share the same shape, icon alignment and height (32px). Normal text buttons use horizontal padding (10px) and icon gaps (6px); icon-only tools are square (32px).

- **Primary:** red primary pane with contrasting primary-foreground ink and the stronger glass edge treatment. Hover thins the fill; press reduces its lift.
- **Glass:** clear control fill, upper rim and short contact shadow. Hover uses foreground mixed to (12%) opacity; the optional stronger state uses the source component's stronger mix.
- **Ghost:** transparent at rest, neutral hover fill and no resting lift. Header tools and reset actions use this quieter form.
- **Focus / Disabled:** library focus edge and ring treatment remains visible; disabled controls suppress interaction and reduce opacity.

### Cards / Containers

The inspector is the thinnest panel, the preview a card, and floating select/menu/dialog content the thickest popover. All use the shared edge vocabulary. Workspace panes clip their own contents, with section padding (16px). Toolbar and metadata boundaries are hairline separators rather than nested card outlines.

### Inputs / Fields

Fields are clear, inset panes with one perimeter and a top rim. Inputs and selects are (32px) high; inputs use padding (4px 10px), and multiline editors use (8px 10px). Labels remain above their fields with gap (6px). Textareas can resize vertically where the workflow allows. Focus strengthens the field edge; invalid state uses destructive ink and border treatment. Disabled fields retain the library opacity and cursor behavior.

### Navigation

Workspace and input choices use the same Base UI tabs. A muted inset tray (32px high, 3px padding) holds compact text-and-icon options. The active tab is a small clear pane with a rim and contact shadow; the label becomes full foreground. The header workspace choice expands across the mobile second row. Icons use consistent SVG strokes and generally measure (16px).

### Checkboxes and Disclosures

Checkboxes use a recessed groove while unchecked and a red primary pane with a checkmark while selected. A row provides a minimum height (32px) and label gap (8px). Disclosures use full-width text rows with a chevron; opening rotates it through (180deg) over (150ms ease-out). Open contents use a compact field gap (12px).

### Image Filmstrip

Imported image items form a horizontally scrollable compact strip. Each uses a muted rounded container, truncated source name, small mono result count and separate removal control. The selected item wears the glass-state fill, upper rim and short contact shadow; it does not introduce another accent color.

### Artwork and Diagnostics

Source images and generated output are the signature visual content. Images fit without distortion; generated artwork retains a white substrate and pixelated rendering. Successful detection uses a deep blue outline (6px) under a bright blue line (3px), with inactive results reduced to opacity (0.65). HEX, JSON, SVG and barcode text diagnostics retain mono type and local scrolling or resizing. Reader Diagnostics uses a compact two-column flag grid, byte-aligned HEX wrapping and bounded binary summaries; complete data is exported on demand without expanding large arrays into the interface. The exact workflow arrangement is in the surface brief.

## Do's and Don'ts

### Do:

- **Do** reuse the copied Solid Glass stylesheet and Base UI components for matching controls.
- **Do** preserve the same visual hierarchy in light and dark themes.
- **Do** keep field labels visible and technical values readable in their established type roles.
- **Do** fit source artwork and generated symbols without stretching or cropping their contents.
- **Do** retain keyboard focus, reduced motion and reduced transparency treatments.

### Don't:

- **Don't** replace the neutral workbench with decorative gradients across pane faces.
- **Don't** tint symbol paper to match the surrounding theme.
- **Don't** use detection green as a general action or navigation accent.
- **Don't** enlarge ordinary headings into a display typography system that the workbench does not use.
- **Don't** remove the edge treatment or stack extra borders around glass panes.

The favicon uses a simple scan frame and Z monogram on a Flexoki red tile. The same mark is provided as 192px/512px app icons and a separately padded maskable SVG/PNG.
