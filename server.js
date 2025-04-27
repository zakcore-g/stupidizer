// Import required modules
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { convertPdfPagesToImages, generateQuizQuestions } from './index.js';

// Initialize environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/', 'index.html'));
});

// API route for PDF processing
app.post('/api/process-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    console.log('Processing PDF:', pdfPath);

    // Convert PDF to images
    const images = await convertPdfPagesToImages(pdfPath);
    console.log(`Converted ${images.length} pages to images`);

    if (images.length === 0) {
      return res.status(500).json({ error: 'Failed to convert PDF to images' });
    }

    // Generate quiz questions from images
    console.log('Generating quiz questions from images...');
    const quizQuestions = await generateQuizQuestions(images);

    // Clean up temporary files
    images.forEach(imgPath => {
      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    });
    
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

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});