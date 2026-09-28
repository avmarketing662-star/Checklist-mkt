/* Marketing AV — agenda local, sem servidor ou bibliotecas externas. */
(() => {
  'use strict';

  const STORAGE_KEY = 'marketingAgenda.local.v1';
  const LEGACY_KEYS = ['minhaAgenda.v3', 'marketingAgenda.v1'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const todayISO = () => toISO(new Date());
  const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = value => {
    if (!value) return null;
    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  };
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dateLabel = value => { const d = parseISO(value); return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Sem data'; };
  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const categoryNames = { personal: 'Atrair', work: 'Conectar', study: 'Vender', attract: 'Atrair', connect: 'Conectar', sell: 'Vender', atrair: 'Atrair', conectar: 'Conectar', vender: 'Vender' };
  const statusNames = { todo: 'A fazer', doing: 'Em andamento', done: 'Concluída' };

  function safeParse(raw) { try { return JSON.parse(raw); } catch { return null; } }
  function getSavedValue(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function normalizeTask(t = {}) {
    const list = Array.isArray(t.checklist) ? t.checklist : Array.isArray(t.subtasks) ? t.subtasks : [];
    return {
      id: String(t.id || uid()), title: String(t.title || t.name || 'Tarefa sem título'),
      description: String(t.description || ''), category: normalizeCategory(t.category),
      priority: ['high', 'normal', 'low'].includes(t.priority) ? t.priority : 'normal',
      status: ['todo', 'doing', 'done'].includes(t.status) ? t.status : 'todo',
      date: String(t.date || t.dueDate || t.start || '').slice(0, 10), time: String(t.time || '').slice(0, 5),
      checklist: list.map(x => typeof x === 'string' ? { id: uid(), text: x, done: false } : ({ id: String(x.id || uid()), text: String(x.text || x.title || ''), done: Boolean(x.done || x.completed) })).filter(x => x.text),
      createdAt: t.createdAt || new Date().toISOString(), updatedAt: t.updatedAt || new Date().toISOString()
    };
  }
  function normalizeCategory(value) {
    const v = String(value || '').toLowerCase();
    if (['work', 'conectar', 'connect', 'moderado'].includes(v)) return 'work';
    if (['study', 'vender', 'sell', 'leve'].includes(v)) return 'study';
    return 'personal';
  }
  function normalizeEvent(e = {}) {
    const list = Array.isArray(e.checklist) ? e.checklist : Array.isArray(e.items) ? e.items : [];
    return {
      id: String(e.id || uid()), title: String(e.title || e.name || 'Evento sem título'),
      date: String(e.date || e.start || '').slice(0, 10), start: String(e.startTime || e.start || '').slice(11, 16) || String(e.startTime || '').slice(0, 5),
      end: String(e.endTime || e.end || '').slice(11, 16) || String(e.endTime || '').slice(0, 5),
      location: String(e.location || ''), description: String(e.description || ''), script: String(e.script || e.roteiro || ''),
      notes: String(e.notes || ''), status: ['planned', 'progress', 'completed'].includes(e.status) ? e.status : 'planned',
      checklist: list.map(x => typeof x === 'string' ? { id: uid(), text: x, done: false } : ({ id: String(x.id || uid()), text: String(x.text || x.title || ''), done: Boolean(x.done || x.completed) })).filter(x => x.text),
      responsibles: Array.isArray(e.responsibles) ? e.responsibles.map(String) : [], createdAt: e.createdAt || new Date().toISOString()
    };
  }
  function initialState() {
    let raw = safeParse(getSavedValue(STORAGE_KEY));
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        const old = safeParse(getSavedValue(key));
        if (old) { raw = old; break; }
      }
    }
    const data = raw?.data || raw?.state?.data || raw || {};
    const cal = raw?.calendar || {};
    return {
      tasks: (Array.isArray(data.tasks) ? data.tasks : []).map(normalizeTask),
      events: (Array.isArray(data.events) ? data.events : []).map(normalizeEvent),
      nodes: Array.isArray(data.nodes) ? data.nodes.map((n, i) => ({ id: String(n.id || uid()), title: String(n.title || 'Ideia'), description: String(n.description || ''), x: Number(n.x ?? 70 + (i % 3) * 245), y: Number(n.y ?? 70 + Math.floor(i / 3) * 150) })) : [],
      connections: Array.isArray(data.connections) ? data.connections : [],
      routineSteps: Array.isArray(data.routineSteps) ? data.routineSteps.map(s => ({ id: String(s.id || uid()), title: String(s.title || 'Etapa'), description: String(s.description || ''), responsible: String(s.responsible || ''), duration: String(s.duration || '') })) : [],
      view: cal.view || raw?.view || 'week', cursor: parseISO(cal.date || raw?.date) || new Date(),
      selectedEventId: null, eventFilter: 'all', eventSort: 'date', taskFilter: 'all', dashboardPeriod: 'all', selectedPage: 'calendar'
    };
  }
  const state = initialState();
  let taskDraft = [], eventChecklistDraft = [], responsibleDraft = [], editNodeId = null, editRoutineId = null, connectionStart = null, draggedTaskId = null;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: { tasks: state.tasks, events: state.events, nodes: state.nodes, connections: state.connections, routineSteps: state.routineSteps }, calendar: { view: state.view, date: toISO(state.cursor) } }));
    } catch (error) { toast('Não foi possível salvar. O armazenamento do navegador pode estar cheio.'); console.error(error); }
  }
  function toast(message) {
    const el = $('#toast'); if (!el) return;
    el.textContent = message; el.classList.add('show', 'visible'); clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show', 'visible'), 2800);
  }
  function showModal(el) { if (!el) return; el.classList.add('active'); el.setAttribute('aria-hidden', 'false'); document.body.classList.add('modal-open'); }
  function hideModal(el) { if (!el) return; el.classList.remove('active'); el.setAttribute('aria-hidden', 'true'); if (!$('.modal-overlay.active')) document.body.classList.remove('modal-open'); }
  function syncCategories() {
    const select = $('#categoryInput'); if (!select) return;
    select.innerHTML = '<option value="personal">Atrair</option><option value="work">Conectar</option><option value="study">Vender</option>';
  }
  function insertScriptField() {
    const form = $('#eventOrganizerForm'); if (!form || $('#organizedEventScript')) return;
    const description = $('#organizedEventDescription')?.closest('label');
    const label = document.createElement('label'); label.innerHTML = 'Roteiro <textarea id="organizedEventScript" rows="6" placeholder="Escreva o roteiro para a divulgação do evento..."></textarea>';
    (description?.parentElement || $('.modal-body', form)).insertBefore(label, $('#organizedEventNotes')?.closest('label') || null);
  }

  function renderAll() { renderCalendar(); renderDrawer(); renderTasks(); renderEvents(); renderFlowchart(); renderRoutine(); renderDashboard(); updatePrimaryAction(); }
  function updatePrimaryAction() {
    const button = $('#primaryAction'); if (!button) return;
    const page = state.selectedPage;
    button.textContent = page === 'events' ? '＋ Novo evento' : page === 'tasks' ? '＋ Nova tarefa' : page === 'flowchart' ? '＋ Novo bloco' : '＋ Nova tarefa';
    button.dataset.action = page === 'events' ? 'event' : page === 'flowchart' ? 'node' : 'task';
  }
  function setPage(name) {
    state.selectedPage = name;
    $$('.page').forEach(p => p.classList.toggle('active', p.id === `${name}Page`));
    $$('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === name));
    const titles = { calendar: ['PLANEJAMENTO', 'Calendário'], flowchart: ['ORGANIZAÇÃO', 'Fluxograma'], events: ['DATAS IMPORTANTES', 'Eventos'], tasks: ['EXECUÇÃO', 'Minhas tarefas'], dashboard: ['ACOMPANHAMENTO', 'Dashboard'], settings: ['PREFERÊNCIAS', 'Configurações'] };
    const [eyebrow, title] = titles[name] || titles.calendar;
    if ($('#pageEyebrow')) $('#pageEyebrow').textContent = eyebrow;
    if ($('#pageTitle')) $('#pageTitle').textContent = title;
    document.body.classList.remove('sidebar-open'); renderAll();
  }

  function mondayOf(date) { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; }
  function moveCursor(amount) {
    const d = new Date(state.cursor);
    if (state.view === 'month') d.setMonth(d.getMonth() + amount, 1);
    else d.setDate(d.getDate() + amount * (state.view === 'week' ? 7 : 1));
    state.cursor = d; save(); renderCalendar();
  }
  function calendarTitle() {
    const fmtMonth = d => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (state.view === 'month') return fmtMonth(state.cursor);
    if (state.view === 'day') return state.cursor.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const a = mondayOf(state.cursor), b = new Date(a); b.setDate(a.getDate() + 6);
    return `${a.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  function itemsForDate(iso) {
    const tasks = state.tasks.filter(t => t.date === iso).map(t => ({ ...t, kind: 'task' }));
    const events = state.events.filter(e => e.date === iso).map(e => ({ ...e, kind: 'event' }));
    return [...events, ...tasks];
  }
  function calendarCell(date, outside = false) {
    const iso = toISO(date), items = itemsForDate(iso), isToday = iso === todayISO();
    const contents = items.slice(0, 4).map(item => {
      const isTask = item.kind === 'task';
      const label = `${isTask ? '☑ ' : '✦ '}${item.time ? `${item.time} ` : ''}${item.title}`;
      return `<button type="button" draggable="${isTask}" class="calendar-chip ${isTask ? 'task' : 'event'} ${item.priority === 'high' ? 'high' : ''}" data-${isTask ? 'open-task' : 'open-event'}="${escapeHTML(item.id)}" title="${escapeHTML(label)}">${escapeHTML(label)}</button>`;
    }).join('');
    return `<td class="${outside ? 'outside-month' : ''} ${isToday ? 'today' : ''}" data-date="${iso}"><div class="calendar-day-head"><span class="day-number">${date.getDate()}</span>${isToday ? '<span class="today-dot">Hoje</span>' : ''}</div><div class="calendar-day-items">${contents}${items.length > 4 ? `<button class="more-items" data-date-more="${iso}">+${items.length - 4} mais</button>` : ''}</div></td>`;
  }
  function renderCalendar() {
    const target = $('#calendar'); if (!target) return;
    if ($('#dateTitle')) $('#dateTitle').textContent = calendarTitle();
    $$('.view-buttons [data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === state.view));
    let dates = [];
    if (state.view === 'day') dates = [new Date(state.cursor)];
    else if (state.view === 'week') { const start = mondayOf(state.cursor); dates = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; }); }
    else {
      const first = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1), start = mondayOf(first);
      dates = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
    }
    const cols = state.view === 'day' ? 1 : 7;
    const headings = dates.slice(0, cols).map(d => `<th>${state.view === 'month' ? weekdays[(d.getDay() + 6) % 7] : `${weekdays[(d.getDay() + 6) % 7]} <span>${d.getDate()}</span>`}</th>`).join('');
    const rows = [];
    for (let i = 0; i < dates.length; i += cols) rows.push(`<tr>${dates.slice(i, i + cols).map(d => calendarCell(d, state.view === 'month' && d.getMonth() !== state.cursor.getMonth())).join('')}</tr>`);
    target.innerHTML = `<table class="calendar-grid ${state.view}-view"><thead><tr>${headings}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }
  function taskCard(task, compact = false) {
    const done = task.checklist.filter(x => x.done).length, total = task.checklist.length;
    return `<article class="task-card ${compact ? 'compact' : ''}" draggable="true" data-task-card="${escapeHTML(task.id)}"><div class="task-card-top"><button class="task-title-button" data-open-task="${escapeHTML(task.id)}">${escapeHTML(task.title)}</button><button class="task-edit-button" aria-label="Editar tarefa" data-edit-task="${escapeHTML(task.id)}">⋯</button></div>${task.description ? `<p class="task-description">${escapeHTML(task.description)}</p>` : ''}<div class="task-meta"><span class="category-badge ${task.category}">${categoryNames[task.category] || 'Atrair'}</span>${task.priority === 'high' ? '<span class="priority-badge">Importante</span>' : ''}${task.date ? `<span class="task-date">${dateLabel(task.date)}</span>` : ''}</div>${total ? `<div class="task-progress"><span>${done}/${total} itens</span><div class="progress-track"><div class="progress-fill" style="width:${Math.round(done / total * 100)}%"></div></div></div><div class="task-checklist">${task.checklist.map(item => `<label class="mini-task"><input type="checkbox" data-task-check="${escapeHTML(task.id)}" data-check-id="${escapeHTML(item.id)}" ${item.done ? 'checked' : ''}><span class="${item.done ? 'checked' : ''}">${escapeHTML(item.text)}</span></label>`).join('')}</div>` : '<div class="task-no-checklist">Sem itens no checklist</div>'}<div class="task-card-actions"><button class="text-button" data-edit-task="${escapeHTML(task.id)}">Editar</button><button class="text-button delete-text" data-delete-task="${escapeHTML(task.id)}">Excluir</button></div></article>`;
  }
  function renderDrawer() {
    const target = $('#calendarTaskList'); if (!target) return;
    const pending = state.tasks.filter(t => t.status !== 'done').sort((a, b) => (a.status === 'doing' ? -1 : 0) - (b.status === 'doing' ? -1 : 0) || (a.date || '9999').localeCompare(b.date || '9999'));
    target.innerHTML = pending.length ? pending.map(t => `<div class="drawer-task" draggable="true" data-task-card="${escapeHTML(t.id)}"><button class="drawer-task-title" data-open-task="${escapeHTML(t.id)}">${escapeHTML(t.title)}</button><span class="category-badge ${t.category}">${categoryNames[t.category]}</span>${t.date ? `<small>${dateLabel(t.date)}</small>` : '<small>Arraste para uma data</small>'}</div>`).join('') : '<div class="empty drawer-empty">Nenhuma tarefa pendente. Crie uma tarefa na aba “Minhas tarefas”.</div>';
  }
  function renderTasks() {
    const board = $('#kanban'); if (!board) return;
    const filtered = state.taskFilter === 'high' ? state.tasks.filter(t => t.priority === 'high') : state.tasks;
    const columns = [['todo', 'A fazer'], ['doing', 'Em andamento'], ['done', 'Concluídas']];
    board.innerHTML = columns.map(([status, label]) => {
      const tasks = filtered.filter(t => t.status === status);
      return `<section class="kanban-column" data-task-status="${status}"><div class="kanban-column-head"><h3>${label}</h3><span class="count-badge">${tasks.length}</span><button class="add-column-task" data-new-task-status="${status}" title="Adicionar tarefa">＋</button></div><div class="kanban-column-body">${tasks.length ? tasks.map(t => taskCard(t)).join('') : `<div class="kanban-empty">${status === 'done' ? 'As tarefas concluídas aparecerão aqui.' : 'Arraste uma tarefa para cá ou crie uma nova.'}</div>`}</div></section>`;
    }).join('');
  }

  function openTask(id = null, defaults = {}) {
    syncCategories(); taskDraft = [];
    const task = id ? state.tasks.find(t => t.id === id) : null;
    if (task) taskDraft = task.checklist.map(x => ({ ...x }));
    $('#itemId').value = task?.id || ''; $('#itemType').value = 'task';
    $('#modalEyebrow').textContent = task ? 'EDITAR TAREFA' : 'NOVA TAREFA';
    $('#modalTitle').textContent = task ? 'Editar tarefa' : 'Criar tarefa';
    $('#titleInput').value = task?.title || ''; $('#descriptionInput').value = task?.description || '';
    $('#categoryInput').value = task?.category || 'personal'; $('#priorityInput').value = task?.priority || 'normal';
    $('#statusInput').value = task?.status || defaults.status || 'todo';
    $('#dateInput').value = task?.date || defaults.date || ''; $('#timeInput').value = task?.time || '';
    $('#eventFields').classList.remove('hidden'); $('#taskFields').classList.remove('hidden');
    const statusLabel = $('#statusInput')?.closest('label'); if (statusLabel) statusLabel.classList.remove('hidden');
    $('#deleteButton').classList.toggle('hidden', !task);
    $('#deleteButton').textContent = 'Excluir tarefa';
    renderTaskDraft(); showModal($('#modalOverlay')); setTimeout(() => $('#titleInput')?.focus(), 50);
  }
  function renderTaskDraft() {
    const list = $('#subtaskDraftList'); if (!list) return;
    list.innerHTML = taskDraft.length ? taskDraft.map((x, i) => `<div class="draft-row"><span>${escapeHTML(x.text)}</span><button type="button" aria-label="Remover item" data-remove-task-draft="${i}">×</button></div>`).join('') : '<small class="muted-help">Adicione itens que fazem parte desta tarefa.</small>';
  }
  function openEvent(id = null) {
    const e = id ? state.events.find(x => x.id === id) : null;
    if (!$('#eventOrganizerModal')) { toast('O formulário de eventos não foi encontrado no HTML.'); return; }
    insertScriptField(); eventChecklistDraft = e ? e.checklist.map(x => ({ ...x })) : []; responsibleDraft = e ? [...e.responsibles] : [];
    $('#organizedEventId').value = e?.id || ''; $('#eventOrganizerTitle').textContent = e ? 'Editar evento' : 'Novo evento';
    $('#organizedEventName').value = e?.title || ''; $('#organizedEventDate').value = e?.date || '';
    $('#organizedEventStatus').value = e?.status || 'planned'; $('#organizedEventStart').value = e?.start || ''; $('#organizedEventEnd').value = e?.end || '';
    $('#organizedEventLocation').value = e?.location || ''; $('#organizedEventDescription').value = e?.description || '';
    $('#organizedEventScript').value = e?.script || ''; $('#organizedEventNotes').value = e?.notes || '';
    $('#deleteOrganizedEvent').classList.toggle('hidden', !e); renderEventDraft(); renderResponsibles(); showModal($('#eventOrganizerModal'));
  }
  function renderEventDraft() {
    const box = $('#eventChecklistDraft'); if (!box) return;
    box.innerHTML = eventChecklistDraft.length ? eventChecklistDraft.map((x, i) => `<div class="draft-row"><span>${escapeHTML(x.text)}</span><button type="button" aria-label="Remover item" data-remove-event-draft="${i}">×</button></div>`).join('') : '<small class="muted-help">Ainda não há itens no checklist.</small>';
  }
  function renderResponsibles() {
    const box = $('#eventResponsiblesDraft'); if (!box) return;
    box.innerHTML = responsibleDraft.length ? responsibleDraft.map((x, i) => `<span class="responsible-pill">${escapeHTML(x)} <button type="button" data-remove-responsible="${i}" aria-label="Remover responsável">×</button></span>`).join('') : '<small class="muted-help">Opcional: inclua pessoas ou setores envolvidos.</small>';
  }
  function renderEvents() {
    const list = $('#eventsList'); if (!list) return;
    let events = [...state.events];
    if (state.eventFilter !== 'all') events = events.filter(e => e.status === state.eventFilter);
    if (state.eventSort === 'name') events.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    else events.sort((a, b) => (a.date || '').localeCompare(b.date || '') * (state.eventSort === 'date-desc' ? -1 : 1));
    const counts = { all: state.events.length, planned: state.events.filter(e => e.status === 'planned').length, progress: state.events.filter(e => e.status === 'progress').length, completed: state.events.filter(e => e.status === 'completed').length };
    const summary = $('#eventSummary');
    if (summary) summary.innerHTML = [['Total', counts.all], ['Planejados', counts.planned], ['Em andamento', counts.progress], ['Concluídos', counts.completed]].map(([label, n]) => `<div class="event-summary-card"><span>${label}</span><strong>${n}</strong></div>`).join('');
    list.innerHTML = events.length ? events.map(e => `<button type="button" class="event-list-card ${state.selectedEventId === e.id ? 'selected' : ''}" data-select-event="${escapeHTML(e.id)}"><span class="event-date-block"><strong>${parseISO(e.date)?.getDate() || '—'}</strong><small>${parseISO(e.date)?.toLocaleDateString('pt-BR', { month: 'short' }) || 'Sem data'}</small></span><span class="event-list-main"><strong>${escapeHTML(e.title)}</strong><small>${escapeHTML(e.location || 'Local não definido')}${e.start ? ` · ${escapeHTML(e.start)}` : ''}</small></span><span class="event-status ${e.status}">${e.status === 'completed' ? 'Concluído' : e.status === 'progress' ? 'Em andamento' : 'Planejado'}</span></button>`).join('') : '<div class="empty"><strong>Nenhum evento cadastrado</strong><p>Registre uma data especial, campanha ou ação da loja.</p></div>';
    renderEventDetails();
  }
  function renderEventDetails() {
    const panel = $('#eventDetails'); if (!panel) return;
    const e = state.events.find(x => x.id === state.selectedEventId);
    if (!e) { panel.innerHTML = '<div class="empty"><div style="font-size:32px">🎇</div><strong>Selecione um evento</strong><p>Aqui você acompanha checklist, roteiro e informações da data.</p></div>'; return; }
    panel.innerHTML = `<div class="event-detail-head"><div><span class="eyebrow">EVENTO</span><h3>${escapeHTML(e.title)}</h3></div><div class="event-detail-actions"><button class="btn" data-edit-event="${escapeHTML(e.id)}">Editar</button><button class="btn" data-print-event="${escapeHTML(e.id)}">Imprimir roteiro</button><button class="btn btn-danger" data-delete-event="${escapeHTML(e.id)}">Excluir</button></div></div><div class="event-facts"><div><small>Data</small><strong>${dateLabel(e.date)}</strong></div><div><small>Horário</small><strong>${escapeHTML([e.start, e.end].filter(Boolean).join(' – ') || 'Dia todo')}</strong></div><div><small>Local</small><strong>${escapeHTML(e.location || 'Não definido')}</strong></div><div><small>Status</small><strong>${e.status === 'completed' ? 'Concluído' : e.status === 'progress' ? 'Em andamento' : 'Planejado'}</strong></div></div>${e.description ? `<section class="event-detail-section"><h4>Descrição</h4><p>${escapeHTML(e.description)}</p></section>` : ''}<section class="event-detail-section"><h4>Checklist de preparação <span>${e.checklist.filter(x => x.done).length}/${e.checklist.length}</span></h4>${e.checklist.length ? `<div class="event-detail-checklist">${e.checklist.map(x => `<label class="mini-task"><input type="checkbox" data-event-check="${escapeHTML(e.id)}" data-check-id="${escapeHTML(x.id)}" ${x.done ? 'checked' : ''}><span class="${x.done ? 'checked' : ''}">${escapeHTML(x.text)}</span></label>`).join('')}</div>` : '<p class="muted-help">Nenhum item no checklist.</p>'}</section>${e.script ? `<section class="event-script"><h4>Roteiro</h4><pre>${escapeHTML(e.script)}</pre><button class="text-button" data-print-event="${escapeHTML(e.id)}">Imprimir roteiro</button></section>` : '<section class="event-script empty-script"><h4>Roteiro</h4><p>Adicione um roteiro ao editar este evento.</p></section>'}${e.responsibles.length ? `<section class="event-detail-section"><h4>Responsáveis</h4><p>${e.responsibles.map(escapeHTML).join(' · ')}</p></section>` : ''}${e.notes ? `<section class="event-detail-section"><h4>Observações</h4><p>${escapeHTML(e.notes)}</p></section>` : ''}`;
  }

  function renderFlowchart() {
    const canvas = $('#mindmapCanvas'); if (!canvas) return;
    canvas.innerHTML = state.nodes.map(n => `<article class="mindmap-node" data-node-id="${escapeHTML(n.id)}" style="left:${n.x}px;top:${n.y}px"><button class="node-delete" type="button" data-delete-node="${escapeHTML(n.id)}" aria-label="Excluir bloco">×</button><strong>${escapeHTML(n.title)}</strong>${n.description ? `<p>${escapeHTML(n.description)}</p>` : ''}</article>`).join('');
    drawConnections();
  }
  function drawConnections() {
    const board = $('#mindmapBoard'), svg = $('#mindmapConnections'); if (!board || !svg) return;
    const rect = board.getBoundingClientRect(); svg.setAttribute('viewBox', `0 0 ${Math.max(rect.width, 1)} ${Math.max(rect.height, 1)}`); svg.innerHTML = '';
    for (const c of state.connections) {
      const a = $(`[data-node-id="${CSS.escape(c.from)}"]`, board), b = $(`[data-node-id="${CSS.escape(c.to)}"]`, board); if (!a || !b) continue;
      const x1 = a.offsetLeft + a.offsetWidth / 2, y1 = a.offsetTop + a.offsetHeight / 2, x2 = b.offsetLeft + b.offsetWidth / 2, y2 = b.offsetTop + b.offsetHeight / 2;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); line.setAttribute('x1', x1); line.setAttribute('y1', y1); line.setAttribute('x2', x2); line.setAttribute('y2', y2); svg.appendChild(line);
    }
  }
  function renderRoutine() {
    const flow = $('#routineFlow'); if (!flow) return;
    flow.innerHTML = state.routineSteps.map((s, i) => `<article class="routine-step" data-routine-id="${escapeHTML(s.id)}"><span class="routine-number">${i + 1}</span><div class="routine-step-content"><strong>${escapeHTML(s.title)}</strong>${s.description ? `<p>${escapeHTML(s.description)}</p>` : ''}<small>${[s.responsible, s.duration].filter(Boolean).map(escapeHTML).join(' · ')}</small></div><button class="text-button" data-edit-routine="${escapeHTML(s.id)}">Editar</button><button class="text-button delete-text" data-delete-routine="${escapeHTML(s.id)}">Excluir</button></article>`).join('');
    $('#routineEmpty')?.classList.toggle('hidden', state.routineSteps.length > 0);
  }
  function renderDashboard() {
    const stats = $('#stats'); if (!stats) return;
    const now = new Date(), startWeek = mondayOf(now), startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const within = date => { const d = parseISO(date); if (!d || state.dashboardPeriod === 'all') return true; if (state.dashboardPeriod === 'week') return d >= startWeek && d < new Date(startWeek.getFullYear(), startWeek.getMonth(), startWeek.getDate() + 7); return d >= startMonth && d < new Date(now.getFullYear(), now.getMonth() + 1, 1); };
    const tasks = state.tasks.filter(t => within(t.date)); const total = tasks.length, done = tasks.filter(t => t.status === 'done').length, pending = total - done, percent = total ? Math.round(done / total * 100) : 0;
    stats.innerHTML = [['Tarefas', total], ['Concluídas', done], ['Em andamento', tasks.filter(t => t.status === 'doing').length], ['Eventos cadastrados', state.events.length]].map(([label, n]) => `<article class="stat-card"><span>${label}</span><strong>${n}</strong></article>`).join('');
    const donut = $('#statusDonut'); if (donut) donut.style.background = `conic-gradient(var(--primary) ${percent * 3.6}deg, #eceef4 0deg)`;
    if ($('#donutPercent')) $('#donutPercent').textContent = `${percent}%`;
    if ($('#donutLegend')) $('#donutLegend').innerHTML = `<div><i class="legend-dot done"></i>Concluídas <strong>${done}</strong></div><div><i class="legend-dot pending"></i>Pendentes <strong>${pending}</strong></div>`;
    const bars = $('#categoryBars'); if (bars) bars.innerHTML = [['personal', 'Atrair'], ['work', 'Conectar'], ['study', 'Vender']].map(([key, name]) => { const arr = tasks.filter(t => t.category === key), finished = arr.filter(t => t.status === 'done').length, pct = arr.length ? Math.round(finished / arr.length * 100) : 0; return `<div class="bar-row"><span>${name}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div><strong>${pct}%</strong></div>`; }).join('');
    const upcoming = $('#upcomingEvents'); if (upcoming) { const future = [...state.events].filter(e => e.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5); upcoming.innerHTML = future.length ? future.map(e => `<button class="upcoming-event" data-select-event="${escapeHTML(e.id)}"><strong>${escapeHTML(e.title)}</strong><span>${dateLabel(e.date)} · ${escapeHTML(e.location || 'Local não definido')}</span></button>`).join('') : '<div class="empty">Nenhum evento futuro cadastrado.</div>'; }
    if ($('#eventCountLabel')) $('#eventCountLabel').textContent = `${state.events.length} evento(s)`;
  }

  function addTaskFromForm(event) {
    event.preventDefault();
    const id = $('#itemId').value || uid(), existing = state.tasks.find(t => t.id === id);
    const task = normalizeTask({ id, title: $('#titleInput').value.trim(), description: $('#descriptionInput').value.trim(), category: $('#categoryInput').value, priority: $('#priorityInput').value, status: $('#statusInput').value, date: $('#dateInput').value, time: $('#timeInput').value, checklist: taskDraft, createdAt: existing?.createdAt, updatedAt: new Date().toISOString() });
    if (!task.title) return;
    const index = state.tasks.findIndex(t => t.id === id); if (index >= 0) state.tasks[index] = task; else state.tasks.push(task);
    save(); hideModal($('#modalOverlay')); renderAll(); toast(index >= 0 ? 'Tarefa atualizada.' : 'Tarefa criada.');
  }
  function addEventFromForm(event) {
    event.preventDefault(); const id = $('#organizedEventId').value || uid(), old = state.events.find(e => e.id === id);
    const e = normalizeEvent({ id, title: $('#organizedEventName').value.trim(), date: $('#organizedEventDate').value, status: $('#organizedEventStatus').value, startTime: $('#organizedEventStart').value, endTime: $('#organizedEventEnd').value, location: $('#organizedEventLocation').value.trim(), description: $('#organizedEventDescription').value.trim(), script: $('#organizedEventScript').value.trim(), notes: $('#organizedEventNotes').value.trim(), checklist: eventChecklistDraft, responsibles: responsibleDraft, createdAt: old?.createdAt });
    if (!e.title || !e.date) { toast('Preencha o nome e a data do evento.'); return; }
    const index = state.events.findIndex(x => x.id === id); if (index >= 0) state.events[index] = e; else state.events.push(e);
    state.selectedEventId = e.id; save(); hideModal($('#eventOrganizerModal')); renderAll(); toast(index >= 0 ? 'Evento atualizado.' : 'Evento salvo.');
  }
  function deleteTask(id) { const task = state.tasks.find(t => t.id === id); if (!task) return; if (!confirm(`Excluir a tarefa “${task.title}”?`)) return; state.tasks = state.tasks.filter(t => t.id !== id); save(); renderAll(); hideModal($('#modalOverlay')); toast('Tarefa excluída.'); }
  function deleteEvent(id) { const e = state.events.find(x => x.id === id); if (!e) return; if (!confirm(`Excluir o evento “${e.title}”?`)) return; state.events = state.events.filter(x => x.id !== id); if (state.selectedEventId === id) state.selectedEventId = null; save(); renderAll(); hideModal($('#eventOrganizerModal')); toast('Evento excluído.'); }
  function toggleChecklist(taskId, checkId, checked) { const t = state.tasks.find(x => x.id === taskId); const item = t?.checklist.find(x => x.id === checkId); if (!item) return; item.done = checked; save(); renderAll(); }
  function toggleEventChecklist(eventId, checkId, checked) { const e = state.events.find(x => x.id === eventId); const item = e?.checklist.find(x => x.id === checkId); if (!item) return; item.done = checked; save(); renderAll(); }
  function printEvent(id) {
    const e = state.events.find(x => x.id === id); if (!e) return;
    const w = window.open('', '_blank', 'width=850,height=700');
    if (!w) { toast('Permita a abertura da janela para imprimir o roteiro.'); return; }
    const checklist = e.checklist.map(x => `<li>${x.done ? '☑' : '☐'} ${escapeHTML(x.text)}</li>`).join('');
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Roteiro — ${escapeHTML(e.title)}</title><style>body{font:16px/1.6 Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#202633}h1{font-size:28px;margin-bottom:4px}h2{font-size:17px;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:6px}.meta{color:#596579;margin-bottom:24px}.script{white-space:pre-wrap;font:inherit}.checklist li{padding:5px 0}@media print{body{margin:0;padding:0}}</style></head><body><h1>${escapeHTML(e.title)}</h1><div class="meta">${dateLabel(e.date)}${e.start ? ` · ${escapeHTML(e.start)}` : ''} · ${escapeHTML(e.location || 'Local não definido')}</div>${e.description ? `<p>${escapeHTML(e.description)}</p>` : ''}<h2>Roteiro</h2><div class="script">${escapeHTML(e.script || 'Roteiro não informado.')}</div><h2>Checklist de preparação</h2><ul class="checklist">${checklist || '<li>Nenhum item cadastrado.</li>'}</ul>${e.notes ? `<h2>Observações</h2><p>${escapeHTML(e.notes)}</p>` : ''}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  function openNode(id = null) {
    const n = id ? state.nodes.find(x => x.id === id) : null; if (!$('#mindNodeModal')) return;
    editNodeId = n?.id || null; $('#mindNodeId').value = n?.id || ''; $('#mindNodeModalTitle').textContent = n ? 'Editar bloco' : 'Novo bloco';
    $('#mindNodeTitle').value = n?.title || ''; $('#mindNodeDescription').value = n?.description || '';
    $('#deleteMindNode')?.classList.toggle('hidden', !n); showModal($('#mindNodeModal'));
  }
  function saveNode(event) {
    event.preventDefault(); const title = $('#mindNodeTitle').value.trim(); if (!title) return;
    if (editNodeId) { const n = state.nodes.find(x => x.id === editNodeId); if (n) { n.title = title; n.description = $('#mindNodeDescription').value.trim(); } }
    else { const index = state.nodes.length; state.nodes.push({ id: uid(), title, description: $('#mindNodeDescription').value.trim(), x: 35 + (index % 3) * 245, y: 30 + Math.floor(index / 3) * 145 }); }
    save(); hideModal($('#mindNodeModal')); renderFlowchart();
  }
  function openRoutine(id = null) {
    const s = id ? state.routineSteps.find(x => x.id === id) : null; if (!$('#routineStepModal')) return;
    editRoutineId = s?.id || null; $('#routineStepId').value = s?.id || ''; $('#routineStepModalTitle').textContent = s ? 'Editar etapa' : 'Nova etapa';
    $('#routineStepTitle').value = s?.title || ''; $('#routineStepDescription').value = s?.description || ''; $('#routineStepResponsible').value = s?.responsible || ''; $('#routineStepDuration').value = s?.duration || '';
    $('#deleteRoutineStep')?.classList.toggle('hidden', !s); showModal($('#routineStepModal'));
  }
  function saveRoutine(event) {
    event.preventDefault(); const s = { id: editRoutineId || uid(), title: $('#routineStepTitle').value.trim(), description: $('#routineStepDescription').value.trim(), responsible: $('#routineStepResponsible').value.trim(), duration: $('#routineStepDuration').value.trim() }; if (!s.title) return;
    const index = state.routineSteps.findIndex(x => x.id === s.id); if (index >= 0) state.routineSteps[index] = s; else state.routineSteps.push(s);
    save(); hideModal($('#routineStepModal')); renderRoutine();
  }
  function addDraft(input, list, render) { const text = input?.value.trim(); if (!text) return; list.push({ id: uid(), text, done: false }); input.value = ''; render(); input.focus(); }
  function setTaskDate(id, date) { const task = state.tasks.find(t => t.id === id); if (!task) return; task.date = date; save(); renderAll(); toast(`“${task.title}” foi adicionada ao calendário em ${dateLabel(date)}.`); }

  document.addEventListener('click', event => {
    const clickedNode = event.target.closest('[data-node-id]');
    if (clickedNode && !event.target.closest('button')) {
      if (suppressNodeClick) { suppressNodeClick = false; return; }
      if (connectionStart === clickedNode.dataset.nodeId) {
        connectionStart = null;
        toast('Seleção de conexão cancelada.');
      } else if (connectionStart) {
        const exists = state.connections.some(c => c.from === connectionStart && c.to === clickedNode.dataset.nodeId);
        if (!exists) state.connections.push({ from: connectionStart, to: clickedNode.dataset.nodeId });
        connectionStart = null; toast(exists ? 'Essa conexão já existe.' : 'Conexão criada.'); save(); drawConnections();
      } else { connectionStart = clickedNode.dataset.nodeId; toast('Bloco selecionado. Clique em outro bloco para conectar.'); }
      return;
    }
    const button = event.target.closest('button, [data-select-event]'); if (!button) return;
    if (button.matches('.nav-item[data-page]')) { setPage(button.dataset.page); return; }
    if (button.id === 'sidebarButton') { document.body.classList.toggle('sidebar-open'); return; }
    if (button.id === 'primaryAction') { button.dataset.action === 'event' ? openEvent() : button.dataset.action === 'node' ? openNode() : openTask(); return; }
    if (button.id === 'newEventButton') { openEvent(); return; }
    if (button.id === 'quickTask') { openTask(); return; }
    if (button.id === 'previousPeriod') { moveCursor(-1); return; }
    if (button.id === 'nextPeriod') { moveCursor(1); return; }
    if (button.id === 'todayButton') { state.cursor = new Date(); save(); renderCalendar(); return; }
    if (button.matches('.view-buttons [data-view]')) { state.view = button.dataset.view; save(); renderCalendar(); return; }
    if (button.matches('[data-task-filter]')) { state.taskFilter = button.dataset.taskFilter; $$('.chip[data-task-filter]').forEach(x => x.classList.toggle('active', x === button)); renderTasks(); return; }
    if (button.matches('[data-event-filter]')) { state.eventFilter = button.dataset.eventFilter; $$('.chip[data-event-filter]').forEach(x => x.classList.toggle('active', x === button)); renderEvents(); return; }
    if (button.matches('[data-flow-view]')) { $$('.flowchart-tab').forEach(x => x.classList.toggle('active', x === button)); const mind = button.dataset.flowView === 'mindmap'; $('#mindmapView')?.classList.toggle('active', mind); $('#routineView')?.classList.toggle('active', !mind); return; }
    if (button.id === 'addMindNode') { openNode(); return; }
    if (button.id === 'addFlowStep' || button.id === 'addRoutineStep') { openRoutine(); return; }
    if (button.id === 'mindmapZoomIn' || button.id === 'mindmapZoomOut' || button.id === 'mindmapReset') { const canvas = $('#mindmapCanvas'); let zoom = Number(canvas.dataset.zoom || 1); if (button.id === 'mindmapZoomIn') zoom = Math.min(1.6, zoom + .1); else if (button.id === 'mindmapZoomOut') zoom = Math.max(.6, zoom - .1); else zoom = 1; canvas.dataset.zoom = zoom; canvas.style.transform = `scale(${zoom})`; $('#mindmapZoom').textContent = `${Math.round(zoom * 100)}%`; return; }
    if (button.matches('[data-open-task], [data-edit-task]')) { openTask(button.dataset.openTask || button.dataset.editTask); return; }
    if (button.matches('[data-delete-task]')) { deleteTask(button.dataset.deleteTask); return; }
    if (button.matches('[data-new-task-status]')) { openTask(null, { status: button.dataset.newTaskStatus }); return; }
    if (button.matches('[data-select-event]')) { state.selectedEventId = button.dataset.selectEvent; renderEvents(); return; }
    if (button.matches('[data-edit-event]')) { openEvent(button.dataset.editEvent); return; }
    if (button.matches('[data-delete-event]')) { deleteEvent(button.dataset.deleteEvent); return; }
    if (button.matches('[data-print-event]')) { printEvent(button.dataset.printEvent); return; }
    if (button.matches('[data-open-event]')) { setPage('events'); state.selectedEventId = button.dataset.openEvent; renderEvents(); return; }
    if (button.matches('[data-remove-task-draft]')) { taskDraft.splice(Number(button.dataset.removeTaskDraft), 1); renderTaskDraft(); return; }
    if (button.matches('[data-remove-event-draft]')) { eventChecklistDraft.splice(Number(button.dataset.removeEventDraft), 1); renderEventDraft(); return; }
    if (button.matches('[data-remove-responsible]')) { responsibleDraft.splice(Number(button.dataset.removeResponsible), 1); renderResponsibles(); return; }
    if (button.matches('[data-edit-routine]')) { openRoutine(button.dataset.editRoutine); return; }
    if (button.matches('[data-delete-routine]')) { const id = button.dataset.deleteRoutine; if (confirm('Excluir esta etapa do fluxo?')) { state.routineSteps = state.routineSteps.filter(x => x.id !== id); save(); renderRoutine(); } return; }
    if (button.matches('[data-delete-node]')) { const id = button.dataset.deleteNode; if (confirm('Excluir este bloco e suas conexões?')) { state.nodes = state.nodes.filter(x => x.id !== id); state.connections = state.connections.filter(x => x.from !== id && x.to !== id); save(); renderFlowchart(); } return; }
    if (button.matches('[data-date-more]')) { const d = parseISO(button.dataset.dateMore); if (d) { state.cursor = d; state.view = 'day'; save(); renderCalendar(); } return; }
    if (button.id === 'closeModal' || button.id === 'cancelModal') { hideModal($('#modalOverlay')); return; }
    if (button.id === 'closeMindNodeModal' || button.id === 'cancelMindNode') { hideModal($('#mindNodeModal')); return; }
    if (button.id === 'closeRoutineStepModal' || button.id === 'cancelRoutineStep') { hideModal($('#routineStepModal')); return; }
    if (button.id === 'closeEventOrganizer' || button.id === 'cancelEventOrganizer') { hideModal($('#eventOrganizerModal')); return; }
    if (button.id === 'addSubtask') { addDraft($('#subtaskInput'), taskDraft, renderTaskDraft); return; }
    if (button.id === 'addEventChecklist') { addDraft($('#eventChecklistInput'), eventChecklistDraft, renderEventDraft); return; }
    if (button.id === 'addEventResponsible') { const value = $('#eventResponsibleInput').value.trim(); if (value && !responsibleDraft.includes(value)) responsibleDraft.push(value); $('#eventResponsibleInput').value = ''; renderResponsibles(); return; }
    if (button.id === 'deleteButton') { deleteTask($('#itemId').value); return; }
    if (button.id === 'deleteOrganizedEvent') { deleteEvent($('#organizedEventId').value); return; }
    if (button.id === 'deleteMindNode') { const id = editNodeId; if (id && confirm('Excluir este bloco?')) { state.nodes = state.nodes.filter(x => x.id !== id); state.connections = state.connections.filter(x => x.from !== id && x.to !== id); save(); renderFlowchart(); hideModal($('#mindNodeModal')); } return; }
    if (button.id === 'deleteRoutineStep') { const id = editRoutineId; if (id && confirm('Excluir esta etapa?')) { state.routineSteps = state.routineSteps.filter(x => x.id !== id); save(); renderRoutine(); hideModal($('#routineStepModal')); } return; }
    if (button.id === 'clearData') { if (confirm('Apagar todas as tarefas, eventos e fluxos salvos neste navegador?')) { state.tasks = []; state.events = []; state.nodes = []; state.connections = []; state.routineSteps = []; state.selectedEventId = null; save(); renderAll(); toast('Dados apagados.'); } return; }
  });

  document.addEventListener('dblclick', event => { const node = event.target.closest('[data-node-id]'); if (node) openNode(node.dataset.nodeId); });
  document.addEventListener('change', event => {
    const el = event.target;
    if (el.matches('[data-task-check]')) toggleChecklist(el.dataset.taskCheck, el.dataset.checkId, el.checked);
    if (el.matches('[data-event-check]')) toggleEventChecklist(el.dataset.eventCheck, el.dataset.checkId, el.checked);
    if (el.id === 'eventSort') { state.eventSort = el.value; renderEvents(); }
    if (el.id === 'dashboardPeriod') { state.dashboardPeriod = el.value; renderDashboard(); }
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'itemForm') addTaskFromForm(event);
    else if (event.target.id === 'eventOrganizerForm') addEventFromForm(event);
    else if (event.target.id === 'mindNodeForm') saveNode(event);
    else if (event.target.id === 'routineStepForm') saveRoutine(event);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') $$('.modal-overlay.active').forEach(hideModal);
    if (event.key === 'Enter' && event.target.matches('#subtaskInput, #eventChecklistInput, #eventResponsibleInput')) { event.preventDefault(); event.target.id === 'subtaskInput' ? addDraft(event.target, taskDraft, renderTaskDraft) : event.target.id === 'eventChecklistInput' ? addDraft(event.target, eventChecklistDraft, renderEventDraft) : $('#addEventResponsible').click(); }
  });
  $$('.modal-overlay').forEach(overlay => overlay.addEventListener('mousedown', event => { if (event.target === overlay) hideModal(overlay); }));
  document.addEventListener('dragstart', event => {
    const card = event.target.closest('[data-task-card]'); if (!card) return;
    draggedTaskId = card.dataset.taskCard; event.dataTransfer?.setData('text/plain', draggedTaskId); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', event => { if (event.target.closest('[data-date], [data-task-status]')) event.preventDefault(); });
  document.addEventListener('drop', event => {
    const dateCell = event.target.closest('[data-date]'); const column = event.target.closest('[data-task-status]');
    const id = event.dataTransfer?.getData('text/plain') || draggedTaskId; if (!id) return;
    if (dateCell) { event.preventDefault(); setTaskDate(id, dateCell.dataset.date); }
    else if (column) { event.preventDefault(); const task = state.tasks.find(t => t.id === id); if (task) { task.status = column.dataset.taskStatus; save(); renderAll(); } }
    draggedTaskId = null;
  });
  document.addEventListener('dragend', () => { draggedTaskId = null; });
  let movingNode = null, suppressNodeClick = false;
  document.addEventListener('pointerdown', event => {
    const node = event.target.closest('.mindmap-node');
    if (!node || event.target.closest('button') || event.button !== 0) return;
    const board = $('#mindmapBoard'), rect = board?.getBoundingClientRect(); if (!rect) return;
    movingNode = { id: node.dataset.nodeId, node, board, rect, startX: event.clientX, startY: event.clientY, x: node.offsetLeft, y: node.offsetTop, moved: false };
    node.setPointerCapture?.(event.pointerId);
  });
  document.addEventListener('pointermove', event => {
    if (!movingNode) return;
    const zoom = Number($('#mindmapCanvas')?.dataset.zoom || 1);
    const dx = (event.clientX - movingNode.startX) / zoom, dy = (event.clientY - movingNode.startY) / zoom;
    if (Math.abs(dx) + Math.abs(dy) > 4) movingNode.moved = true;
    if (!movingNode.moved) return;
    const nodeData = state.nodes.find(n => n.id === movingNode.id); if (!nodeData) return;
    nodeData.x = Math.max(0, movingNode.x + dx); nodeData.y = Math.max(0, movingNode.y + dy);
    movingNode.node.style.left = `${nodeData.x}px`; movingNode.node.style.top = `${nodeData.y}px`; drawConnections();
  });
  document.addEventListener('pointerup', () => {
    if (movingNode?.moved) { save(); drawConnections(); suppressNodeClick = true; }
    movingNode = null;
  });
  document.addEventListener('click', event => { if (event.target.matches('.calendar-grid td[data-date]')) { /* célula clicável: duplo clique para criar tarefa naquela data */ } });
  document.addEventListener('dblclick', event => { const cell = event.target.closest('.calendar-grid td[data-date]'); if (cell) openTask(null, { date: cell.dataset.date }); });
  window.addEventListener('resize', () => drawConnections());

  // Permite adicionar uma tarefa clicando duas vezes em uma data e abre o roteiro pela tela de eventos.
  syncCategories(); insertScriptField();
  if ($('#startHourSetting') && !$('#startHourSetting').options.length) {
    $('#startHourSetting').innerHTML = Array.from({ length: 24 }, (_, hour) => `<option value="${String(hour).padStart(2, '0')}">${String(hour).padStart(2, '0')}:00</option>`).join('');
    $('#startHourSetting').value = '08';
  }
  if ($('#eventSort')) state.eventSort = $('#eventSort').value || 'date';
  if ($('#dashboardPeriod')) state.dashboardPeriod = $('#dashboardPeriod').value || 'all';
  $$('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === state.selectedPage));
  setPage('calendar');
})();
