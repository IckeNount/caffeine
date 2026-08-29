import {
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  MAX_IMAGE_SIZE,
  OcrError,
  SUPPORTED_IMAGE_TYPES,
} from "./ocr-types";

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export interface ValidatedImage {
  mimeType: SupportedImageType;
  width: number;
  height: number;
  size: number;
}

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function readUint16BE(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint24LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

export function detectImageMimeType(
  bytes: Uint8Array,
): SupportedImageType | "image/heic" | null {
  if (bytes.length >= 24 && hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (bytes.length >= 4 && hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 30 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4).toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "heif", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
  }
  return null;
}

function pngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (ascii(bytes, 12, 4) !== "IHDR") return null;
  return {
    width: readUint32BE(bytes, 16),
    height: readUint32BE(bytes, 20),
  };
}

const JPEG_SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
  0xcf,
]);

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > bytes.length) return null;
    const length = readUint16BE(bytes, offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if (JPEG_SOF_MARKERS.has(marker) && length >= 7) {
      return {
        height: readUint16BE(bytes, offset + 3),
        width: readUint16BE(bytes, offset + 5),
      };
    }
    offset += length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const kind = ascii(bytes, 12, 4);
  if (kind === "VP8X" && bytes.length >= 30) {
    return {
      width: readUint24LE(bytes, 24) + 1,
      height: readUint24LE(bytes, 27) + 1,
    };
  }
  if (
    kind === "VP8 " &&
    bytes.length >= 30 &&
    hasPrefix(bytes.slice(23), [0x9d, 0x01, 0x2a])
  ) {
    return {
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }
  if (kind === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    return {
      width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
      height:
        1 +
        (bytes[22] >> 6) +
        (bytes[23] << 2) +
        ((bytes[24] & 0x0f) << 10),
    };
  }
  return null;
}

function dimensionsFor(
  bytes: Uint8Array,
  mimeType: SupportedImageType,
): { width: number; height: number } | null {
  if (mimeType === "image/png") return pngDimensions(bytes);
  if (mimeType === "image/jpeg") return jpegDimensions(bytes);
  return webpDimensions(bytes);
}

function normalizeClaimedType(value: string): string {
  return value.toLowerCase() === "image/jpg" ? "image/jpeg" : value.toLowerCase();
}

export function validateImageBytes(
  bytes: Uint8Array,
  claimedMimeType: string,
): ValidatedImage {
  if (bytes.byteLength === 0) {
    throw new OcrError("The image file is empty.", "INVALID_IMAGE", 400);
  }
  if (bytes.byteLength > MAX_IMAGE_SIZE) {
    throw new OcrError("The image exceeds the 10 MB limit.", "IMAGE_TOO_LARGE", 400);
  }

  const claimed = normalizeClaimedType(claimedMimeType);
  if (HEIC_TYPES.has(claimed)) {
    throw new OcrError(
      "HEIC and HEIF are not supported. Convert the image to JPEG, PNG, or WebP.",
      "UNSUPPORTED_FORMAT",
      400,
    );
  }
  if (!SUPPORTED_IMAGE_TYPES.includes(claimed as SupportedImageType)) {
    throw new OcrError(
      "Unsupported image format. Use JPEG, PNG, or WebP.",
      "UNSUPPORTED_FORMAT",
      400,
    );
  }

  const detected = detectImageMimeType(bytes);
  if (detected === "image/heic") {
    throw new OcrError(
      "HEIC and HEIF are not supported. Convert the image to JPEG, PNG, or WebP.",
      "UNSUPPORTED_FORMAT",
      400,
    );
  }
  if (!detected || detected !== claimed) {
    throw new OcrError(
      "The file contents do not match its image type.",
      "INVALID_IMAGE",
      400,
    );
  }

  const dimensions = dimensionsFor(bytes, detected);
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
    throw new OcrError("The image dimensions are invalid.", "INVALID_IMAGE", 400);
  }
  if (
    dimensions.width > MAX_IMAGE_DIMENSION ||
    dimensions.height > MAX_IMAGE_DIMENSION ||
    dimensions.width * dimensions.height > MAX_IMAGE_PIXELS
  ) {
    throw new OcrError(
      "The image dimensions are too large. Choose a smaller image.",
      "INVALID_IMAGE",
      400,
    );
  }

  return {
    mimeType: detected,
    width: dimensions.width,
    height: dimensions.height,
    size: bytes.byteLength,
  };
}

export function imageMimeTypeFromPath(filePath: string): SupportedImageType | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}
