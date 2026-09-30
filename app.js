const DAY = 86400000;

const checklists = [
  {
    offset: 0,
    items: [
      { id: 1, icon: "⌂", category: "Abertura", title: "Abertura da loja", time: "07:00", total: 12, done: 12, status: "Concluído" },
      { id: 2, icon: "❄", category: "Perecíveis", title: "Controle de temperatura", time: "10:00", total: 10, done: 6, status: "Em andamento" },
      { id: 3, icon: "✦", category: "Operação", title: "Limpeza e organização", time: "12:00", total: 15, done: 0, status: "Pendente" },
      { id: 4, icon: "▣", category: "Frente de caixa", title: "Conferência dos caixas", time: "18:00", total: 8, done: 0, status: "Pendente" }
    ]
  },
  {
    offset: -1,
    items: [
      { id: 5, icon: "⌂", category: "Abertura", title: "Abertura da loja", time: "07:00", total: 12, done: 12, status: "Concluído" },
      { id: 6, icon: "❄", category: "Perecíveis", title: "Controle de temperatura", time: "10:00", total: 10, done: 10, status: "Concluído" },
      { id: 7, icon: "✦", category: "Operação", title: "Limpeza e organização", time: "12:00", total: 15, done: 15, status: "Concluído" }
    ]
  },
  {
    offset: 1,
    items: [
      { id: 8, icon: "⌂", category: "Abertura", title: "Abertura da loja", time: "07:00", total: 12, done: 0, status: "Pendente" },
      { id: 9, icon: "❄", category: "Perecíveis", title: "Controle de temperatura", time: "10:00", total: 10, done: 0, status: "Pendente" },
      { id: 10, icon: "✦", category: "Operação", title: "Limpeza e organização", time: "12:00", total: 15, done: 0, status: "Pendente" }
    ]
  }
];

const questionsByType = {
  "Abertura": [
    "A iluminação da entrada está funcionando corretamente?",
    "A entrada da loja está limpa e organizada?",
    "Os carrinhos e cestos estão disponíveis e organizados?",
    "Os equipamentos essenciais estão ligados e operando?"
  ],
  "Perecíveis": [
    "A temperatura dos equipamentos está dentro do limite?",
    "Os produtos estão corretamente armazenados?",
    "Existem produtos vencidos ou fora do padrão?",
    "A área está limpa e sem sinais de vazamento?"
  ],
  "Operação": [
    "O piso está limpo e seco?",
    "Os corredores estão livres e organizados?",
    "As lixeiras estão em condições adequadas?",
    "Os materiais de limpeza estão armazenados corretamente?"
  ],
  "Frente de caixa": [
    "Todos os caixas previstos estão operacionais?",
    "Os equipamentos de pagamento estão funcionando?",
    "A área de atendimento está organizada?",
    "Há materiais suficientes para a operação?"
  ]
};

let selectedDate = startOfDay(new Date());
let activeChecklist = null;
let answers = {};

const dateTitle = document.querySelector("#dateTitle");
const weekday = document.querySelector("#weekday");
const todayLabel = document.querySelector("#todayLabel");
const checklistList = document.querySelector("#checklistList");
const emptyState = document.querySelector("#emptyState");
const progressText = document.querySelector("#progressText");
const progressPercent = document.querySelector("#progressPercent");
const progressBar = document.querySelector("#progressBar");
const drawer = document.querySelector("#drawer");
const overlay = document.querySelector("#overlay");
const modal = document.querySelector("#taskModal");

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayOffset(date) {
  return Math.round((startOfDay(date) - startOfDay(new Date())) / DAY);
}

function getItems() {
  return checklists.find(d => d.offset === dayOffset(selectedDate))?.items || [];
}

function render() {
  const isToday = dayOffset(selectedDate) === 0;
  dateTitle.textContent = selectedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  weekday.textContent = selectedDate.toLocaleDateString("pt-BR", { weekday: "long" });
  todayLabel.textContent = isToday ? "HOJE" : "";

  const items = getItems();
  checklistList.innerHTML = "";
  emptyState.hidden = items.length > 0;

  items.forEach(item => {
    const pct = Math.round((item.done / item.total) * 100);
    const statusClass = item.status === "Concluído" ? "done" : item.status === "Em andamento" ? "progress" : "pending";
    const card = document.createElement("article");
    card.className = "check-card";
    card.innerHTML = `
      <div class="card-top">
        <div class="card-icon">${item.icon}</div>
        <div class="card-main">
          <span>${item.category}</span>
          <h3>${item.title}</h3>
          <p>${item.time} • ${item.total} itens</p>
        </div>
        <div class="status ${statusClass}">${item.status}</div>
      </div>
      <div class="card-bottom">
        <div class="progress-track"><div style="width:${pct}%"></div></div>
        <small>${item.done}/${item.total}</small>
      </div>`;
    card.addEventListener("click", () => openChecklist(item));
    checklistList.appendChild(card);
  });

  const completed = items.filter(i => i.status === "Concluído").length;
  const pct = items.length ? Math.round(completed / items.length * 100) : 0;
  progressText.textContent = `${completed} de ${items.length} concluídos`;
  progressPercent.textContent = `${pct}%`;
  progressBar.style.width = `${pct}%`;
}

function changeDay(amount) {
  selectedDate = new Date(selectedDate.getTime() + amount * DAY);
  render();
}

function toggleDrawer(show) {
  drawer.classList.toggle("open", show);
  overlay.classList.toggle("show", show);
}

function openChecklist(item) {
  activeChecklist = item;
  answers = {};
  document.querySelector("#taskCategory").textContent = item.category;
  document.querySelector("#taskTitle").textContent = item.title;
  document.querySelector("#taskMeta").textContent = `Loja 01 • ${item.time}`;
  const qs = questionsByType[item.category] || questionsByType["Operação"];
  const holder = document.querySelector("#questions");
  holder.innerHTML = "";

  qs.forEach((q, index) => {
    const el = document.createElement("div");
    el.className = "question";
    el.innerHTML = `
      <div class="question-label">
        <span class="q-number">${String(index + 1).padStart(2, "0")}</span>
        <div style="flex:1">
          <h4>${q}</h4>
          <div class="answer-row">
            <button class="answer-btn yes" data-index="${index}" data-answer="Sim">✓ Sim</button>
            <button class="answer-btn no" data-index="${index}" data-answer="Não">× Não</button>
          </div>
        </div>
      </div>`;
    holder.appendChild(el);
  });

  holder.querySelectorAll(".answer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = btn.dataset.index;
      answers[idx] = btn.dataset.answer;
      btn.parentElement.querySelectorAll(".answer-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      updateTaskProgress(qs.length);
    });
  });

  updateTaskProgress(qs.length);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function updateTaskProgress(total) {
  const count = Object.keys(answers).length;
  const pct = total ? Math.round(count / total * 100) : 0;
  document.querySelector("#taskCount").textContent = `${count}/${total}`;
  document.querySelector("#taskPercent").textContent = `${pct}%`;
  document.querySelector("#taskProgressBar").style.width = `${pct}%`;
}

function closeChecklist() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

document.querySelector("#prevDay").addEventListener("click", () => changeDay(-1));
document.querySelector("#nextDay").addEventListener("click", () => changeDay(1));
document.querySelector("#todayBtn").addEventListener("click", () => {
  selectedDate = startOfDay(new Date());
  render();
});
document.querySelector("#menuBtn").addEventListener("click", () => toggleDrawer(true));
overlay.addEventListener("click", () => toggleDrawer(false));
document.querySelector("#closeTask").addEventListener("click", closeChecklist);

document.querySelector("#finishBtn").addEventListener("click", () => {
  const total = document.querySelectorAll(".question").length;
  if (Object.keys(answers).length < total) {
    alert("Responda todos os itens antes de salvar.");
    return;
  }
  if (activeChecklist) {
    activeChecklist.done = activeChecklist.total;
    activeChecklist.status = "Concluído";
  }
  closeChecklist();
  render();
});

render();
