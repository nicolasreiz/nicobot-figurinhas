// ============================================================
//  Download de mídia (correção do bug da whatsapp-web.js 1.34.7)
//
//  A função downloadMedia() da biblioteca esquece de dizer ao WhatsApp
//  qual é o tipo do arquivo (ex: "image/jpeg"). Sem essa informação o
//  WhatsApp assume "application/octet-stream" (= "arquivo qualquer"),
//  acha estranho uma imagem ser "arquivo qualquer" e recusa o download.
//
//  Esta é uma versão própria do download COM essa informação, e que
//  sempre explica no terminal em qual passo deu errado.
//  Quando sair uma versão nova da biblioteca com a correção, dá para
//  voltar a usar "alvo.downloadMedia()" e apagar este arquivo.
//  Mais detalhes: https://github.com/wwebjs/whatsapp-web.js/issues/201908
// ============================================================

const { MessageMedia } = require('whatsapp-web.js');

// CORREÇÃO 1 — o "RG" da mensagem mudou de nome.
// Em julho/2026 o WhatsApp Web passou a chamar o RG das mensagens de "$1",
// mas a biblioteca ainda procura pelo nome antigo "_serialized". Sem ele,
// baixar mídia, responder (reply) e reagir (react) procuram um RG vazio.
// Esta função copia o valor do nome novo para o nome antigo.
// Mais detalhes: https://github.com/wwebjs/whatsapp-web.js/issues/201833
function consertarId(mensagem) {
    if (mensagem && mensagem.id && !mensagem.id._serialized && mensagem.id.$1) {
        mensagem.id._serialized = mensagem.id.$1;
    }
    return mensagem;
}

// CORREÇÃO 2 — o tipo do arquivo (mimetype). Veja a explicação no topo do arquivo.

async function baixarMidia(client, mensagem) {
    if (!mensagem.hasMedia) return null;
    consertarId(mensagem);

    // Este bloco roda DENTRO do WhatsApp Web (no Chrome escondido),
    // por isso usa "window.require" para acessar as funções do WhatsApp.
    // Tudo aqui dentro tem try/catch: se um erro "escapasse" daqui, ele
    // chegaria ao nosso código só como "r: r", sem explicação nenhuma.
    const resultado = await client.pupPage.evaluate(async (msgId) => {
        const avisos = [];
        const explicar = (e) => `${e && e.name}: ${e && e.message} | ${String(e)}`;

        // 1) Acha a mensagem
        let msg;
        try {
            const colecao = window.require('WAWebCollections').Msg;
            msg = colecao.get(msgId) || (await colecao.getMessagesById([msgId]))?.messages?.[0];
        } catch (e) {
            return { erro: 'passo 1 (achar a mensagem): ' + explicar(e) };
        }
        if (!msg) return { erro: 'passo 1: mensagem não encontrada' };
        if (!msg.directPath || !msg.mediaKey) {
            return { erro: `passo 1: mensagem sem dados de mídia (estágio: ${msg.mediaData && msg.mediaData.mediaStage})` };
        }

        // 2) Tenta "preparar" a mídia do jeito do WhatsApp.
        //    Se falhar, NÃO desiste: o passo 3 baixa direto mesmo assim.
        try {
            if (msg.mediaData && msg.mediaData.mediaStage !== 'RESOLVED') {
                await msg.downloadMedia({ downloadEvenIfExpensive: true, rmrReason: 1 });
            }
        } catch (e) {
            avisos.push('passo 2 falhou, tentando baixar direto: ' + explicar(e));
        }

        // 3) Baixa e descriptografa o arquivo, informando o tipo (mimetype)
        try {
            // "Objeto coringa": o WhatsApp chama funções de estatística nele
            // (addPoint, addAnnotations...). Este aceita qualquer nome e não faz nada.
            const coringa = new Proxy(function () {}, {
                get: () => coringa,
                apply: () => coringa,
            });

            const arquivo = await window.require('WAWebDownloadManager').downloadManager.downloadAndMaybeDecrypt({
                directPath: msg.directPath,
                encFilehash: msg.encFilehash,
                filehash: msg.filehash,
                mediaKey: msg.mediaKey,
                mediaKeyTimestamp: msg.mediaKeyTimestamp,
                type: msg.type,
                mimetype: msg.mimetype, // <- A CORREÇÃO: a linha que faltava na biblioteca
                signal: new AbortController().signal,
                downloadQpl: coringa,
            });

            return {
                avisos,
                data: await window.WWebJS.arrayBufferToBase64Async(arquivo),
                mimetype: msg.mimetype,
                filename: msg.filename,
                filesize: msg.size,
            };
        } catch (e) {
            return { avisos, erro: 'passo 3 (baixar o arquivo): ' + explicar(e) };
        }
    }, mensagem.id._serialized);

    for (const aviso of resultado.avisos || []) console.log('⚠️', aviso);
    if (resultado.erro) throw new Error('Download falhou no ' + resultado.erro);

    return new MessageMedia(resultado.mimetype, resultado.data, resultado.filename, resultado.filesize);
}

module.exports = { baixarMidia, consertarId };
