const API_URL = "http://192.168.2.28:8000";
const DAY = 86400000;


/* =========================================================
   ESTADO
========================================================= */

let usuarioLogado = null;

let selectedDate = startOfDay(new Date());

let checklistsDoDia = [];

let activeChecklist = null;

let tarefasAtivas = [];

let respostas = {};

let paginaAtual = "inicio";


/* =========================================================
   ELEMENTOS PRINCIPAIS
========================================================= */

const loginPage = document.getElementById("loginPage");
const loginForm = document.getElementById("loginForm");

const loginNome = document.getElementById("loginNome");
const loginSenha = document.getElementById("loginSenha");

const loginError = document.getElementById("loginError");
const loginButton = document.getElementById("loginButton");

const dateTitle = document.getElementById("dateTitle");
const weekday = document.getElementById("weekday");
const todayLabel = document.getElementById("todayLabel");

const checklistList = document.getElementById("checklistList");
const emptyState = document.getElementById("emptyState");

const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const progressBar = document.getElementById("progressBar");

const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");

const modal = document.getElementById("taskModal");
const questions = document.getElementById("questions");


/* =========================================================
   DATAS
========================================================= */

function startOfDay(date) {

    const d = new Date(date);

    d.setHours(0, 0, 0, 0);

    return d;
}


function formatarDataAPI(date) {

    const ano = date.getFullYear();

    const mes = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        date.getDate()
    ).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


function atualizarDataTela() {

    if (!dateTitle) return;

    const hoje = startOfDay(new Date());

    const isToday =
        selectedDate.getTime() ===
        hoje.getTime();


    dateTitle.textContent =
        selectedDate.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "long"
            }
        );


    weekday.textContent =
        selectedDate.toLocaleDateString(
            "pt-BR",
            {
                weekday: "long"
            }
        );


    todayLabel.textContent =
        isToday ? "HOJE" : "";
}


async function mudarDia(quantidade) {

    selectedDate =
        new Date(
            selectedDate.getTime()
            + quantidade * DAY
        );


    atualizarDataTela();

    await carregarChecklists();
}


/* =========================================================
   LOGIN
========================================================= */

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        loginError.textContent = "";

        const nome =
            loginNome.value.trim();

        const senha =
            loginSenha.value;


        if (!nome || !senha) {

            loginError.textContent =
                "Digite o usuário e a senha.";

            return;
        }


        loginButton.disabled = true;

        loginButton.textContent =
            "Entrando...";


        try {

            const resposta =
                await fetch(
                    `${API_URL}/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            nome,
                            senha
                        })
                    }
                );


            if (!resposta.ok) {

                if (resposta.status === 401) {

                    loginError.textContent =
                        "Usuário ou senha incorretos.";

                } else {

                    loginError.textContent =
                        "Erro ao realizar login.";
                }

                return;
            }


            const dados =
                await resposta.json();


            usuarioLogado =
                dados.usuario;


            localStorage.setItem(
                "usuarioLogado",
                JSON.stringify(usuarioLogado)
            );


            await entrarNoSistema();


        } catch (erro) {

            console.error(erro);

            loginError.textContent =
                "Não foi possível conectar ao servidor.";

        } finally {

            loginButton.disabled = false;

            loginButton.textContent =
                "Entrar";
        }
    }
);


/* =========================================================
   ENTRAR NO SISTEMA
========================================================= */

async function entrarNoSistema() {

    loginPage.classList.add("hidden");

    atualizarUsuarioInterface();

    configurarPermissoes();

    atualizarDataTela();

    navegarPara("inicio");

    await carregarChecklists();
}


/* =========================================================
   USUÁRIO
========================================================= */

function atualizarUsuarioInterface() {

    if (!usuarioLogado) {
        return;
    }


    const primeiroNome =
        usuarioLogado.nome
            .trim()
            .split(" ")[0];


    const iniciais =
        gerarIniciais(
            usuarioLogado.nome
        );


    definirTexto(
        "welcomeUser",
        `Bom dia, ${primeiroNome} 👋`
    );


    definirTexto(
        "welcomeStore",
        `Loja ${usuarioLogado.loja}`
    );


    definirTexto(
        "drawerUserName",
        usuarioLogado.nome
    );


    definirTexto(
        "drawerStore",
        `Loja ${usuarioLogado.loja}`
    );


    definirTexto(
        "profileAvatar",
        iniciais
    );


    /* PERFIL */

    definirTexto(
        "profilePageAvatar",
        iniciais
    );


    definirTexto(
        "profilePageName",
        usuarioLogado.nome
    );


    definirTexto(
        "profilePageStore",
        `Loja ${usuarioLogado.loja}`
    );


    definirTexto(
        "profilePageRole",
        usuarioLogado.adm
            ? "Administrador"
            : "Funcionário"
    );


    definirTexto(
        "profilePageAccess",
        usuarioLogado.adm
            ? "Administrador"
            : "Usuário"
    );


    /* MONITORAMENTO */

    definirTexto(
        "monitoramentoLoja",
        `Acompanhe a situação operacional da Loja ${usuarioLogado.loja}.`
    );
}


function definirTexto(id, texto) {

    const elemento =
        document.getElementById(id);

    if (elemento) {
        elemento.textContent = texto;
    }
}


function gerarIniciais(nome) {

    const partes =
        nome
            .trim()
            .split(/\s+/);


    if (partes.length === 1) {

        return partes[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        partes[0][0]
        +
        partes[partes.length - 1][0]
    ).toUpperCase();
}


/* =========================================================
   PERMISSÕES
========================================================= */

function usuarioEhAdm() {

    return usuarioLogado?.adm === true;
}


function configurarPermissoes() {

    document
        .querySelectorAll(
            '[data-admin-only="true"]'
        )
        .forEach(elemento => {

            /*
             * IMPORTANTE:
             *
             * Algumas páginas administrativas
             * já começam hidden.
             *
             * Por isso não podemos simplesmente
             * remover hidden de tudo.
             */

            if (
                elemento.matches(
                    "button"
                )
            ) {

                elemento.hidden =
                    !usuarioEhAdm();
            }
        });
}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

document
    .querySelectorAll("[data-page]")
    .forEach(botao => {

        botao.addEventListener(
            "click",
            () => {

                const pagina =
                    botao.dataset.page;


                toggleDrawer(false);

                navegarPara(pagina);
            }
        );
    });


function navegarPara(pagina) {

    const paginasAdm = [
        "historico",
        "configuracoes",
        "editar-checklists",
        "editar-fluxograma"
    ];


    if (
        paginasAdm.includes(pagina)
        &&
        !usuarioEhAdm()
    ) {

        alert(
            "Acesso restrito ao administrador."
        );

        return;
    }


    const paginaDestino =
        document.querySelector(
            `[data-page-content="${pagina}"]`
        );


    if (!paginaDestino) {

        console.warn(
            `Página não encontrada: ${pagina}`
        );

        return;
    }


    /*
     * ESCONDER TODAS
     */

    document
        .querySelectorAll(
            "[data-page-content]"
        )
        .forEach(page => {

            page.hidden = true;

            page.classList.remove(
                "active"
            );
        });


    /*
     * MOSTRAR DESTINO
     */

    paginaDestino.hidden = false;

    paginaDestino.classList.add(
        "active"
    );


    paginaAtual = pagina;


    /*
     * MENU LATERAL
     */

    document
        .querySelectorAll(
            ".drawer .nav-link"
        )
        .forEach(botao => {

            botao.classList.toggle(
                "active",
                botao.dataset.page === pagina
            );
        });


    /*
     * MENU INFERIOR
     */

    document
        .querySelectorAll(
            ".bottom-nav button"
        )
        .forEach(botao => {

            botao.classList.toggle(
                "active",
                botao.dataset.page === pagina
            );
        });


    /*
     * CARREGAR CONTEÚDO
     */

    carregarPagina(pagina);


    /*
     * VOLTAR AO TOPO
     */

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   CARREGAMENTO DAS PÁGINAS
========================================================= */

async function carregarPagina(pagina) {

    switch (pagina) {

        case "inicio":

            if (usuarioLogado) {
                await carregarChecklists();
            }

            break;


        case "fluxograma":

            await carregarFluxograma();

            break;


        case "monitoramento":

            carregarMonitoramento();

            break;


        case "ocorrencias":

            carregarOcorrencias();

            break;


        case "historico":

            carregarHistorico();

            break;


        case "relatorios":

            carregarRelatorios();

            break;


        case "perfil":

            atualizarUsuarioInterface();

            break;


        case "configuracoes":

            break;


        case "editar-checklists":

            carregarAdminChecklists();

            break;


        case "editar-fluxograma":

            carregarAdminFluxograma();

            break;
    }
}


/* =========================================================
   CHECKLISTS
========================================================= */

async function carregarChecklists() {

    if (!usuarioLogado) {
        return;
    }


    checklistList.innerHTML = `
        <div class="loading-list">
            Carregando checklists...
        </div>
    `;


    try {

        const parametros =
            new URLSearchParams({
                usuario_id:
                    usuarioLogado.id,

                loja:
                    usuarioLogado.loja,

                data:
                    formatarDataAPI(
                        selectedDate
                    )
            });


        const resposta =
            await fetch(
                `${API_URL}/checklists?${parametros}`
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao carregar checklists"
            );
        }


        checklistsDoDia =
            await resposta.json();


        renderizarChecklists();


    } catch (erro) {

        console.error(erro);

        checklistList.innerHTML = `
            <div class="api-error">
                Não foi possível carregar os checklists.
            </div>
        `;
    }
}


/* =========================================================
   RENDERIZAR CHECKLISTS
========================================================= */

function renderizarChecklists() {

    checklistList.innerHTML = "";


    if (!checklistsDoDia.length) {

        emptyState.hidden = false;

        atualizarProgressoDia();

        return;
    }


    emptyState.hidden = true;


    checklistsDoDia.forEach(
        checklist => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "check-card";


            const status =
                checklist.status
                || "Pendente";


            const statusClass =
                obterClasseStatus(status);


            card.innerHTML = `

                <div class="card-top">

                    <div class="card-icon">
                        ✓
                    </div>


                    <div class="card-main">

                        <span>
                            ${escapeHTML(
                                checklist.setor
                            )}
                        </span>

                        <h3>
                            ${escapeHTML(
                                checklist.nome
                            )}
                        </h3>

                        <p>

                            ${formatarHorario(
                                checklist.horario_inicio
                            )}

                            até

                            ${formatarHorario(
                                checklist.horario_fim
                            )}

                            •

                            ${formatarRepeticao(
                                checklist.repeticao
                            )}

                        </p>

                    </div>


                    <div
                        class="status ${statusClass}"
                    >
                        ${escapeHTML(status)}
                    </div>

                </div>

            `;


            card.addEventListener(
                "click",
                () => abrirChecklist(
                    checklist
                )
            );


            checklistList.appendChild(
                card
            );
        }
    );


    atualizarProgressoDia();
}


/* =========================================================
   STATUS
========================================================= */

function obterClasseStatus(status) {

    const valor =
        String(status)
            .toLowerCase();


    if (
        valor.includes("conclu")
    ) {
        return "done";
    }


    if (
        valor.includes("andamento")
    ) {
        return "progress";
    }


    if (
        valor.includes("atras")
    ) {
        return "alert";
    }


    return "pending";
}


/* =========================================================
   PROGRESSO DO DIA
========================================================= */

function atualizarProgressoDia() {

    const total =
        checklistsDoDia.length;


    const concluidos =
        checklistsDoDia.filter(
            item =>
                String(
                    item.status
                )
                    .toLowerCase()
                    .includes("conclu")
        ).length;


    const percentual =
        total
            ? Math.round(
                concluidos
                / total
                * 100
            )
            : 0;


    progressText.textContent =
        `${concluidos} de ${total} concluídos`;


    progressPercent.textContent =
        `${percentual}%`;


    progressBar.style.width =
        `${percentual}%`;
}


/* =========================================================
   ABRIR CHECKLIST
========================================================= */

async function abrirChecklist(checklist) {

    activeChecklist =
        checklist;

    respostas = {};


    try {

        const resposta =
            await fetch(
                `${API_URL}/checklists/${checklist.id}/tarefas`
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar tarefas"
            );
        }


        tarefasAtivas =
            await resposta.json();


        mostrarChecklist();


    } catch (erro) {

        console.error(erro);

        alert(
            "Não foi possível abrir o checklist."
        );
    }
}


/* =========================================================
   MOSTRAR CHECKLIST
========================================================= */

function mostrarChecklist() {

    definirTexto(
        "taskCategory",
        activeChecklist.setor
    );


    definirTexto(
        "taskTitle",
        activeChecklist.nome
    );


    definirTexto(
        "taskMeta",
        `Loja ${usuarioLogado.loja} • ${
            formatarHorario(
                activeChecklist.horario_inicio
            )
        } - ${
            formatarHorario(
                activeChecklist.horario_fim
            )
        }`
    );


    questions.innerHTML = "";


    tarefasAtivas.forEach(
        (tarefa, index) => {

            const elemento =
                criarCampoTarefa(
                    tarefa,
                    index
                );


            questions.appendChild(
                elemento
            );
        }
    );


    atualizarProgressoChecklist();


    modal.classList.add("open");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );
}


/* =========================================================
   CRIAR TAREFA
========================================================= */

function criarCampoTarefa(
    tarefa,
    index
) {

    const elemento =
        document.createElement(
            "div"
        );


    elemento.className =
        "question";


    const numero =
        String(index + 1)
            .padStart(2, "0");


    elemento.innerHTML = `

        <div class="question-label">

            <span class="q-number">
                ${numero}
            </span>

            <div style="flex:1">

                <h4>
                    ${escapeHTML(
                        tarefa.titulo
                    )}
                </h4>

                <div
                    class="question-field"
                ></div>

            </div>

        </div>
    `;


    const holder =
        elemento.querySelector(
            ".question-field"
        );


    switch (tarefa.tipo) {

        case "numero":

            criarCampoNumero(
                holder,
                tarefa,
                elemento
            );

            break;


        case "texto":

            criarCampoTexto(
                holder,
                tarefa,
                elemento
            );

            break;


        default:

            criarCampoCheckbox(
                holder,
                tarefa,
                elemento
            );
    }


    return elemento;
}


/* =========================================================
   CHECKBOX
========================================================= */

function criarCampoCheckbox(
    holder,
    tarefa,
    question
) {

    holder.innerHTML = `

        <div class="answer-row">

            <button
                type="button"
                class="answer-btn yes"
            >
                ✓ Sim
            </button>

            <button
                type="button"
                class="answer-btn no"
            >
                × Não
            </button>

        </div>

        <div
            class="no-instruction"
            hidden
        >
            <strong>
                ⚠ Ação necessária
            </strong>

            <p></p>
        </div>
    `;


    const sim =
        holder.querySelector(".yes");

    const nao =
        holder.querySelector(".no");

    const instrucao =
        holder.querySelector(
            ".no-instruction"
        );


    instrucao
        .querySelector("p")
        .textContent =
            tarefa.instrucao_nao
            ||
            "Comunique o responsável pelo setor.";


    sim.addEventListener(
        "click",
        () => {

            respostas[tarefa.id] = {
                tipo: "checkbox",
                valor: true
            };


            sim.classList.add(
                "selected"
            );

            nao.classList.remove(
                "selected"
            );


            instrucao.hidden = true;

            question.classList.add(
                "answered"
            );


            atualizarProgressoChecklist();
        }
    );


    nao.addEventListener(
        "click",
        () => {

            respostas[tarefa.id] = {
                tipo: "checkbox",
                valor: false
            };


            nao.classList.add(
                "selected"
            );

            sim.classList.remove(
                "selected"
            );


            instrucao.hidden = false;

            question.classList.add(
                "answered"
            );


            atualizarProgressoChecklist();
        }
    );
}


/* =========================================================
   NÚMERO
========================================================= */

function criarCampoNumero(
    holder,
    tarefa,
    question
) {

    const input =
        document.createElement(
            "input"
        );


    input.type = "number";

    input.step = "any";

    input.className =
        "question-input";

    input.placeholder =
        "Digite o valor";


    input.addEventListener(
        "input",
        () => {

            if (
                input.value === ""
            ) {

                delete respostas[
                    tarefa.id
                ];

                question.classList.remove(
                    "answered"
                );

            } else {

                respostas[tarefa.id] = {
                    tipo: "numero",
                    valor:
                        Number(
                            input.value
                        )
                };


                question.classList.add(
                    "answered"
                );
            }


            atualizarProgressoChecklist();
        }
    );


    holder.appendChild(input);
}


/* =========================================================
   TEXTO
========================================================= */

function criarCampoTexto(
    holder,
    tarefa,
    question
) {

    const textarea =
        document.createElement(
            "textarea"
        );


    textarea.className =
        "question-input";


    textarea.placeholder =
        "Digite sua resposta";


    textarea.addEventListener(
        "input",
        () => {

            const valor =
                textarea.value.trim();


            if (!valor) {

                delete respostas[
                    tarefa.id
                ];

                question.classList.remove(
                    "answered"
                );

            } else {

                respostas[tarefa.id] = {
                    tipo: "texto",
                    valor
                };


                question.classList.add(
                    "answered"
                );
            }


            atualizarProgressoChecklist();
        }
    );


    holder.appendChild(
        textarea
    );
}


/* =========================================================
   PROGRESSO DO CHECKLIST
========================================================= */

function atualizarProgressoChecklist() {

    const total =
        tarefasAtivas.length;


    const respondidas =
        Object.keys(
            respostas
        ).length;


    const percentual =
        total
            ? Math.round(
                respondidas
                / total
                * 100
            )
            : 0;


    definirTexto(
        "taskCount",
        `${respondidas}/${total}`
    );


    definirTexto(
        "taskPercent",
        `${percentual}%`
    );


    const barra =
        document.getElementById(
            "taskProgressBar"
        );


    if (barra) {

        barra.style.width =
            `${percentual}%`;
    }
}


/* =========================================================
   FECHAR CHECKLIST
========================================================= */

function fecharChecklist() {

    modal.classList.remove(
        "open"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    activeChecklist = null;

    tarefasAtivas = [];

    respostas = {};
}


/* =========================================================
   SALVAR CHECKLIST
========================================================= */

document
    .getElementById("finishBtn")
    .addEventListener(
        "click",
        async () => {

            const obrigatorias =
                tarefasAtivas.filter(
                    tarefa =>
                        tarefa.obrigatoria
                        !== false
                );


            const faltando =
                obrigatorias.some(
                    tarefa =>
                        respostas[
                            tarefa.id
                        ] === undefined
                );


            if (faltando) {

                alert(
                    "Responda todos os itens obrigatórios."
                );

                return;
            }


            /*
             * Ainda vamos conectar:
             *
             * POST /execucoes
             */

            const dados = {

                checklist_id:
                    activeChecklist.id,

                usuario_id:
                    usuarioLogado.id,

                loja:
                    usuarioLogado.loja,

                data_referencia:
                    formatarDataAPI(
                        selectedDate
                    ),

                respostas:
                    Object.entries(
                        respostas
                    ).map(
                        ([tarefaId, resposta]) => ({

                            tarefa_id:
                                Number(tarefaId),

                            tipo:
                                resposta.tipo,

                            valor:
                                resposta.valor
                        })
                    )
            };


            console.log(
                "Execução:",
                dados
            );


            alert(
                "Checklist preenchido. Agora falta conectarmos o salvamento à API."
            );
        }
    );


/* =========================================================
   FLUXOGRAMA
========================================================= */

async function carregarFluxograma() {

    const lista =
        document.getElementById(
            "fluxogramaLista"
        );


    const vazio =
        document.getElementById(
            "fluxogramaEmpty"
        );


    if (!lista) {
        return;
    }


    /*
     * Quando criarmos:
     *
     * GET /fluxograma
     *
     * aqui virão as atividades.
     */

    lista.innerHTML = "";

    if (vazio) {
        vazio.hidden = false;
    }
}


/* =========================================================
   MONITORAMENTO
========================================================= */

function carregarMonitoramento() {

    const concluidos =
        checklistsDoDia.filter(
            item =>
                String(item.status)
                    .toLowerCase()
                    .includes("conclu")
        ).length;


    const andamento =
        checklistsDoDia.filter(
            item =>
                String(item.status)
                    .toLowerCase()
                    .includes("andamento")
        ).length;


    const pendentes =
        checklistsDoDia.filter(
            item =>
                !String(item.status)
                    .toLowerCase()
                    .includes("conclu")
                &&
                !String(item.status)
                    .toLowerCase()
                    .includes("andamento")
        ).length;


    definirTexto(
        "monitorConcluidos",
        concluidos
    );


    definirTexto(
        "monitorPendentes",
        pendentes
    );


    definirTexto(
        "monitorAndamento",
        andamento
    );


    definirTexto(
        "monitorAtencao",
        "0"
    );
}


/* =========================================================
   OCORRÊNCIAS
========================================================= */

function carregarOcorrencias() {

    /*
     * Vamos conectar posteriormente:
     *
     * GET /ocorrencias
     */

    console.log(
        "Carregar ocorrências"
    );
}


/* =========================================================
   HISTÓRICO
========================================================= */

function carregarHistorico() {

    if (!usuarioEhAdm()) {
        return;
    }


    /*
     * Futuramente:
     *
     * GET /historico
     */

    console.log(
        "Carregar histórico"
    );
}


/* =========================================================
   RELATÓRIOS
========================================================= */

function carregarRelatorios() {

    console.log(
        "Carregar relatórios"
    );
}


/* =========================================================
   ADMIN - CHECKLISTS
========================================================= */

function carregarAdminChecklists() {

    if (!usuarioEhAdm()) {
        return;
    }


    /*
     * Próximo endpoint:
     *
     * GET /admin/checklists
     */

    console.log(
        "Carregar editor de checklists"
    );
}


/* =========================================================
   ADMIN - FLUXOGRAMA
========================================================= */

function carregarAdminFluxograma() {

    if (!usuarioEhAdm()) {
        return;
    }


    /*
     * Próximo endpoint:
     *
     * GET /fluxograma
     */

    console.log(
        "Carregar editor de fluxograma"
    );
}


/* =========================================================
   MENU LATERAL
========================================================= */

function toggleDrawer(show) {

    drawer.classList.toggle(
        "open",
        show
    );


    overlay.classList.toggle(
        "show",
        show
    );
}


document
    .getElementById("menuBtn")
    .addEventListener(
        "click",
        () => toggleDrawer(true)
    );


overlay.addEventListener(
    "click",
    () => toggleDrawer(false)
);


/* =========================================================
   DATA
========================================================= */

document
    .getElementById("prevDay")
    .addEventListener(
        "click",
        () => mudarDia(-1)
    );


document
    .getElementById("nextDay")
    .addEventListener(
        "click",
        () => mudarDia(1)
    );


document
    .getElementById("todayBtn")
    .addEventListener(
        "click",
        async () => {

            selectedDate =
                startOfDay(
                    new Date()
                );


            atualizarDataTela();

            await carregarChecklists();
        }
    );


/* =========================================================
   MODAL CHECKLIST
========================================================= */

document
    .getElementById("closeTask")
    .addEventListener(
        "click",
        fecharChecklist
    );


/* =========================================================
   LOGOUT
========================================================= */

const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );


if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        () => {

            localStorage.removeItem(
                "usuarioLogado"
            );


            usuarioLogado = null;

            checklistsDoDia = [];

            paginaAtual = "inicio";


            loginSenha.value = "";

            loginError.textContent = "";


            loginPage.classList.remove(
                "hidden"
            );


            toggleDrawer(false);
        }
    );
}


/* =========================================================
   EDITORES ADMIN
========================================================= */

const novoChecklistBtn =
    document.getElementById(
        "novoChecklistBtn"
    );


const checklistEditorModal =
    document.getElementById(
        "checklistEditorModal"
    );


if (novoChecklistBtn) {

    novoChecklistBtn.addEventListener(
        "click",
        () => {

            if (!usuarioEhAdm()) {
                return;
            }


            checklistEditorModal.hidden =
                false;


            checklistEditorModal.classList.add(
                "open"
            );


            checklistEditorModal.setAttribute(
                "aria-hidden",
                "false"
            );
        }
    );
}


const closeChecklistEditor =
    document.getElementById(
        "closeChecklistEditor"
    );


if (closeChecklistEditor) {

    closeChecklistEditor.addEventListener(
        "click",
        fecharEditorChecklist
    );
}


function fecharEditorChecklist() {

    if (!checklistEditorModal) {
        return;
    }


    checklistEditorModal.classList.remove(
        "open"
    );


    checklistEditorModal.setAttribute(
        "aria-hidden",
        "true"
    );


    setTimeout(
        () => {

            checklistEditorModal.hidden =
                true;

        },
        220
    );
}


/* =========================================================
   EDITOR FLUXOGRAMA
========================================================= */

const novaAtividadeFluxoBtn =
    document.getElementById(
        "novaAtividadeFluxoBtn"
    );


const fluxogramaEditorModal =
    document.getElementById(
        "fluxogramaEditorModal"
    );


if (novaAtividadeFluxoBtn) {

    novaAtividadeFluxoBtn.addEventListener(
        "click",
        () => {

            if (!usuarioEhAdm()) {
                return;
            }


            fluxogramaEditorModal.hidden =
                false;


            fluxogramaEditorModal.classList.add(
                "open"
            );


            fluxogramaEditorModal.setAttribute(
                "aria-hidden",
                "false"
            );
        }
    );
}


const closeFluxogramaEditor =
    document.getElementById(
        "closeFluxogramaEditor"
    );


if (closeFluxogramaEditor) {

    closeFluxogramaEditor.addEventListener(
        "click",
        fecharEditorFluxograma
    );
}


function fecharEditorFluxograma() {

    if (!fluxogramaEditorModal) {
        return;
    }


    fluxogramaEditorModal.classList.remove(
        "open"
    );


    fluxogramaEditorModal.setAttribute(
        "aria-hidden",
        "true"
    );


    setTimeout(
        () => {

            fluxogramaEditorModal.hidden =
                true;

        },
        220
    );
}


/* =========================================================
   REPETIÇÃO DO CHECKLIST
========================================================= */

const editRepeticao =
    document.getElementById(
        "editRepeticao"
    );


if (editRepeticao) {

    editRepeticao.addEventListener(
        "change",
        atualizarCamposRepeticao
    );
}


function atualizarCamposRepeticao() {

    if (!editRepeticao) {
        return;
    }


    const grupoSemana =
        document.getElementById(
            "grupoDiaSemana"
        );


    const grupoMes =
        document.getElementById(
            "grupoDiaMes"
        );


    grupoSemana.hidden = true;

    grupoMes.hidden = true;


    if (
        editRepeticao.value ===
        "semanal"
    ) {

        grupoSemana.hidden = false;
    }


    if (
        editRepeticao.value ===
        "mensal"
    ) {

        grupoMes.hidden = false;
    }
}


/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatarHorario(horario) {

    if (!horario) {
        return "--:--";
    }


    return String(horario)
        .substring(0, 5);
}


function formatarRepeticao(
    repeticao
) {

    const nomes = {

        diario:
            "Diário",

        semanal:
            "Semanal",

        quinzenal:
            "Quinzenal",

        mensal:
            "Mensal"
    };


    return nomes[repeticao]
        || repeticao
        || "";
}


/* =========================================================
   SEGURANÇA DE HTML
========================================================= */

function escapeHTML(valor) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        valor ?? "";


    return div.innerHTML;
}


/* =========================================================
   RESTAURAR SESSÃO
========================================================= */

async function restaurarSessao() {

    const sessao =
        localStorage.getItem(
            "usuarioLogado"
        );


    if (!sessao) {

        atualizarDataTela();

        return;
    }


    try {

        usuarioLogado =
            JSON.parse(sessao);


        if (
            !usuarioLogado
            ||
            !usuarioLogado.id
        ) {

            throw new Error(
                "Sessão inválida"
            );
        }


        await entrarNoSistema();


    } catch (erro) {

        console.error(
            "Erro ao restaurar sessão:",
            erro
        );


        localStorage.removeItem(
            "usuarioLogado"
        );


        usuarioLogado = null;

        loginPage.classList.remove(
            "hidden"
        );
    }
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

restaurarSessao();