const multer = require('multer');
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Create Express app
const app = express();
const router = express.Router();

// Configure middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create uploads directory if it doesn't exist
const uploadsDir = '/tmp/uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Inline implementation of generateQuizQuestions to avoid dependency issues
async function generateQuizQuestions(pdfPath) {
  try {
    // Load environment variables
    require('dotenv').config();
    
    // Import Google Generative AI
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    // Initialize Google Generative AI with API key
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    // Configure the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Improved prompt for better grade-level adaptation and multiple-choice questions
    const contentParts = [
      { text: `Analyze this educational PDF material and determine the appropriate grade level (elementary, middle school, high school, or college).
        Then generate 5 multiple-choice questions with 4 options each and provide the correct answers.
        The questions should be appropriate for the identified grade level, using vocabulary and concepts suitable for that age group. Focus on diagrams, charts, and exact visual information in the document.
        [IMPORTANT] For each question that references a visual element, Always describe that element and its details for better understanding of question.
        [IMPORTANT] Always explain detailed description of visual elements rather than referencing them.` }
    ];

    // Add PDF as file
    if (fs.existsSync(pdfPath)) {
      const pdfData = fs.readFileSync(pdfPath);
      contentParts.push({
        inlineData: {
          data: Buffer.from(pdfData).toString('base64'),
          mimeType: 'application/pdf'
        }
      });
    }

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: contentParts }],
    });

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw error;
  }
}

// API route for PDF processing
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    console.log('Processing PDF:', pdfPath);

    // Generate quiz questions directly from the PDF
    console.log('Generating quiz questions from PDF...');
    const quizQuestions = await generateQuizQuestions(pdfPath);

    // Delete the uploaded PDF
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }

    // Return the generated quiz questions
    res.json({ quizQuestions });
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

app.use('/.netlify/functions/process-pdf', router);

module.exports.handler = serverless(app);