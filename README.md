# 🤖 NicoBot Figurinhas

Bot para WhatsApp que transforma **imagens e vídeos curtos em figurinhas**, direto na conversa.

Este é o meu primeiro projeto de programação, feito com **JavaScript** e **Node.js**.

<!-- Dica: depois coloque aqui um print ou GIF do bot funcionando -->

## ✨ Funcionalidades

- 🖼️ **Imagem → figurinha**: envie uma imagem com a legenda `!fig`
- 🎬 **Vídeo → figurinha animada**: envie um vídeo de até 10 segundos com a legenda `!fig`
- 💬 **Responder mídia**: responda a uma imagem ou vídeo já enviado com `!fig`
- ❓ **Ajuda**: envie `!ajuda` (ou `!help`) para ver as instruções

## 🛠️ Tecnologias

- [Node.js](https://nodejs.org/): ambiente que roda JavaScript fora do navegador
- [whatsapp-web.js](https://wwebjs.dev/): biblioteca que controla o WhatsApp Web
- [qrcode-terminal](https://www.npmjs.com/package/qrcode-terminal): mostra o QR Code de login no terminal
- [FFmpeg](https://ffmpeg.org/): converte vídeos em figurinhas animadas

## 📋 Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Google Chrome](https://www.google.com/chrome/) instalado
- [FFmpeg](https://ffmpeg.org/) instalado (necessário só para figurinhas animadas)
- Um número de WhatsApp para o bot (recomendo um **número secundário**)

## 🚀 Como rodar

1. Clone o repositório:
   ```bash
   git clone https://github.com/nicolasreiz/nicobot-figurinhas.git
   cd nicobot-figurinhas
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o bot:
   ```bash
   npm start
   ```

4. Escaneie o QR Code que aparecer no terminal pelo WhatsApp:
   **WhatsApp → Dispositivos conectados → Conectar dispositivo**

Pronto! A sessão fica salva, então só é preciso escanear na primeira vez.

## ⚙️ Configuração

As configurações ficam no topo do arquivo [`index.js`](index.js):

| Constante           | O que faz                                   |
| ------------------- | ------------------------------------------- |
| `COMANDO`           | Comando que cria a figurinha (`!fig`)       |
| `NOME_PACOTE`       | Nome do pacote que aparece na figurinha     |
| `AUTOR`             | Autor que aparece na figurinha              |
| `DURACAO_MAX_VIDEO` | Duração máxima dos vídeos, em segundos      |
| `CHROME_PATH`       | Caminho do Chrome instalado no computador   |

## ⚠️ Avisos

- Este bot **não é oficial** do WhatsApp. Use com moderação e de preferência com um número secundário, pois contas podem ser banidas.
- A pasta `.wwebjs_auth/` guarda o login do WhatsApp. **Nunca compartilhe essa pasta** (ela já está no `.gitignore`).

## 🗺️ Próximos passos

- [ ] Comando para escolher nome e autor da figurinha (`!fig Nome | Autor`)
- [ ] Converter figurinha de volta em imagem (`!img`)
- [ ] Criar figurinha a partir de texto

## 👤 Autor

Feito por **Nicolas Reis** · [GitHub](https://github.com/nicolasreiz)
