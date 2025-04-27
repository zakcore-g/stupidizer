const multer = require('multer');
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { convertPdfPagesToImages, generateQuizQuestions } = require('../../index-cjs.js');

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

// API route for PDF processing
router.post('/', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    console.log('Processing PDF:', pdfPath);

    // Pass the PDF directly to generate quiz questions
    console.log('Generating quiz questions from PDF...');
    const quizQuestions = await generateQuizQuestions([pdfPath]);

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