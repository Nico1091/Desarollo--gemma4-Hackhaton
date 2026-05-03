# AI Engineering Tutor 🎓

An AI tutoring application powered by advanced language models for Systems Engineering students, built for educational innovation.

## 🌟 Vision

This application addresses the educational challenge in regions with limited access to quality educational resources. Using advanced AI through LM Studio, it provides a virtual professor specialized in Systems Engineering that:

- Explains complex concepts clearly and accessibly
- Searches for educational resources on the internet
- Recommends books and study materials
- Includes sign language support and accessibility resources
- Adapts to the student's level
- Works completely offline with local LM Studio

## 🏆 Hackathon Category

**Future of Education** - Reimagining the learning process by building multi-tool agents that adapt to the individual and empower the educator.

## 🚀 Features

### 1. Specialized AI Chat
- Expert system in Systems Engineering
- Clear explanations with practical examples
- Maintained conversation context
- Responses in English
- Generation of personalized study plans
- Creation of interactive quizzes for practice
- Summaries of concepts and technical documents

### 2. Educational Resource Search
- Real-time search for tutorials and documentation
- Integration with DuckDuckGo API
- Relevant and curated results

### 3. Book Recommendations
- Database of classic books by topic
- Personalized recommendations
- Includes authors and descriptions

### 5. Sign Language and Accessibility
- Database of common signs
- Explanations of basic terms and phrases
- Tips on how AI can analyze and explain accessible communication

### 6. Popular Topics
- Predefined frequently asked questions
- Quick access to key concepts
- Organized by knowledge areas

## 🛠️ Technical Architecture

### Backend (Node.js + Express)
```
server.js
├── /api/chat          - Connection with LM Studio (AI Model)
├── /api/search        - Web resource search
├── /api/books         - Book recommendations
└── /api/health        - Health check
```

### Frontend (HTML + CSS + JavaScript)
```
public/
├── index.html         - Main interface
├── styles.css         - Modern and responsive design
└── app.js            - Interaction logic
```

### Technologies Used
- **Advanced AI Model** (via LM Studio) - Main language model
- **Node.js** - Server runtime
- **Express** - Web framework
- **Axios** - HTTP client
- **DuckDuckGo API** - Web search
- **Vanilla JS** - Frontend without frameworks
- **CSS3** - Modern styles with gradients and animations

## 📦 Installation

### Prerequisites
1. **Node.js** (v14 or higher) - Download from https://nodejs.org/
2. **LM Studio** - Download from https://lmstudio.ai/
3. Git (to clone the repository) - Download from https://git-scm.com/

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/Nico1091/ai-engineering-tutor
cd Desarollo--gemma4-Hackhaton
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
The `.env` file is already included in the repository. Verify it contains:
```env
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=google/gemma-2-9b-it
PORT=3000
```
If you need to change the port, edit the `.env` file directly.

4. Install and configure LM Studio:
   - Download and install LM Studio from https://lmstudio.ai/
   - Open LM Studio
   - In the sidebar, click on the search icon (🔍)
   - Search for: `google/gemma-2-9b-it`
   - Click "Download" to download the model (approx. 2-4 GB)
   - Wait for the download to complete
   - Go to "Local Server" (server icon in the sidebar)
   - Select the model `google/gemma-2-9b-it` in the dropdown
   - Configure the port to 1234
   - Click "Start Server"
   - Verify the server is running at `http://localhost:1234`

5. Start the server:
```bash
npm start
```
You should see: `Server running on http://localhost:3000`

6. Open your browser at `http://localhost:3000`

### Common Troubleshooting

- **If port 3000 is occupied:** Change `PORT=3001` in the `.env` file
- **If LM Studio doesn't connect:** Verify that the LM Studio server is started and the port matches the one in `.env`
- **If the model is not found:** Search for `google/gemma-4-e4b` in LM Studio and download it
- **If npm install fails:** Try `npm install --force` or delete the `node_modules` folder and reinstall

## AI Model Usage

### Model Configuration
- **Model**: google/gemma-2-9b-it
- **Temperature**: 0.7 (balance between creativity and precision)
- **Max Tokens**: 2000 (detailed responses)
- **System Prompt**: Specialized in Systems Engineering

### Prompt Engineering
The system prompt is designed to:
- Focus exclusively on Systems Engineering topics
- Provide clear and practical explanations
- Include code examples when relevant
- Recommend resources and books
- Adapt to the student's level

## 🎨 Interface Design

### Design Principles
- **Dark mode** - Visual fatigue reduction
- **Modern gradients** - Contemporary aesthetics
- **Responsive** - Works on mobile and desktop
- **Accessible** - High contrast and clear typography
- **Intuitive** - Simple and direct navigation

### Sections
1. **AI Chat** - Main conversation with the tutor
2. **Search Resources** - Search for educational materials
3. **Recommended Books** - Curated library by topic
4. **Popular Topics** - Quick access to key concepts

## 🌍 Social Impact

### Problem Addressed
- Engineering students in regions with limited resources
- Lack of available specialized professors
- High cost of quality educational materials
- Language barriers (most resources are in English)

### Solution Provided
- Free access to specialized tutoring 24/7
- Resources in English
- Offline operation (with local LM Studio)
- Personalized adaptation to student's pace
- Accessible book recommendations

### Scalability Potential
- Can be deployed in schools and universities
- Easy to add multilingual support
- Integration with existing educational platforms
- Possibility of specialized models by area

## 📊 Hackathon Evaluation Criteria

### Impact and Vision (40 points)
✅ Addresses a real significant problem (access to quality education)
✅ Inspiring vision with potential for positive change
✅ Scalable and accessible solution

### Video Presentation and Narration (30 points)
✅ 3-minute or less demo video
✅ Clear story of problem and solution
✅ Functional demo in action

### Technical Depth and Execution (30 points)
✅ Innovative use of AI with specialized system prompt
✅ Real, functional, and well-designed technology
✅ Well-documented and structured code

## 🔧 Technical Challenges Overcome

1. **Connection with LM Studio**
   - Implementation of API compatible with chat format
   - Error handling and reconnection
   - Support for conversation history

2. **Web Search without API Key**
   - Use of free DuckDuckGo API
   - Filtering of educational results
   - Handling of asynchronous responses

3. **Responsive Interface**
   - Mobile-first design
   - Performance optimization
   - Smooth animations

4. **Model Specialization**
   - Carefully designed system prompt
   - Systems Engineering context
   - Balance between rigor and accessibility

## 📚 Educational Resources Included

### Knowledge Areas
- Software Engineering and Development
- Computer Architecture
- Databases and Design
- Operating Systems
- Networks and Communications
- Algorithms and Data Structures
- Project Management
- Systems Design
- Cloud Computing
- Cybersecurity
- Machine Learning and AI

### Recommended Books
- Introduction to Algorithms (Cormen et al.)
- Clean Code (Robert C. Martin)
- Design Patterns (GoF)
- Database System Concepts (Silberschatz)
- Computer Networking (Kurose & Ross)
- And many more...

## 🚀 Future Improvements

1. **Multilingualism** - Support for more languages
2. **Interactive Exercises** - Programming problems
3. **Progress Tracking** - Learning dashboard
4. **Complete Offline Mode** - Resource cache
5. **LMS Integration** - Moodle, Canvas, etc.
6. **Voice Interface** - Voice interaction
7. **Code Execution** - Code execution in sandbox
8. **Collaborative Features** - Group study

## 👥 Contributions

This project was developed for educational innovation and AI advancement.

## 📄 License

MIT License - Free for educational and non-commercial use.

## 🙏 Acknowledgments

- Google for the AI model
- LM Studio for the local execution platform
- The open source community

## 📞 Contact

For questions about the project, contact through the GitHub repository.

---

**Built with ❤️ to democratize Systems Engineering education**
