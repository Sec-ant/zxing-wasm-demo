import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const library = resolve(root, "../zxing-wasm");
const pkg = JSON.parse(
  await readFile(resolve(library, "package.json"), "utf8"),
);
await access(resolve(library, "dist/full/zxing_full.wasm"));
const api = await import(
  pathToFileURL(resolve(library, "dist/es/full/index.js")).href
);
const vendor = resolve(root, "vendor");
execFileSync("pnpm", ["pack", "--pack-destination", vendor], {
  cwd: library,
  stdio: "inherit",
});
const packed = `zxing-wasm-${pkg.version}.tgz`;
const bytes = await readFile(resolve(vendor, packed));
const sha256 = createHash("sha256").update(bytes).digest("hex");
// Amend keeps the npm version unchanged. Distinct paths invalidate pnpm and Vite caches.
const name = `zxing-wasm-${pkg.version}-${api.ZXING_CPP_COMMIT.slice(0, 8)}-${sha256.slice(0, 8)}.tgz`;
await rename(resolve(vendor, packed), resolve(vendor, name));
const demo = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const previous = demo.dependencies["zxing-wasm"].replace(/^file:vendor\//, "");
demo.dependencies["zxing-wasm"] = `file:vendor/${name}`;
await writeFile(
  resolve(root, "package.json"),
  `${JSON.stringify(demo, null, 2)}\n`,
);
await writeFile(
  resolve(vendor, "build.json"),
  `${JSON.stringify({ package: name, version: api.ZXING_WASM_VERSION, zxingCppCommit: api.ZXING_CPP_COMMIT, sha256 }, null, 2)}\n`,
);
execFileSync("pnpm", ["update", "zxing-wasm"], { cwd: root, stdio: "inherit" });
if (previous !== name && /^zxing-wasm-[^/]+\.tgz$/.test(previous))
  await unlink(resolve(vendor, previous)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
