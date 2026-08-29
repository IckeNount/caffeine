import { NextRequest, NextResponse } from "next/server";
import {
  CloudOcrRequestOptionsSchema,
  MAX_IMAGE_SIZE,
  OcrError,
  OcrModeSchema,
  validateImageBytes,
} from "@/shared/lib/ocr";
import { extractText, isCloudOcrEnabled } from "@/shared/lib/ocr/ocr-service";

export const runtime = "nodejs";
const MAX_MULTIPART_OVERHEAD = 512 * 1024;

function errorResponse(error: OcrError) {
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.statusCode },
  );
}

export async function GET() {
  return NextResponse.json(
    { enabled: isCloudOcrEnabled() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isCloudOcrEnabled()) {
    return errorResponse(
      new OcrError("Cloud OCR is unavailable.", "CLOUD_OCR_DISABLED", 404),
    );
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return NextResponse.json(
          { error: "This OCR request is not allowed." },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "This OCR request is not allowed." },
        { status: 403 },
      );
    }
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_IMAGE_SIZE + MAX_MULTIPART_OVERHEAD
  ) {
    return errorResponse(
      new OcrError("The image exceeds the 10 MB limit.", "IMAGE_TOO_LARGE", 413),
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      throw new OcrError(
        "Choose a JPEG, PNG, or WebP image.",
        "INVALID_IMAGE",
        400,
      );
    }

    const modeResult = OcrModeSchema.safeParse(formData.get("mode") ?? "smart");
    if (!modeResult.success) {
      throw new OcrError(
        "OCR mode must be text or smart.",
        "INVALID_MODE",
        400,
      );
    }

    const optionsResult = CloudOcrRequestOptionsSchema.safeParse({
      mode: modeResult.data,
      cloudConsent: formData.get("cloudConsent") === "true",
    });
    if (!optionsResult.success) {
      throw new OcrError(
        "Cloud OCR requires explicit consent.",
        "CLOUD_CONSENT_REQUIRED",
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    validateImageBytes(buffer, file.type);
    const result = await extractText(buffer, file.type, {
      mode: optionsResult.data.mode,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OcrError) {
      console.warn("OCR API request rejected", { code: error.code });
      return errorResponse(error);
    }
    console.warn("OCR API request failed", { code: "EXTRACTION_FAILED" });
    return errorResponse(
      new OcrError(
        "Cloud OCR could not process this image.",
        "EXTRACTION_FAILED",
        500,
      ),
    );
  }
}
