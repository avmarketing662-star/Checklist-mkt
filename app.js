// ============================================================
// CHECKLIST MKT - SUPERMERCADO AVENIDA
// ============================================================

// Semana atualmente exibida
let semanaAtual = obterInicioSemana(new Date());


// ============================================================
// CONFIGURAÇÕES
// ============================================================

const STORAGE_PREFIX = "avenida_mkt_checklist_";

const diasSemana = [
    "segunda",
    "terca",
    "quarta",
    "quinta",
    "sexta",
    "sabado",
    "domingo"
];

const colunas = [
    {
        chave: "cafe",
        nome: "☕ Café"
    },
    {
        chave: "promocao",
        nome: "🔥 Promoção"
    },
    {
        chave: "conteudo",
        nome: "📱 Receita / Conteúdo"
    }
];


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    configurarEventos();

    renderizarSemana();

});


// ============================================================
// EVENTOS DOS BOTÕES
// ============================================================

function configurarEventos() {

    const btnAnterior = document.getElementById("btnPreviousWeek");
    const btnProxima = document.getElementById("btnNextWeek");
    const btnHoje = document.getElementById("btnToday");
    const btnLimpar = document.getElementById("btnClearWeek");

    if (btnAnterior) {
        btnAnterior.addEventListener("click", () => {
            semanaAtual = adicionarDias(semanaAtual, -7);
            renderizarSemana();
        });
    }

    if (btnProxima) {
        btnProxima.addEventListener("click", () => {
            semanaAtual = adicionarDias(semanaAtual, 7);
            renderizarSemana();
        });
    }

    if (btnHoje) {
        btnHoje.addEventListener("click", () => {
            semanaAtual = obterInicioSemana(new Date());
            renderizarSemana();
        });
    }

    if (btnLimpar) {
        btnLimpar.addEventListener("click", limparSemana);
    }

}


// ============================================================
// OBTER SEGUNDA-FEIRA DA SEMANA
// ============================================================

function obterInicioSemana(data) {

    const dataNova = new Date(data);

    dataNova.setHours(0, 0, 0, 0);

    const dia = dataNova.getDay();

    // Domingo = 0
    // Segunda = 1
    // ...
    // Sábado = 6

    const diferenca = dia === 0 ? -6 : 1 - dia;

    dataNova.setDate(dataNova.getDate() + diferenca);

    return dataNova;
}


// ============================================================
// ADICIONAR DIAS
// ============================================================

function adicionarDias(data, quantidade) {

    const novaData = new Date(data);

    novaData.setDate(novaData.getDate() + quantidade);

    return novaData;
}


// ============================================================
// FORMATAÇÃO DE DATA
// ============================================================

function formatarData(data) {

    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

}


function formatarDataCurta(data) {

    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit"
    });

}


// ============================================================
// CHAVE DA DATA
// ============================================================

function chaveData(data) {

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;

}


// ============================================================
// LOCALSTORAGE
// ============================================================

function obterTarefasSalvas(data) {

    const chave = STORAGE_PREFIX + chaveData(data);

    const dados = localStorage.getItem(chave);

    if (!dados) {
        return {};
    }

    try {

        return JSON.parse(dados);

    } catch (erro) {

        console.error("Erro ao ler checklist:", erro);

        return {};

    }

}


function salvarTarefas(data, tarefas) {

    const chave = STORAGE_PREFIX + chaveData(data);

    localStorage.setItem(
        chave,
        JSON.stringify(tarefas)
    );

}


// ============================================================
// RENDERIZAR SEMANA
// ============================================================

function renderizarSemana() {

    atualizarCabecalhoSemana();

    renderizarTabela();

    atualizarProgresso();

    atualizarStatusSalvamento();

}


// ============================================================
// CABEÇALHO DA SEMANA
// ============================================================

function atualizarCabecalhoSemana() {

    const inicio = semanaAtual;

    const fim = adicionarDias(inicio, 6);

    const titulo = document.getElementById("weekTitle");
    const intervalo = document.getElementById("weekRange");

    if (titulo) {

        titulo.textContent = "Checklist MKT";

    }

    if (intervalo) {

        intervalo.textContent =
            `${formatarData(inicio)} até ${formatarData(fim)}`;

    }

}


// ============================================================
// RENDERIZAR TABELA
// ============================================================

function renderizarTabela() {

    const tabela = document.getElementById("weekTableBody");

    if (!tabela) {
        return;
    }

    tabela.innerHTML = "";

    diasSemana.forEach((diaNome, indice) => {

        const data = adicionarDias(
            semanaAtual,
            indice
        );

        const tr = document.createElement("tr");

        // ----------------------------------------------------
        // COLUNA DO DIA
        // ----------------------------------------------------

        const tdDia = document.createElement("td");

        tdDia.className = "day-cell";

        if (ehHoje(data)) {

            tdDia.classList.add("today");

        }

        tdDia.innerHTML = `
            <div class="day-name">
                ${nomesDias[diaNome]}
            </div>

            <div class="day-date">
                ${formatarDataCurta(data)}
            </div>
        `;

        tr.appendChild(tdDia);


        // ----------------------------------------------------
        // COLUNAS DE TAREFAS
        // ----------------------------------------------------

        colunas.forEach(coluna => {

            const td = document.createElement("td");

            td.className = `column-${coluna.chave}`;

            const tarefas =
                rotinaMKT[diaNome]?.[coluna.chave] || [];

            if (tarefas.length === 0) {

                td.innerHTML = `
                    <div class="empty-task">
                        —
                    </div>
                `;

            } else {

                tarefas.forEach((nomeTarefa, index) => {

                    const tarefa = criarTarefa(
                        data,
                        coluna.chave,
                        index,
                        nomeTarefa
                    );

                    td.appendChild(tarefa);

                });

            }

            tr.appendChild(td);

        });


        tabela.appendChild(tr);

    });

}


// ============================================================
// CRIAR TAREFA
// ============================================================

function criarTarefa(
    data,
    coluna,
    indice,
    nome
) {

    const container = document.createElement("div");

    container.className = "task";

    const id = criarIdTarefa(
        data,
        coluna,
        indice
    );

    const tarefasSalvas =
        obterTarefasSalvas(data);

    const concluida =
        tarefasSalvas[id] === true;


    if (concluida) {

        container.classList.add("completed");

    }


    // --------------------------------------------------------
    // CHECKBOX
    // --------------------------------------------------------

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";

    checkbox.className = "task-checkbox";

    checkbox.checked = concluida;


    // --------------------------------------------------------
    // TEXTO
    // --------------------------------------------------------

    const texto = document.createElement("span");

    texto.className = "task-name";

    texto.textContent = nome;


    // --------------------------------------------------------
    // EVENTO
    // --------------------------------------------------------

    checkbox.addEventListener("change", () => {

        const tarefas =
            obterTarefasSalvas(data);

        tarefas[id] = checkbox.checked;

        salvarTarefas(
            data,
            tarefas
        );

        if (checkbox.checked) {

            container.classList.add("completed");

        } else {

            container.classList.remove("completed");

        }

        atualizarProgresso();

        mostrarSalvo();

    });


    container.appendChild(checkbox);

    container.appendChild(texto);


    return container;

}


// ============================================================
// ID ÚNICO DA TAREFA
// ============================================================

function criarIdTarefa(
    data,
    coluna,
    indice
) {

    return [
        chaveData(data),
        coluna,
        indice
    ].join("_");

}


// ============================================================
// VERIFICAR SE É HOJE
// ============================================================

function ehHoje(data) {

    const hoje = new Date();

    return chaveData(data) === chaveData(hoje);

}


// ============================================================
// PROGRESSO
// ============================================================

function atualizarProgresso() {

    let total = 0;

    let concluido = 0;


    diasSemana.forEach((diaNome, indice) => {

        const data = adicionarDias(
            semanaAtual,
            indice
        );

        const tarefasSalvas =
            obterTarefasSalvas(data);


        colunas.forEach(coluna => {

            const tarefas =
                rotinaMKT[diaNome]?.[coluna.chave] || [];


            tarefas.forEach((_, tarefaIndex) => {

                total++;

                const id = criarIdTarefa(
                    data,
                    coluna.chave,
                    tarefaIndex
                );

                if (tarefasSalvas[id] === true) {

                    concluido++;

                }

            });

        });

    });


    const pendente = total - concluido;

    const porcentagem =
        total === 0
            ? 0
            : Math.round(
                (concluido / total) * 100
            );


    // --------------------------------------------------------
    // PORCENTAGEM
    // --------------------------------------------------------

    const progressValue =
        document.getElementById("progressValue");

    if (progressValue) {

        progressValue.textContent =
            `${porcentagem}%`;

    }


    // --------------------------------------------------------
    // BARRA
    // --------------------------------------------------------

    const progressFill =
        document.getElementById("progressFill");

    if (progressFill) {

        progressFill.style.width =
            `${porcentagem}%`;

    }


    // --------------------------------------------------------
    // TOTAIS
    // --------------------------------------------------------

    const totalTasks =
        document.getElementById("totalTasks");

    const completedTasks =
        document.getElementById("completedTasks");

    const pendingTasks =
        document.getElementById("pendingTasks");


    if (totalTasks) {

        totalTasks.textContent =
            total;

    }

    if (completedTasks) {

        completedTasks.textContent =
            concluido;

    }

    if (pendingTasks) {

        pendingTasks.textContent =
            pendente;

    }

}


// ============================================================
// STATUS DE SALVAMENTO
// ============================================================

function atualizarStatusSalvamento() {

    const status =
        document.getElementById("saveStatus");

    if (!status) {
        return;
    }

    status.textContent =
        "✓ Dados salvos automaticamente";

}


function mostrarSalvo() {

    const status =
        document.getElementById("saveStatus");

    if (!status) {
        return;
    }


    const agora = new Date();

    const hora =
        agora.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });


    status.textContent =
        `✓ Salvo automaticamente às ${hora}`;

}


// ============================================================
// LIMPAR SEMANA
// ============================================================

function limparSemana() {

    const confirmar = confirm(
        "Deseja realmente limpar o checklist desta semana?"
    );

    if (!confirmar) {
        return;
    }


    diasSemana.forEach((_, indice) => {

        const data =
            adicionarDias(
                semanaAtual,
                indice
            );

        const chave =
            STORAGE_PREFIX + chaveData(data);

        localStorage.removeItem(chave);

    });


    renderizarSemana();

    mostrarSalvo();

}


// ============================================================
// FUNÇÃO PARA DEBUG
// ============================================================

function mostrarDadosSemana() {

    console.log("================================");
    console.log("CHECKLIST MKT");
    console.log("Semana:", formatarData(semanaAtual));
    console.log("================================");


    diasSemana.forEach((diaNome, indice) => {

        const data =
            adicionarDias(
                semanaAtual,
                indice
            );

        console.log(
            diaNome,
            formatarData(data),
            obterTarefasSalvas(data)
        );

    });

}