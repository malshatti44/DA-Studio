
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { ProductDetails, ImageConfig, GroundingSource } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Rephrases a product title and generates a professional Instagram caption with hashtags.
 */
export const prepareMarketingText = async (details: ProductDetails): Promise<{ rephrasedTitle: string; caption: string }> => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Act as a professional Instagram marketing expert. 
      The user has a product with the following details:
      Title: ${details.title}
      Price: ${details.price} د.ك
      Code: ${details.sku}

      Tasks:
      1. Rephrase the Title into a catchy, high-engagement Instagram headline (Arabic).
      2. Write a complete Instagram caption including the rephrased title, a description of the product's value, the price, the product code (formatted as "كود المنتج: ${details.sku}"), and 5-10 relevant trending hashtags.

      Return the result as JSON with keys: "rephrasedTitle" and "caption".
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rephrasedTitle: { type: Type.STRING },
          caption: { type: Type.STRING }
        },
        required: ["rephrasedTitle", "caption"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

/**
 * Generates the final post using Nano Banana Pro.
 * Handles the specific layout: Headline Top, Product Center, Price Bottom Left, Code Bottom Right.
 */
export const generateDukkanPost = async (
  productBase64: string,
  templateBase64: string,
  rephrasedTitle: string,
  price: string,
  sku: string,
  aspectRatio: "4:5" | "9:16"
): Promise<string | null> => {
  const ai = getClient();
  
  const prompt = `
    Create a professional Instagram marketing post for "Dukkan Assima".
    
    ASSETS:
    - Image 1: The product.
    - Image 2: The official purple Dukkan template.
    
    INSTRUCTIONS:
    1. Re-create the template from Image 2 exactly.
    2. PLACE PRODUCT: Remove background from Image 1 and place it in the center. Add a realistic soft shadow.
    3. TOP HEADLINE: Write "${rephrasedTitle}" in a bold, elegant white Arabic font at the top.
    4. PRICE: In the purple box at the bottom-left, write "${price}" followed by "د.ك" in a very large, clean white font.
    5. PRODUCT CODE: In the white search bar area at the bottom-right, write the text "كود المنتج: ${sku}" in a clean dark font.
    
    Ensure the final result is studio-quality and follows the "Dukkan Assima" visual identity perfectly.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { inlineData: { data: productBase64.split(',')[1] || productBase64, mimeType: 'image/png' } },
        { inlineData: { data: templateBase64.split(',')[1] || templateBase64, mimeType: 'image/png' } },
        { text: prompt }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio === "4:5" ? "4:5" : "9:16",
        imageSize: "1K"
      }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
};
