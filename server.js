const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const tesseract = require('node-tesseract-ocr');
const { PDFImage } = require('pdf-image');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

async function callLmStudioPrompt(prompt, systemPrompt = SYSTEM_PROMPT, temperature = 0.7) {
  const response = await axios.post(`${LM_STUDIO_URL}/api/v1/chat`, {
    model: process.env.LM_STUDIO_MODEL || 'google/gemma-4-e4b',
    system_prompt: systemPrompt,
    input: prompt,
    temperature
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  let responseText = '';
  if (response.data.output && Array.isArray(response.data.output)) {
    const messageOutput = response.data.output.find(item => item.type === 'message');
    if (messageOutput && messageOutput.content) {
      responseText = messageOutput.content;
    }
  }

  if (!responseText) {
    if (response.data.message?.content) {
      responseText = response.data.message.content;
    } else if (response.data.content) {
      responseText = response.data.content;
    } else if (typeof response.data === 'string') {
      responseText = response.data;
    } else {
      responseText = JSON.stringify(response.data);
    }
  }

  return {
    text: String(responseText),
    usage: response.data.usage
  };
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Math/Calculus specialized system prompt for document analysis
const SYSTEM_PROMPT = `You are an expert assistant in Systems Engineering and Mathematics for university students.
- Respond in clear and accessible English.
- Explain concepts step by step using practical examples and analogies.
- If you present formulas, use exclusively LaTeX delimited with $$...$$ or \(...\). Do not deliver mathematical expressions in plain text.
- Deliver the actual formulas as they are, in standard mathematical notation.
- Always accompany formulas with explanations in natural language.
- Do not deliver only LaTeX code without explanation.
`;

const MATH_SYSTEM_PROMPT = `You are an expert professor in Calculus and Vector Calculus, with deep knowledge in:
- Differential calculus (derivatives, gradients, optimization)
- Integral calculus (line and surface integrals)
- Vector calculus (gradient, divergence, curl, conservative fields)
- Multivariable calculus
- Applications in physics and engineering

Your teaching style:
1. Explain concepts with clear analogies and real-world examples.
2. Break down complex problems into simple steps.
3. Use conversational and accessible language.
4. Relate results to geometric and physical interpretations.
5. Include practical applications when possible.
6. Use clear mathematical expressions and, when including formulas, deliver them in LaTeX delimited with $$...$$ or \(...\).
7. Deliver exact formulas as mathematical notation, not as descriptive text.
8. Show intermediate steps and common errors.
8. Connect methods with broader mathematical frameworks.
9. Point out assumptions and special cases.
10. Make the content friendly and motivating.

When solving document problems:
- Read and understand the statement carefully.
- Explain the mathematical concepts involved.
- Offer step-by-step solutions with clear reasoning.
- If you use formulas, place them in LaTeX blocks delimited with $$...$$.
- Do not deliver formulas as plain text.
- Always provide explanations in English along with the formulas.
- Prefer short paragraphs, numbered lists, and visual descriptions.
- Describe the physical or geometric meaning of the results.
- Suggest extensions or related problems.

Always be patient and encouraging. Use analogies like the flow of a liquid for vector fields and landscapes for scalar fields.`;

const SIGN_LANGUAGE_DATABASE = [
  {
    term: 'hello',
    category: 'Greeting',
    description: 'Open hand with palm facing outward, moving hand from forehead forward.',
    notes: 'Used to greet someone without sound.'
  },
  {
    term: 'thank you',
    category: 'Courtesy',
    description: 'Fingers touch chin and hand moves slightly forward with palm up.',
    notes: 'Expresses gratitude in formal and informal contexts.'
  },
  {
    term: 'please',
    category: 'Courtesy',
    description: 'Open hand on chest, making a small circular movement to the side.',
    notes: 'Used to ask for something with respect.'
  },
  {
    term: 'yes',
    category: 'Affirmation',
    description: 'Closed hand with thumb raised and a small forward movement.',
    notes: 'Used to respond affirmatively visually.'
  },
  {
    term: 'no',
    category: 'Negation',
    description: 'Index and middle fingers join with thumb as if closing a small clip.',
    notes: 'Used to deny or reject something.'
  },
  {
    term: 'goodbye',
    category: 'Farewell',
    description: 'Open hand moving side to side as saying bye.',
    notes: 'Used to say goodbye.'
  },
  {
    term: 'help',
    category: 'Need',
    description: 'Both hands closed in fists, moving up and down.',
    notes: 'Used to ask for help or assistance.'
  },
  {
    term: 'water',
    category: 'Need',
    description: 'Hand simulating drinking water, bringing fingers to mouth.',
    notes: 'Used to ask for or refer to water.'
  },
  {
    term: 'eat',
    category: 'Need',
    description: 'Fingers simulating bringing food to mouth.',
    notes: 'Used to refer to food or eating.'
  },
  {
    term: 'friend',
    category: 'Relationships',
    description: 'Index and thumb of both hands forming an A, joining them.',
    notes: 'Used to refer to a friend.'
  }
];

const SIGN_LANGUAGE_SYSTEM_PROMPT = `You are an expert assistant in sign language and accessibility for deaf or hard of hearing people.
- Respond in clear and direct English, without excessively long explanations.
- For simple queries about a specific sign, give only the basic description and a brief tip.
- If you don't have the sign in the database, explain how it would be done using known signs.
- Keep responses concise: maximum 3-4 paragraphs.
- Do not use tables or complex formats.
- Focus on what is practical and useful for learning.`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    // Build conversation context from history
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg.role === 'user') {
          conversationContext += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          conversationContext += `Assistant: ${msg.content}\n`;
        }
      });
    }

    // Combine context with current message
    const fullInput = conversationContext + `User: ${message}`;

    const response = await axios.post(`${LM_STUDIO_URL}/api/v1/chat`, {
      model: process.env.LM_STUDIO_MODEL || 'google/gemma-4-e4b',
      system_prompt: SYSTEM_PROMPT,
      input: fullInput,
      temperature: 0.7
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Extract the response text from LM Studio's response
    let responseText = '';
    
    // Handle the new LM Studio format with output array
    if (response.data.output && Array.isArray(response.data.output)) {
      const messageOutput = response.data.output.find(item => item.type === 'message');
      if (messageOutput && messageOutput.content) {
        responseText = messageOutput.content;
      }
    }
    
    // Fallback to old format
    if (!responseText) {
      if (response.data.message?.content) {
        responseText = response.data.message.content;
      } else if (response.data.content) {
        responseText = response.data.content;
      } else if (typeof response.data === 'string') {
        responseText = response.data;
      } else {
        responseText = JSON.stringify(response.data);
      }
    }
    
    // Ensure response is a string
    responseText = String(responseText);
    
    res.json({
      response: responseText,
      usage: response.data.usage
    });
  } catch (error) {
    console.error('Error calling LM Studio:', error.response?.data || error.message);

    res.status(500).json({ 
      error: 'Failed to connect to LM Studio',
      details: error.response?.data || error.message 
    });
  }
});

// Web search endpoint for educational resources
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Using DuckDuckGo instant answer API for web search
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' systems engineering textbook tutorial')}&format=json`;
    
    const response = await axios.get(searchUrl);
    
    res.json({
      query: query,
      results: response.data.RelatedTopics?.slice(0, 5) || [],
      abstract: response.data.Abstract || '',
      abstractText: response.data.AbstractText || '',
      abstractSource: response.data.AbstractSource || ''
    });
  } catch (error) {
    console.error('Error performing web search:', error.message);
    res.status(500).json({ 
      error: 'Failed to perform web search',
      details: error.message 
    });
  }
});

// Get book recommendations endpoint
app.post('/api/books', async (req, res) => {
  try {
    const { topic } = req.body;
    
    const searchQuery = `best books ${topic} systems engineering computer science`;
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json`;
    
    const response = await axios.get(searchUrl);
    
    res.json({
      topic: topic,
      results: response.data.RelatedTopics?.slice(0, 8) || [],
      abstract: response.data.Abstract || ''
    });
  } catch (error) {
    console.error('Error searching for books:', error.message);
    res.status(500).json({ 
      error: 'Failed to search for books',
      details: error.message 
    });
  }
});

app.get('/api/sign-language-list', (req, res) => {
  res.json({ signs: SIGN_LANGUAGE_DATABASE });
});

app.post('/api/sign-language-query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required to search sign language.' });
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Search in local database first
    const localSign = SIGN_LANGUAGE_DATABASE.find(sign =>
      sign.term.toLowerCase() === normalizedQuery
    );

    if (localSign) {
      // If in local database, return direct response
      const prompt = `Sign found in local database:
Term: ${localSign.term}
Description: ${localSign.description}
Notes: ${localSign.notes}

Give a concise response with the description and a brief tip.`;
      const result = await callLmStudioPrompt(prompt, SIGN_LANGUAGE_SYSTEM_PROMPT, 0.7);
      return res.json({ response: result.text, usage: result.usage, source: 'local' });
    }

    // If not in local database, search on internet
    try {
      // Search in specialized sign language dictionaries
      const searchResults = [];

      try {
        // Search in Signing Savvy (ASL dictionary)
        const signingSavvyUrl = `https://www.signingsavvy.com/search/${encodeURIComponent(normalizedQuery)}`;
// ...
        const signingSavvyResponse = await axios.get(signingSavvyUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        const $savvy = cheerio.load(signingSavvyResponse.data);
        const signTitle = $savvy('.sign_title').first().text().trim();
        const signDescription = $savvy('.sign_description').first().text().trim();

        if (signTitle && signDescription) {
          searchResults.push({
            source: 'Signing Savvy',
            title: signTitle,
            description: signDescription,
            url: signingSavvyUrl
          });
        }
      } catch (savvyError) {
        console.log('Signing Savvy search failed:', savvyError.message);
      }

      try {
        // Search in Lifeprint ASL Dictionary
        const lifeprintUrl = `https://www.lifeprint.com/dictionary.htm`;
        const lifeprintResponse = await axios.get(lifeprintUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });

        const $lifeprint = cheerio.load(lifeprintResponse.data);
        // Search for links containing the word
        const relevantLinks = [];
        $lifeprint('a').each((index, element) => {
          const linkText = $lifeprint(element).text().toLowerCase();
          const href = $lifeprint(element).attr('href');
          if (linkText.includes(normalizedQuery) && href && href.includes('.htm')) {
            relevantLinks.push({
              text: $lifeprint(element).text().trim(),
              url: `https://www.lifeprint.com${href}`
            });
          }
        });

        if (relevantLinks.length > 0) {
          searchResults.push({
            source: 'Lifeprint ASL',
            title: relevantLinks[0].text,
            description: `Link found in Lifeprint ASL dictionary`,
            url: relevantLinks[0].url
          });
        }
      } catch (lifeprintError) {
        console.log('Lifeprint search failed:', lifeprintError.message);
      }

      // If we found results in specialized dictionaries
      if (searchResults.length > 0) {
        let searchContext = '';
        searchResults.forEach((result, index) => {
          searchContext += `Source ${index + 1} (${result.source}): ${result.title}\n${result.description}\nURL: ${result.url}\n\n`;
        });

        const prompt = `I found information about the sign "${query}" in specialized sign language dictionaries:

${searchContext}

Based on this information from reliable ASL (American Sign Language) sources, explain how to make the sign for "${query}". Keep the response concise and practical. Include the source if relevant.`;

        const result = await callLmStudioPrompt(prompt, SIGN_LANGUAGE_SYSTEM_PROMPT, 0.7);
        return res.json({ response: result.text, usage: result.usage, source: 'specialized_dictionaries' });
      }

      // If no results in dictionaries, try general search
      const searchQuery = `ASL sign for ${normalizedQuery} how to sign`;
      const searchResponse = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(searchResponse.data);
      const generalResults = [];

      $('.result').each((index, element) => {
        if (index < 3) {
          const title = $(element).find('.result__title a').text().trim();
          const snippet = $(element).find('.result__snippet').text().trim();

          if (title && snippet && snippet.length > 50) {
            generalResults.push({
              title: title,
              snippet: snippet
            });
          }
        }
      });

      if (generalResults.length > 0) {
        let searchContext = '';
        generalResults.forEach((result, index) => {
          searchContext += `Result ${index + 1}: ${result.title}\n${result.snippet}\n\n`;
        });

        const prompt = `I didn't find "${query}" in specialized dictionaries, but I found general information on the internet about sign language:

${searchContext}

Based on this information, explain how to make the sign for "${query}" in ASL. Keep the response concise and practical. If not clear, suggest consulting specialized dictionaries.`;

        const result = await callLmStudioPrompt(prompt, SIGN_LANGUAGE_SYSTEM_PROMPT, 0.7);
        return res.json({ response: result.text, usage: result.usage, source: 'web_search' });
      }

      // If no useful results, use fallback
      throw new Error('No useful search results found');

    } catch (searchError) {
      console.error('Error searching web for sign:', searchError.message);

      // Intelligent fallback with basic web search
      try {
        // Quick Wikipedia search for general information
        const wikiQuery = `American Sign Language ${normalizedQuery}`;
        const wikiResponse = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`, {
          timeout: 3000
        });

        if (wikiResponse.data && wikiResponse.data.extract && wikiResponse.data.extract.length > 100) {
          const wikiInfo = wikiResponse.data.extract.substring(0, 500);
          const prompt = `I don't have "${query}" in my local database. I found general information on Wikipedia about ASL:

${wikiInfo}

Based on this contextual information about American Sign Language, explain how to make the sign for "${query}". If the information is not specific about the sign, suggest a practical visual approximation.`;

          const result = await callLmStudioPrompt(prompt, SIGN_LANGUAGE_SYSTEM_PROMPT, 0.7);
          return res.json({ response: result.text, usage: result.usage, source: 'wikipedia' });
        }
      } catch (wikiError) {
        console.log('Wikipedia search failed:', wikiError.message);
      }

      // Final fallback with expert knowledge
      const prompt = `As an expert in American Sign Language (ASL), I don't have "${query}" in my local database and couldn't find specific information on the internet. I provide an explanation based on common ASL patterns:

For the sign "${query}", consider these practical options:

1. **Search in specialized dictionaries**: I recommend consulting:
   - Signing Savvy (signingsavvy.com)
   - Lifeprint ASL Dictionary (lifeprint.com)
   - Sign School (signschool.com)
   - Bill Vicars ASL Dictionary

2. **Visual approximation**: [Generate a descriptive gesture based on the meaning of the word]

3. **Fingerspelling**: If it's a specific word, you can spell it letter by letter using the ASL manual alphabet

Would you like me to teach you the ASL alphabet to fingerspell "${query}", or would you prefer information about a related sign I do know?`;

      const result = await callLmStudioPrompt(prompt, SIGN_LANGUAGE_SYSTEM_PROMPT, 0.7);
      return res.json({ response: result.text, usage: result.usage, source: 'expert_fallback' });
    }

  } catch (error) {
    console.error('Error processing sign language query:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to process sign language query', details: error.message });
  }
});

app.post('/api/study-plan', async (req, res) => {
  try {
    const { topic, durationWeeks = 4, level = 'intermediate' } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required to generate study plan.' });
    }

    const prompt = `You are an expert tutor in Systems Engineering. Generate a ${durationWeeks}-week study plan for the topic: ${topic}. Include clear weekly objectives, practical activities, recommended resources, and study tips. Adjust the language for a ${level} level student. Return the response in English with numbered lists.`;

    const result = await callLmStudioPrompt(prompt, SYSTEM_PROMPT, 0.7);

    res.json({ response: result.text, usage: result.usage });
  } catch (error) {
    console.error('Error generating study plan:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate study plan', details: error.response?.data || error.message });
  }
});

app.post('/api/quiz', async (req, res) => {
  try {
    const { topic, questions = 5, level = 'intermediate' } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required to generate quiz.' });
    }

    const prompt = `You are an expert professor in Systems Engineering. Create a quiz of ${questions} questions about the topic: ${topic}. Each question should have four options (A, B, C, D). At the end, include the correct answers with a brief explanation for each one. Use clear language in English.`;

    const result = await callLmStudioPrompt(prompt, SYSTEM_PROMPT, 0.7);

    res.json({ response: result.text, usage: result.usage });
  } catch (error) {
    console.error('Error generating quiz:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate quiz', details: error.response?.data || error.message });
  }
});

app.post('/api/summary', async (req, res) => {
  try {
    const { documentText } = req.body;

    if (!documentText || !documentText.trim()) {
      return res.status(400).json({ error: 'Document text is required to generate summary.' });
    }

    const truncatedDocText = documentText.length > 30000
      ? documentText.substring(0, 30000) + '... [document truncated]'
      : documentText;

    const prompt = `You are an assistant that summarizes technical Systems Engineering documents. Summarize the following content in no more than 200 words, highlighting key concepts and study recommendations. Document:\n\n${truncatedDocText}`;

    const result = await callLmStudioPrompt(prompt, SYSTEM_PROMPT, 0.7);

    res.json({ response: result.text, usage: result.usage });
  } catch (error) {
    console.error('Error generating summary:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate summary', details: error.response?.data || error.message });
  }
});

// Upload and read PDF endpoint
app.post('/api/upload-pdf', async (req, res) => {
  try {
    const { pdfData, fileName } = req.body;
    
    console.log('PDF upload request received, fileName:', fileName);
    console.log('PDF data length:', pdfData ? pdfData.length : 'none');
    
    if (!pdfData) {
      return res.status(400).json({ error: 'No PDF data provided' });
    }

    // Remove data URL prefix if present
    let base64Data = pdfData;
    if (pdfData.startsWith('data:application/pdf;base64,')) {
      base64Data = pdfData.replace(/^data:application\/pdf;base64,/, '');
    } else if (pdfData.startsWith('data:text/plain;base64,')) {
      base64Data = pdfData.replace(/^data:text\/plain;base64,/, '');
    }
    
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log('Buffer created, size:', buffer.length);

    // Check if this is actually a PDF by looking at PDF header
    const isPdf = buffer.length > 4 && 
      buffer[0] === 0x25 && // %
      buffer[1] === 0x50 && // P
      buffer[2] === 0x44 && // D
      buffer[3] === 0x46;   // F
    
    if (!isPdf) {
      console.log('File is not a PDF, treating as plain text');
      const textContent = buffer.toString('utf8');
      return res.json({
        success: true,
        fileName: fileName || 'document.txt',
        text: textContent,
        pages: 1,
        info: {},
        ocrUsed: false
      });
    }

    // Parse PDF
    const data = await pdfParse(buffer);
    
    console.log('PDF parsed successfully, pages:', data.numpages, 'text length:', data.text.length);
    
    let extractedText = data.text;
    
    // If text is very short, PDF is likely scanned - use OCR
    if (data.text.length < 100) { // Enable OCR for short text PDFs
      console.log('PDF appears to be scanned (image-based). Attempting OCR...');
      console.log('PDF text length:', data.text.length);
      console.log('OCR condition met: text length < 100');
      
      // Attempt OCR for short text PDFs
      console.log('Attempting OCR for short text PDF...');
      
      // Save buffer to temporary file for pdf2pic
      const tempPdfPath = path.join(__dirname, 'temp.pdf');
      fs.writeFileSync(tempPdfPath, buffer);
      console.log('Temporary PDF saved to:', tempPdfPath);
      
      // Use pdf-image to convert PDF pages to images
      const pdfImage = new PDFImage(tempPdfPath, {
        convertOptions: {
          '-density': '300',
          '-quality': '100'
        }
      });
      
      let ocrText = '';
      
      const config = {
        lang: 'spa', // Spanish
        oem: 1,
        psm: 6,
      };
      
      // Convert each page
      for (let i = 0; i < data.numpages; i++) {
        try {
          console.log(`Converting page ${i+1}/${data.numpages} to image`);
          const imagePath = await pdfImage.convertPage(i);
          
          // OCR: image
          console.log(`Performing OCR on page ${i+1}...`);
          console.log(`Image path: ${imagePath}`);
          
          const text = await tesseract.recognize(imagePath, config);
          console.log(`Page ${i+1} raw OCR result:`, text);
          console.log(`Page ${i+1} OCR result length:`, text.length);
          
          if (text && text.trim()) {
            ocrText += text + '\n\n';
            console.log(`Page ${i+1} OCR result (first 100 chars):`, text.substring(0, 100));
          } else {
            console.log(`Page ${i+1} OCR failed or returned empty result`);
          }
          
          // Clean up image file
          fs.unlinkSync(imagePath);
        } catch (pageError) {
          console.error(`Error processing page ${i+1}:`, pageError.message);
          console.error('Page error stack:', pageError.stack);
        }
      }
      
      // Clean up temp PDF
      fs.unlinkSync(tempPdfPath);
      
      // Use OCR text if it's longer than extracted text
      if (ocrText.length > data.text.length) {
        extractedText = ocrText;
        console.log('Using OCR text instead of extracted text');
      } else {
        console.log('Using extracted text (OCR text was shorter)');
      }
      
      console.log('OCR completed, extracted text length:', data.text.length, 'OCR text length:', ocrText.length);
    }
    
    res.json({
      success: true,
      fileName: fileName || 'document.pdf',
      text: extractedText,
      pages: data.numpages,
      info: data.info,
      ocrUsed: data.text.length < 100
    });
  } catch (error) {
    console.error('Error parsing PDF:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ 
      error: 'Failed to parse PDF',
      details: error.message 
    });
  }
});

// Upload and read Word document endpoint
app.post('/api/upload-word', async (req, res) => {
  try {
    const { wordData, fileName } = req.body;
    
    console.log('Word upload request received, fileName:', fileName);
    console.log('Word data length:', wordData ? wordData.length : 'none');
    
    if (!wordData) {
      return res.status(400).json({ error: 'No Word data provided' });
    }

    // Remove data URL prefix if present
    const base64Data = wordData.replace(/^data:application\/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log('Buffer created, size:', buffer.length);

    // Parse Word document
    const result = await mammoth.extractRawText({ buffer });
    
    console.log('Word parsed successfully, text length:', result.value.length);
    console.log('Mammoth messages:', result.messages);
    
    res.json({
      success: true,
      fileName: fileName || 'document.docx',
      text: result.value,
      messages: result.messages
    });
  } catch (error) {
    console.error('Error parsing Word document:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ 
      error: 'Failed to parse Word document',
      details: error.message 
    });
  }
});

// Chat with document context endpoint - uses LM Studio for document interpretation
app.post('/api/chat-with-document', async (req, res) => {
  try {
    const { message, documentText, conversationHistory = [] } = req.body;

    // Build conversation context from history
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg.role === 'user') {
          conversationContext += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          conversationContext += `Assistant: ${msg.content}\n`;
        }
      });
    }

    // Truncate document text if too long (keep first 15000 chars)
    const truncatedDocText = documentText.length > 30000 
      ? documentText.substring(0, 30000) + '... [document truncated]' 
      : documentText;

    // Combine document context with conversation
    const fullInput = `DOCUMENT CONTENT:\n${truncatedDocText}\n\nCONVERSATION:\n${conversationContext}User: ${message}`;

    const response = await axios.post(`${LM_STUDIO_URL}/api/v1/chat`, {
      model: process.env.LM_STUDIO_MODEL || 'google/gemma-4-e4b',
      system_prompt: MATH_SYSTEM_PROMPT + '\n\nYou have been provided with a mathematical document containing calculus problems. Solve problems step-by-step with clear explanations, analogies, and practical applications. Use natural, conversational language that makes mathematics accessible and engaging. Deliver exact formulas in LaTeX delimiters ($$...$$ or \\(...\\)), not as plain text descriptions.',
      input: fullInput,
      temperature: 0.7
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Extract the response text from LM Studio's response
    let responseText = '';
    
    // Handle the new LM Studio format with output array
    if (response.data.output && Array.isArray(response.data.output)) {
      const messageOutput = response.data.output.find(item => item.type === 'message');
      if (messageOutput && messageOutput.content) {
        responseText = messageOutput.content;
      }
    }
    
    // Fallback to old format
    if (!responseText) {
      if (response.data.message?.content) {
        responseText = response.data.message.content;
      } else if (response.data.content) {
        responseText = response.data.content;
      } else if (typeof response.data === 'string') {
        responseText = response.data;
      } else {
        responseText = JSON.stringify(response.data);
      }
    }
    
    // Ensure response is a string
    responseText = String(responseText);
    
    res.json({
      response: responseText,
      usage: response.data.usage
    });
  } catch (error) {
    console.error('Error calling LM Studio with document:', error.response?.data || error.message);

    res.status(500).json({ 
      error: 'Failed to connect to LM Studio',
      details: error.response?.data || error.message 
    });
  }
});

// Get PDF book links endpoint
app.post('/api/pdf-books', async (req, res) => {
  try {
    const { topic } = req.body;
    
    // Curated list of free PDF book sources by topic
    const pdfBooksByTopic = {
      'algorithms': [
        { title: 'Introduction to Algorithms', author: 'Cormen et al.', url: 'https://mitpress.mit.edu/sites/default/files/samples/Introduction%20to%20Algorithms%20Third%20Edition.pdf', source: 'MIT Press' },
        { title: 'Algorithms', author: 'Sedgewick & Wayne', url: 'https://algs4.cs.princeton.edu/home/', source: 'Princeton University' },
        { title: 'The Algorithm Design Manual', author: 'Steven Skiena', url: 'https://www.algorist.com/', source: 'Springer' }
      ],
      'software engineering': [
        { title: 'Clean Code', author: 'Robert C. Martin', url: 'https://www.oreilly.com/library/view/clean-code-a/9780136083238/', source: 'O\'Reilly' },
        { title: 'Design Patterns', author: 'GoF', url: 'https://www.oreilly.com/library/view/design-patterns-elements/0201633612/', source: 'O\'Reilly' },
        { title: 'Refactoring', author: 'Martin Fowler', url: 'https://www.refactoring.com/', source: 'Addison-Wesley' }
      ],
      'databases': [
        { title: 'Database System Concepts', author: 'Silberschatz et al.', url: 'https://www.db-book.com/', source: 'McGraw-Hill' },
        { title: 'SQL and Relational Theory', author: 'C.J. Date', url: 'https://www.oreilly.com/library/view/sql-and-relational/9781449316402/', source: 'O\'Reilly' }
      ],
      'operating systems': [
        { title: 'Operating System Concepts', author: 'Silberschatz et al.', url: 'https://www.os-book.com/', source: 'Wiley' },
        { title: 'The Linux Programming Interface', author: 'Michael Kerrisk', url: 'https://man7.org/linux/man-pages/', source: 'No Starch Press' }
      ],
      'networks': [
        { title: 'Computer Networking', author: 'Kurose & Ross', url: 'https://www.pearson.com/en-us/subject-catalog/p/computer-networking/P200000003422/9780135926367', source: 'Pearson' },
        { title: 'TCP/IP Illustrated', author: 'W. Richard Stevens', url: 'https://www.pearson.com/en-us/subject-catalog/p/tcp-ip-illustrated-volume-1/P200000003624/9780201633467', source: 'Addison-Wesley' }
      ],
      'computer architecture': [
        { title: 'Computer Organization and Design', author: 'Patterson & Hennessy', url: 'https://www.elsevier.com/books/computer-organization-and-design/patterson/978-0-12-820331-4', source: 'Morgan Kaufmann' },
        { title: 'Structured Computer Organization', author: 'Andrew Tanenbaum', url: 'https://www.pearson.com/en-us/subject-catalog/p/structured-computer-organization/P200000003599/9780132916563', source: 'Pearson' }
      ],
      'machine learning': [
        { title: 'Hands-On Machine Learning', author: 'Aurélien Géron', url: 'https://www.oreilly.com/library/view/hands-on-machine-learning/9781492032632/', source: 'O\'Reilly' },
        { title: 'Pattern Recognition and Machine Learning', author: 'Christopher Bishop', url: 'https://www.springer.com/gp/book/9780387310732', source: 'Springer' }
      ],
      'cybersecurity': [
        { title: 'Practical Malware Analysis', author: 'Sikorski & Honig', url: 'https://www.elsevier.com/books/practical-malware-analysis/sikorski/978-1-59749-956-3', source: 'No Starch Press' },
        { title: 'Web Application Hacker\'s Handbook', author: 'Dafydd Stuttard', url: 'https://www.wiley.com/en-us/Web+Application+Hacker%27s+Handbook-p-9780470170779', source: 'Wiley' }
      ],
      'cloud computing': [
        { title: 'Cloud Computing: Concepts, Technology & Architecture', author: 'Erl et al.', url: 'https://www.pearson.com/en-us/subject-catalog/p/cloud-computing-concepts-technology/P200000003628/9780133387758', source: 'Pearson' },
        { title: 'Kubernetes Up & Running', author: 'Brendan Burns et al.', url: 'https://www.oreilly.com/library/view/kubernetes-up-and/9781492046486/', source: 'O\'Reilly' }
      ]
    };

    const books = pdfBooksByTopic[topic] || [
      { title: 'The Pragmatic Programmer', author: 'Andrew Hunt & David Thomas', url: 'https://www.oreilly.com/library/view/the-pragmatic-programmer/9780135957051/', source: 'Addison-Wesley' },
      { title: 'Clean Architecture', author: 'Robert C. Martin', url: 'https://www.pearson.com/en-us/subject-catalog/p/clean-architecture/P200000003621/9780134494166', source: 'Pearson' }
    ];

    res.json({
      topic: topic,
      books: books
    });
  } catch (error) {
    console.error('Error getting PDF books:', error.message);
    res.status(500).json({ 
      error: 'Failed to get PDF books',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'AI Engineering Tutor API is running',
    lmStudioUrl: LM_STUDIO_URL 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LM Studio URL: ${LM_STUDIO_URL}`);
});
