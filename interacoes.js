// ============================================================
//  Interações aleatórias em grupos
//  O bot às vezes REAGE ou RESPONDE mensagens nos grupos,
//  para parecer que está participando da conversa.
//
//  Para remover: apague este arquivo e as 2 linhas marcadas
//  com "INTERAÇÕES" no index.js.
// ============================================================

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { MessageMedia } = require('whatsapp-web.js');
const { baixarMidia } = require('./midia');

// ---------- Configurações ----------
const LIGADO = true; // mude para false para desligar sem apagar nada

// Chance de acontecer, de 0 a 1 (0.05 = 5% das mensagens)
const CHANCE_REAGIR = 0.40;
const CHANCE_RESPONDER = 0.08;

// Tempo mínimo entre uma interação e outra NO MESMO GRUPO (evita spam)
const INTERVALO_MINIMO_MINUTOS = 3;

const REACOES = ['😂', '👍', '🔥', '😮', '❤️', '👀'];

// De vez em quando, em vez das reações acima, ele usa um emoji "surpresa" desta lista.
// 0.15 = 15% das reações serão surpresa.
const CHANCE_EMOJI_SURPRESA = 0.15;
const EMOJIS_SURPRESA = [
    '🤡', '💀', '🐸', '🗿', '🤨', '🙄', '😈', '👻', '🤖', '👽', '🫠', '🥴', '🤯', '😴', '🤓',
    '🧐', '😬', '🫡', '🤌', '👏', '🙏', '💅', '🧠', '👑', '💩', '🍕', '🍿', '🥶', '🥵', '🌚',
    '🐒', '🦆', '🐔', '🐍', '🦄', '🐌', '🦖', '🚀', '⚡', '🌈', '🎉', '🎯', '🏆', '💯', '❓',
    '‼️', '🚨', '📉', '📈', '🤝', '👎', '🫶', '😭', '😡', '🥹', '😏', '😎', '🤠', '🥸', '🫣',
];

const RESPOSTAS = [
    'É verdade!',
    'É isso aí!',
    'Concordo total',
    'Falou tudo',
    'Kkkkkkk',
    'Nossa 😮',
    'Pior que é mesmo',
    'NÃO',
    'Não concordo',
    'Nada a ver',
    'Discordo totalmente',
];

// ---------- Grupo parado ----------
// Se ninguém falar num grupo por HORAS_SEM_MENSAGEM, o bot manda uma das mensagens abaixo.
// Ele manda UMA vez só: só volta a mandar depois que alguém falar e o grupo parar de novo.
const GRUPO_PARADO_LIGADO = true;
const HORAS_SEM_MENSAGEM = 3;
const MENSAGENS_GRUPO_PARADO = ['grupo MOLE'];
// Só manda nesse horário, para não acordar ninguém de madrugada
const HORA_INICIO = 9;  // a partir das 9h
const HORA_FIM = 23;    // até as 23h

// ---------- Figurinhas da coleção ----------
// Quando alguém manda figurinha num grupo, o bot às vezes guarda uma cópia na
// pasta "figurinhas-coletadas". Depois, às vezes responde com uma delas.
const CHANCE_FIGURINHA = 0.06;     // chance de responder com figurinha (6% das mensagens)
const CHANCE_GUARDAR = 0.3;        // chance de guardar uma figurinha que alguém mandou (30%)
const MAX_FIGURINHAS = 200;        // limite da coleção, para não lotar o computador
const PASTA_FIGURINHAS = path.join(__dirname, 'figurinhas-coletadas');

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

// Lista os arquivos da coleção (ou lista vazia se a pasta ainda não existe)
async function listarColecao() {
    try {
        return (await fs.readdir(PASTA_FIGURINHAS)).filter((n) => n.endsWith('.webp'));
    } catch {
        return [];
    }
}

// Às vezes guarda a figurinha que alguém mandou
async function talvezGuardarFigurinha(msg, client) {
    if (Math.random() >= CHANCE_GUARDAR) return;
    const colecao = await listarColecao();
    if (colecao.length >= MAX_FIGURINHAS) return;

    try {
        const media = await baixarMidia(client, msg);
        if (!media) return;
        const dados = Buffer.from(media.data, 'base64');

        // Como o nome vem do conteúdo, a mesma figurinha nunca é guardada duas vezes
        const nome = nomeDoArquivo(dados);
        if (colecao.includes(nome)) return;

        await fs.mkdir(PASTA_FIGURINHAS, { recursive: true });
        await fs.writeFile(path.join(PASTA_FIGURINHAS, nome), dados);
        console.log(`🗂️ Figurinha guardada na coleção (${colecao.length + 1}/${MAX_FIGURINHAS})`);
    } catch (erro) {
        console.error('Erro ao guardar figurinha:', erro.message || erro);
    }
}

// O nome de cada arquivo é um "hash" do conteúdo (a mesma figurinha sempre gera o mesmo nome)
const nomeDoArquivo = (dados) => crypto.createHash('sha1').update(dados).digest('hex').slice(0, 16) + '.webp';

// Tira uma figurinha da coleção (usado pelo !apagarfig). Devolve true se apagou.
async function removerDaColecao(dadosBase64) {
    try {
        await fs.unlink(path.join(PASTA_FIGURINHAS, nomeDoArquivo(Buffer.from(dadosBase64, 'base64'))));
        return true;
    } catch {
        return false; // não estava na coleção
    }
}

// Sorteia uma figurinha da coleção (ou null se estiver vazia)
async function figurinhaAleatoria() {
    const colecao = await listarColecao();
    if (colecao.length === 0) return null;
    const dados = await fs.readFile(path.join(PASTA_FIGURINHAS, sortear(colecao)), 'base64');
    return new MessageMedia('image/webp', dados);
}

// ---------- Lógica principal ----------
async function interagirEmGrupos(msg, client) {
    if (!LIGADO) return;

    // Só em grupos (o endereço de grupos termina com @g.us)
    if (!msg.from.endsWith('@g.us')) return detetive('não é grupo', msg);

    // Nunca interage com as próprias mensagens (senão ele responderia a si mesmo)
    if (msg.fromMe) return detetive('mensagem do próprio bot', msg);

    // Anota que o grupo está ativo (usado pelo "grupo parado").
    // Fica antes dos outros filtros: qualquer mensagem de pessoa conta, até figurinha.
    registrarAtividade(msg.from);

    // Alguém mandou figurinha? Talvez entre para a coleção.
    if (msg.type === 'sticker') {
        talvezGuardarFigurinha(msg, client);
        return detetive('era figurinha (só coleção)', msg);
    }

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
    } else if (sorteio < CHANCE_RESPONDER + CHANCE_REAGIR + CHANCE_FIGURINHA) {
        acao = 'figurinha';
    }
    if (!acao) return detetive('o sorteio disse que não', msg); // dessa vez não faz nada

    ultimaInteracao.set(msg.from, agora);

    try {
        // Espera de 2 a 6 segundos, para parecer uma pessoa digitando
        await esperar(2000 + Math.random() * 4000);

        // Se sorteou figurinha mas a coleção está vazia, reage em vez disso
        const figurinha = acao === 'figurinha' ? await figurinhaAleatoria() : null;
        if (acao === 'figurinha' && !figurinha) acao = 'reagir';

        if (acao === 'responder') {
            await msg.reply(sortear(RESPOSTAS));
        } else if (acao === 'figurinha') {
            await msg.reply(figurinha, undefined, { sendMediaAsSticker: true });
        } else {
            const surpresa = Math.random() < CHANCE_EMOJI_SURPRESA;
            await msg.react(sortear(surpresa ? EMOJIS_SURPRESA : REACOES));
        }
        console.log(`💬 Interação aleatória (${acao}) no grupo ${msg.from}`);
    } catch (erro) {
        console.error('Erro na interação aleatória:', erro);
    }
}

// ---------- Grupo parado ----------

// Caderninho: "grupo X → quando foi a última mensagem e se já mandamos o aviso"
const atividadeDosGrupos = new Map();

function registrarAtividade(grupoId) {
    atividadeDosGrupos.set(grupoId, { ultimaMensagem: Date.now(), avisado: false });
}

let vigiaIniciado = false;

// Chamado uma vez quando o bot fica pronto. A cada 10 minutos, confere todos os grupos.
function iniciarVigiaDeGrupos(client) {
    if (!LIGADO || !GRUPO_PARADO_LIGADO) return;
    if (vigiaIniciado) return; // evita criar dois vigias quando o bot reconecta
    vigiaIniciado = true;

    setInterval(async () => {
        const horaAgora = new Date().getHours();
        if (horaAgora < HORA_INICIO || horaAgora >= HORA_FIM) return;

        const limite = HORAS_SEM_MENSAGEM * 60 * 60 * 1000;

        for (const [grupoId, info] of atividadeDosGrupos) {
            if (info.avisado) continue;
            if (Date.now() - info.ultimaMensagem < limite) continue;

            info.avisado = true; // marca antes de enviar, para não mandar duas vezes
            try {
                await client.sendMessage(grupoId, sortear(MENSAGENS_GRUPO_PARADO));
                console.log(`😴 Grupo parado há ${HORAS_SEM_MENSAGEM}h, mandei mensagem: ${grupoId}`);
            } catch (erro) {
                console.error('Erro ao mandar mensagem de grupo parado:', erro);
            }
            await esperar(5000 + Math.random() * 10000); // se forem vários grupos, não manda tudo de uma vez
        }
    }, 10 * 60 * 1000);
}

// Deixa as funções disponíveis para o index.js usar
module.exports = { interagirEmGrupos, iniciarVigiaDeGrupos, removerDaColecao };
