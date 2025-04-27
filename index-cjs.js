require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { convert } = require('pdf-poppler');

// Initialize Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Function to convert PDF pages to images
async function convertPdfPagesToImages(pdfPath) {
  try {
    console.log('Converting PDF pages to images...');
    const outputImages = [];
    
    // Create a temporary directory for the output
    const tempDir = '/tmp/temp_images';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Set options for pdf-poppler
    const options = {
      format: 'png',
      out_dir: tempDir,
      out_prefix: 'page',
      page: null // Convert all pages
    };
    
    console.log('Converting PDF to images using pdf-poppler...');
    
    try {
      // Convert PDF to images
      await convert(pdfPath, options);
      
      // Find all generated PNG files
      const files = fs.readdirSync(tempDir);
      const pngFiles = files.filter(file => file.startsWith('page-') && file.endsWith('.png'));
      
      // Sort files by page number
      pngFiles.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0]);
        const numB = parseInt(b.match(/\d+/)[0]);
        return numA - numB;
      });
      
      // Add full paths to the output array
      pngFiles.forEach(file => {
        outputImages.push(path.join(tempDir, file));
      });
      
      console.log(`Successfully converted ${outputImages.length} PDF pages to images`);
    } catch (error) {
      console.error('Error with pdf-poppler conversion:', error);
      throw error;
    }
    
    return outputImages;
  } catch (error) {
    console.error('Error converting PDF pages to images:', error);
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
      { text: `Analyze these educational materials and determine the appropriate grade level (elementary, middle school, high school, or college).
        Then generate 5 multiple-choice questions with 4 options each and provide the correct answers.
        The questions should be appropriate for the identified grade level, using vocabulary and concepts suitable for that age group. Focus on diagrams, charts, and exact visual information in the images.
        [IMPORTANT] For each question that references a visual element, Always describe that element and its details for better understandig of question.
        [IMPORTANT] Always explain detailed describtion of visual elements rather than referancing them.` }
    ];

    // Add images
    for (const imagePath of imagePaths) {
      if (fs.existsSync(imagePath)) {
        const imageData = fs.readFileSync(imagePath);
        contentParts.push({
          inlineData: {
            data: Buffer.from(imageData).toString('base64'),
            mimeType: 'image/png'
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