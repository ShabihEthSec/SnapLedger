import { NextResponse } from "next/server";
import { loadModel, ocr, OCR_LATIN_RECOGNIZER_1 } from "@qvac/sdk";
import sharp from "sharp";

export const runtime = "nodejs";

declare global {
  var qvacOcrModelId: string | undefined;
  var qvacOcrModelPromise: Promise<string> | undefined;
}

async function getModelId() {
  if (globalThis.qvacOcrModelId) {
    return globalThis.qvacOcrModelId;
  }

  globalThis.qvacOcrModelPromise ??= loadModel({
    modelSrc: OCR_LATIN_RECOGNIZER_1,
    modelType: "onnx-ocr",
    modelConfig: {
      langList: ["en"],
      useGPU: false,
      timeout: 30000,
      magRatio: 1.5,
      defaultRotationAngles: [90, 180, 270],
      contrastRetry: false,
      lowConfidenceThreshold: 0.5,
      recognizerBatchSize: 1,
    },
  });

  globalThis.qvacOcrModelId = await globalThis.qvacOcrModelPromise;
  return globalThis.qvacOcrModelId;
}

type OCRBlock = {
  text: string;
  bbox?: [number, number, number, number];
  confidence?: number;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Normalize image → PNG
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const imageBuffer = await sharp(inputBuffer)
      .resize(1024) // normalize size
      .grayscale() // remove color noise
      .normalize() // enhance contrast
      .sharpen() // edge clarity
      .png()
      .toBuffer();

    const modelId = await getModelId();

    // 🔥 CONCURRENCY-SAFE OCR EXECUTION
    let blocks: OCRBlock[];

    try {
      const result = await ocr({
        modelId,
        image: imageBuffer,
        options: {
          paragraph: true,
        },
      });

      blocks = await result.blocks; // 🔥 important
    } catch (err: any) {
      // 🔥 handle QVAC stale job race condition
      if (err?.message?.includes("Stale job")) {
        return NextResponse.json(
          { text: "" }, // safe fallback
          { status: 200 },
        );
      }

      throw err;
    }

    const text = blocks
      .map((block) => block.text)
      .join("\n")
      .trim();

    return NextResponse.json({ text });
  } catch (err) {
    console.error("QVAC OCR Error:", err);
    return NextResponse.json({ error: "QVAC OCR failed" }, { status: 500 });
  }
}
