const rendered = new WeakMap<Blob, Promise<OffscreenCanvas>>();

/** SVG needs the document image renderer; worker createImageBitmap cannot decode it. */
export async function svgBitmap(file: Blob): Promise<ImageBitmap> {
  let pending = rendered.get(file);
  if (!pending) {
    pending = (async () => {
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const { naturalWidth: width, naturalHeight: height } = image;
        if (!width || !height || width * height > 32_000_000)
          throw new Error("Use an image under 32 megapixels.");
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error("Image processing is unavailable in this browser.");
        context.drawImage(image, 0, 0);
        return canvas;
      } finally {
        URL.revokeObjectURL(url);
      }
    })();
    rendered.set(file, pending);
    pending.catch(() => rendered.delete(file));
  }
  return createImageBitmap(await pending);
}
