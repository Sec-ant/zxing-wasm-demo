/** Schedule only new video frames; never queue a second decode behind the first. */
export function nextVideoFrame(
  video: HTMLVideoElement,
  callback: () => void,
): () => void {
  if (typeof video.requestVideoFrameCallback === "function") {
    const handle = video.requestVideoFrameCallback(callback);
    return () => video.cancelVideoFrameCallback(handle);
  }
  const handle = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(handle);
}

/** Transfer a video handle; keep RGBA readback off the UI thread when supported. */
export async function captureVideo(
  video: HTMLVideoElement,
  fallback: HTMLCanvasElement,
) {
  if (typeof VideoFrame === "function")
    return new VideoFrame(video, {
      timestamp: Math.round(video.currentTime * 1_000_000),
    });
  if (typeof createImageBitmap === "function") return createImageBitmap(video);
  const scale = Math.min(
    1,
    1280 / Math.max(video.videoWidth, video.videoHeight),
  );
  const width = Math.round(video.videoWidth * scale);
  const height = Math.round(video.videoHeight * scale);
  if (fallback.width !== width) fallback.width = width;
  if (fallback.height !== height) fallback.height = height;
  const context = fallback.getContext("2d", { willReadFrequently: true });
  if (!context)
    throw new Error("The browser could not create a camera canvas.");
  context.drawImage(video, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}
