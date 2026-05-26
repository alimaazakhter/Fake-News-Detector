import fs from "fs";
import path from "path";
import { predictNews, ModelMetadata } from "../../../lib/predictor";

// Support CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string" || text.trim() === "") {
      return Response.json(
        { error: "No text content provided." },
        {
          status: 400,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    // Load model metadata from public directory
    const modelPath = path.join(process.cwd(), "public", "model_metadata.json");
    if (!fs.existsSync(modelPath)) {
      return Response.json(
        { error: "Model parameters not found on the server. Please run python train_model.py first." },
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const modelJson = fs.readFileSync(modelPath, "utf-8");
    const model: ModelMetadata = JSON.parse(modelJson);

    // Perform prediction
    const prediction = predictNews(text, model);

    const response = Response.json(prediction);
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  } catch (error: any) {
    console.error("Verification error:", error);
    return Response.json(
      { error: error.message || "An error occurred during verification." },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
}
