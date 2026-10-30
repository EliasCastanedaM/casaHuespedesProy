import test from "node:test";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { writeFile, access } from "node:fs/promises";
import {
  MEDIA_LIMITS, allowedImageMime, allowedVideoMime,
  detectImageSignature, detectVideoSignature,
  assertImageSignature, assertVideoSignature, removeTemporaryMedia, safeMediaTitle,
} from "../src/middlewares/uploads/mediaSecurity.js";
import { uploadRoomVideos, uploadRoomImages } from "../src/middlewares/uploads/uploadRoomMedia.js";

const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
const jpg = Buffer.from([255,216,255,224,0,0]);
const gif = Buffer.from("GIF89a" + "xxxxxxxxxxx", "ascii");
const webp = Buffer.from("RIFF1234WEBPxxxx", "ascii");
const mp4 = Buffer.from("0000ftypisom000000", "ascii");
const webm = Buffer.from([0x1a,0x45,0xdf,0xa3,0x9f,0x42,0xf7]);

test("rechaza SVG y un archivo falso aunque declare MIME image/png", () => {
  assert.equal(allowedImageMime("image/svg+xml"), false);
  assert.equal(allowedImageMime("image/png"), true);
  assert.equal(detectImageSignature(Buffer.from("<svg><script>")), null);
  assert.throws(() => assertImageSignature({
    mimetype: "image/png", buffer: Buffer.from("no-es-una-imagen"),
  }), (error) => error.statusCode === 415);
  assert.throws(() => assertImageSignature({
    mimetype: "image/jpeg", buffer: png,
  }), (error) => error.statusCode === 415);
});

test("admite formatos de imagen reales y compatibles", () => {
  for (const [mime, buffer] of [
    ["image/jpeg", jpg], ["image/png", png],
    ["image/webp", webp], ["image/gif", gif],
  ]) {
    assert.equal(detectImageSignature(buffer), mime);
    assert.doesNotThrow(() => assertImageSignature({ mimetype: mime, buffer }));
  }
});

test("vídeos pasan a disco y se limita cantidad y tamaño de lote", () => {
  assert.equal(uploadRoomVideos.storage.constructor.name, "DiskStorage");
  assert.equal(uploadRoomImages.storage.constructor.name, "MemoryStorage");
  assert.equal(uploadRoomVideos.limits.files, 2);
  assert.equal(uploadRoomImages.limits.files, 8);
  assert.equal(uploadRoomVideos.limits.fileSize, MEDIA_LIMITS.videoBytes);
  assert.equal(MEDIA_LIMITS.videoBytes, 100 * 1024 * 1024);
});

test("valida contenedores MP4/MOV/WebM desde el archivo real", async () => {
  const checks = [
    ["video/mp4", mp4, true],
    ["video/quicktime", mp4, true],
    ["video/webm", webm, true],
    ["video/webm", mp4, false],
    ["video/mp4", Buffer.from("<svg onload=alert(1)>"), false],
    ["application/octet-stream", mp4, false],
  ];
  for (const [mime, content, shouldPass] of checks) {
    const path = join(tmpdir(), "chp-validation-test-" + randomUUID());
    await writeFile(path, content);
    try {
      const action = () => assertVideoSignature({ path, mimetype: mime });
      if (shouldPass) await assert.doesNotReject(action);
      else await assert.rejects(action, (error) => error.statusCode === 415);
    } finally {
      await removeTemporaryMedia([{ path }]);
      await assert.rejects(() => access(path));
    }
  }
  assert.equal(allowedVideoMime("video/x-msvideo"), false);
  assert.equal(detectVideoSignature(webm), "webm");
  assert.equal(detectVideoSignature(mp4), "mp4");
});

test("normaliza títulos sin caracteres de control ni etiquetas", () => {
  assert.equal(safeMediaTitle("foto<script>\u0000.jpg"), "fotoscript");
  assert.ok(safeMediaTitle("x".repeat(400) + ".png").length <= 90);
});
