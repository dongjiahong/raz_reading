import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AIAnalysisRequest } from "../types";
import { GEMINI_MODEL } from "../constants";

export const generateAIResponse = async (
  request: AIAnalysisRequest
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found");

    const ai = new GoogleGenAI({ apiKey });
    
    const parts: any[] = [];
    
    if (request.imageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png', // Assuming canvas export is PNG
          data: request.imageBase64,
        },
      });
    }

    if (request.text) {
      parts.push({ text: `Context text from PDF page: \n${request.text}\n\n` });
    }

    parts.push({ text: request.prompt });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts },
      config: {
        systemInstruction: "You are a helpful research assistant. You are analyzing a specific page of a PDF document provided by the user. Keep your answers concise, professional, and directly related to the content visible or provided.",
      }
    });

    return response.text || "No response generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Error: ${error.message || "Failed to generate response"}`;
  }
};
