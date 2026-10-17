# 🏢 Pixel Office — Ambiente Virtual Interativo 2D

![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas_2D-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-Pixel_Art_UI-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-4ade80?style=for-the-badge)

Um ambiente virtual **Pixel Art Top-Down** (visto de cima, inspirado em *Gather.town* e RPGs clássicos 16-bits) construído 100% com **HTML5 Canvas, CSS3 e JavaScript puro**, sem necessidade de imagens externas ou bibliotecas.

---

## ✨ Funcionalidades

- 🎨 **Pixel Art Procedural 16x16**: Todos os pisos, móveis, animações e personagens são desenhados via código em resolução nativa de `384x256` (`24x16` tiles) com *Integer Scaling* para manter os pixels sempre nítidos.
- 🏢 **3 Áreas de Escritório Detalhadas**:
  - 💻 **Estações de Trabalho**: 4 mesas completas com computadores, monitores simples e duplos com linhas de código animadas, canecas de café soltando fumaça, cadeiras ergonômicas, rack de servidores com LEDs piscando, impressora e quadro Kanban.
  - 📚 **Biblioteca & Estante de Livros**: Piso de nogueira, tapete de leitura e 3 grandes estantes repletas de livros coloridos, pastas e troféu da equipe.
  - 🛋️ **Lounge & Copa**: Tapete aconchegante, sofá de 3 lugares com almofadas, poltrona de leitura, mesa de centro com tampo de vidro e copa equipada com cafeteira expresso e bebedouro com bolhas animadas.
- 👥 **6 Bonecos Jogáveis (3 Mulheres e 3 Homens)**:
  - Seletor interativo com prévia animada em tempo real e troca rápida pelas teclas `1` a `6`:
    - 👩 **Clara** (*Tech Lead*) · **Marina** (*UX / Pixel Artist*) · **Bia** (*Full-Stack Dev*)
    - 👨 **Lucas** (*Front-end Dev*) · **Rafael** (*Back-end / DevOps*) · **Tiago** (*Product Manager*)
- 📐 **Profundidade Dinâmica (`Y-Sorting`) & Colisões**: O personagem passa por trás ou pela frente dos móveis de forma natural e pode **sentar nas cadeiras, no sofá e na poltrona**.

---

## 🎮 Controles do Teclado

| Tecla | Ação |
| :--- | :--- |
| <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> ou <kbd>↑</kbd> <kbd>←</kbd> <kbd>↓</kbd> <kbd>→</kbd> | Movimentar o boneco pelo escritório |
| <kbd>Shift</kbd> | Correr |
| <kbd>E</kbd> ou <kbd>Espaço</kbd> | Interagir com objetos / Sentar ou levantar de cadeiras e sofá |
| <kbd>P</kbd> | Abrir / fechar o seletor de personagens |
| <kbd>1</kbd> a <kbd>6</kbd> | Trocar de boneco instantaneamente |
| <kbd>G</kbd> | Mostrar / ocultar a grade de tiles (`16x16`) |
| <kbd>C</kbd> | Mostrar / ocultar o mapa de colisões |
| <kbd>L</kbd> | Mostrar / ocultar os rótulos das áreas |
| <kbd>Esc</kbd> | Fechar janelas de diálogo / levantar do assento |

---

## 🚀 Como Executar Localmente

Como o projeto não possui dependências externas nem etapa de build, basta clonar o repositório e abrir o arquivo `index.html` no navegador:

```bash
# 1. Clone o repositório
git clone https://github.com/SEU-USUARIO/pixel-office.git

# 2. Entre na pasta do projeto
cd pixel-office

# 3. Abra o index.html no navegador
```

---

## 📁 Estrutura de Arquivos

```text
├── index.html   # Estrutura da página, HUD superior, modais e legenda de atalhos
├── style.css    # Estilização retrô pixelada, escala inteira e layout responsivo
├── office.js    # Motor 2D em Canvas, tiles, móveis, 6 bonecos, colisões e Y-Sorting
└── README.md    # Documentação do projeto
```

---

## 🗺️ Roadmap (Próximos Passos)

- [ ] Adicionar NPCs (colegas de trabalho) com rotinas pelo escritório
- [ ] Efeitos sonoros 8-bit e som ambiente opcional
- [ ] Sala de reunião com quadro interativo
- [ ] Modo Multiplayer em tempo real (WebSockets)

---

Feito com ❤️ e muitos pixels.
