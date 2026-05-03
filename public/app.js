// API Configuration
const API_BASE = 'http://localhost:3000/api';

// State
let conversationHistory = [];
let currentDocumentText = '';
let documentConversationHistory = [];

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchResults = document.getElementById('searchResults');
const bookTopic = document.getElementById('bookTopic');
const searchBooksButton = document.getElementById('searchBooksButton');
const booksResults = document.getElementById('booksResults');
const signLanguageInput = document.getElementById('signLanguageInput');
const signLanguageSearchButton = document.getElementById('signLanguageSearchButton');
const signLanguageResults = document.getElementById('signLanguageResults');
const signLanguageList = document.getElementById('signLanguageList');
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const quickActions = document.querySelectorAll('.quick-action');
const topicCards = document.querySelectorAll('.topic-card');
const chatModeSelect = document.getElementById('chatModeSelect');
const modeParameterInput = document.getElementById('modeParameterInput');
const modeParameterWrapper = document.getElementById('modeParameterWrapper');
const modeParameterLabel = document.getElementById('modeParameterLabel');

// Document upload elements
const pdfInput = document.getElementById('pdfInput');
const wordInput = document.getElementById('wordInput');
const documentInfo = document.getElementById('documentInfo');
const summaryDocumentButton = document.getElementById('summaryDocumentButton');
const documentFileName = document.getElementById('documentFileName');
const documentPages = document.getElementById('documentPages');
const documentChars = document.getElementById('documentChars');
const documentPreviewText = document.getElementById('documentPreviewText');
const documentQuestionInput = document.getElementById('documentQuestionInput');
const askDocumentButton = document.getElementById('askDocumentButton');
const clearDocument = document.getElementById('clearDocument');

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        contentSections.forEach(sec => sec.classList.remove('active'));
        document.getElementById(`${section}-section`).classList.add('active');
    });
});

function updateModeControls() {
    const mode = chatModeSelect.value;

    if (mode === 'study-plan') {
        modeParameterWrapper.style.display = 'flex';
        modeParameterLabel.textContent = 'Weeks';
        modeParameterInput.placeholder = '4';
        messageInput.placeholder = 'Topic for study plan...';
    } else if (mode === 'quiz') {
        modeParameterWrapper.style.display = 'flex';
        modeParameterLabel.textContent = 'Questions';
        modeParameterInput.placeholder = '5';
        messageInput.placeholder = 'Topic for quiz...';
    } else if (mode === 'summary') {
        modeParameterWrapper.style.display = 'none';
        messageInput.placeholder = 'Topic or concept to summarize...';
    } else {
        modeParameterWrapper.style.display = 'none';
        messageInput.placeholder = 'Type your question here...';
    }
}

chatModeSelect.addEventListener('change', updateModeControls);

// Chat Functionality
async function sendMessage(message, mode = 'chat', modeParam = '') {
    if (!message.trim()) return;

    let displayMessage = message;
    if (mode === 'study-plan') {
        displayMessage = `Study Plan: ${message}`;
    } else if (mode === 'quiz') {
        displayMessage = `Quiz: ${message}`;
    } else if (mode === 'summary') {
        displayMessage = `Summary: ${message}`;
    }

    // Add user message to chat
    addMessageToChat(displayMessage, 'user');
    conversationHistory.push({ role: 'user', content: displayMessage });
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Disable send button
    sendButton.disabled = true;
    
    // Show loading indicator
    const loadingId = addLoadingIndicator();
    
    try {
        let data;
        if (mode === 'study-plan') {
            data = await requestStudyPlan(message, modeParam);
        } else if (mode === 'quiz') {
            data = await requestQuiz(message, modeParam);
        } else if (mode === 'summary') {
            data = await requestSummary(message);
        } else {
            data = await requestChat(message);
        }

        removeLoadingIndicator(loadingId);
        
        if (data.error) {
            addMessageToChat(`Error: ${data.error}`, 'assistant');
        } else {
            addMessageToChat(data.response, 'assistant');
            conversationHistory.push({ role: 'assistant', content: data.response });
        }
    } catch (error) {
        removeLoadingIndicator(loadingId);
        addMessageToChat(`Connection error: ${error.message}`, 'assistant');
    }
    
    sendButton.disabled = false;
}

async function requestChat(message) {
    const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message,
            conversationHistory
        })
    });

    return response.json();
}

async function requestStudyPlan(topic, weeks) {
    return fetch(`${API_BASE}/study-plan`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            topic,
            durationWeeks: Number(weeks) || 4,
            level: 'intermedio'
        })
    }).then(res => res.json());
}

async function requestQuiz(topic, questions) {
    return fetch(`${API_BASE}/quiz`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            topic,
            questions: Number(questions) || 5,
            level: 'intermedio'
        })
    }).then(res => res.json());
}

async function requestSummary(topic) {
    return fetch(`${API_BASE}/summary`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            documentText: topic
        })
    }).then(res => res.json());
}

function addMessageToChat(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = role === 'assistant' 
        ? '<i class="fas fa-robot"></i>' 
        : '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Format the content (basic markdown-like formatting)
    const formattedContent = formatMessage(content);
    contentDiv.innerHTML = formattedContent;
    renderMath(contentDiv);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function autoWrapPlainMath(content) {
    if (/\$\$|\\\(|\\\[/.test(content)) {
        return content;
    }

    return content.replace(/(^|\n)([^\n]*?(?:\^|_|sqrt|frac|int|lim|sin|cos|tan|=)[^\n]*?)(?=\n|$)/g, (match, prefix, expr) => {
        const trimmed = expr.trim();
        if (!trimmed) return match;
        const hasMathChars = /[\^_]|sqrt|frac|int|lim|sin|cos|tan|=/.test(trimmed);
        if (!hasMathChars) return match;
        return `${prefix}$$${trimmed}$$`;
    });
}

function formatMessage(content) {
    if (typeof content !== 'string') {
        content = String(content);
    }

    content = escapeHTML(content);
    content = autoWrapPlainMath(content);

    const mathBlocks = [];
    content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
        const key = `___MATH_BLOCK_${mathBlocks.length}___`;
        mathBlocks.push(match);
        return key;
    });
    content = content.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
        const key = `___MATH_BLOCK_${mathBlocks.length}___`;
        mathBlocks.push(match);
        return key;
    });
    content = content.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
        const key = `___MATH_BLOCK_${mathBlocks.length}___`;
        mathBlocks.push(match);
        return key;
    });
    content = content.replace(/(^|[^\\])\$([^\$\n]+?)\$(?!\$)/g, (match, prefix, inner) => {
        const key = `___MATH_BLOCK_${mathBlocks.length}___`;
        mathBlocks.push(`$${inner}$`);
        return `${prefix}${key}`;
    });

    const codeBlocks = [];
    content = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const key = `___CODE_BLOCK_${codeBlocks.length}___`;
        codeBlocks.push({ lang: lang || '', code });
        return key;
    });

    let formatted = content
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Lists
        .replace(/^\- (.+)$/gm, '<li>$1</li>')
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
        const key = `___CODE_BLOCK_${index}___`;
        const escapedCode = escapeHTML(block.code);
        formatted = formatted.replace(key, `<pre><code>${escapedCode}</code></pre>`);
    });

    // Restore math blocks
    mathBlocks.forEach((block, index) => {
        const key = `___MATH_BLOCK_${index}___`;
        formatted = formatted.replace(key, block);
    });

    if (!formatted.startsWith('<')) {
        formatted = `<p>${formatted}</p>`;
    }
    
    return formatted;
}

function renderMath(element) {
    if (window.renderMathInElement) {
        try {
            renderMathInElement(element, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                    { left: '\\[', right: '\\]', display: true }
                ],
                throwOnError: false
            });
        } catch (err) {
            console.warn('Math rendering failed:', err);
        }
    }
}


function addLoadingIndicator() {
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.className = 'message assistant';
    loadingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="loading">
                <div class="loading-spinner"></div>
                <span>Pensando...</span>
            </div>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return loadingId;
}

function removeLoadingIndicator(id) {
    const loadingElement = document.getElementById(id);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// Event Listeners for Chat
sendButton.addEventListener('click', () => {
    sendMessage(messageInput.value, chatModeSelect.value, modeParameterInput.value);
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(messageInput.value, chatModeSelect.value, modeParameterInput.value);
    }
});

messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
});

// Quick Actions
quickActions.forEach(action => {
    action.addEventListener('click', () => {
        const prompt = action.dataset.prompt;
        chatModeSelect.value = 'chat';
        updateModeControls();
        sendMessage(prompt, 'chat');
    });
});

// Topic Cards
topicCards.forEach(card => {
    card.addEventListener('click', () => {
        const topic = card.dataset.topic;
        chatModeSelect.value = 'chat';
        updateModeControls();
        // Switch to chat section
        navItems.forEach(nav => nav.classList.remove('active'));
        document.querySelector('[data-section="chat"]').classList.add('active');
        contentSections.forEach(sec => sec.classList.remove('active'));
        document.getElementById('chat-section').classList.add('active');
        // Send the topic as a message
        sendMessage(topic, 'chat');
    });
});

// Search Functionality
searchButton.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;
    
    searchResults.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>Buscando recursos...</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        const data = await response.json();
        
        if (data.error) {
            searchResults.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error: ${data.error}</p>
                </div>
            `;
        } else {
            displaySearchResults(data);
        }
    } catch (error) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Connection error: ${error.message}</p>
            </div>
        `;
    }
});

function displaySearchResults(data) {
    if (!data.results || data.results.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <p>No se encontraron resultados para "${data.query}"</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    if (data.abstractText) {
        html += `
            <div class="search-result-item">
                <h3>Resumen</h3>
                <p>${data.abstractText}</p>
                ${data.abstractSource ? `<small>Fuente: ${data.abstractSource}</small>` : ''}
            </div>
        `;
    }
    
    data.results.forEach(result => {
        if (result.Text && result.FirstURL) {
            html += `
                <div class="search-result-item">
                    <h3>${result.Text.substring(0, 100)}...</h3>
                    <p>${result.Text.substring(0, 200)}...</p>
                    <a href="${result.FirstURL}" target="_blank">View more →</a>
                </div>
            `;
        }
    });
    
    searchResults.innerHTML = html;
}

async function loadSignLanguageList() {
    signLanguageList.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>Loading common signs...</span>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/sign-language-list`);
        const data = await response.json();

        if (!data.signs || data.signs.length === 0) {
            signLanguageList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-handshake"></i>
                    <p>No signs available at the moment.</p>
                </div>
            `;
            return;
        }

        let html = `<div class="sign-language-grid">`;
        data.signs.forEach(sign => {
            html += `
                <div class="sign-card">
                    <h4>${sign.term}</h4>
                    <p><strong>Category:</strong> ${sign.category}</p>
                    <p>${sign.description}</p>
                    <p><em>${sign.notes}</em></p>
                </div>
            `;
        });
        html += `</div>`;
        signLanguageList.innerHTML = html;
    } catch (error) {
        signLanguageList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading signs: ${error.message}</p>
            </div>
        `;
    }
}

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchButton.click();
    }
});

// Sign Language Search Functionality
signLanguageSearchButton.addEventListener('click', async () => {
    const query = signLanguageInput.value.trim();
    if (!query) {
        alert('Please enter a sign or question.');
        return;
    }

    signLanguageResults.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>Consulting sign language...</span>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/sign-language-query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        if (data.error) {
            signLanguageResults.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error: ${data.error}</p>
                </div>
            `;
        } else {
            signLanguageResults.innerHTML = `
                <div class="search-result-item">
                    <h3>Sign language response</h3>
                    <p>${escapeHTML(data.response)}</p>
                </div>
            `;
            renderMath(signLanguageResults);
        }
    } catch (error) {
        signLanguageResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Connection error: ${error.message}</p>
            </div>
        `;
    }
});

signLanguageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        signLanguageSearchButton.click();
    }
});

// Books Search Functionality
searchBooksButton.addEventListener('click', async () => {
    const topic = bookTopic.value;
    if (!topic) {
        alert('Por favor selecciona un tema');
        return;
    }
    
    booksResults.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>Buscando libros PDF...</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/pdf-books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ topic })
        });
        
        const data = await response.json();
        
        if (data.error) {
            booksResults.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error: ${data.error}</p>
                </div>
            `;
        } else {
            displayPDFBookResults(data);
        }
    } catch (error) {
        booksResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Connection error: ${error.message}</p>
            </div>
        `;
    }
});

function displayBookResults(data) {
    if (!data.results || data.results.length === 0) {
        booksResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <p>No se encontraron libros para "${data.topic}"</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Add some classic book recommendations based on topic
    const classicBooks = getClassicBooks(data.topic);
    
    classicBooks.forEach(book => {
        html += `
            <div class="book-card">
                <h3>${book.title}</h3>
                <p class="author">${book.author}</p>
                <p class="description">${book.description}</p>
            </div>
        `;
    });
    
    booksResults.innerHTML = html;
}

function displayPDFBookResults(data) {
    if (!data.books || data.books.length === 0) {
        booksResults.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <p>No se encontraron libros PDF para "${data.topic}"</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    data.books.forEach(book => {
        html += `
            <div class="book-card">
                <h3>${book.title}</h3>
                <p class="author">${book.author}</p>
                <p class="description">Fuente: ${book.source}</p>
                <a href="${book.url}" target="_blank" class="pdf-link">
                    <i class="fas fa-external-link-alt"></i>
                    Abrir PDF / Fuente
                </a>
            </div>
        `;
    });
    
    booksResults.innerHTML = html;
}

function getClassicBooks(topic) {
    const booksByTopic = {
        'algorithms': [
            { title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', description: 'The definitive textbook on algorithms and data structures.' },
            { title: 'Algorithms', author: 'Sedgewick & Wayne', description: 'An accessible introduction to fundamental algorithms.' },
            { title: 'The Algorithm Design Manual', author: 'Steven Skiena', description: 'Practical guide for algorithm design and analysis.' }
        ],
        'software engineering': [
            { title: 'Clean Code', author: 'Robert C. Martin', description: 'Guide to writing clean and maintainable code.' },
            { title: 'Design Patterns', author: 'Gamma, Helm, Johnson, Vlissides', description: 'The essential GoF design patterns.' },
            { title: 'Refactoring', author: 'Martin Fowler', description: 'Improve the design of existing code.' }
        ],
        'databases': [
            { title: 'Database System Concepts', author: 'Silberschatz, Korth, Sudarshan', description: 'Fundamental concepts of database systems.' },
            { title: 'SQL Cookbook', author: 'Anthony Molinaro', description: 'Recipes and solutions for common SQL problems.' },
            { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann', description: 'Design principles for modern data systems.' }
        ],
        'operating systems': [
            { title: 'Operating System Concepts', author: 'Silberschatz, Galvin, Gagne', description: 'The "dinosaur" - classic operating systems textbook.' },
            { title: 'Modern Operating Systems', author: 'Andrew Tanenbaum', description: 'Modern view of operating systems.' },
            { title: 'The Linux Programming Interface', author: 'Michael Kerrisk', description: 'Complete guide to Linux programming.' }
        ],
        'networks': [
            { title: 'Computer Networking', author: 'Kurose & Ross', description: 'Top-down approach to networking.' },
            { title: 'TCP/IP Illustrated', author: 'W. Richard Stevens', description: 'Detailed explanation of TCP/IP protocol.' },
            { title: 'Network Warrior', author: 'Gary Donahue', description: 'Practical guide for network administrators.' }
        ],
        'computer architecture': [
            { title: 'Computer Organization and Design', author: 'Patterson & Hennessy', description: 'Computer architecture from hardware.' },
            { title: 'Structured Computer Organization', author: 'Andrew Tanenbaum', description: 'Hierarchical organization of computers.' },
            { title: 'Code', author: 'Charles Petzold', description: 'From zeros and ones to modern applications.' }
        ],
        'machine learning': [
            { title: 'Hands-On Machine Learning', author: 'Aurélien Géron', description: 'Practical guide with Scikit-Learn, Keras and TensorFlow.' },
            { title: 'Pattern Recognition and Machine Learning', author: 'Christopher Bishop', description: 'Mathematical foundations of ML.' },
            { title: 'Deep Learning', author: 'Ian Goodfellow et al.', description: 'Definitive text on deep learning.' }
        ],
        'cybersecurity': [
            { title: 'Practical Malware Analysis', author: 'Sikorski & Honig', description: 'Practical guide to malware analysis.' },
            { title: 'Web Application Hacker\'s Handbook', author: 'Dafydd Stuttard', description: 'Web application security.' },
            { title: 'Security Engineering', author: 'Ross Anderson', description: 'Design of secure systems.' }
        ],
        'cloud computing': [
            { title: 'Cloud Computing: Concepts, Technology & Architecture', author: 'Erl et al.', description: 'Fundamentals of cloud computing.' },
            { title: 'AWS Certified Solutions Architect', author: 'Syed & Rahman', description: 'AWS certification preparation.' },
            { title: 'Kubernetes Up & Running', author: 'Brendan Burns et al.', description: 'Container orchestration with Kubernetes.' }
        ]
    };
    
    return booksByTopic[topic] || [
        { title: 'The Pragmatic Programmer', author: 'Andrew Hunt & David Thomas', description: 'Improve your programming skills.' },
        { title: 'Clean Architecture', author: 'Robert C. Martin', description: 'Software design principles.' },
        { title: 'Peopleware', author: 'Tom DeMarco & Tim Lister', description: 'Human aspects of software development.' }
    ];
}

// Document Upload Functionality
pdfInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    await uploadDocument(file, 'pdf');
});

wordInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    await uploadDocument(file, 'word');
});

// Load the sign language database on startup
loadSignLanguageList();

async function uploadDocument(file, type) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const base64Data = e.target.result;
        
        try {
            const endpoint = type === 'pdf' ? '/upload-pdf' : '/upload-word';
            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    [type === 'pdf' ? 'pdfData' : 'wordData']: base64Data,
                    fileName: file.name
                })
            });
            
            if (!response.ok) {
                console.error('HTTP error:', response.status, response.statusText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            console.log('Document upload response:', data);
            console.log('Response status:', response.status);
            
            if (data.success) {
                currentDocumentText = data.text;
                documentConversationHistory = [];
                
                documentFileName.textContent = data.fileName;
                documentPages.textContent = data.pages || 'N/A';
                documentChars.textContent = data.text.length.toLocaleString();
                documentPreviewText.textContent = data.text.substring(0, 500) + '...';
                
                documentInfo.style.display = 'block';
                
                // Hide upload zones
                document.querySelector('.upload-area').style.display = 'none';
                
                console.log('Document loaded successfully, text length:', data.text.length);
            } else if (data.error === 'SCANNED_PDF') {
                alert('⚠️ ' + data.message + '\n\nPlease copy and paste the document content directly into the chat so I can help you.');
            } else {
                console.error('Document upload error:', data);
                alert('Error al procesar el documento: ' + data.error);
            }
        } catch (error) {
            alert('Connection error: ' + error.message);
        }
    };
    
    reader.readAsDataURL(file);
}

// Clear document
clearDocument.addEventListener('click', () => {
    currentDocumentText = '';
    documentConversationHistory = [];
    documentInfo.style.display = 'none';
    document.querySelector('.upload-area').style.display = 'grid';
    pdfInput.value = '';
    wordInput.value = '';
});

// Ask question about document
askDocumentButton.addEventListener('click', async () => {
    const question = documentQuestionInput.value.trim();
    if (!question || !currentDocumentText) return;
    
    documentQuestionInput.value = '';
    
    // Add user question to document preview
    const questionDiv = document.createElement('div');
    questionDiv.className = 'document-question';
    questionDiv.innerHTML = `<strong>You:</strong> ${question}`;
    documentPreviewText.appendChild(questionDiv);
    
    // Show loading
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'document-loading';
    loadingDiv.innerHTML = '<div class="loading-spinner"></div> <span>Pensando...</span>';
    documentPreviewText.appendChild(loadingDiv);
    
    try {
        const response = await fetch(`${API_BASE}/chat-with-document`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: question,
                documentText: currentDocumentText,
                conversationHistory: documentConversationHistory
            })
        });
        
        const data = await response.json();
        
        // Remove loading
        loadingDiv.remove();
        
        if (data.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'document-error';
            errorDiv.innerHTML = `<strong>Error:</strong> ${data.error}`;
            documentPreviewText.appendChild(errorDiv);
        } else {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'document-answer';
            answerDiv.innerHTML = `<strong>IA:</strong> ${formatMessage(data.response)}`;
            renderMath(answerDiv);
            documentPreviewText.appendChild(answerDiv);
            
            documentConversationHistory.push({ role: 'user', content: question });
            documentConversationHistory.push({ role: 'assistant', content: data.response });
        }
        
        // Scroll to bottom
        documentPreviewText.scrollTop = documentPreviewText.scrollHeight;
    } catch (error) {
        loadingDiv.remove();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'document-error';
        errorDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
        documentPreviewText.appendChild(errorDiv);
    }
});

summaryDocumentButton.addEventListener('click', async () => {
    if (!currentDocumentText) return;

    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'document-loading';
    summaryDiv.innerHTML = '<div class="loading-spinner"></div> <span>Generando resumen...</span>';
    documentPreviewText.appendChild(summaryDiv);
    documentPreviewText.scrollTop = documentPreviewText.scrollHeight;

    try {
        const response = await fetch(`${API_BASE}/summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ documentText: currentDocumentText })
        });

        const data = await response.json();
        summaryDiv.remove();

        if (data.error) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'document-error';
            errorDiv.innerHTML = `<strong>Error:</strong> ${data.error}`;
            documentPreviewText.appendChild(errorDiv);
        } else {
            const summaryResultDiv = document.createElement('div');
            summaryResultDiv.className = 'document-answer';
            summaryResultDiv.innerHTML = `<strong>Resumen del documento:</strong> ${formatMessage(data.response)}`;
            renderMath(summaryResultDiv);
            documentPreviewText.appendChild(summaryResultDiv);
        }

        documentPreviewText.scrollTop = documentPreviewText.scrollHeight;
    } catch (error) {
        summaryDiv.remove();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'document-error';
        errorDiv.innerHTML = `<strong>Error:</strong> ${error.message}`;
        documentPreviewText.appendChild(errorDiv);
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateModeControls();

    // Check if LM Studio is running
    fetch(`${API_BASE}/health`)
        .then(response => response.json())
        .then(data => {
            console.log('Server health:', data);
        })
        .catch(error => {
            console.error('Server not reachable:', error);
            addMessageToChat('⚠️ Cannot connect to server. Make sure LM Studio is running on localhost:1234 and the Node.js server is started.', 'assistant');
        });
});
