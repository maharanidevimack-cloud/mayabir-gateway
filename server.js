// ==========================================
// SECTION 0: SETUP & DEPENDENCIES
// ==========================================
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

app.use(express.json());

const PORT = process.env.PORT || 3000;


// ==========================================
// SECTION 1: SECURITY & TOKEN SENSOR
// ==========================================
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


// ==========================================
// SECTION 2: TEXT AI ENGINE (MULTI-API REAL FALLBACK)
// ==========================================
async function handleTextGeneration(prompt) {
    const GROQ_API_KEY = "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";
    const GEMINI_API_KEY = "AQ.Ab8RN6ITvCF2Bx4xuN-RDCOSsEMldYrayo3lhd-zsIUNFJMXXQ";

    // --- STEP 1: Try Primary API (Groq - Llama 3) ---
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || "Groq API failed");
        }

        return data.choices[0].message.content;
        
    } catch (groqError) {
        console.log(`Groq failed: ${groqError.message}. Switching to real Gemini API...`);
        
        // --- STEP 2: Fallback to Secondary Real API (Gemini 1.5 Flash) ---
        try {
            const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const geminiData = await geminiResponse.json();
            
            if (!geminiResponse.ok) {
                throw new Error(geminiData.error?.message || "Gemini API failed");
            }

            return geminiData.candidates[0].content.parts[0].text;
            
        } catch (geminiError) {
            throw new Error(`Dono Asli Text APIs fail ho gayi hain: ${geminiError.message}`);
        }
    }
}


// ==========================================
// SECTION 3: REAL IMAGE GENERATION ENGINE
// ==========================================
async function handleImageGeneration(prompt) {
    try {
        // Real Image generation link jo direct UI/Frontend mein <img src="..." /> ke andar lag kar image dikha dega
        const encodedPrompt = encodeURIComponent(prompt);
        const realImageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
        
        return {
            image_url: realImageUrl,
            status: "Real image successfully generated for direct display!"
        };
    } catch (imgError) {
        throw new Error(`Image generation failed: ${imgError.message}`);
    }
}


// ==========================================
// SECTION 4: MASTER ROUTING ENDPOINT
// ==========================================
app.post("/v1/gateway", verifyAppToken, async (req, res) => {
    const { prompt, task_type } = req.body;

    if (!prompt || !task_type) {
        return res.status(400).json({ error: "Prompt and task_type are required in request body." });
    }

    try {
        if (task_type === "text") {
            const result = await handleTextGeneration(prompt);
            return res.json({ status: "success", type: "text", output: result });
        } 
        else if (task_type === "image") {
            const result = await handleImageGeneration(prompt);
            return res.json({ status: "success", type: "image", output: result });
        } 
        else {
            return res.status(400).json({ error: "Invalid task_type. Use 'text' or 'image'." });
        }
    } catch (error) {
        return res.status(500).json({ status: "error", message: error.message });
    }
});


// ==========================================
// SECTION 5: SYSTEM HEALTH CHECK
// ==========================================
app.get("/", (req, res) => {
    res.json({ status: "Mayabir Master Node.js Gateway is live with Real Groq, Gemini Fallback, and Image Engine!" });
});

app.listen(PORT, () => {
    console.log(`Gateway server is running on port ${PORT}`);
});
  
