require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ dest: 'uploads/' });

// Initialize Gemini
const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || "").trim());

app.use(express.static('public'));
app.use(express.json());

app.post('/analyze', upload.single('report'), async (req, res) => {
    let imagePath = null;
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        imagePath = req.file.path;

        // Trying the newest 2.5 series which might have a fresh quota bucket
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const imageData = fs.readFileSync(imagePath);
        const prompt = "ROLE: Clinical Data Scientist. TASK: Identify biomarkers from this blood report image. OUTPUT: Return ONLY a JSON object with keys: biomarkers (array of {parameter, result, range, status}), docsNote (English simple explanation), hindiSummary (3 sentences Hindi), actionableSteps (3 lifestyle tips), risk (red alert message if life-threatening, else null).";

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
            msg = "Your daily free quota for Gemini 2.0 has been reached. Please try again in 1 hour or use a different API key.";
        } else if (error.message.includes('404')) {
            msg = "Model not found. Trying another version...";
            // We could add more fallbacks here if needed
        }

        res.status(500).json({ error: msg });
    } finally {
        if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
});

app.listen(port, () => {
    console.log(`\n🚀 HemaLens Ready (Lite Mode): http://localhost:${port}`);
});
