const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'todos.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function loadTodos() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    return [];
  } catch (e) {
    return [];
  }
}

function saveTodos(todos) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2), 'utf8');
}

function generateId() {
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  ).toUpperCase();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.get('/api/todos', (req, res) => {
  res.json(loadTodos());
});

app.post('/api/todos', (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }
  const todos = loadTodos();
  const todo = { id: generateId(), text: text.trim(), completed: false, createdAt: Date.now() };
  todos.push(todo);
  saveTodos(todos);
  res.status(201).json(todo);
});

app.patch('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body || {};
  const todos = loadTodos();
  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (typeof text === 'string') todos[idx].text = text.trim();
  if (typeof completed === 'boolean') todos[idx].completed = completed;
  saveTodos(todos);
  res.json(todos[idx]);
});

app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const todos = loadTodos();
  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = todos.splice(idx, 1)[0];
  saveTodos(todos);
  res.json(removed);
});

app.post('/api/todos/clear-completed', (req, res) => {
  const todos = loadTodos();
  const active = todos.filter(t => !t.completed);
  saveTodos(active);
  res.json({ cleared: todos.length - active.length });
});

app.post('/api/todos/toggle-all', (req, res) => {
  const { completed } = req.body || {};
  if (typeof completed !== 'boolean') return res.status(400).json({ error: 'completed boolean required' });
  const todos = loadTodos().map(t => ({ ...t, completed }));
  saveTodos(todos);
  res.json(todos);
});

app.listen(PORT, () => {
  console.log(`Todo app listening on http://localhost:${PORT}`);
});
