# ZXing WASM Studio

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers testing barcode decoding, generation and the ZXing WASM API.

## Product Purpose

Read, generate and inspect barcodes in a browser workbench using the published zxing-wasm package on main.

## Capabilities and Constraints

The user confirmed image and camera reading, generation, light and dark themes, and React with Vite. All codec work runs locally in browser workers. There is no SSR or server codec fallback. Preserve batch uploads, folders, dropped images, pasted images, remote image URLs and complete reader parameters from the existing demo.

Main currently pins the npm release zxing-wasm 3.1.6. Reader and writer choices follow the actual readable and creatable sets exported by that package. The experimental circular families are not present in this release; the local sync helper can be used for development without committing its artifacts.

## Brand Commitments

The user requested the existing Helianthus design and its Solid Glass / Base UI component library, implemented directly from the local reference. The user subsequently requested the official Flexoki palette across the complete light and dark interface.

## Evidence on Hand

Reference implementation: ../helianthus/examples/sveltekit. Production codec: npm zxing-wasm 3.1.6. Samples: reproducible output of scripts/generate-samples.mjs, verified through the same published reader. Optional experimental codec source: ../zxing-wasm.

## Product Principles

- Keep the image and actual decoded results visible together.
- Preserve full parameters and inspectable binary/JSON diagnostics.
- Request camera access only when the user starts the camera.
- Make generation exports follow the successful preview.

## Interaction Requirements

Keep editable controls in a stable region while results are invalidated and replaced. Reader output has independent, bounded geometry on desktop and mobile. Camera throughput should reflect the public library call rather than an artificial UI delay, with capture/frame overhead measured separately. Use concise action labels and real values; omit passive processing claims and default explanatory copy. Diagnostics previews must remain bounded, and full binary/JSON export must not block the interface.
