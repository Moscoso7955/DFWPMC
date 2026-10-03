import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { HomepageContent, HomepageContentField, StoryContent } from "./siteContentSchema";
import { HOMEPAGE_CONTENT_FIELDS, STORY_IMAGE_FIELDS } from "./siteContentSchema";
import type { AssetDetails, HomepageAssetDetails, StoryAssetDetails } from "./assetDetailsSchema";

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function getGreatestCommonDivisor(firstValue: number, secondValue: number): number {
  return secondValue === 0 ? firstValue : getGreatestCommonDivisor(secondValue, firstValue % secondValue);
}

function formatRatio(width: number | null, height: number | null) {
  if (!width || !height) return "Unknown";
  const divisor = getGreatestCommonDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
}

function getPngDimensions(buffer: Buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getJpegDimensions(buffer: Buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function readUInt24LE(buffer: Buffer, offset: number) {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function getWebpDimensions(buffer: Buffer) {
  const riffType = buffer.toString("ascii", 0, 4);
  const webpType = buffer.toString("ascii", 8, 12);
  if (riffType !== "RIFF" || webpType !== "WEBP") return null;

  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (chunkType === "VP8X") {
      return {
        width: readUInt24LE(buffer, dataOffset + 4) + 1,
        height: readUInt24LE(buffer, dataOffset + 7) + 1,
      };
    }

    if (chunkType === "VP8 ") {
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    if (chunkType === "VP8L") {
      const bits = buffer.readUInt32LE(dataOffset + 1);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
}

function getSvgDimensions(fileText: string) {
  const viewBoxMatch = fileText.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (!viewBoxMatch) return null;

  return {
    width: Math.round(Number(viewBoxMatch[1])),
    height: Math.round(Number(viewBoxMatch[2])),
  };
}

function getImageDimensions(filePath: string, extension: string) {
  const buffer = readFileSync(filePath);

  if (extension === "png") return getPngDimensions(buffer);
  if (extension === "jpg" || extension === "jpeg") return getJpegDimensions(buffer);
  if (extension === "webp") return getWebpDimensions(buffer);
  if (extension === "svg") return getSvgDimensions(buffer.toString("utf8"));

  return null;
}

function getPublicFilePath(src: string) {
  const cleanSrc = src.startsWith("/") ? src.slice(1) : src;
  return path.join(process.cwd(), "public", cleanSrc);
}

function getSuggestedType(field: HomepageContentField) {
  if (field === "desktopLogo" || field === "mobileLogo") return "PNG";
  return "JPG or PNG";
}

export function getAssetDetails(field: HomepageContentField, src: string): AssetDetails {
  const isRemote = /^https?:\/\//i.test(src);

  if (isRemote) {
    const remoteExt = path.extname(new URL(src).pathname).replace(".", "").toUpperCase();
    return {
      extension: remoteExt || "Unknown",
      fileSize: "Unknown",
      height: null,
      ratio: "Unknown",
      suggestedType: getSuggestedType(field),
      width: null,
    };
  }

  const filePath = getPublicFilePath(src);
  const extension = path.extname(filePath).replace(".", "").toUpperCase() || "Unknown";

  if (!existsSync(filePath)) {
    return {
      extension,
      fileSize: "Unknown",
      height: null,
      ratio: "Unknown",
      suggestedType: getSuggestedType(field),
      width: null,
    };
  }

  const dimensions = getImageDimensions(filePath, extension.toLowerCase());
  const width = dimensions?.width ?? null;
  const height = dimensions?.height ?? null;

  return {
    extension,
    fileSize: formatFileSize(statSync(filePath).size),
    height,
    ratio: formatRatio(width, height),
    suggestedType: getSuggestedType(field),
    width,
  };
}

export function getHomepageAssetDetails(content: HomepageContent) {
  return HOMEPAGE_CONTENT_FIELDS.reduce((details, field) => {
    details[field] = getAssetDetails(field, content[field]);
    return details;
  }, {} as HomepageAssetDetails);
}

export function getMenuImageAssetDetails(src: string) {
  return getAssetDetails("desktopHeroImage", src);
}

export function getStoryAssetDetails(content: StoryContent) {
  return STORY_IMAGE_FIELDS.reduce((details, field) => {
    details[field] = getAssetDetails("desktopHeroImage", content[field]);
    return details;
  }, {} as StoryAssetDetails);
}
