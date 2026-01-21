
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedReceiptData, ExpenseCategory } from "../types";

/**
 * Gemini Vision Service
 * Uses the pre-configured system API key to analyze receipt images directly.
 * This replaces the local Tesseract engine which is often too noisy for receipts.
 */
export const analyzeReceipt = async (base64Image: string, mimeType: string): Promise<ParsedReceiptData> => {
  // Use the system-provided API key from the environment.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              },
            },
            {
              text: `Extract the details from this receipt for an expense liquidation report. 
              Identify the merchant name, transaction date, total amount, currency (usually PHP), and the most appropriate category.
              Return the data strictly in the specified JSON format.`
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Merchant or Store Name" },
            date: { type: Type.STRING, description: "Transaction date in YYYY-MM-DD format" },
            amount: { type: Type.NUMBER, description: "Total amount paid" },
            currency: { type: Type.STRING, description: "Currency code (e.g., PHP)" },
            category: { 
              type: Type.STRING, 
              enum: ["Transport", "Food", "Lodging", "Equipment", "Miscellaneous"],
              description: "Expense category" 
            },
            issuerAddress: { type: Type.STRING, description: "Physical address of the store" },
            explanation: { type: Type.STRING, description: "Summary of items purchased" }
          },
          required: ["title", "date", "amount", "currency", "category"]
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("Empty response from AI engine.");
    
    return JSON.parse(jsonStr) as ParsedReceiptData;
  } catch (err) {
    console.error("Gemini Analysis Error:", err);
    throw new Error("AI analysis failed. Please ensure the image is clear and try again.");
  }
};
