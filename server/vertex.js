const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

let credentials = null;

if (process.env.KEY_JSON_BASE64) {
  const keyBuffer = Buffer.from(process.env.KEY_JSON_BASE64, 'base64');
  credentials = JSON.parse(keyBuffer.toString('utf-8'));
}

if (!credentials || !process.env.GOOGLE_PROJECT_ID || !process.env.LOCATION) {
  throw new Error("Missing required environment variables or credentials.");
}

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID,
  location: process.env.LOCATION,
  credentials, // <- this bypasses GOOGLE_APPLICATION_CREDENTIALS
});

const textModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-04-17',
    generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
    },
})

const imgModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.0-flash-preview-image-generation',
    generationConfig: {
        responseModalities:["TEXT","IMAGE"],
        maxOutputTokens: 2048,
        temperature: 0.7,
    },
    responseMimeType: 'image/png',
})

async function textGemini(prompt, base64Image) {
    const contents = [
        {
        role: 'user',
        parts: [
            { text: prompt },
            base64Image && {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image,
            },
            },
        ].filter(Boolean),
        },
    ];

    const result = await textModel.generateContent({ contents });

    const parts = result.response.candidates[0].content.parts;
    const text = parts.find(p => p.text)?.text || '';

    return { text };
}

async function imgGemini(prompt) {
    const result = await imgModel.generateContent({
        contents: [
        {
            role: 'user',
            parts: [
                {
                    text: prompt
                },
            ],
        },
        ],
    });

    const parts = result.response.candidates[0].content.parts;

    let base64Img = null;
    let mimeType = null;
    let text = null;

    for (const part of parts) {
        if (part.inlineData) {
            base64Img = part.inlineData.data;
            mimeType = part.inlineData.mimeType;
        } else if (part.text) {
            text = part.text;
        }
    }

    return {
        image: base64Img,
        mimeType,
        text,
    };
}

module.exports = { textGemini, imgGemini }