const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Read the document text
const docPath = path.join(__dirname, 'test-document.txt');
const documentText = fs.readFileSync(docPath, 'utf8');

// Test the chat-with-document endpoint
async function testChatWithDocument() {
  try {
    const response = await axios.post('http://localhost:3000/api/chat-with-document', {
      message: 'Desarrolla los 5 ejercicios del taller de cálculo vectorial',
      documentText: documentText
    });

    const data = response.data;
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testChatWithDocument();