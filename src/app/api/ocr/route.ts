import { NextRequest, NextResponse } from "next/server";
import { extractText, OcrError, SUPPORTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/shared/lib/ocr";
import type { OcrOptions } from "@/shared/lib/ocr";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    const mode = (formData.get("mode") as OcrOptions["mode"]) || "smart";

    // ── Validate file presence ────────────────────────────────────
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file provided. Please upload a JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // ── Validate file type ────────────────────────────────────────
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type as typeof SUPPORTED_IMAGE_TYPES[number])) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Please upload a JPEG, PNG, or WebP image.` },
        { status: 400 }
      );
    }

    // ── Validate file size ────────────────────────────────────────
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        { error: `File is too large (${sizeMB} MB). Maximum size is 10 MB.` },
        { status: 400 }
      );
    }

    // ── Extract text ──────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await extractText(buffer, file.type, { mode });

    return NextResponse.json(result);
  } catch (error) {
    console.error("OCR API Error:", error);

    if (error instanceof OcrError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { error: "Failed to process image. Please try again." },
      { status: 500 }
    );
  }
}
