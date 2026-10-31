# Sample sources

These PNGs are generated with the published zxing-wasm writer using `pnpm samples:generate`. The script verifies every payload with the reader, including both symbols in the multi-code image.

- qrcode.png: QR Code, `hello-world`
- datamatrix.png: Data Matrix, `HELLO`
- aztec.png: Aztec Code, `你 😀`
- pdf417.png: PDF417, `ZXing WASM Studio`
- code128.png: Code 128, `HELLO`
- multi.png: two QR Codes containing the project and documentation URLs

These generated examples are provided under the repository's MIT license.
