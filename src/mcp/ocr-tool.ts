import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import {
  imageMimeTypeFromPath,
  OcrError,
  OcrModeSchema,
  OcrProviderSchema,
  OcrResultSchema,
  validateImageBytes,
  type OcrResult,
} from "@/shared/lib/ocr";
import { extractText, isCloudOcrEnabled } from "@/shared/lib/ocr/ocr-service";
import { extractTextWithTesseractNode } from "@/shared/lib/ocr/tesseract-node";

const OcrToolInputSchema = z
  .object({
    imagePath: z.string().trim().min(1).max(1_024),
    provider: OcrProviderSchema.default("tesseract"),
    mode: OcrModeSchema.default("smart"),
    cloudConsent: z.boolean().optional(),
  })
  .strict();

export async function resolveAllowedImagePath(
  imagePath: string,
  allowedRoot: string,
): Promise<string> {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(imagePath) || imagePath.includes("\0")) {
    throw new OcrError(
      "The image path is outside the allowed root.",
      "FILE_ACCESS_DENIED",
      403,
    );
  }

  try {
    const root = await realpath(allowedRoot);
    const candidate = path.isAbsolute(imagePath)
      ? path.resolve(imagePath)
      : path.resolve(root, imagePath);
    const resolved = await realpath(candidate);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error("outside root");
    }
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) throw new Error("not a file");
    return resolved;
  } catch {
    throw new OcrError(
      "The image path is outside the allowed root or is not a readable file.",
      "FILE_ACCESS_DENIED",
      403,
    );
  }
}

async function extractForTool(input: z.infer<typeof OcrToolInputSchema>): Promise<OcrResult> {
  const allowedRoot = process.env.OCR_MCP_ALLOWED_ROOT?.trim() || process.cwd();
  const resolved = await resolveAllowedImagePath(input.imagePath, allowedRoot);
  const mimeType = imageMimeTypeFromPath(resolved);
  if (!mimeType) {
    throw new OcrError(
      "Unsupported image format. Use JPEG, PNG, or WebP.",
      "UNSUPPORTED_FORMAT",
      400,
    );
  }

  const bytes = await readFile(resolved);
  validateImageBytes(bytes, mimeType);

  if (input.provider === "gemini") {
    if (!input.cloudConsent) {
      throw new OcrError(
        "Gemini OCR requires cloudConsent: true.",
        "CLOUD_CONSENT_REQUIRED",
        400,
      );
    }
    if (!isCloudOcrEnabled() || !process.env.GEMINI_API_KEY?.trim()) {
      throw new OcrError(
        "Cloud OCR is unavailable.",
        "CLOUD_OCR_DISABLED",
        404,
      );
    }
    return extractText(bytes, mimeType, { mode: input.mode });
  }

  return extractTextWithTesseractNode(bytes, mimeType);
}

export function createOcrMcpServer(): McpServer {
  const server = new McpServer({ name: "caffeine-ocr", version: "1.0.0" });

  server.registerTool(
    "ocr_extract_text",
    {
      title: "Extract text from a local image",
      description:
        "Extract English text from a JPEG, PNG, or WebP file under the configured allowed root. Local Tesseract is the default; Gemini requires explicit cloud consent and server enablement.",
      inputSchema: OcrToolInputSchema,
      outputSchema: OcrResultSchema,
    },
    async (input) => {
      try {
        const output = await extractForTool(input);
        return {
          content: [{ type: "text", text: output.text }],
          structuredContent: output,
        };
      } catch (error) {
        const safe =
          error instanceof OcrError
            ? { code: error.code, message: error.message }
            : {
                code: "EXTRACTION_FAILED",
                message: "OCR could not process this image.",
              };
        return {
          isError: true,
          content: [{ type: "text", text: JSON.stringify(safe) }],
        };
      }
    },
  );

  return server;
}
