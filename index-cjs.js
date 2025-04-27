require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// We'll use a different approach for PDF conversion

// Initialize Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Function to convert PDF to base64
async function convertPdfToBase64(pdfPath) {
  try {
    console.log('Converting PDF to base64...');
    const pdfData = fs.readFileSync(pdfPath);
    return Buffer.from(pdfData).toString('base64');
  } catch (error) {
    console.error('Error converting PDF to base64:', error);
    throw error;
  }
}

// Function to convert PDF pages to images - modified to use the Gemini API directly
async function convertPdfPagesToImages(pdfPath) {
  try {
    console.log('Using direct PDF approach instead of converting to images...');
    // For Netlify, we'll just return the PDF path as a single item array
    // The generateQuizQuestions function will handle it differently
    return [pdfPath];
  } catch (error) {
    console.error('Error with PDF handling:', error);
    return [];
  }
}

// Function to generate quiz questions using Gemini model
async function generateQuizQuestions(imagePaths = []) {
  try {
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
    if (imagePaths.length > 0) {
      const pdfPath = imagePaths[0];
      if (fs.existsSync(pdfPath)) {
        const pdfData = fs.readFileSync(pdfPath);
        contentParts.push({
          inlineData: {
            data: Buffer.from(pdfData).toString('base64'),
            mimeType: 'application/pdf'
          }
        });
      }
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

// Export the functions
module.exports = {
  convertPdfPagesToImages,
  generateQuizQuestions
};