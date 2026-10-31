---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets:
  [
    "src/components/encoder.tsx",
    "src/components/results.tsx",
    "src/components/reader-options.tsx",
    "src/components/camera-reader.tsx",
    "src/index.css",
  ]
---

# ZXing WASM Studio workspaces

Mode: Operate. Scope: image and camera decoding, barcode encoding, complete parameters and inspectable local results. The user pinned the local Helianthus reference and its Solid Glass / Base UI library, with React and Vite and direct implementation. The pinned Helianthus reference supplies the material and workbench arrangement; the user subsequently pinned Flexoki for all interface colors.

## Direction contract

THESIS: A compact barcode studio that keeps real artwork, editable parameters and inspectable results within one working context.

OWN-WORLD: Helianthus Solid Glass: Flexoki paper/ink panes, inset fields, Flexoki red primary actions, fine edge light, Geist interface type and Geist Mono technical data. Preserve the same material in daylight mode. The source artwork is the main image.

STORY: Choose Reader or Writer. Reader opens an image, a batch or a camera session, then shows actual detected text and diagnostics beside the source. Writer edits content and supported writer parameters, then copies, downloads or reads the successful generated symbol. Reader and writer formats come from the published package; samples cover matrix, linear and multiple symbols.

FIRST VIEWPORT: A compact brand and tab header followed by an equal-height desktop inspector and preview. Reader uses a parameter inspector containing only reader settings. A separate, persistently allocated output pane holds decoded text, copy actions and diagnostics; it sits to the source’s right on wide screens and below it at intermediate widths. The preview has Image/Camera tabs, grouped URL/folder/upload inputs, artwork, source filmstrip and metadata. Writer pairs content and writer settings with the generated symbol, copy/download tools and output diagnostics. At wide widths Writer docks diagnostics on the right; narrower widths place them below the artboard. On mobile the preview and fixed-height output come first, followed by parameters in matching DOM and focus order. Busy, empty and populated results keep the same outer output geometry.

FORM: Operate mode. Directly reuse the pinned Solid Glass / Base UI controls and stylesheet. Keep the first view compact and professional, use actual barcode images and outlines, and retain full parameters with progressive disclosure for detailed diagnostics. Do not introduce a concept roll or replace the user-confirmed reference world.

## Finished evidence

Implementation: `src/App.tsx`, `src/index.css`, `src/styles/solid-glass.css`, and the shared UI components. Reviewed corrected raster evidence in `/tmp/zxing-helianthus-review`: desktop and mobile light empty, dark decode, dark encode, and light encode captures. These are local review artifacts, not shipped product assets. The design system records current source rules; visual evidence supports the same density, theme hierarchy, bounded preview and mobile ordering.

Camera contours update on completed decoded frames without rerendering the parameter form. Reader, complete frame latency and completed-frame Hz have distinct meanings; remove passive explanatory copy from the working interface.

FINISH: Record the implemented tokens and self-contained component examples in root `DESIGN.md` and `.impeccable/design.json`; do not copy implementation claims from the reference that are absent from this code.

Diagnostics keeps flags in a tight two-column grid, bounds HEX/JSON previews and exports complete JSON in a separate worker. Default interface copy names actions and actual data; omit passive processing/privacy claims and show remote-image constraints only when a request fails.

Multiple results use a visible list with source-matched number labels and active outlines. Camera selection follows the same payload across reordered frames. The Multi sample demonstrates two real QR Codes together.

The output container uses side-by-side payload and details only when details exist and its own width is at least 600px. Narrow, short docks use a full-width payload followed by compact metadata and full-width Diagnostics; the tall sidebar retains its vertical structure. Expanding Diagnostics scrolls only this panel when needed to reveal its trigger and first flags. Empty or cleared results use the full available content width while keeping the dock and controls in their fixed outer allocations.

Image URL opens a non-modal Base UI popover anchored to the image input toolbar. Source container width controls the toolbar: full labels at 576px and above, compact URL/Upload labels from 480px to 576px, and two aligned rows below 480px. Rescan remains allocated and is disabled without a source. Opening, requesting and error states do not change pane geometry. URL errors stay with the form and successful imports close it.

The user selected Flexoki red as the primary accent, replacing cyan. Light primary is red-600; dark primary is red-300 for legible dark ink. Red applies to actions, selected controls and focus; green remains dedicated to success; blue distinguishes detected geometry.
