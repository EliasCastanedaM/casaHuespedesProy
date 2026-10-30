import { open, unlink } from "node:fs/promises";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]);

export const MEDIA_LIMITS = Object.freeze({
  imageCount: 8,
  imageBytes: 8 * 1024 * 1024,
  videoCount: 2,
  videoBytes: 100 * 1024 * 1024,
  singleImageBytes: 5 * 1024 * 1024,
});

function unsupported() {
  const error = new Error("Formato de archivo no permitido. Utiliza JPEG, PNG, WebP, GIF, MP4, MOV o WebM.");
  error.statusCode = 415;
  return error;
}

export function allowedImageMime(mime) {
  return IMAGE_TYPES.has(String(mime || "").toLowerCase());
}

export function allowedVideoMime(mime) {
  return VIDEO_TYPES.has(String(mime || "").toLowerCase());
}

export function detectImageSignature(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 6 && ["GIF87a", "GIF89a"].includes(buf.toString("ascii", 0, 6))) return "image/gif";
  return null;
}

export function detectVideoSignature(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  if (buf.length >= 12 && buf.toString("ascii", 4, 8) === "ftyp") return "mp4";
  if (buf.length >= 4 && buf.subarray(0, 4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))) return "webm";
  return null;
}

export function assertImageSignature(file) {
  const actual = detectImageSignature(file?.buffer);
  if (!actual || !allowedImageMime(file?.mimetype) || actual !== file.mimetype.toLowerCase()) {
    throw unsupported();
  }
}

export async function assertVideoSignature(file) {
  if (!file?.path || !allowedVideoMime(file?.mimetype)) throw unsupported();
  const handle = await open(file.path, "r");
  const header = Buffer.alloc(16);
  try {
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const actual = detectVideoSignature(header.subarray(0, bytesRead));
    if (!actual) throw unsupported();
    const mime = file.mimetype.toLowerCase();
    if ((actual === "webm") !== (mime === "video/webm")) throw unsupported();
  } finally {
    await handle.close();
  }
}

export async function removeTemporaryMedia(files) {
  await Promise.allSettled(
    (Array.isArray(files) ? files : []).filter(file => file?.path)
      .map(file => unlink(file.path))
  );
}

export function safeMediaTitle(filename) {
  return String(filename || "Archivo")
    .replace(/\.[^.]+$/, "")
    .replace(/[\x00-\x1f\x7f<>]/g, "")
    .trim()
    .slice(0, 90) || "Archivo";
}
