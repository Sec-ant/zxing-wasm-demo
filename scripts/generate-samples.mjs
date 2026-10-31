import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";
import { prepareZXingModule, readBarcodes, writeBarcode } from "zxing-wasm";

const require = createRequire(import.meta.url);
await prepareZXingModule({
  overrides: {
    wasmBinary: await readFile(
      require.resolve("zxing-wasm/full/zxing_full.wasm"),
    ),
  },
  fireImmediately: true,
});

for (const [name, format, text] of [
  ["qrcode", "QRCode", "hello-world"],
  ["datamatrix", "DataMatrix", "HELLO"],
  ["aztec", "AztecCode", "你 😀"],
  ["pdf417", "PDF417", "ZXing WASM Studio"],
  ["code128", "Code128", "HELLO"],
]) {
  const result = await writeBarcode(text, { format, scale: 8 });
  if (result.error || !result.image) throw new Error(result.error);
  const decoded = await readBarcodes(result.image);
  if (decoded.length !== 1 || decoded[0].text !== text)
    throw new Error(`Sample did not roundtrip: ${name}`);
  await writeFile(
    `public/samples/${name}.png`,
    new Uint8Array(await result.image.arrayBuffer()),
  );
}

const codes = [];
for (const text of [
  "https://github.com/Sec-ant/zxing-wasm",
  "https://sec-ant.github.io/zxing-wasm/docs/",
]) {
  const result = await writeBarcode(text, { format: "QRCode", scale: 8 });
  if (result.error || !result.image) throw new Error(result.error);
  codes.push(
    `data:image/png;base64,${Buffer.from(await result.image.arrayBuffer()).toString("base64")}`,
  );
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const data = await page.evaluate(async (codes) => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 440;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    for (const [index, code] of codes.entries()) {
      const image = new Image();
      image.src = code;
      await image.decode();
      ctx.drawImage(image, 40 + index * 400, 60, 320, 320);
    }
    return canvas.toDataURL("image/png").split(",")[1];
  }, codes);
  const bytes = Buffer.from(data, "base64");
  const results = await readBarcodes(bytes);
  if (results.length !== 2)
    throw new Error("Multi sample did not decode both symbols");
  await writeFile("public/samples/multi.png", bytes);
} finally {
  await browser.close();
}
console.log(
  "Generated and verified six samples with the installed zxing-wasm package.",
);
