# Gemma 4 Engineering Tutor 🎓

Una aplicación de tutoría de IA impulsada por Gemma 4 para estudiantes de Ingeniería de Sistemas, construida para el **Gemma 4 Good Hackathon**.

## 🌟 Visión

Esta aplicación aborda el desafío educativo en regiones con acceso limitado a recursos educativos de calidad. Utilizando Gemma 4 a través de LM Studio, proporciona un profesor virtual especializado en Ingeniería de Sistemas que:

- Explica conceptos complejos de manera clara y accesible
- Busca recursos educativos en internet
- Recomienda libros y materiales de estudio
- Se adapta al nivel del estudiante
- Funciona completamente offline con LM Studio local

## 🏆 Categoría del Hackathon

**Futuro de la Educación** - Reimaginando el proceso de aprendizaje construyendo agentes multiherramienta que se adapten al individuo y empoderen al educador.

## 🚀 Características

### 1. Chat con IA Especializada
- Sistema experto en Ingeniería de Sistemas
- Explicaciones claras con ejemplos prácticos
- Contexto de conversación mantenido
- Respuestas en español

### 2. Búsqueda de Recursos Educativos
- Búsqueda en tiempo real de tutoriales y documentación
- Integración con DuckDuckGo API
- Resultados relevantes y curados

### 3. Recomendación de Libros
- Base de datos de libros clásicos por tema
- Recomendaciones personalizadas
- Incluye autores y descripciones

### 4. Temas Populares
- Preguntas frecuentes predefinidas
- Acceso rápido a conceptos clave
- Organizado por áreas de conocimiento

## 🛠️ Arquitectura Técnica

### Backend (Node.js + Express)
```
server.js
├── /api/chat          - Conexión con LM Studio (Gemma 4)
├── /api/search        - Búsqueda web de recursos
├── /api/books         - Recomendación de libros
└── /api/health        - Health check
```

### Frontend (HTML + CSS + JavaScript)
```
public/
├── index.html         - Interfaz principal
├── styles.css         - Diseño moderno y responsivo
└── app.js            - Lógica de interacción
```

### Tecnologías Utilizadas
- **Gemma 4** (via LM Studio) - Modelo de lenguaje principal
- **Node.js** - Runtime del servidor
- **Express** - Framework web
- **Axios** - Cliente HTTP
- **DuckDuckGo API** - Búsqueda web
- **Vanilla JS** - Frontend sin frameworks
- **CSS3** - Estilos modernos con gradientes y animaciones

## 📦 Instalación

### Prerrequisitos
1. **Node.js** (v14 o superior)
2. **LM Studio** con Gemma 4 modelo cargado
3. Git (para clonar el repositorio)

### Pasos de Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/gemma4-engineering-tutor.git
cd gemma4-engineering-tutor
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
# Editar .env si es necesario
LM_STUDIO_URL=http://localhost:1234
LM_STUDIO_MODEL=google/gemma-4-e4b
PORT=3000
```

4. Iniciar LM Studio:
   - Abrir LM Studio
   - Cargar el modelo `google/gemma-4-e4b`
   - Asegurarse de que el servidor esté corriendo en `http://localhost:1234`

5. Iniciar el servidor:
```bash
npm start
```

6. Abrir el navegador en `http://localhost:3000`

## 💡 Uso de Gemma 4

### Configuración del Modelo
- **Modelo**: google/gemma-4-e4b
- **Temperatura**: 0.7 (balance entre creatividad y precisión)
- **Max Tokens**: 2000 (respuestas detalladas)
- **System Prompt**: Especializado en Ingeniería de Sistemas

### Prompt Engineering
El system prompt está diseñado para:
- Enfocarse exclusivamente en temas de Ingeniería de Sistemas
- Proporcionar explicaciones claras y prácticas
- Incluir ejemplos de código cuando sea relevante
- Recomendar recursos y libros
- Adaptarse al nivel del estudiante

## 🎨 Diseño de la Interfaz

### Principios de Diseño
- **Modo oscuro** - Reducción de fatiga visual
- **Gradientes modernos** - Estética contemporánea
- **Responsive** - Funciona en móviles y desktop
- **Accesible** - Alto contraste y tipografía clara
- **Intuitivo** - Navegación simple y directa

### Secciones
1. **Chat con IA** - Conversación principal con el tutor
2. **Buscar Recursos** - Búsqueda de materiales educativos
3. **Libros Recomendados** - Biblioteca curada por tema
4. **Temas Populares** - Acceso rápido a conceptos clave

## 🌍 Impacto Social

### Problema Abordado
- Estudiantes de ingeniería en regiones con recursos limitados
- Falta de profesores especializados disponibles
- Costo elevado de materiales educativos de calidad
- Barreras lingüísticas (la mayoría de recursos están en inglés)

### Solución Proporcionada
- Acceso gratuito a tutoría especializada 24/7
- Recursos en español
- Funcionamiento offline (con LM Studio local)
- Adaptación personalizada al ritmo del estudiante
- Recomendaciones de libros accesibles

### Potencial de Escalabilidad
- Puede desplegarse en escuelas y universidades
- Soporte multilingüe fácil de agregar
- Integración con plataformas educativas existentes
- Posibilidad de modelos especializados por área

## 📊 Criterios de Evaluación del Hackathon

### Impacto y Visión (40 puntos)
✅ Aborda un problema real significativo (acceso a educación de calidad)
✅ Visión inspiradora con potencial de cambio positivo
✅ Solución escalable y accesible

### Presentación de Video y Narración (30 puntos)
✅ Video demostrativo de 3 minutos o menos
✅ Historia clara del problema y solución
✅ Demo funcional en acción

### Profundidad Técnica y Ejecución (30 puntos)
✅ Uso innovador de Gemma 4 con system prompt especializado
✅ Tecnología real, funcional y bien diseñada
✅ Código bien documentado y estructurado

## 🔧 Desafíos Técnicos Superados

1. **Conexión con LM Studio**
   - Implementación de API compatible con formato de chat
   - Manejo de errores y reconexión
   - Soporte para historial de conversación

2. **Búsqueda Web sin API Key**
   - Uso de DuckDuckGo API gratuita
   - Filtrado de resultados educativos
   - Manejo de respuestas asíncronas

3. **Interfaz Responsiva**
   - Diseño mobile-first
   - Optimización de rendimiento
   - Animaciones suaves

4. **Especialización del Modelo**
   - System prompt cuidadosamente diseñado
   - Contexto de Ingeniería de Sistemas
   - Balance entre rigor y accesibilidad

## 📚 Recursos Educativos Incluidos

### Áreas de Conocimiento
- Software Engineering y Desarrollo
- Arquitectura de Computadores
- Bases de Datos y Diseño
- Sistemas Operativos
- Redes y Comunicaciones
- Algoritmos y Estructuras de Datos
- Gestión de Proyectos
- Diseño de Sistemas
- Cloud Computing
- Ciberseguridad
- Machine Learning e IA

### Libros Recomendados
- Introduction to Algorithms (Cormen et al.)
- Clean Code (Robert C. Martin)
- Design Patterns (GoF)
- Database System Concepts (Silberschatz)
- Computer Networking (Kurose & Ross)
- Y muchos más...

## 🚀 Futuras Mejoras

1. **Multilingüismo** - Soporte para más idiomas
2. **Ejercicios Interactivos** - Problemas de programación
3. **Seguimiento de Progreso** - Dashboard de aprendizaje
4. **Modo Offline Completo** - Cache de recursos
5. **Integración con LMS** - Moodle, Canvas, etc.
6. **Voice Interface** - Interacción por voz
7. **Code Execution** - Ejecución de código en sandbox
8. **Collaborative Features** - Estudio en grupo

## 👥 Contribuciones

Este proyecto fue desarrollado para el Gemma 4 Good Hackathon 2026.

## 📄 Licencia

MIT License - Libre para uso educativo y no comercial.

## 🙏 Agradecimientos

- Google por el modelo Gemma 4
- LM Studio por la plataforma de ejecución local
- La comunidad de código abierto

## 📞 Contacto

Para preguntas sobre el proyecto, contactar a través del repositorio de GitHub.

---

**Construido con ❤️ para democratizar la educación en Ingeniería de Sistemas**
