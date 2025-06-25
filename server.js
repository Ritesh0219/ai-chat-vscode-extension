require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found. Check your .env file.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

app.post('/gemini', async (req, res) => {
  try {
    const prompt = req.body.prompt;

    const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash'});
    

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error('Gemini API Error:', error?.response?.data || error.message || error);
    res.status(500).json({ reply: 'Error connecting to Gemini API' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
