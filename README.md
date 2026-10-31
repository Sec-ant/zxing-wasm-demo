# ZXing WASM Studio

A browser workbench for reading, generating and inspecting barcodes with the published [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) package. React + Vite runs entirely on the client. Codecs execute in Web Workers; no SSR or server-side decoding is required.

The interface uses the same **Solid Glass / Base UI** components, material and workspace layout as the local [Helianthus example](../helianthus/examples/sveltekit). The light and dark palettes use [Flexoki](https://stephango.com/flexoki) by Steph Ango. Vendor notices and MIT licenses are preserved in `src/styles/`.

## Workspaces

- **Reader:** the source toolbar groups Image URL, folder and file inputs. Image URL opens an anchored form with inline errors; on mobile all input methods remain visible in a second toolbar row. Upload multiple images or a folder, drag files, paste images, fetch an image URL, or start the camera. Inspect detected outlines, text, bytes, format, flags and the full result JSON. Parameters and output have independent panes, so results never move the settings while rescanning. Reader option changes rescan imported images.
- **Writer:** choose an actual ZXing-C++ writable format, edit the payload and writer options, preview the result, copy the image, download PNG/SVG, print, or send the generated image back to Reader.
- **Formats and samples:** reader and writer choices come from the installed library. Samples cover QR Code, Data Matrix, Aztec, PDF417, Code 128 and multiple symbols.
- Complete reader controls include custom format selection, binarizers, text modes, character sets, EAN add-ons, downscaling, denoising, checksums and symbol limits.
- Light/dark themes, responsive desktop/mobile layouts, keyboard controls, local settings and shareable configuration links. Imported images and decoded results are excluded from saved/shared state.
- Installable PWA. The app, sample images, fonts, worker and WASM are cached for offline use after the first successful visit.

Drop and paste accept image files, mixed files and nested folders, HTTP/HTTPS links, readable blob URLs, data URLs, and HTML image fragments (including picture/srcset, lazy-source attributes and inline SVG). Alternative representations of one image are fallbacks; multiple HTML images become separate imported images. Dropping an existing preview selects its source without importing a duplicate. SVG uses the browser document renderer before transferring a bitmap to the reader worker. Drag text and file-entry handles are captured synchronously before asynchronous reads.

Images are limited to 32 MB each and 32 megapixels. A workspace holds up to 200 images. Image URL hosts must permit CORS. Camera access requires HTTPS or localhost and starts only after pressing **Start camera**; leaving the camera workspace or hiding the page stops its tracks.

## Local development

Main uses the published npm package, pinned to `zxing-wasm@3.1.6` in the lockfile. Install and run without a sibling checkout or native toolchain:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

To try an experimental build from `../zxing-wasm`, build that library and run `pnpm sync:zxing` here. The helper writes a content-addressed package into the ignored `vendor/` directory. Restore the published dependency with `pnpm add --save-exact zxing-wasm@3.1.6` before committing to main. Experimental circular readers are not part of this published release.

Sample PNGs are generated and roundtrip-checked with the installed library via `pnpm samples:generate` (requires the Playwright Chromium browser).

The base path is `/zxing-wasm-demo/`. Settings and theme storage are optional: the app also works when browser storage is unavailable. Shared URLs take precedence over saved local configuration.

## Validation

```sh
pnpm type-check
pnpm lint
pnpm build
pnpm exec playwright install chromium  # first time only
pnpm test
```

Playwright exercises the production build at desktop and mobile widths: matrix and linear readers, actual format filters, PNG/SVG downloads, Unicode generation/readback, saved/share/reset state, malformed images and remote failures, fake-camera track cleanup, offline startup and codecs, plus axe accessibility and overflow checks. Camera tests use Chromium's simulated video source; real device camera quality depends on the hardware and lighting.

## Deployment

Pushing main builds and tests the production app, then deploys it to [GitHub Pages](https://sec-ant.github.io/zxing-wasm-demo/). Pull requests run the same checks without deploying. The workflow installs the published package with the frozen lockfile.

## License

MIT. See `src/styles/SOLID-GLASS-LICENSE` for the vendored component library and `public/samples/README.md` for sample sources.

## Camera processing

Camera input uses the dedicated reader build. VideoFrame handles are transferred to a worker when available, with ImageBitmap and RGBA fallbacks. Pixel preparation uses a reusable OffscreenCanvas in the worker. New video frames drive scheduling; only one decode is in flight, so slow decoding drops frames instead of building a queue. The maximum side stays at 1280 pixels and the configured ReaderOptions are respected.

The contour updates directly after each completed frame. Result details update separately. Diagnostics lazily shows at most 256 payload bytes and bounded JSON binary summaries. Full JSON serialization runs in a separate worker on explicit export; raw payload bytes can also be downloaded. Image parameter changes reuse the initialized reader and its most recent prepared image, and image jobs pause while the camera is active.

Camera metadata separates **Read** (the complete public `readBarcodes` call), **Frame** (capture, preparation, transport and decoding), and completed-frame **Hz**. The initial module load is excluded from the steady-state rate. These measurements describe the current browser and input, not a device-independent guarantee.

Reader precedes Writer in navigation. Multiple detections appear as a selectable list, with matching numbers on image and camera outlines. Selecting a row changes the displayed payload and diagnostics, and highlights its outline. ReaderOptions.maxNumberOfSymbols controls the limit (255 by default; 0 is unlimited).
