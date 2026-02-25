import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const { text, personaInstructions } = await req.json();

        if (!text || !personaInstructions) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        // Private server-side key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: "Gemini API Key is missing. Please check your environment variables." }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `You are an expert editor who rewrites text to sound naturally human. Maximize burstiness and perplexity while adhering strictly to the following persona instructions:\n\nPersona Instructions:\n"${personaInstructions}"\n\nOriginal Text to Rewrite:\n"${text}"\n\nRewritten Text:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;

        return NextResponse.json({ success: true, text: response.text() });
    } catch (error: any) {
        console.error("Gemini API Route Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
