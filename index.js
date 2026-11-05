// ============================================================
//  Bot de Figurinhas para WhatsApp
//  Comando: !fig  (na legenda de uma imagem/vídeo, ou respondendo a uma)
// ============================================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { execSync } = require('child_process');
const { interagirEmGrupos, iniciarVigiaDeGrupos } = require('./interacoes'); // INTERAÇÕES (pode apagar)
const { baixarMidia, consertarId } = require('./midia');
const { deixarQuadrado } = require('./quadrado');
const { brincadeiras } = require('./brincadeiras'); // BRINCADEIRAS (pode apagar)
const { comandosDeGrupo, registrarMensagem, boasVindas, iniciarVigiasGrupos } = require('./grupos'); // GRUPOS (pode apagar)

// ---------- Configurações ----------
const COMANDO = '!fig';
const NOME_PACOTE = '-';
const AUTOR = 'NicoBot';
const DURACAO_MAX_VIDEO = 10; // segundos (o WhatsApp não aceita figurinha animada muito longa)
const CORTAR_QUADRADO = true; // true = corta o centro em quadrado | false = mantém a foto inteira com bordas transparentes

// ---------- Windows ou Linux? ----------
// O bot roda no seu PC (Windows) e no servidor (Linux). Cada sistema guarda
// os programas em lugares diferentes, então descobrimos onde está cada um.
const NO_WINDOWS = process.platform === 'win32';

// Procura um programa pelo nome e devolve o caminho dele (ou null se não achar).
// No Windows o comando para isso é "where"; no Linux é "which".
function acharPrograma(nome) {
    try {
        const comando = NO_WINDOWS ? `where ${nome}` : `which ${nome}`;
        return execSync(comando, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split(/\r?\n/)[0].trim() || null;
    } catch {
        return null;
    }
}

// Chrome: no Windows usa o Chrome instalado; no Linux procura o Chromium
const CHROME_PATH = NO_WINDOWS
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : acharPrograma('chromium-browser') || acharPrograma('chromium') || acharPrograma('google-chrome');

if (!CHROME_PATH) {
    console.error('❌ Não achei o Chromium. No servidor Linux, instale com: sudo apt install -y chromium-browser');
    process.exit(1);
}

// FFmpeg (usado para figurinhas animadas e para cortar em quadrado)
const FFMPEG_PATH = acharPrograma('ffmpeg') || 'ffmpeg';

// ---------- Criação do cliente ----------
// LocalAuth salva a sessão na pasta .wwebjs_auth, assim você só
// precisa escanear o QR Code na primeira vez.
const client = new Client({
    authStrategy: new LocalAuth(),
    ffmpegPath: FFMPEG_PATH,
    puppeteer: {
        executablePath: CHROME_PATH,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
});

// ---------- Eventos de conexão ----------
client.on('qr', (qr) => {
    console.log('\n📱 Escaneie o QR Code abaixo com o WhatsApp:');
    console.log('   (WhatsApp > Dispositivos conectados > Conectar dispositivo)\n');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => console.log('🔐 Autenticado!'));
client.on('auth_failure', (m) => console.error('❌ Falha na autenticação:', m));
client.on('ready', () => {
    console.log('✅ Bot pronto! Mande uma imagem com a legenda "!fig".');
    iniciarVigiaDeGrupos(client); // INTERAÇÕES (pode apagar)
    iniciarVigiasGrupos(client); // GRUPOS (pode apagar)
});

// Alguém entrou num grupo → boas-vindas
client.on('group_join', (aviso) => boasVindas(client, aviso)); // GRUPOS (pode apagar)
// Mostra a hora junto das mensagens, para saber QUANDO algo aconteceu
const hora = () => new Date().toLocaleTimeString('pt-BR');

// Se a conexão cair, tenta reconectar sozinho depois de 10 segundos
client.on('disconnected', async (motivo) => {
    console.log(`⚠️ [${hora()}] Desconectado:`, motivo);

    // LOGOUT = alguém desconectou o bot pelo celular. Aí não adianta tentar de novo:
    // é preciso apagar a pasta .wwebjs_auth e escanear o QR Code outra vez.
    if (motivo === 'LOGOUT') {
        console.log('🔑 O bot foi desconectado pelo celular. Apague a pasta .wwebjs_auth e rode npm start de novo.');
        return;
    }

    console.log('🔄 Tentando reconectar em 10 segundos...');
    setTimeout(async () => {
        try {
            await client.destroy();
            await client.initialize();
        } catch (erro) {
            console.error(`❌ [${hora()}] Não consegui reconectar:`, erro);
        }
    }, 10000);
});

// Rede de segurança: se algum erro "escapar" sem tratamento, mostra no
// terminal em vez de deixar o Node desligar o bot inteiro.
process.on('unhandledRejection', (erro) => {
    console.error(`🛟 [${hora()}] Erro não tratado (o bot continua rodando):`, erro);
});

// ---------- Lógica das figurinhas ----------
// 'message_create' pega mensagens recebidas E as que você mesmo envia,
// assim dá pra testar mandando mensagem pra você mesmo.
client.on('message_create', async (msg) => {
    consertarId(msg); // precisa vir primeiro: sem isso reply, react e download falham
    registrarMensagem(msg); // GRUPOS (pode apagar): conta mensagens para o !topfala
    const texto = (msg.body || '').trim().toLowerCase();

    if (texto === '!ajuda' || texto === '!help') {
        return msg.reply(
            '🤖 *Olá, eu sou o NicoBot, seu bot de Figurinhas*\n\n' +
            `• No privado: é só mandar uma *imagem* ou *vídeo curto*!\n` +
            `• Em grupos: mande com a legenda *${COMANDO}*\n` +
            `• Ou responda a uma imagem/vídeo com *${COMANDO}*\n` +
            `• Em grupos, mande *!brincadeiras* para ver os jogos 🎲\n\n` +
            `Vídeos: no máximo ${DURACAO_MAX_VIDEO} segundos.`
        ).catch((erro) => console.error('Erro ao responder !ajuda:', erro));
    }
    if (texto === '!ping') {
        return msg.reply('🏓 pong!').catch((erro) => console.error('Erro ao responder !ping:', erro));
    }

    if (await brincadeiras(msg, client)) return; // BRINCADEIRAS (pode apagar)
    if (await comandosDeGrupo(msg, client)) return; // GRUPOS (pode apagar)

    interagirEmGrupos(msg, client); // INTERAÇÕES (pode apagar)

    // No PRIVADO, qualquer foto ou vídeo vira figurinha automaticamente.
    // Nos GRUPOS continua precisando do !fig (senão toda foto do grupo viraria figurinha).
    // "!msg.fromMe" é essencial: sem ele o bot tentaria transformar a própria figurinha que acabou de mandar, sem parar.
    const ehGrupo = msg.from.endsWith('@g.us');
    const automatico = !msg.fromMe && !ehGrupo && msg.hasMedia && ['image', 'video'].includes(msg.type);

    if (texto !== COMANDO && !automatico) return;

    let alvo = msg;
    try {
        // 1) A mídia está na própria mensagem, ou na mensagem respondida?
        if (!msg.hasMedia && msg.hasQuotedMsg) {
            alvo = consertarId(await msg.getQuotedMessage());
        }

        if (!alvo.hasMedia) {
            return msg.reply(`❗ Mande uma imagem ou vídeo com a legenda *${COMANDO}*, ou responda a uma com *${COMANDO}*.`);
        }

        if (!['image', 'video', 'sticker'].includes(alvo.type)) {
            return msg.reply('❗ Só consigo transformar *imagens* e *vídeos* em figurinha.');
        }

        // 2) Checa a duração de vídeos
        if (alvo.type === 'video' && Number(alvo.duration) > DURACAO_MAX_VIDEO) {
            return msg.reply(`⏱️ Vídeo muito longo!!! Máximo de ${DURACAO_MAX_VIDEO} segundos.`);
        }

        // 3) Baixa a mídia
        const media = await baixarMidia(client, alvo); // em vez de alvo.downloadMedia(), que está com bug
        if (!media) {
            return msg.reply('❌ Não consegui baixar a mídia. Tente enviar de novo.');
        }

        // 4) Corta em quadrado (se a opção estiver ligada)
        const midiaFinal = CORTAR_QUADRADO ? await deixarQuadrado(media, FFMPEG_PATH) : media;

        // 5) Envia de volta como figurinha
        await msg.reply(midiaFinal, undefined, {
            sendMediaAsSticker: true,
            stickerName: NOME_PACOTE,
            stickerAuthor: AUTOR,
        });

        console.log(`🎨 Figurinha criada para ${msg.from} (${alvo.type})`);
    } catch (erro) {
        console.error('Erro ao criar figurinha:', erro);
        msg.reply('❌ Deu erro ao criar a figurinha. Tente outra imagem.').catch(() => {});
    }
});

console.log('🚀 Iniciando o bot... (a primeira vez pode demorar um pouco)');
client.initialize();
