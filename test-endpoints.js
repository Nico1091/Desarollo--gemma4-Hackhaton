const assert = require('assert');
const fetch = global.fetch || require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

const tests = [
  {
    name: 'Study plan endpoint',
    path: '/study-plan',
    payload: { topic: 'Sistemas Operativos', durationWeeks: 3, level: 'intermedio' },
    validate: (data) => {
      assert(data.response, 'Respuesta vacía del plan de estudio');
      assert(typeof data.response === 'string', 'La respuesta debe ser texto');
    }
  },
  {
    name: 'Quiz endpoint',
    path: '/quiz',
    payload: { topic: 'Bases de Datos', questions: 3, level: 'intermedio' },
    validate: (data) => {
      assert(data.response, 'Respuesta vacía del quiz');
      assert(data.response.includes('A'), 'La respuesta debe contener opciones de pregunta');
    }
  },
  {
    name: 'Summary endpoint',
    path: '/summary',
    payload: { documentText: 'Los sistemas operativos gestionan procesos, memoria y dispositivos. Permiten ejecutar aplicaciones de forma segura y eficiente.' },
    validate: (data) => {
      assert(data.response, 'Respuesta vacía del resumen');
      assert(data.response.length < 3000, 'Resumen demasiado largo');
    }
  }
];

async function runTest(test) {
  process.stdout.write(`Running ${test.name}... `);
  const res = await fetch(`${API_BASE}${test.path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(test.payload)
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  const data = await res.json();
  test.validate(data);
  console.log('OK');
}

(async () => {
  try {
    for (const test of tests) {
      await runTest(test);
    }
    console.log('\nAll tests passed.');
  } catch (err) {
    console.error('\nTest failed:', err.message);
    process.exit(1);
  }
})();
