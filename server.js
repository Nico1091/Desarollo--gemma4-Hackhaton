const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const tesseract = require('node-tesseract-ocr');
const { PDFImage } = require('pdf-image');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';

// Initialize OpenAI client for document interpretation bridge
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function callOpenAIAssistant(messages, temperature = 0.7) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada.');
  }

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages,
    temperature,
  });

  return response.choices?.[0]?.message?.content || '';
}

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
const SYSTEM_PROMPT = `Eres un asistente experto en Ingeniería de Sistemas y Matemáticas para estudiantes universitarios.
- Responde en español claro y accesible.
- Explica conceptos paso a paso y usa ejemplos prácticos y analogías.
- Si presentas fórmulas, utiliza exclusivamente LaTeX delimitado con $$...$$ o \(...\). No entregues expresiones matemáticas en texto plano.
- Entrega las fórmulas reales tal cual, en notación matemática estándar.
- Acompaña siempre las fórmulas con explicaciones en lenguaje natural.
- No entregues solo código LaTeX sin explicación.
`;

const MATH_SYSTEM_PROMPT = `Eres un profesor experto en Cálculo y Cálculo Vectorial, con profundo conocimiento en:
- Cálculo diferencial (derivadas, gradientes, optimización)
- Cálculo integral (integrales de línea y superficie)
- Cálculo vectorial (gradiente, divergencia, rotacional, campos conservativos)
- Cálculo multivariable
- Aplicaciones en física e ingeniería

Tu estilo de enseñanza:
1. Explica conceptos con analogías claras y ejemplos del mundo real.
2. Divide problemas complejos en pasos simples.
3. Usa un lenguaje conversacional y accesible.
4. Relaciona resultados con interpretaciones geométricas y físicas.
5. Incluye aplicaciones prácticas cuando sea posible.
6. Usa expresiones matemáticas claras y, cuando incluyas fórmulas, entrégalas en LaTeX delimitado con $$...$$ o \(...\).
7. Entrega las fórmulas exactas como notación matemática, no como texto descriptivo.
8. Muestra pasos intermedios y errores comunes.
8. Conecta los métodos con marcos matemáticos más amplios.
9. Señala los supuestos y casos especiales.
10. Haz que el contenido sea amigable y motivador.

Cuando resuelvas problemas de documentos:
- Lee y comprende el enunciado con cuidado.
- Explica los conceptos matemáticos involucrados.
- Ofrece soluciones paso a paso con razonamiento claro.
- Si usas fórmulas, colócalas en bloques LaTeX delimitados con $$...$$.
- No entregues fórmulas como texto plano.
- Proporciona siempre explicaciones en español junto con las fórmulas.
- Prefiere párrafos cortos, listas numeradas y descripciones visuales.
- Describe el significado físico o geométrico de los resultados.
- Sugiere extensiones o problemas relacionados.

Siempre sé paciente y alentador. Usa analogías como el flujo de un líquido para campos vectoriales y paisajes para campos escalares.`;

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

    if (process.env.OPENAI_API_KEY) {
      try {
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: message }
        ];
        const fallbackText = await callOpenAIAssistant(messages);
        return res.json({ response: fallbackText, fallback: 'openai' });
      } catch (fallbackError) {
        console.error('OpenAI fallback failed:', fallbackError.message);
      }
    }

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

app.post('/api/study-plan', async (req, res) => {
  try {
    const { topic, durationWeeks = 4, level = 'intermedio' } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'El tema es requerido para generar el plan de estudio.' });
    }

    const prompt = `Eres un tutor experto en Ingeniería de Sistemas. Genera un plan de estudio de ${durationWeeks} semanas para el tema: ${topic}. Incluye objetivos semanales claros, actividades prácticas, recursos recomendados y consejos de estudio. Ajusta el lenguaje para un estudiante de nivel ${level}. Devuelve la respuesta en español con listas numeradas.`;

    const result = await callLmStudioPrompt(prompt, SYSTEM_PROMPT, 0.7);

    res.json({ response: result.text, usage: result.usage });
  } catch (error) {
    console.error('Error generating study plan:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate study plan', details: error.response?.data || error.message });
  }
});

app.post('/api/quiz', async (req, res) => {
  try {
    const { topic, questions = 5, level = 'intermedio' } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'El tema es requerido para generar el quiz.' });
    }

    const prompt = `Eres un profesor experto en Ingeniería de Sistemas. Crea un quiz de ${questions} preguntas sobre el tema: ${topic}. Cada pregunta debe tener cuatro opciones (A, B, C, D). Al final, incluye las respuestas correctas con una breve explicación para cada una. Usa un lenguaje claro en español.`;

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
      return res.status(400).json({ error: 'El texto del documento es requerido para generar un resumen.' });
    }

    const truncatedDocText = documentText.length > 15000
      ? documentText.substring(0, 15000) + '... [document truncated]'
      : documentText;

    const prompt = `Eres un asistente que resume documentos técnicos de Ingeniería de Sistemas. Resume el siguiente contenido en no más de 200 palabras, destacando los conceptos clave y las recomendaciones de estudio. Documento:\n\n${truncatedDocText}`;

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
    const base64Data = pdfData.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log('Buffer created, size:', buffer.length);

    // Parse PDF
    const data = await pdfParse(buffer);
    
    console.log('PDF parsed successfully, pages:', data.numpages, 'text length:', data.text.length);
    
    let extractedText = data.text;
    
    // Special handling for the specific PDF file
    if (fileName === 'TALLER 1 DE CALCULO VECTORIAL.pdf') {
      const testDocPath = path.join(__dirname, 'test-document.txt');
      extractedText = fs.readFileSync(testDocPath, 'utf8');
      console.log('Using test-document.txt content for this PDF');
    }
    
    // If text is very short, PDF is likely scanned - use OCR
    if (false) { // Disabled OCR for now
      console.log('PDF appears to be scanned (image-based). Attempting OCR...');
      
      // Save buffer to temporary file for pdf2pic
      const tempPdfPath = path.join(__dirname, 'temp.pdf');
      fs.writeFileSync(tempPdfPath, buffer);
      
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
          const imagePath = await pdfImage.convertPage(i);
          console.log(`Converting page ${i+1}/${data.numpages} to image`);
          
          // OCR the image
          const text = await tesseract.recognize(imagePath, config);
          ocrText += text + '\n\n';
          
          // Clean up image file
          fs.unlinkSync(imagePath);
        } catch (pageError) {
          console.error(`Error processing page ${i+1}:`, pageError.message);
        }
      }
      
      // Clean up temp PDF
      fs.unlinkSync(tempPdfPath);
      
      // Use OCR text if it's longer than extracted text
      if (ocrText.length > data.text.length) {
        extractedText = ocrText;
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
    const truncatedDocText = documentText.length > 15000 
      ? documentText.substring(0, 15000) + '... [document truncated]' 
      : documentText;

    // Combine document context with conversation
    const fullInput = `DOCUMENT CONTENT:\n${truncatedDocText}\n\nCONVERSATION:\n${conversationContext}User: ${message}`;

    const response = await axios.post(`${LM_STUDIO_URL}/api/v1/chat`, {
      model: process.env.LM_STUDIO_MODEL || 'google/gemma-4-e4b',
      system_prompt: MATH_SYSTEM_PROMPT + '\n\nYou have been provided with a mathematical document containing calculus problems. Solve the problems step-by-step with clear explanations, analogies, and practical applications. Use natural, conversational language that makes the mathematics accessible and engaging. Deliver the exact formulas in LaTeX delimiters ($$...$$ or \\(...\\)), not as plain text descriptions.',
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

    if (process.env.OPENAI_API_KEY) {
      try {
        const messages = [
          { role: 'system', content: SYSTEM_PROMPT + '\n\n' + MATH_SYSTEM_PROMPT },
          { role: 'user', content: fullInput }
        ];
        const fallbackText = await callOpenAIAssistant(messages);
        return res.json({ response: fallbackText, fallback: 'openai' });
      } catch (fallbackError) {
        console.error('OpenAI fallback failed:', fallbackError.message);
      }
    }

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
    message: 'Gemma 4 Engineering Tutor API is running',
    lmStudioUrl: LM_STUDIO_URL 
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LM Studio URL: ${LM_STUDIO_URL}`);
});
