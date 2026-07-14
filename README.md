# zxing-wasm-demo

[![deploy status](https://github.com/Sec-ant/zxing-wasm-demo/actions/workflows/deploy.yml/badge.svg)](https://github.com/Sec-ant/zxing-wasm-demo/actions/workflows/deploy.yml) [![zxing-wasm version](https://img.shields.io/npm/v/zxing-wasm?label=zxing-wasm)](https://www.npmjs.com/package/zxing-wasm)

A browser workbench for testing [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) barcode decoding.

**[Launch Demo →](https://sec-ant.github.io/zxing-wasm-demo/)**

## Features

- **Drag & drop** images, folders, or paste from clipboard
- **Remote image URL** support
- Full control over all [reader options](https://github.com/Sec-ant/zxing-wasm?tab=readme-ov-file#readeroptions): formats, binarizers, text modes, character sets, EAN add-ons, and more
- **Batch scanning** with detailed results per file
- Copy results to clipboard in one click
- Light / dark / auto theme
- Installable PWA with offline support after the first visit

## Development

```bash
pnpm i
pnpm dev
```

## Build

```bash
pnpm build
```

## License

MIT
