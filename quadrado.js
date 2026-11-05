// ============================================================
//  Corta imagens e vídeos em QUADRADO (pegando o centro)
//
//  Sem isso, a biblioteca encolhe a foto e preenche o que sobra com
//  fundo transparente, deixando a figurinha com "bordas" vazias.
//  Aqui usamos o FFmpeg (o mesmo das figurinhas animadas) para cortar
//  antes de transformar em figurinha.
// ============================================================

const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { MessageMedia } = require('whatsapp-web.js');

const executar = promisify(execFile);

// Filtro do FFmpeg, lido em português:
//   crop=  → corta um quadrado do tamanho do MENOR lado (largura ou altura).
//            Sem posição informada, o FFmpeg corta bem do centro.
//   scale= → redimensiona para 512x512, o tamanho padrão de figurinha.
const FILTRO_QUADRADO = "crop='min(iw,ih)':'min(iw,ih)',scale=512:512";

async function deixarQuadrado(media, caminhoFfmpeg) {
    const ehImagem = media.mimetype.startsWith('image/');
    const ehVideo = media.mimetype.startsWith('video/');

    // Figurinhas (webp) já são quadradas; outros tipos não mexemos
    if ((!ehImagem && !ehVideo) || media.mimetype.includes('webp')) return media;

    // O FFmpeg trabalha com arquivos, então salvamos numa pasta temporária do Windows
    const nome = `figurinha-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const entrada = path.join(os.tmpdir(), `${nome}-entrada`);
    const saida = path.join(os.tmpdir(), `${nome}-saida.${ehImagem ? 'png' : 'mp4'}`);

    try {
        await fs.writeFile(entrada, Buffer.from(media.data, 'base64'));

        const opcoes = ehImagem
            ? ['-y', '-i', entrada, '-vf', FILTRO_QUADRADO, '-frames:v', '1', saida]
            : ['-y', '-i', entrada, '-vf', FILTRO_QUADRADO, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', saida];

        await executar(caminhoFfmpeg, opcoes);

        const dados = await fs.readFile(saida, 'base64');
        return new MessageMedia(ehImagem ? 'image/png' : 'video/mp4', dados, media.filename);
    } finally {
        // "finally" roda sempre, dando certo ou errado: apaga os arquivos temporários
        await fs.unlink(entrada).catch(() => {});
        await fs.unlink(saida).catch(() => {});
    }
}

module.exports = { deixarQuadrado };
