require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Use memory storage for Vercel/Serverless compatibility
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini
const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || "").trim());

app.use(express.static('public'));
app.use(express.json());

app.post('/analyze', upload.single('report'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Get image data from memory buffer
        const imageData = req.file.buffer;
        const prompt = "ROLE: Clinical Data Scientist. TASK: Identify biomarkers from this blood report image. OUTPUT: Return ONLY a JSON object with keys: biomarkers (array of {parameter, result, range, status}), docsNote (English simple explanation), hindiSummary (3 sentences Hindi), actionableSteps (3 lifestyle tips), nutritionPlan (3 specific food recommendations based on analysis), risk (red alert message if life-threatening, else null).";

        console.log("--- Starting Analysis with Gemini 2.5 Flash ---");
        const result = await model.generateContent([{
            inlineData: { data: imageData.toString('base64'), mimeType: req.file.mimetype }
        }, prompt]);

        const text = result.response.text();
        const cleanedJson = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanedJson);

        console.log(`✅ Analysis Successful`);
        res.json(data);

    } catch (error) {
        console.error('Server Error:', error.message);
        let msg = "Analysis failed. Please try again.";
        if (error.message.includes('429')) {
            msg = "Google Quota limit reached. Please wait a bit and try again.";
        }
        res.status(500).json({ error: msg });
    }
});

// Export the app for Vercel
module.exports = app;

// Only listen if not running as a Vercel function
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`🚀 Local Server: http://localhost:${port}`);
    });
}
