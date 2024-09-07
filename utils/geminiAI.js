const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const geminiAI = async () => {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Describe the image below in a few sentences, and count the items in the image.";
    const image = {
        inlineData: {
            data: Buffer.from(fs.readFileSync("cookie.jpeg")).toString("base64"),
            mimeType: "image/jpeg",
        },
    };

    const result = await model.generateContent([prompt, image]);
    console.log(result.response.text());
}