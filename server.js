const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const ALLOWED_APP_TOKENS = ["mayabir_secret_token_123"];

const verifyAppToken = (req, res, next) => {
    const xAppToken = req.headers['x-app-token'];
    if (!xAppToken || !ALLOWED_APP_TOKENS.includes(xAppToken)) {
        return res.status(403).json({
            error: "Security Error: Unauthorized Access! Invalid or Missing App Token."
        });
    }
    next();
};

app.post('/v1/gateway', verifyAppToken, async (req, res) => {
    const { prompt } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    const GROQ_API_KEY = "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";

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Groq API failed");
        }

        const botReply = data.choices[0].message.content;
        res.json({
            status: "success",
            output: botReply
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
