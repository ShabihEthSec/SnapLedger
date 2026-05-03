import { NextResponse } from "next/server";
import { loadModel, ocr, OCR_LATIN_RECOGNIZER_1 } from "@qvac/sdk";

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
    modelType: "ocr",
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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const modelId = await getModelId();
    const { blocks } = ocr({
      modelId,
      image: imageBuffer,
      options: {
        paragraph: false,
      },
    });
    const result = await blocks;
    const text = result.map((block) => block.text).join("\n").trim();

    return NextResponse.json({ text });
  } catch (err) {
    console.error("QVAC OCR Error:", err);
    return NextResponse.json({ error: "QVAC OCR failed" }, { status: 500 });
  }
}
