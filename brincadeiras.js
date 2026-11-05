// ============================================================
//  Brincadeiras para grupos
//
//  !match @pessoa1 @pessoa2   → porcentagem de match (até 5 pessoas)
//  !casal [3]                 → o casal (ou trisal...) da vez
//  !quem <pergunta>           → o bot escolhe alguém do grupo
//  !ranking <coisa>           → top 3 do grupo em alguma coisa
//  !nivel <coisa> @pessoa     → mede o nível de algo em alguém
//  !profecia                  → uma previsão maluca para o seu dia
//  !detector (respondendo)    → detector de mentira na mensagem respondida
//  !duelo @pessoa             → batalha de RPG narrada
//  !julgamento @pessoa        → tribunal com crime absurdo e sentença
//  !oraculo <pergunta>        → o oráculo responde sim, não ou talvez
//  !preco @pessoa             → quanto a pessoa vale no mercado
//  !sorteio [2]               → sorteio DE VERDADE entre os membros
//  !brincadeiras              → mostra esta lista no WhatsApp
//
//  O DIFERENCIAL: a maioria dos resultados é "do dia". Se pedirem o
//  mesmo match duas vezes no mesmo dia, o resultado é o mesmo, como se
//  o universo tivesse decidido. No dia seguinte, muda tudo.
//  Isso também evita que fiquem repetindo o comando até sair o resultado
//  que querem (menos spam = menos risco de banimento).
//
//  Para remover: apague este arquivo e as linhas marcadas com
//  "BRINCADEIRAS" no index.js.
// ============================================================

const {
    idDe, marcar, sortear, esperar, sorteioDoDia, sortearDoDia, embaralharDoDia,
    barra, membrosDoGrupo, autorDe, podeResponder,
} = require('./util');
const { consertarId } = require('./midia');

// ---------- Configurações ----------
const LIGADO = true;

// De quanto em quanto tempo o !casal troca de casal.
// 60 = um casal novo a cada hora | 0 = casal novo toda vez que alguém pedir
const TROCAR_CASAL_A_CADA_MINUTOS = 60;

// Nome do "casal" de acordo com quantas pessoas
const NOMES_CASAL = { 2: 'CASAL', 3: 'TRISAL', 4: 'QUADRISAL', 5: 'PENTASAL' };
const MAX_PESSOAS = 5; // limite para não marcar gente demais numa mensagem

// ---------- Textos (pode adicionar os seus!) ----------

const PROFECIAS = [
    'um pombo vai te encarar hoje. Não desvie o olhar, é um teste 🐦',
    'em 2031 você vai ser preso por roubar uma única uva no mercado 🍇',
    'sua próxima vida vai ser como capivara. Uma capivara rica, pelo menos',
    'hoje um sapo vai saber seu nome. Não pergunte como 🐸',
    'você vai ganhar na loteria, mas vai perder o bilhete dentro de uma coxinha',
    'os ETs já escolheram você. Só estão esperando você lavar a louça 👽',
    'seu travesseiro está planejando algo. Durma de olho aberto 👁️',
    'hoje você vai tropeçar no nada e fingir que foi de propósito',
    'um gato vai te julgar profundamente nas próximas 24 horas 🐈',
    'daqui a 7 anos você vai abrir uma pastelaria chamada "Pastel de Vento" e ficar milionário',
    'o micro-ondas da sua casa sabe de coisas. Coisas demais',
    'sua sombra pediu demissão. Ela sai sexta-feira',
    'hoje você vai pensar numa resposta perfeita para uma briga de 2019',
    'você foi um pato num reality show em outra vida e perdeu na final 🦆',
    'um desconhecido vai te chamar de "chefe" e isso vai mudar seu dia',
    'seu Wi-Fi vai cair exatamente no momento mais importante. É o destino',
    'em breve você vai descobrir que sempre falou uma palavra errado a vida toda',
    'uma galinha vai cruzar seu caminho. Ela sabe o que fez 🐔',
    'você vai ser famoso, mas só no Paraguai 🇵🇾',
    'hoje você vai abrir a geladeira 14 vezes procurando algo que não existe',
    'o universo mandou avisar: aquele áudio de 4 minutos não precisava ter sido enviado',
    'sua alma gêmea está agora mesmo comendo miojo cru em algum lugar do Brasil',
    'um cachorro vai te escolher como líder. Aceite o cargo 🐕',
    'em 2029 você vai inventar um sabor de Doritos e ninguém vai acreditar',
    'hoje uma música vai grudar na sua cabeça e só vai sair na terça que vem',
    'o seu eu do futuro está muito decepcionado com o que você vai almoçar hoje',
    'você vai cochilar 5 minutos e acordar em outro século ⏳',
    'uma formiga carregou uma migalha sua e agora você é uma lenda no formigueiro 🐜',
    'você vai receber uma ligação de um número desconhecido. É o seu destino. Não atenda',
    'as estrelas dizem que você deve muito dinheiro para um duende 🧌',
];

const VEREDITOS_DETECTOR = [
    [90, '🚨 MENTIRA DESCARADA. Nem o Pinóquio teria coragem.'],
    [70, '🤥 Isso aí tem cheiro de mentira de longe.'],
    [50, '🤔 Meia verdade... ou meia mentira. O detector está confuso.'],
    [30, '🧐 Parece verdade, mas o detector está de olho.'],
    [10, '✅ Verdade. O detector até se emocionou.'],
    [0, '😇 Verdade pura. Pode jurar de pé junto.'],
];

const ARMAS_DUELO = [
    'chinelo voador 🩴', 'pastel de vento 🥟', 'áudio de 5 minutos 🎙️', 'olhar de mãe brava 👁️',
    'espada de isopor ⚔️', 'grito de "TÁ PAGO" 💪', 'pombo adestrado 🐦', 'figurinha amaldiçoada 🗿',
    'boleto vencido 🧾', 'abraço sufocante 🤗', 'mochila de rodinha 🎒', 'caneta que não funciona 🖊️',
    'raio do Wi-Fi 📶', 'galinha de estimação 🐔', 'tapa de luva de pelica 🧤', 'buzina de caminhão 🚚',
];

const CRIMES = [
    'roubar o último pão de queijo de 2019',
    'deixar o grupo no vácuo por 3 dias',
    'mandar "kkkk" sem achar graça',
    'colocar ketchup na pizza',
    'dar spoiler do final da novela',
    'visualizar e não responder',
    'cantar no chuveiro em volume criminoso',
    'fingir que não viu a mensagem do grupo',
    'levar o carregador de alguém e nunca devolver',
    'falar "vou ali" e sumir por 6 horas',
    'comer a comida dos outros na geladeira',
    'mandar figurinha em vez de responder',
    'ter mais de 4 mil mensagens não lidas',
    'chegar atrasado no próprio aniversário',
];

const PENAS = [
    'lavar a louça por 7 dias seguidos 🍽️',
    'ficar 1 hora sem celular 📵',
    'pagar um açaí para o grupo inteiro 🍧',
    'usar foto de perfil de batata por uma semana 🥔',
    'ouvir pagode de 2005 no volume máximo 🎶',
    'responder todo mundo com "sim senhor" hoje',
    'mandar bom dia no grupo da família por 30 dias ☀️',
    'dançar a dança do siri em público 🦀',
    'ser o último a escolher time no futebol ⚽',
];

const RESPOSTAS_ORACULO = [
    'Sim. As estrelas não mentem ✨',
    'Não. Nem se o mundo acabar 🌍',
    'Talvez... depende do quanto você quer 👀',
    'Com toda certeza do universo 🌌',
    'Jamais. O oráculo até riu da pergunta 😂',
    'Pergunte de novo amanhã, hoje o oráculo está de folga 😴',
    'Os búzios disseram sim, mas a minha intuição disse não 🐚',
    'Sim, mas vai dar trabalho 😮‍💨',
    'Não conte com isso 🙅',
    'O destino ainda está decidindo... ⏳',
];

const ITENS_PRECO = [
    'meio pastel', 'um chiclete usado', 'três balas de goma', 'um vale-coxinha', 'uma tampinha de garrafa',
    'um pacote de bolacha recheada', 'um Fusca 1978', 'uma galinha caipira', 'dois passes de ônibus',
    'uma figurinha rara da Copa', 'um coco gelado', 'um pão francês amanhecido',
];

// ---------- As brincadeiras ----------

function comentarioDoMatch(p) {
    if (p >= 90) return '💍 Já podem marcar o casamento!';
    if (p >= 70) return '😍 Tem química demais!';
    if (p >= 50) return '😏 Hmm... tem chance!';
    if (p >= 30) return '🤔 Melhor ficar na amizade.';
    if (p >= 10) return '😬 Vixe...';
    return '💀 Nem em outra vida.';
}

async function match(msg, client, mencionados) {
    // "!match @fulano" = você + fulano | "!match @a @b @c" = trisal... até MAX_PESSOAS
    let pessoas = [...new Set(mencionados)]; // "new Set" tira repetidos
    if (pessoas.length === 1) {
        const autor = autorDe(msg, client);
        if (autor === pessoas[0]) return msg.reply('🪞 Amor próprio: *100%*. Sempre.');
        pessoas = [autor, pessoas[0]];
    }
    if (pessoas.length < 2) {
        return msg.reply('💘 Use assim: *!match @pessoa1 @pessoa2* (pode marcar até 5) ou só *!match @pessoa* para testar com você');
    }
    pessoas = pessoas.slice(0, MAX_PESSOAS);

    // Ordena para a ordem não importar: "A com B" dá o mesmo que "B com A"
    const p = Math.round(sorteioDoDia(`match|${[...pessoas].sort().join('+')}`) * 100);
    const titulo = pessoas.length === 2 ? 'MATCH' : `MATCH DO ${NOMES_CASAL[pessoas.length]}`;
    return msg.reply(
        `💘 *${titulo}* 💘\n\n${pessoas.map(marcar).join(' + ')}\n\n${barra(p)} *${p}%*\n${comentarioDoMatch(p)}`,
        undefined,
        { mentions: pessoas },
    );
}

async function casal(msg, client, resto) {
    // "!casal" = 2 pessoas | "!casal 3" = trisal | ... até MAX_PESSOAS
    const pedido = parseInt(resto, 10);
    const quantas = Number.isNaN(pedido) ? 2 : Math.min(Math.max(pedido, 2), MAX_PESSOAS);

    const membros = await membrosDoGrupo(msg.from, client);
    if (membros.length < quantas) return msg.reply(`😅 Preciso de pelo menos ${quantas} pessoas no grupo.`);

    // "Rodada": muda a cada TROCAR_CASAL_A_CADA_MINUTOS. Na mesma rodada, mesmo casal.
    let rodada;
    let rodape;
    if (TROCAR_CASAL_A_CADA_MINUTOS > 0) {
        const tamanho = TROCAR_CASAL_A_CADA_MINUTOS * 60 * 1000;
        rodada = Math.floor(Date.now() / tamanho);
        const faltam = Math.ceil((tamanho - (Date.now() % tamanho)) / 60000);
        rodape = `_O universo decidiu. Novo casal em ${faltam} min._`;
    } else {
        rodada = Math.random();
        rodape = '_Pede de novo que o universo muda de ideia._';
    }

    // A quantidade entra no sorteio: o trisal da rodada é diferente do casal da rodada
    const escolhidos = embaralharDoDia(membros, `casal|${msg.from}|${rodada}|${quantas}`).slice(0, quantas);
    const p = 70 + Math.round(sorteioDoDia(`casal-p|${msg.from}|${rodada}|${quantas}`) * 30);
    return msg.reply(
        `💑 *${NOMES_CASAL[quantas]} DA VEZ* 💑\n\n${escolhidos.map(marcar).join(' ❤️ ')}\n\n${barra(p)} *${p}%*\n${rodape}`,
        undefined,
        { mentions: escolhidos },
    );
}

async function quem(msg, client, resto) {
    if (!resto) return msg.reply('🤔 Use assim: *!quem vai casar primeiro?*');
    const membros = await membrosDoGrupo(msg.from, client);
    if (membros.length === 0) return;

    const pergunta = resto.replace(/\?*$/, '?');
    const [escolhido] = embaralharDoDia(membros, `quem|${msg.from}|${pergunta.toLowerCase()}`);
    return msg.reply(`🔮 *Quem ${pergunta}*\n\nCom certeza é ${marcar(escolhido)} 👀`, undefined, { mentions: [escolhido] });
}

async function ranking(msg, client, resto) {
    if (!resto) return msg.reply('🏆 Use assim: *!ranking atrasados*');
    const membros = await membrosDoGrupo(msg.from, client);
    if (membros.length === 0) return;

    const top = embaralharDoDia(membros, `ranking|${msg.from}|${resto.toLowerCase()}`).slice(0, 3);
    const medalhas = ['🥇', '🥈', '🥉'];
    const linhas = top.map((id, i) => `${medalhas[i]} ${marcar(id)}`).join('\n');
    return msg.reply(`🏆 *RANKING: mais ${resto}* 🏆\n\n${linhas}`, undefined, { mentions: top });
}

async function nivel(msg, client, resto, mencionados) {
    const coisa = resto.replace(/@\S+/g, '').trim(); // tira as menções do texto
    if (!coisa) return msg.reply('📊 Use assim: *!nivel preguiça @pessoa* (sem @ mede você)');
    const alvo = mencionados[0] || autorDe(msg, client);

    const p = Math.round(sorteioDoDia(`nivel|${alvo}|${coisa.toLowerCase()}`) * 100);
    return msg.reply(`📊 *Nível de ${coisa}* de ${marcar(alvo)}\n\n${barra(p)} *${p}%*`, undefined, { mentions: [alvo] });
}

async function profecia(msg, client) {
    const autor = autorDe(msg, client);
    return msg.reply(`🔮 ${marcar(autor)}, ${sortearDoDia(PROFECIAS, `profecia|${autor}`)}`, undefined, { mentions: [autor] });
}

// 🕵️ Detector de mentira: precisa ser usado RESPONDENDO uma mensagem
async function detector(msg) {
    if (!msg.hasQuotedMsg) return msg.reply('🕵️ Responda a mensagem suspeita com *!detector*');
    const suspeita = consertarId(await msg.getQuotedMessage());

    // O resultado depende do "RG" da mensagem: a mesma mensagem sempre dá o mesmo resultado
    const p = Math.round(sorteioDoDia(`detector|${idDe(suspeita.id)}`) * 100);
    const [, veredito] = VEREDITOS_DETECTOR.find(([minimo]) => p >= minimo);
    const texto = `🕵️ *DETECTOR DE MENTIRA* 🕵️\n\nAnalisando mensagem... 📡\n\n${barra(p)} *${p}% MENTIRA*\n${veredito}`;

    // Responde em cima da mensagem suspeita (se não der, responde quem pediu)
    return suspeita.reply(texto).catch(() => msg.reply(texto));
}

// ⚔️ Duelo: batalha narrada em rodadas. Esse é sorteio de verdade (muda toda vez).
async function duelo(msg, client, mencionados) {
    const autor = autorDe(msg, client);
    const rival = mencionados[0];
    if (!rival) return msg.reply('⚔️ Use assim: *!duelo @pessoa*');
    if (rival === autor) return msg.reply('🪞 Você lutou contra você mesmo e... os dois perderam.');

    const lutadores = [autor, rival];
    const vida = { [autor]: 100, [rival]: 100 }; // começam com 100 de vida
    const linhas = [`⚔️ *DUELO* ⚔️\n${marcar(autor)} 🆚 ${marcar(rival)}\n`];

    for (let rodada = 1; rodada <= 3; rodada++) {
        for (const [i, atacante] of lutadores.entries()) {
            const defensor = lutadores[1 - i];
            const critico = Math.random() < 0.15; // 15% de chance de golpe crítico
            const dano = Math.floor(10 + Math.random() * 25) * (critico ? 2 : 1);
            vida[defensor] = Math.max(0, vida[defensor] - dano);
            linhas.push(`${critico ? '💥' : '👊'} ${marcar(atacante)} usou *${sortear(ARMAS_DUELO)}* e causou *${dano}* de dano${critico ? ' (CRÍTICO!)' : ''}`);
            if (vida[defensor] === 0) break;
        }
        if (Object.values(vida).includes(0)) break;
    }

    const vencedor = vida[autor] >= vida[rival] ? autor : rival;
    linhas.push(`\n❤️ ${marcar(autor)}: ${vida[autor]} | ❤️ ${marcar(rival)}: ${vida[rival]}`);
    linhas.push(`🏆 *${marcar(vencedor)} VENCEU!*`);
    return msg.reply(linhas.join('\n'), undefined, { mentions: lutadores });
}

// ⚖️ Julgamento: crime, veredito e pena do dia
async function julgamento(msg, mencionados) {
    const reu = mencionados[0];
    if (!reu) return msg.reply('⚖️ Use assim: *!julgamento @pessoa*');

    const crime = sortearDoDia(CRIMES, `crime|${reu}`);
    const culpado = sorteioDoDia(`veredito|${reu}`) < 0.7; // 70% de chance de ser culpado (é a vida)
    const pena = sortearDoDia(PENAS, `pena|${reu}`);

    const texto = culpado
        ? `⚖️ *TRIBUNAL DO GRUPO* ⚖️\n\nRéu: ${marcar(reu)}\nAcusação: *${crime}*\n\n🔨 Veredito: *CULPADO!*\nPena: ${pena}`
        : `⚖️ *TRIBUNAL DO GRUPO* ⚖️\n\nRéu: ${marcar(reu)}\nAcusação: *${crime}*\n\n🕊️ Veredito: *INOCENTE!* Desta vez...`;
    return msg.reply(texto, undefined, { mentions: [reu] });
}

// 🔮 Oráculo: mesma pergunta no mesmo dia, mesma resposta
async function oraculo(msg, resto) {
    if (!resto) return msg.reply('🔮 Use assim: *!oraculo vou ficar rico?*');
    const resposta = sortearDoDia(RESPOSTAS_ORACULO, `oraculo|${resto.toLowerCase()}`);
    return msg.reply(`🔮 *O ORÁCULO RESPONDE* 🔮\n\n_"${resto}"_\n\n${resposta}`);
}

// 💸 Preço de mercado da pessoa
async function preco(msg, client, mencionados) {
    const alvo = mencionados[0] || autorDe(msg, client);
    const reais = (sorteioDoDia(`preco|${alvo}`) * 50).toFixed(2).replace('.', ',');
    const item = sortearDoDia(ITENS_PRECO, `preco-item|${alvo}`);
    return msg.reply(`💸 *VALOR DE MERCADO* 💸\n\n${marcar(alvo)} vale *R$ ${reais}* e ${item}.\n_Aceitamos Pix._`, undefined, { mentions: [alvo] });
}

// 🎁 Sorteio DE VERDADE (para rifas e decisões): muda toda vez
async function sorteio(msg, client, resto) {
    const pedido = parseInt(resto, 10);
    const quantas = Number.isNaN(pedido) ? 1 : Math.min(Math.max(pedido, 1), MAX_PESSOAS);
    const membros = await membrosDoGrupo(msg.from, client);
    if (membros.length < quantas) return msg.reply(`😅 O grupo não tem ${quantas} pessoas.`);

    // Embaralha de verdade e pega os primeiros
    const ganhadores = [...membros].sort(() => Math.random() - 0.5).slice(0, quantas);
    await msg.reply('🥁 Sorteando...');
    await esperar(2000); // suspense
    return msg.reply(`🎁 *RESULTADO DO SORTEIO* 🎁\n\n${ganhadores.map((id) => `🎉 ${marcar(id)}`).join('\n')}`, undefined, { mentions: ganhadores });
}

function lista(msg) {
    return msg.reply(
        '🎲 *BRINCADEIRAS* 🎲\n\n' +
        '💘 *!match @pessoa1 @pessoa2* (até 5)\n' +
        '💑 *!casal* ou *!casal 3* para trisal\n' +
        '🔮 *!quem* vai casar primeiro?\n' +
        '🏆 *!ranking* atrasados\n' +
        '📊 *!nivel* preguiça @pessoa\n' +
        '✨ *!profecia*\n' +
        '🕵️ *!detector* (respondendo uma mensagem)\n' +
        '⚔️ *!duelo @pessoa*\n' +
        '⚖️ *!julgamento @pessoa*\n' +
        '🔮 *!oraculo* vou ficar rico?\n' +
        '💸 *!preco @pessoa*\n' +
        '🎁 *!sorteio* ou *!sorteio 3*\n\n' +
        '👥 *FUNÇÕES DO GRUPO*\n' +
        '📈 *!topfala* (quem mais fala na semana)\n' +
        '⏰ *!lembrete 30 tirar a pizza*\n' +
        '🎂 *!aniversario 25/12* e *!aniversarios*\n\n' +
        '_A maioria dos resultados muda todo dia!_',
    );
}

// ---------- Entrada principal ----------
// Devolve true se a mensagem era uma brincadeira (aí o index.js não precisa fazer mais nada).
const COMANDOS = [
    '!match', '!casal', '!quem', '!ranking', '!nivel', '!profecia', '!detector',
    '!duelo', '!julgamento', '!oraculo', '!preco', '!sorteio', '!brincadeiras',
];

async function brincadeiras(msg, client) {
    if (!LIGADO) return false;

    const [primeira, ...outras] = (msg.body || '').trim().split(/\s+/);
    const comando = (primeira || '').toLowerCase();
    if (!COMANDOS.includes(comando)) return false;

    if (!msg.from.endsWith('@g.us')) {
        msg.reply('🎲 As brincadeiras só funcionam em *grupos*!').catch(() => {});
        return true;
    }

    // Anti-spam compartilhado: ignora em silêncio se pediram rápido demais
    if (!podeResponder(msg.from)) return true;

    const resto = outras.join(' ').trim();
    const mencionados = (msg.mentionedIds || []).map(idDe).filter(Boolean);

    try {
        if (comando === '!match') await match(msg, client, mencionados);
        else if (comando === '!casal') await casal(msg, client, resto);
        else if (comando === '!quem') await quem(msg, client, resto);
        else if (comando === '!ranking') await ranking(msg, client, resto);
        else if (comando === '!nivel') await nivel(msg, client, resto, mencionados);
        else if (comando === '!profecia') await profecia(msg, client);
        else if (comando === '!detector') await detector(msg);
        else if (comando === '!duelo') await duelo(msg, client, mencionados);
        else if (comando === '!julgamento') await julgamento(msg, mencionados);
        else if (comando === '!oraculo') await oraculo(msg, resto);
        else if (comando === '!preco') await preco(msg, client, mencionados);
        else if (comando === '!sorteio') await sorteio(msg, client, resto);
        else if (comando === '!brincadeiras') await lista(msg);
        console.log(`🎲 Brincadeira ${comando} no grupo ${msg.from}`);
    } catch (erro) {
        console.error(`Erro na brincadeira ${comando}:`, erro);
        msg.reply('😵 Deu erro nessa brincadeira. Tenta de novo daqui a pouco.').catch(() => {});
    }
    return true;
}

module.exports = { brincadeiras };
