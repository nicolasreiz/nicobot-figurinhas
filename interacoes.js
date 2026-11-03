// ============================================================
//  Interações aleatórias em grupos
//  O bot às vezes REAGE ou RESPONDE mensagens nos grupos,
//  para parecer que está participando da conversa.
//
//  Para remover: apague este arquivo e as 2 linhas marcadas
//  com "INTERAÇÕES" no index.js.
// ============================================================

// ---------- Configurações ----------
const LIGADO = true; // mude para false para desligar sem apagar nada

// Chance de acontecer, de 0 a 1 (0.05 = 5% das mensagens)
const CHANCE_REAGIR = 0.40;
const CHANCE_RESPONDER = 0.08;

// Tempo mínimo entre uma interação e outra NO MESMO GRUPO (evita spam)
const INTERVALO_MINIMO_MINUTOS = 3;

const REACOES = ['😂', '👍', '🔥', '😮', '❤️', '👀'];

const RESPOSTAS = [
    'É verdade!',
    'É isso aí!',
    'Concordo total',
    'Falou tudo',
    'Kkkkkkk',
    'Nossa 😮',
    'Pior que é mesmo',
];

// ---------- Funções auxiliares ----------

// Sorteia um item de uma lista
function sortear(lista) {
    const posicao = Math.floor(Math.random() * lista.length);
    return lista[posicao];
}

// Espera alguns milissegundos (1000 ms = 1 segundo)
function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Guarda quando foi a última interação em cada grupo
// (é como um caderninho: "grupo X → horário")
const ultimaInteracao = new Map();

// MODO DETETIVE: mostra no terminal por que o bot NÃO interagiu.
// Útil para testar; mude para false quando estiver tudo certo.
const MODO_DETETIVE = false;
function detetive(motivo, msg) {
    if (MODO_DETETIVE) console.log(`🕵️ não interagiu (${motivo}) | de: ${msg.from} | tipo: ${msg.type}`);
}

// ---------- Lógica principal ----------
async function interagirEmGrupos(msg) {
    if (!LIGADO) return;

    // Só em grupos (o endereço de grupos termina com @g.us)
    if (!msg.from.endsWith('@g.us')) return detetive('não é grupo', msg);

    // Nunca interage com as próprias mensagens (senão ele responderia a si mesmo)
    if (msg.fromMe) return detetive('mensagem do próprio bot', msg);

    // Ignora comandos como !fig e !ajuda
    const texto = (msg.body || '').trim();
    if (texto === '' || texto.startsWith('!')) return detetive('vazia ou comando', msg);

    // Respeita o intervalo mínimo daquele grupo
    const agora = Date.now();
    const ultima = ultimaInteracao.get(msg.from) || 0;
    if (agora - ultima < INTERVALO_MINIMO_MINUTOS * 60 * 1000) return detetive('intervalo de espera', msg);

    // Sorteia o que fazer
    const sorteio = Math.random();
    let acao = null;
    if (sorteio < CHANCE_RESPONDER) {
        acao = 'responder';
    } else if (sorteio < CHANCE_RESPONDER + CHANCE_REAGIR) {
        acao = 'reagir';
    }
    if (!acao) return detetive('o sorteio disse que não', msg); // dessa vez não faz nada

    ultimaInteracao.set(msg.from, agora);

    try {
        // Espera de 2 a 6 segundos, para parecer uma pessoa digitando
        await esperar(2000 + Math.random() * 4000);

        if (acao === 'responder') {
            await msg.reply(sortear(RESPOSTAS));
        } else {
            await msg.react(sortear(REACOES));
        }
        console.log(`💬 Interação aleatória (${acao}) no grupo ${msg.from}`);
    } catch (erro) {
        console.error('Erro na interação aleatória:', erro);
    }
}

// Deixa a função disponível para o index.js usar
module.exports = { interagirEmGrupos };
