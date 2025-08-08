const API = {
  list: () => fetch('/api/todos').then(r => r.json()),
  add: (text) => fetch('/api/todos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }).then(r => r.json()),
  update: (id, patch) => fetch(`/api/todos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }).then(r => r.json()),
  remove: (id) => fetch(`/api/todos/${id}`, { method: 'DELETE' }).then(r => r.json()),
  clearCompleted: () => fetch('/api/todos/clear-completed', { method: 'POST' }).then(r => r.json()),
  toggleAll: (completed) => fetch('/api/todos/toggle-all', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed }) }).then(r => r.json()),
};

const state = {
  todos: [],
  filter: 'all', // all | active | completed
};

const els = {
  newInput: document.getElementById('newTodoInput'),
  addBtn: document.getElementById('addTodoBtn'),
  list: document.getElementById('todoList'),
  itemsLeft: document.getElementById('itemsLeft'),
  clearCompleted: document.getElementById('clearCompleted'),
  filters: Array.from(document.querySelectorAll('.filter')),
  toggleAll: document.getElementById('toggleAll'),
};

function render() {
  const filtered = state.todos.filter(t =>
    state.filter === 'all' ? true : state.filter === 'active' ? !t.completed : t.completed
  );

  els.list.innerHTML = '';
  for (const todo of filtered) {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.dataset.id = todo.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!todo.completed;
    checkbox.addEventListener('change', async () => {
      const updated = await API.update(todo.id, { completed: checkbox.checked });
      const idx = state.todos.findIndex(t => t.id === todo.id);
      if (idx !== -1) state.todos[idx] = updated;
      render();
    });

    const textWrap = document.createElement('div');
    textWrap.className = 'text';
    textWrap.textContent = todo.text;
    textWrap.title = 'Double-click to edit';
    textWrap.addEventListener('dblclick', () => startEdit(li, todo));

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => startEdit(li, todo));

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.className = 'delete';
    delBtn.addEventListener('click', async () => {
      await API.remove(todo.id);
      state.todos = state.todos.filter(t => t.id !== todo.id);
      render();
    });

    actions.append(editBtn, delBtn);
    li.append(checkbox, textWrap, actions);
    els.list.appendChild(li);
  }

  const remaining = state.todos.filter(t => !t.completed).length;
  els.itemsLeft.textContent = `${remaining} item${remaining !== 1 ? 's' : ''} left`;

  const allCompleted = state.todos.length > 0 && state.todos.every(t => t.completed);
  els.toggleAll.checked = allCompleted;
}

function startEdit(li, todo) {
  const existing = li.querySelector('.edit-input');
  if (existing) return;
  const textNode = li.querySelector('.text');
  const input = document.createElement('input');
  input.className = 'edit-input';
  input.value = todo.text;
  textNode.replaceWith(input);
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);

  const finish = async (commit) => {
    const newText = input.value.trim();
    if (commit && newText && newText !== todo.text) {
      const updated = await API.update(todo.id, { text: newText });
      const idx = state.todos.findIndex(t => t.id === todo.id);
      if (idx !== -1) state.todos[idx] = updated;
    }
    render();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    else if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

async function init() {
  state.todos = await API.list();
  render();
}

// Events
els.addBtn.addEventListener('click', async () => {
  const text = els.newInput.value.trim();
  if (!text) return;
  const todo = await API.add(text);
  state.todos.push(todo);
  els.newInput.value = '';
  render();
});

els.newInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.addBtn.click();
});

els.filters.forEach(btn => {
  btn.addEventListener('click', () => {
    els.filters.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    state.filter = btn.dataset.filter;
    render();
  });
});

els.clearCompleted.addEventListener('click', async () => {
  const res = await API.clearCompleted();
  if (res && typeof res.cleared === 'number') {
    state.todos = state.todos.filter(t => !t.completed);
    render();
  }
});

els.toggleAll.addEventListener('change', async () => {
  const completed = els.toggleAll.checked;
  const todos = await API.toggleAll(completed);
  state.todos = todos;
  render();
});

init();
