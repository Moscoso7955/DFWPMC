// Browser-side photo handling shared by contributor uploads and photo
// events: three re-encoded copies, straight-to-storage PUTs.

// Long-edge limits for the three copies. The browser re-encodes each one,
// which also drops the camera's location data.
export type CopySizes = { full: number; view: number; thumb: number };
export const NIGHT_SIZES: CopySizes = { full: 4000, view: 2048, thumb: 800 };
const QUALITY = { full: 0.9, view: 0.85, thumb: 0.8 } as const;


type Surface = OffscreenCanvas | HTMLCanvasElement;

function makeSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function toJpeg(surface: Surface, quality: number): Promise<Blob> {
  if ("convertToBlob" in surface) return surface.convertToBlob({ type: "image/jpeg", quality });
  return new Promise((resolve, reject) =>
    surface.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode photo"))), "image/jpeg", quality),
  );
}

function scaled(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height));
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))] as const;
}

export async function makeCopies(file: Blob, sizes: CopySizes = NIGHT_SIZES) {
  // createImageBitmap applies the photo's rotation (EXIF orientation).
  const bitmap = await createImageBitmap(file);
  try {
    const draw = (source: CanvasImageSource, w: number, h: number) => {
      const surface = makeSurface(w, h);
      const ctx = surface.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if (!ctx) throw new Error("Couldn't process photo");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, w, h);
      return surface;
    };
    const [fw, fh] = scaled(bitmap.width, bitmap.height, sizes.full);
    const full = draw(bitmap, fw, fh);
    const [vw, vh] = scaled(fw, fh, sizes.view);
    const view = draw(full as CanvasImageSource, vw, vh);
    const [tw, th] = scaled(vw, vh, sizes.thumb);
    const thumb = draw(view as CanvasImageSource, tw, th);
    const [fullBlob, viewBlob, thumbBlob] = await Promise.all([
      toJpeg(full, QUALITY.full),
      toJpeg(view, QUALITY.view),
      toJpeg(thumb, QUALITY.thumb),
    ]);
    return { width: fw, height: fh, blobs: { full: fullBlob, view: viewBlob, thumb: thumbBlob } };
  } finally {
    bitmap.close();
  }
}

export function putFile(url: string, blob: Blob, headers: Record<string, string>, onProgress: (sent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage said ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(blob);
  });
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
