// ============================================================
//  Ferramentas compartilhadas
//  Funções usadas por mais de um arquivo (brincadeiras.js, grupos.js...).
//  Ter tudo num lugar só evita repetir o mesmo código em vários arquivos.
// ============================================================

const fs = require('fs');
const path = require('path');

// O WhatsApp às vezes entrega o "RG" da pessoa como texto e às vezes
// como objeto (e com o nome novo "$1"). Esta função sempre devolve texto.
function idDe(x) {
    if (!x) return null;
    if (typeof x === 'string') return x;
    return x._serialized || x.$1 || null;
}

// "5511999999999@c.us" → "5511999999999" (o número que vai depois do @ na menção)
const numero = (id) => id.split('@')[0];
const marcar = (id) => `@${numero(id)}`;

// Sorteia um item de uma lista (sorteio "de verdade", muda toda vez)
const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

// Espera alguns milissegundos (1000 ms = 1 segundo)
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Hoje no formato 2026-11-04 (para os resultados "do dia")
const hoje = () => new Date().toLocaleDateString('sv-SE');

// Sorteio "do dia": o mesmo texto no mesmo dia sempre dá o mesmo número (de 0 a 1).
// Funciona transformando o texto num número (isso se chama "hash").
function sorteioDoDia(texto) {
    let hash = 2166136261;
    for (const letra of `${texto}|${hoje()}`) {
        hash ^= letra.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967295;
}

// Sorteia um item da lista usando o sorteio do dia (mesmo item o dia todo)
const sortearDoDia = (lista, semente) => lista[Math.floor(sorteioDoDia(semente) * lista.length) % lista.length];

// Embaralha uma lista usando o sorteio do dia (mesma ordem o dia todo)
function embaralharDoDia(lista, semente) {
    return [...lista]
        .map((item, i) => ({ item, ordem: sorteioDoDia(`${semente}|${item}|${i}`) }))
        .sort((a, b) => a.ordem - b.ordem)
        .map((x) => x.item);
}

// Barrinha visual: 70% → ▰▰▰▰▰▰▰▱▱▱
function barra(porcentagem) {
    const cheios = Math.round(porcentagem / 10);
    return '▰'.repeat(cheios) + '▱'.repeat(10 - cheios);
}

// Pega a lista de membros do grupo (sem o próprio bot).
// Não usamos msg.getChat() porque ele quebra com o bug do "RG" ($1 no lugar
// de _serialized). Então buscamos os membros direto dentro do WhatsApp Web.
async function membrosDoGrupo(grupoId, client) {
    const resultado = await client.pupPage.evaluate(async (grupoId) => {
        try {
            const wid = window.require('WAWebWidFactory').createWid(grupoId);
            const chat = window.require('WAWebCollections').Chat.get(wid);
            if (!chat || !chat.groupMetadata) return { erro: 'grupo não encontrado' };

            // Atualiza a lista de membros (se falhar, usa a que já tem)
            try {
                const colecoes = window.require('WAWebCollections');
                await (colecoes.GroupMetadata || colecoes.WAWebGroupMetadataCollection).update(wid);
            } catch (e) { /* segue com a lista atual */ }

            // Converte o "RG" novo (@lid) para o número de telefone (@c.us), quando possível
            let paraTelefone = null;
            try { paraTelefone = window.require('WAWebLidMigrationUtils').toPn; } catch (e) { /* sem conversão */ }

            const participantes = chat.groupMetadata.participants;
            const lista = typeof participantes.getModelsArray === 'function'
                ? participantes.getModelsArray()
                : Array.from(participantes || []);

            const ids = lista.map((p) => {
                const w = (paraTelefone && paraTelefone(p.id)) || p.id;
                return w._serialized || w.$1 || String(w);
            });
            return { ids };
        } catch (e) {
            return { erro: `${e && e.name}: ${e && e.message}` };
        }
    }, grupoId);

    if (resultado.erro) throw new Error('Não consegui listar os membros do grupo: ' + resultado.erro);

    const euMesmo = idDe(client.info && client.info.wid);
    return resultado.ids.filter((id) => id && id !== euMesmo);
}

// Quem mandou a mensagem
function autorDe(msg, client) {
    return idDe(msg.author) || idDe(client.info && client.info.wid);
}

// ---------- Anti-spam compartilhado ----------
// Todos os comandos de grupo (brincadeiras e funções) dividem o mesmo limite:
// no máximo 1 resposta a cada INTERVALO_COMANDOS_SEGUNDOS por grupo.
const INTERVALO_COMANDOS_SEGUNDOS = 5;
const ultimoComando = new Map(); // caderninho: grupo → horário do último comando

function podeResponder(grupoId) {
    const agora = Date.now();
    if (agora - (ultimoComando.get(grupoId) || 0) < INTERVALO_COMANDOS_SEGUNDOS * 1000) return false;
    ultimoComando.set(grupoId, agora);
    return true;
}

// ---------- Guardar dados em arquivo ----------
// Algumas funções precisam lembrar das coisas mesmo depois de reiniciar o bot
// (aniversários, contagem de mensagens). Guardamos em arquivos .json na pasta "dados".
// JSON é um formato de texto para guardar listas e objetos.
const PASTA_DADOS = path.join(__dirname, 'dados');

function lerDados(nome, padrao) {
    try {
        return JSON.parse(fs.readFileSync(path.join(PASTA_DADOS, `${nome}.json`), 'utf8'));
    } catch {
        return padrao; // arquivo ainda não existe (ou está corrompido): começa do zero
    }
}

function salvarDados(nome, dados) {
    try {
        fs.mkdirSync(PASTA_DADOS, { recursive: true });
        fs.writeFileSync(path.join(PASTA_DADOS, `${nome}.json`), JSON.stringify(dados, null, 2));
    } catch (erro) {
        console.error(`Erro ao salvar ${nome}.json:`, erro.message);
    }
}

module.exports = {
    idDe, numero, marcar, sortear, esperar, hoje,
    sorteioDoDia, sortearDoDia, embaralharDoDia, barra,
    membrosDoGrupo, autorDe, podeResponder, lerDados, salvarDados,
};
