// ============================================================
//  Funções úteis para grupos
//
//  Boas-vindas        → recebe quem entra no grupo
//  !topfala           → ranking de quem mais mandou mensagem na semana
//  !lembrete 30 texto → avisa no grupo daqui a 30 minutos
//  !aniversario 25/12 → cadastra seu aniversário (o bot dá parabéns no dia)
//  !aniversarios      → lista os próximos aniversários do grupo
//  !apagarfig         → (respondendo uma figurinha) tira ela da coleção do bot
//
//  Os dados que precisam sobreviver a um reinício (aniversários e contagem
//  de mensagens) ficam na pasta "dados", que NÃO vai para o GitHub.
//
//  Para remover: apague este arquivo e as linhas marcadas com "GRUPOS"
//  no index.js.
// ============================================================

const { idDe, marcar, sortear, esperar, autorDe, podeResponder, lerDados, salvarDados } = require('./util');
const { baixarMidia, consertarId } = require('./midia');
const { removerDaColecao } = require('./interacoes');
const { MessageMedia } = require('whatsapp-web.js');

// ---------- Configurações ----------
const BOAS_VINDAS_LIGADO = true;
const BOAS_VINDAS_COM_FOTO = true;     // manda a foto de perfil de quem entrou (se a pessoa tiver e deixar pública)
const ANIVERSARIOS_LIGADO = true;
const MAX_LEMBRETES_POR_GRUPO = 3;     // evita alguém encher o grupo de lembretes
const MAX_MINUTOS_LEMBRETE = 24 * 60;  // no máximo 24 horas
const HORA_PARABENS = 9;               // a partir de que horas o bot manda parabéns

const BOAS_VINDAS = [
    'chegou chegando! Manda uma figurinha pra provar que é humano 🗿',
    'bem-vindo(a)! Aqui a gente fala muito e resolve pouco 😎',
    'entrou no grupo mais caótico do WhatsApp. Boa sorte 🍀',
    'seja bem-vindo(a)! As regras são: não tem regras (mas respeita geral) 🤝',
    'apareceu! O grupo estava sentindo sua falta (mentira, nem te conhecia) 👀',
    'bem-vindo(a)! Digita *!profecia* pra saber o seu destino 🔮',
];

// ---------- Contador de mensagens (para o !topfala) ----------

// Segunda-feira da semana atual, no formato 2026-11-02. Muda toda semana.
function inicioDaSemana() {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // volta até a segunda-feira
    return d.toLocaleDateString('sv-SE');
}

let contagem = lerDados('contagem', { semana: inicioDaSemana(), grupos: {} });
let contagemMudou = false;

// Chamado a cada mensagem: soma +1 para quem mandou (só em grupos, sem contar o bot)
function registrarMensagem(msg) {
    if (!msg.from.endsWith('@g.us') || msg.fromMe) return;
    const pessoa = idDe(msg.author);
    if (!pessoa) return;

    if (contagem.semana !== inicioDaSemana()) contagem = { semana: inicioDaSemana(), grupos: {} }; // semana nova: zera
    const grupo = (contagem.grupos[msg.from] = contagem.grupos[msg.from] || {});
    grupo[pessoa] = (grupo[pessoa] || 0) + 1;
    contagemMudou = true; // salva no arquivo depois (ver iniciarVigiasGrupos)
}

async function topfala(msg) {
    if (contagem.semana !== inicioDaSemana()) contagem = { semana: inicioDaSemana(), grupos: {} };
    const grupo = contagem.grupos[msg.from] || {};

    // Object.entries transforma { pessoa: 10 } em [[pessoa, 10]] para dar para ordenar
    const top = Object.entries(grupo).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length === 0) return msg.reply('📈 Ainda não contei nenhuma mensagem nesta semana.');

    const medalhas = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const linhas = top.map(([id, n], i) => `${medalhas[i]} ${marcar(id)} — ${n} mensagens`).join('\n');
    return msg.reply(`📈 *QUEM MAIS FALA (semana)* 📈\n\n${linhas}\n\n_Conta desde que o bot ligou. Zera toda segunda._`,
        undefined, { mentions: top.map(([id]) => id) });
}

// ---------- Lembretes ----------
const lembretesAtivos = new Map(); // grupo → quantos lembretes estão esperando

async function lembrete(msg, client, resto) {
    const [minutosTexto, ...palavras] = resto.split(/\s+/);
    const minutos = parseInt(minutosTexto, 10);
    const texto = palavras.join(' ').trim();

    if (Number.isNaN(minutos) || !texto) return msg.reply('⏰ Use assim: *!lembrete 30 tirar a pizza do forno* (30 = minutos)');
    if (minutos < 1 || minutos > MAX_MINUTOS_LEMBRETE) return msg.reply(`⏰ Escolha entre 1 e ${MAX_MINUTOS_LEMBRETE} minutos.`);

    const ativos = lembretesAtivos.get(msg.from) || 0;
    if (ativos >= MAX_LEMBRETES_POR_GRUPO) return msg.reply(`⏰ Este grupo já tem ${MAX_LEMBRETES_POR_GRUPO} lembretes esperando. Espera um tocar!`);

    const autor = autorDe(msg, client);
    const grupoId = msg.from;
    lembretesAtivos.set(grupoId, ativos + 1);

    setTimeout(async () => {
        lembretesAtivos.set(grupoId, Math.max(0, (lembretesAtivos.get(grupoId) || 1) - 1));
        try {
            await client.sendMessage(grupoId, `⏰ *LEMBRETE* de ${marcar(autor)}:\n\n${texto}`, { mentions: [autor] });
        } catch (erro) {
            console.error('Erro ao mandar lembrete:', erro);
        }
    }, minutos * 60 * 1000);

    return msg.reply(`⏰ Combinado! Daqui a *${minutos} min* eu aviso.\n_(Se o bot reiniciar antes, o lembrete se perde.)_`);
}

// ---------- Aniversários ----------
// Formato guardado: { grupos: { grupoId: { pessoaId: "25/12" } }, parabenizados: { "grupo|pessoa": 2026 } }
let aniversarios = lerDados('aniversarios', { grupos: {}, parabenizados: {} });

async function cadastrarAniversario(msg, client, resto) {
    const encontrado = resto.match(/^(\d{1,2})\/(\d{1,2})$/); // procura algo como 25/12
    if (!encontrado) return msg.reply('🎂 Use assim: *!aniversario 25/12* (dia/mês)');

    const dia = Number(encontrado[1]);
    const mes = Number(encontrado[2]);
    const valido = mes >= 1 && mes <= 12 && dia >= 1 && dia <= new Date(2024, mes, 0).getDate(); // 2024 tem 29/02
    if (!valido) return msg.reply('🎂 Essa data não existe 🤨');

    const autor = autorDe(msg, client);
    const data = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
    aniversarios.grupos[msg.from] = aniversarios.grupos[msg.from] || {};
    aniversarios.grupos[msg.from][autor] = data;
    salvarDados('aniversarios', aniversarios);
    return msg.reply(`🎂 Anotado! Dia *${data}* eu apareço pra dar parabéns 🎉`);
}

async function listarAniversarios(msg) {
    const grupo = aniversarios.grupos[msg.from] || {};
    if (Object.keys(grupo).length === 0) return msg.reply('🎂 Ninguém cadastrou aniversário ainda. Use *!aniversario 25/12*');

    // Ordena a partir de hoje: quem faz aniversário mais cedo aparece primeiro
    const agora = new Date();
    const hojeNoAno = (agora.getMonth() + 1) * 100 + agora.getDate();
    const chave = (data) => {
        const [d, m] = data.split('/').map(Number);
        const valor = m * 100 + d;
        return valor >= hojeNoAno ? valor : valor + 10000; // já passou este ano → vai para o fim
    };
    const proximos = Object.entries(grupo).sort((a, b) => chave(a[1]) - chave(b[1])).slice(0, 10);

    // Sem "mentions": aparece o @número, mas NÃO notifica ninguém (evita marcar muita gente)
    const linhas = proximos.map(([id, data]) => `🎈 ${data} — ${marcar(id)}`).join('\n');
    return msg.reply(`🎂 *PRÓXIMOS ANIVERSÁRIOS* 🎂\n\n${linhas}`);
}

async function conferirAniversarios(client) {
    if (!ANIVERSARIOS_LIGADO) return;
    const agora = new Date();
    if (agora.getHours() < HORA_PARABENS || agora.getHours() >= 22) return;

    const hojeTexto = `${String(agora.getDate()).padStart(2, '0')}/${String(agora.getMonth() + 1).padStart(2, '0')}`;
    const ano = agora.getFullYear();

    for (const [grupoId, pessoas] of Object.entries(aniversarios.grupos)) {
        // Aniversariantes de hoje que ainda não ganharam parabéns este ano
        const aniversariantes = Object.entries(pessoas)
            .filter(([id, data]) => data === hojeTexto && aniversarios.parabenizados[`${grupoId}|${id}`] !== ano)
            .map(([id]) => id)
            .slice(0, 5);
        if (aniversariantes.length === 0) continue;

        // Marca antes de enviar, para nunca mandar duas vezes
        for (const id of aniversariantes) aniversarios.parabenizados[`${grupoId}|${id}`] = ano;
        salvarDados('aniversarios', aniversarios);

        try {
            await client.sendMessage(
                grupoId,
                `🎉🎂 *FELIZ ANIVERSÁRIO* 🎂🎉\n\n${aniversariantes.map(marcar).join(' ')}\n\nMuitos anos de vida, figurinhas e fofoca! 🥳`,
                { mentions: aniversariantes },
            );
            console.log(`🎂 Parabéns enviado no grupo ${grupoId}`);
        } catch (erro) {
            console.error('Erro ao mandar parabéns:', erro);
        }
        await esperar(5000 + Math.random() * 10000); // se forem vários grupos, não manda tudo junto
    }
}

// ---------- Tirar figurinha da coleção ----------
async function apagarFigurinha(msg, client) {
    if (!msg.hasQuotedMsg) return msg.reply('🗑️ Responda a figurinha que quer tirar da coleção com *!apagarfig*');
    const alvo = consertarId(await msg.getQuotedMessage());
    if (alvo.type !== 'sticker') return msg.reply('🗑️ Isso não é uma figurinha.');

    const media = await baixarMidia(client, alvo);
    const removeu = media && (await removerDaColecao(media.data));
    return msg.reply(removeu ? '🗑️ Pronto, essa figurinha saiu da coleção!' : '🤷 Essa figurinha não está na coleção.');
}

// ---------- Boas-vindas ----------

// Baixa a foto de perfil da pessoa. Devolve null se ela não tiver foto,
// se a foto estiver escondida na privacidade ou se der qualquer erro.
async function fotoDePerfil(client, pessoaId) {
    if (!BOAS_VINDAS_COM_FOTO) return null;
    try {
        const endereco = await client.getProfilePicUrl(pessoaId);
        if (!endereco) return null;
        // unsafeMime: o endereço da foto nem sempre termina em ".jpg", então não dá para adivinhar o tipo pelo nome
        const foto = await MessageMedia.fromUrl(endereco, { unsafeMime: true });
        if (!foto.mimetype || !foto.mimetype.startsWith('image/')) foto.mimetype = 'image/jpeg';
        return foto;
    } catch (erro) {
        console.log('ℹ️ Não consegui pegar a foto de perfil, vou mandar só o texto:', erro.message || erro);
        return null;
    }
}
const ultimaBoasVindas = new Map(); // grupo → horário (no máximo 1 boas-vindas por minuto por grupo)

async function boasVindas(client, aviso) {
    if (!BOAS_VINDAS_LIGADO) return;
    try {
        const grupoId = idDe(aviso.id && aviso.id.remote) || aviso.chatId;
        const chegaram = (aviso.recipientIds || []).map(idDe).filter(Boolean).slice(0, 5);
        if (!grupoId || chegaram.length === 0) return;

        const agora = Date.now();
        if (agora - (ultimaBoasVindas.get(grupoId) || 0) < 60 * 1000) return; // entrou muita gente de uma vez
        ultimaBoasVindas.set(grupoId, agora);

        await esperar(3000 + Math.random() * 3000);

        // Foi o próprio bot que entrou? Então ele se apresenta.
        const euMesmo = idDe(client.info && client.info.wid);
        if (chegaram.includes(euMesmo)) {
            await client.sendMessage(grupoId, '🤖 Oi, eu sou o *NicoBot*! Mande *!ajuda* para ver o que eu faço e *!brincadeiras* para os jogos 🎲');
            return;
        }

        const texto = `👋 ${chegaram.map(marcar).join(' ')} ${sortear(BOAS_VINDAS)}`;

        // Se entrou UMA pessoa só, tenta mandar a foto de perfil dela junto
        const foto = chegaram.length === 1 ? await fotoDePerfil(client, chegaram[0]) : null;
        let mandouFoto = false;
        if (foto) {
            try {
                await client.sendMessage(grupoId, foto, { caption: texto, mentions: chegaram });
                mandouFoto = true;
            } catch (erro) {
                console.log('ℹ️ Não consegui mandar a foto, vou mandar só o texto:', erro.message || erro);
            }
        }
        if (!mandouFoto) await client.sendMessage(grupoId, texto, { mentions: chegaram });
        console.log(`👋 Boas-vindas no grupo ${grupoId}${mandouFoto ? ' (com foto)' : ''}`);
    } catch (erro) {
        console.error('Erro nas boas-vindas:', erro);
    }
}

// ---------- Vigias (tarefas que rodam de tempos em tempos) ----------
let vigiasIniciados = false;

function iniciarVigiasGrupos(client) {
    if (vigiasIniciados) return; // evita criar vigias repetidos quando o bot reconecta
    vigiasIniciados = true;

    // A cada 1 minuto: salva a contagem de mensagens (se mudou)
    setInterval(() => {
        if (!contagemMudou) return;
        salvarDados('contagem', contagem);
        contagemMudou = false;
    }, 60 * 1000);

    // A cada 10 minutos: confere se alguém faz aniversário hoje
    setInterval(() => conferirAniversarios(client).catch((e) => console.error('Erro nos aniversários:', e)), 10 * 60 * 1000);
    conferirAniversarios(client).catch(() => {}); // e uma vez logo ao ligar
}

// ---------- Entrada principal dos comandos ----------
const COMANDOS = ['!topfala', '!lembrete', '!aniversario', '!aniversarios', '!apagarfig'];

async function comandosDeGrupo(msg, client) {
    const [primeira, ...outras] = (msg.body || '').trim().split(/\s+/);
    const comando = (primeira || '').toLowerCase();
    if (!COMANDOS.includes(comando)) return false;

    if (!msg.from.endsWith('@g.us')) {
        msg.reply('👥 Esse comando só funciona em *grupos*!').catch(() => {});
        return true;
    }
    if (!podeResponder(msg.from)) return true; // anti-spam compartilhado

    const resto = outras.join(' ').trim();
    try {
        if (comando === '!topfala') await topfala(msg);
        else if (comando === '!lembrete') await lembrete(msg, client, resto);
        else if (comando === '!aniversario') await cadastrarAniversario(msg, client, resto);
        else if (comando === '!aniversarios') await listarAniversarios(msg);
        else if (comando === '!apagarfig') await apagarFigurinha(msg, client);
        console.log(`👥 Comando ${comando} no grupo ${msg.from}`);
    } catch (erro) {
        console.error(`Erro no comando ${comando}:`, erro);
        msg.reply('😵 Deu erro nesse comando. Tenta de novo daqui a pouco.').catch(() => {});
    }
    return true;
}

module.exports = { comandosDeGrupo, registrarMensagem, boasVindas, iniciarVigiasGrupos };
