const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Read the PDF file
const pdfPath = path.join(__dirname, 'TALLER 1 DE CALCULO VECTORIAL.pdf');
const pdfBuffer = fs.readFileSync(pdfPath);

// Convert to base64
const base64Data = pdfBuffer.toString('base64');
const pdfData = `data:application/pdf;base64,${base64Data}`;

// Test the upload endpoint
async function testUpload() {
  try {
    const response = await axios.post('http://localhost:3000/api/upload-pdf', {
      pdfData: pdfData,
      fileName: 'TALLER 1 DE CALCULO VECTORIAL.pdf'
    });

    const data = response.data;
    console.log('Response:', JSON.stringify(data, null, 2));
    console.log('Text length:', data.text ? data.text.length : 0);
    console.log('First 500 chars:', data.text ? data.text.substring(0, 500) : 'No text');
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testUpload();
