// ============================================================
//  Bot de Figurinhas para WhatsApp
//  Comando: !fig  (na legenda de uma imagem/vídeo, ou respondendo a uma)
// ============================================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { execSync } = require('child_process');

// ---------- Configurações ----------
const COMANDO = '!fig';
const NOME_PACOTE = '-';
const AUTOR = 'NicoBot';
const DURACAO_MAX_VIDEO = 10; // segundos (o WhatsApp não aceita figurinha animada muito longa)

// Caminho do Chrome instalado no seu PC
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// Descobre onde o ffmpeg está instalado (usado para figurinhas animadas)
function acharFfmpeg() {
    try {
        return execSync('where ffmpeg').toString().split(/\r?\n/)[0].trim();
    } catch {
        return 'ffmpeg';
    }
}

// ---------- Criação do cliente ----------
// LocalAuth salva a sessão na pasta .wwebjs_auth, assim você só
// precisa escanear o QR Code na primeira vez.
const client = new Client({
    authStrategy: new LocalAuth(),
    ffmpegPath: acharFfmpeg(),
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
client.on('ready', () => console.log('✅ Bot pronto! Mande uma imagem com a legenda "!fig".'));
client.on('disconnected', (motivo) => console.log('⚠️ Desconectado:', motivo));

// ---------- Lógica das figurinhas ----------
// 'message_create' pega mensagens recebidas E as que você mesmo envia,
// assim dá pra testar mandando mensagem pra você mesmo.
client.on('message_create', async (msg) => {
    const texto = (msg.body || '').trim().toLowerCase();

    if (texto === '!ajuda' || texto === '!help') {
        return msg.reply(
            '🤖 *Olá, eu sou o NicoBot, seu bot de Figurinhas*\n\n' +
            `• Envie uma *imagem* ou *vídeo curto* com a legenda *${COMANDO}*\n` +
            `• Ou responda a uma imagem/vídeo com *${COMANDO}*\n\n` +
            `Vídeos: no máximo ${DURACAO_MAX_VIDEO} segundos.`
        );
    }
    if (texto === '!ping') {
        return msg.reply('🏓 pong!');
    }

    if (texto !== COMANDO) return;

    try {
        // 1) A mídia está na própria mensagem, ou na mensagem respondida?
        let alvo = msg;
        if (!msg.hasMedia && msg.hasQuotedMsg) {
            alvo = await msg.getQuotedMessage();
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
        const media = await alvo.downloadMedia();
        if (!media) {
            return msg.reply('❌ Não consegui baixar a mídia. Tente enviar de novo.');
        }

        // 4) Envia de volta como figurinha
        await msg.reply(media, undefined, {
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
