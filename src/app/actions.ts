import { GoogleGenerativeAI } from "@google/generative-ai";

export async function humanizeText(text: string, personaInstructions: string) {
    // NEXT_PUBLIC_ is required for the key to be accessible on the client side
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please check your .env.local file.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert editor who rewrites text to sound naturally human. Maximize burstiness and perplexity while adhering strictly to the following persona instructions:\n\nPersona Instructions:\n"${personaInstructions}"\n\nOriginal Text to Rewrite:\n"${text}"\n\nRewritten Text:`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return { success: true, text: response.text() };
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return { success: false, error: error.message };
    }
}
