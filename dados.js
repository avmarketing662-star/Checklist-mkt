/*
===========================================================
DADOS DO CHECKLIST DE MARKETING
SUPERMERCADO AVENIDA
===========================================================

Este arquivo contém somente as tarefas.

A lógica do sistema fica no script.js.

Para alterar uma tarefa, basta mudar o texto aqui.
===========================================================
*/

const rotinaMKT = {

    // =====================================================
    // SEGUNDA-FEIRA
    // =====================================================

    segunda: {

        cafe: [
            "Café"
        ],

        promocao: [
            "Promoção"
        ],

        conteudo: [
            "Receita"
        ]

    },


    // =====================================================
    // TERÇA-FEIRA
    // =====================================================

    terca: {

        cafe: [
            "Hortifruti"
        ],

        promocao: [
            "Promoção"
        ],

        conteudo: [
            "Produto novidade"
        ]

    },


    // =====================================================
    // QUARTA-FEIRA
    // =====================================================

    quarta: {

        cafe: [
            "Hortifruti"
        ],

        promocao: [
            "Promoção"
        ],

        conteudo: [
            "Produto novidade"
        ]

    },


    // =====================================================
    // QUINTA-FEIRA
    // =====================================================

    quinta: {

        cafe: [
            "Promoção"
        ],

        promocao: [
            "Carne"
        ],

        conteudo: [
            "Post"
        ]

    },


    // =====================================================
    // SEXTA-FEIRA
    // =====================================================

    sexta: {

        cafe: [
            "Promoção"
        ],

        promocao: [
            "Carne"
        ],

        conteudo: [
            "Vídeo"
        ]

    },


    // =====================================================
    // SÁBADO
    // =====================================================

    sabado: {

        cafe: [
            "Mascote"
        ],


        conteudo: []

    },


    // =====================================================
    // DOMINGO
    // =====================================================

    domingo: {

        cafe: [
            "Almoço"
        ],

        promocao: [],

        conteudo: [
            "Receita"
        ]

    }

};


/*
===========================================================
NOMES DOS DIAS
===========================================================
*/

const nomesDias = {

    domingo: "Domingo",

    segunda: "Segunda-feira",

    terca: "Terça-feira",

    quarta: "Quarta-feira",

    quinta: "Quinta-feira",

    sexta: "Sexta-feira",

    sabado: "Sábado"

};


/*
===========================================================
ORDEM DOS DIAS
===========================================================

Mantemos domingo primeiro aqui porque é a ordem
tradicional do JavaScript.

O script.js organiza a visualização começando na segunda.
===========================================================
*/

const ordemDias = [

    "domingo",

    "segunda",

    "terca",

    "quarta",

    "quinta",

    "sexta",

    "sabado"

];