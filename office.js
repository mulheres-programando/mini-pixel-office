/**
 * PIXEL OFFICE — Top-Down Virtual Office Environment
 * Native pixel resolution: 384x256 (24x16 tiles at 16x16px each)
 */

const TILE_SIZE = 16;
const MAP_COLS = 24;
const MAP_ROWS = 16;
const NATIVE_WIDTH = MAP_COLS * TILE_SIZE;  // 384
const NATIVE_HEIGHT = MAP_ROWS * TILE_SIZE; // 256

const canvas = document.getElementById('office-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const zoneBadge = document.getElementById('zone-badge');
const btnGrid = document.getElementById('btn-grid');
const btnCollision = document.getElementById('btn-collision');
const btnLabels = document.getElementById('btn-labels');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const zoomLevelText = document.getElementById('zoom-level');
const interactionPrompt = document.getElementById('interaction-prompt');
const interactionText = document.getElementById('interaction-text');
const dialogBox = document.getElementById('dialog-box');
const dialogTitle = document.getElementById('dialog-title');
const dialogBody = document.getElementById('dialog-body');
const dialogClose = document.getElementById('dialog-close');

// State
let zoom = 3;
let showGrid = false;
let showCollisions = false;
let showZoneLabels = true;
let tick = 0;

// Resize and integer pixel scaling
function applyZoom() {
  canvas.width = NATIVE_WIDTH;
  canvas.height = NATIVE_HEIGHT;
  canvas.style.width = `${NATIVE_WIDTH * zoom}px`;
  canvas.style.height = `${NATIVE_HEIGHT * zoom}px`;
  ctx.imageSmoothingEnabled = false;
  zoomLevelText.textContent = `${zoom}x`;
}

function autoFitZoom() {
  const maxW = window.innerWidth - 40;
  const maxH = window.innerHeight - 110;
  const fit = Math.floor(Math.min(maxW / NATIVE_WIDTH, maxH / NATIVE_HEIGHT));
  zoom = Math.max(1, Math.min(4, fit || 2));
  applyZoom();
}

window.addEventListener('resize', autoFitZoom);
autoFitZoom();

// ============================================================================
// 1. FLOOR & WALL LAYOUT (24 x 16)
// ============================================================================
// Floor types:
// 0 = Void/BorderWall
// 1 = Top Wall (with baseboard & texture)
// 2 = Wood Parquet (Main Workspace)
// 3 = Library Dark Wood Floor (Top-Right Bookshelf Zone)
// 4 = Lounge Carpet (Bottom-Right Sofa Zone)
// 5 = Pantry Checker Tile (Coffee / Water Cooler Corner)
// 6 = Entrance Mat

const floorMap = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,3,3,3,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,5,5,5,5,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,5,5,5,5,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,2,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,2,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,2,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,2,0],
  [0,2,2,2,2,2,2,2,2,2,2,2,2,4,4,4,4,4,4,4,4,4,2,0],
  [0,2,2,2,2,2,2,2,2,2,6,6,6,2,2,2,2,2,2,2,2,2,2,0],
  [0,0,0,0,0,0,0,0,0,0,6,6,6,0,0,0,0,0,0,0,0,0,0,0],
];

// Collision Map (true = blocked)
const collisionMap = Array.from({ length: MAP_ROWS }, (_, r) =>
  Array.from({ length: MAP_COLS }, (_, c) => {
    const f = floorMap[r][c];
    return f === 0 || f === 1;
  })
);

function blockTiles(col, row, w, h) {
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (r >= 0 && r < MAP_ROWS && c >= 0 && c < MAP_COLS) {
        collisionMap[r][c] = true;
      }
    }
  }
}

// ============================================================================
// 2. PIXEL ART DRAWING HELPERS
// ============================================================================
function pxRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Draw static floor & wall layer to an offscreen canvas for crisp performance
const bgCanvas = document.createElement('canvas');
bgCanvas.width = NATIVE_WIDTH;
bgCanvas.height = NATIVE_HEIGHT;
const bgCtx = bgCanvas.getContext('2d');
bgCtx.imageSmoothingEnabled = false;

function buildBackgroundLayer() {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      const type = floorMap[r][c];

      if (type === 0) {
        // Outer structural wall / border
        bgCtx.fillStyle = '#181a24';
        bgCtx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        bgCtx.fillStyle = '#252838';
        bgCtx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        // Top highlight for 3D wall thickness
        bgCtx.fillStyle = '#33384f';
        bgCtx.fillRect(x, y, TILE_SIZE, 2);
      } else if (type === 1) {
        // Back wall (rows 1 and 2)
        const isBottomWallRow = (r === 2);
        bgCtx.fillStyle = c >= 13 ? '#3b4254' : '#434c5e';
        bgCtx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Subtle wallpaper vertical stripe texture
        bgCtx.fillStyle = c >= 13 ? '#353b4b' : '#3b4354';
        bgCtx.fillRect(x + 3, y, 2, TILE_SIZE);
        bgCtx.fillRect(x + 11, y, 2, TILE_SIZE);

        if (r === 1) {
          // Crown molding at top of wall
          bgCtx.fillStyle = '#2b303c';
          bgCtx.fillRect(x, y, TILE_SIZE, 3);
          bgCtx.fillStyle = '#566178';
          bgCtx.fillRect(x, y + 3, TILE_SIZE, 1);
        }

        if (isBottomWallRow) {
          // Wooden baseboard at bottom of wall
          bgCtx.fillStyle = '#5c3c24';
          bgCtx.fillRect(x, y + 12, TILE_SIZE, 3);
          bgCtx.fillStyle = '#3d2616';
          bgCtx.fillRect(x, y + 15, TILE_SIZE, 1);
        }
      } else if (type === 2) {
        // Warm oak parquet floor (Workspace & Corridors)
        const alt = (r + c) % 2 === 0;
        bgCtx.fillStyle = alt ? '#c89b6e' : '#c19365';
        bgCtx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Plank lines
        bgCtx.fillStyle = '#ab7d50';
        bgCtx.fillRect(x, y + 7, TILE_SIZE, 1);
        bgCtx.fillRect(x, y + 15, TILE_SIZE, 1);
        bgCtx.fillRect(x + (alt ? 8 : 4), y, 1, 7);
        bgCtx.fillRect(x + (alt ? 12 : 10), y + 8, 1, 7);
        // Subtle highlight
        bgCtx.fillStyle = '#d4a97d';
        bgCtx.fillRect(x + 1, y + 1, TILE_SIZE - 2, 1);
      } else if (type === 3) {
        // Darker walnut wood floor + reading rug (Bookshelf / Library Zone)
        bgCtx.fillStyle = '#8b5e3c';
        bgCtx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        bgCtx.fillStyle = '#734b2e';
        bgCtx.fillRect(x, y + 7, TILE_SIZE, 1);
        bgCtx.fillRect(x, y + 15, TILE_SIZE, 1);
        bgCtx.fillRect(x + ((r % 2) * 8 + 4), y, 1, 7);
      } else if (type === 4) {
        // Cozy teal/indigo woven lounge carpet (Sofa Zone)
        // Draw wood underneath on edges
        bgCtx.fillStyle = '#c89b6e';
        bgCtx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        const isLeft = c === 13;
        const isRight = c === 21;
        const isTop = r === 9;
        const isBottom = r === 13;

        const rx = isLeft ? x + 2 : x;
        const ry = isTop ? y + 2 : y;
        const rw = TILE_SIZE - (isLeft ? 2 : 0) - (isRight ? 2 : 0);
        const rh = TILE_SIZE - (isTop ? 2 : 0) - (isBottom ? 2 : 0);

        bgCtx.fillStyle = '#2b4c65';
        bgCtx.fillRect(rx, ry, rw, rh);

        // Carpet pattern
        bgCtx.fillStyle = '#345b78';
        if ((r + c) % 2 === 0) {
          bgCtx.fillRect(rx + 2, ry + 2, rw - 4, rh - 4);
        }
        // Gold/cream carpet border trim
        bgCtx.fillStyle = '#e0b973';
        if (isTop) bgCtx.fillRect(rx, ry, rw, 2);
        if (isBottom) bgCtx.fillRect(rx, ry + rh - 2, rw, 2);
        if (isLeft) bgCtx.fillRect(rx, ry, 2, rh);
        if (isRight) bgCtx.fillRect(rx + rw - 2, ry, 2, rh);
      } else if (type === 5) {
        // Pantry / Coffee bar ceramic tiles
        for (let ty = 0; ty < 2; ty++) {
          for (let tx = 0; tx < 2; tx++) {
            const isLight = (tx + ty) % 2 === 0;
            bgCtx.fillStyle = isLight ? '#d8dee9' : '#b8c2d4';
            bgCtx.fillRect(x + tx * 8, y + ty * 8, 8, 8);
            bgCtx.fillStyle = '#9aa5b8';
            bgCtx.fillRect(x + tx * 8, y + ty * 8 + 7, 8, 1);
            bgCtx.fillRect(x + tx * 8 + 7, y + ty * 8, 1, 8);
          }
        }
      } else if (type === 6) {
        // Entrance doormat
        bgCtx.fillStyle = '#c89b6e';
        bgCtx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        bgCtx.fillStyle = '#4a3b32';
        bgCtx.fillRect(x + 1, y + 2, TILE_SIZE - 2, TILE_SIZE - 4);
        bgCtx.fillStyle = '#6e5849';
        bgCtx.fillRect(x + 3, y + 4, TILE_SIZE - 6, TILE_SIZE - 8);
      }

      // Drop shadow right below the north wall (row 3)
      if (r === 3 && type !== 0) {
        bgCtx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        bgCtx.fillRect(x, y, TILE_SIZE, 4);
      }
    }
  }

  // Library reading rug under the bookshelf area (cols 15..20, rows 4..5)
  const rugX = 15 * TILE_SIZE + 2;
  const rugY = 4 * TILE_SIZE + 3;
  const rugW = 6 * TILE_SIZE - 4;
  const rugH = 2 * TILE_SIZE - 4;
  bgCtx.fillStyle = '#7c2d38';
  bgCtx.fillRect(rugX, rugY, rugW, rugH);
  bgCtx.fillStyle = '#d4a359';
  bgCtx.fillRect(rugX + 2, rugY + 2, rugW - 4, rugH - 4);
  bgCtx.fillStyle = '#963845';
  bgCtx.fillRect(rugX + 4, rugY + 4, rugW - 8, rugH - 8);

  // Wall Decorations (Windows & Whiteboard on North Wall)
  drawWindowOnWall(3 * TILE_SIZE, 1 * TILE_SIZE - 2);
  drawWindowOnWall(7 * TILE_SIZE, 1 * TILE_SIZE - 2);
  drawWhiteboardOnWall(10 * TILE_SIZE + 4, 1 * TILE_SIZE);
}

function drawWindowOnWall(x, y) {
  const w = 32;
  const h = 24;
  // Frame
  bgCtx.fillStyle = '#2b303c';
  bgCtx.fillRect(x, y, w, h);
  // Sky glass
  bgCtx.fillStyle = '#7dc4e4';
  bgCtx.fillRect(x + 2, y + 2, w - 4, h - 4);
  // Distant pixel city skyline
  bgCtx.fillStyle = '#4c7899';
  bgCtx.fillRect(x + 3, y + 12, 6, 8);
  bgCtx.fillRect(x + 10, y + 9, 8, 11);
  bgCtx.fillRect(x + 20, y + 14, 9, 6);
  // Clouds / reflection
  bgCtx.fillStyle = '#bae6fd';
  bgCtx.fillRect(x + 4, y + 4, 9, 3);
  bgCtx.fillRect(x + 19, y + 5, 7, 2);
  // Window mullions
  bgCtx.fillStyle = '#2b303c';
  bgCtx.fillRect(x + 15, y + 2, 2, h - 4);
  bgCtx.fillRect(x + 2, y + 12, w - 4, 2);
  // Sill
  bgCtx.fillStyle = '#d8dee9';
  bgCtx.fillRect(x - 1, y + h - 2, w + 2, 3);
}

function drawWhiteboardOnWall(x, y) {
  const w = 40;
  const h = 20;
  bgCtx.fillStyle = '#475569';
  bgCtx.fillRect(x, y, w, h);
  bgCtx.fillStyle = '#f1f5f9';
  bgCtx.fillRect(x + 2, y + 2, w - 4, h - 4);
  // Kanban sticky notes
  bgCtx.fillStyle = '#facc15';
  bgCtx.fillRect(x + 5, y + 5, 5, 5);
  bgCtx.fillStyle = '#f87171';
  bgCtx.fillRect(x + 12, y + 5, 5, 5);
  bgCtx.fillStyle = '#4ade80';
  bgCtx.fillRect(x + 5, y + 11, 5, 4);
  // Chart lines
  bgCtx.fillStyle = '#3b82f6';
  bgCtx.fillRect(x + 22, y + 6, 12, 2);
  bgCtx.fillRect(x + 22, y + 10, 9, 2);
  bgCtx.fillRect(x + 22, y + 14, 14, 2);
}

buildBackgroundLayer();

// ============================================================================
// 3. OFFICE OBJECTS & FURNITURE (Y-Sorted Depth Renderables)
// ============================================================================
const objects = [];
const interactables = [];

/**
 * Helper to register a piece of furniture with collision, interaction, and Y-sorted draw
 */
function addFurniture({ col, row, wTiles = 1, hTiles = 1, solid = true, sortYOffset = 0, interact, draw }) {
  if (solid) {
    blockTiles(col, row, wTiles, hTiles);
  }
  const x = col * TILE_SIZE;
  const y = row * TILE_SIZE;
  const sortY = (row + hTiles) * TILE_SIZE + sortYOffset;

  objects.push({
    x,
    y,
    w: wTiles * TILE_SIZE,
    h: hTiles * TILE_SIZE,
    sortY,
    draw: (t) => draw(x, y, t)
  });

  if (interact) {
    interactables.push({
      cx: x + (wTiles * TILE_SIZE) / 2,
      cy: y + (hTiles * TILE_SIZE) / 2,
      radius: Math.max(wTiles, hTiles) * TILE_SIZE * 0.75 + 10,
      label: interact.label,
      title: interact.title,
      description: interact.description,
      seat: interact.seat || null
    });
  }
}

// --- SPRITE DRAWING ROUTINES FOR FURNITURE ---

// 1) Workstation Desk with Computer, Monitor, Keyboard, Mouse & Coffee Mug
function createWorkstation(col, row, variant = 0, deskName = 'Estação de Trabalho') {
  const chairX = (col + 1) * TILE_SIZE;
  const chairY = (row + 1) * TILE_SIZE;

  // Chair in front of desk (player can walk or sit on it)
  addFurniture({
    col: col + 1,
    row: row + 1,
    wTiles: 1,
    hTiles: 1,
    solid: false, // Walkable / sittable chair!
    sortYOffset: -4,
    interact: {
      label: `Sentar na ${deskName}`,
      title: `💻 ${deskName}`,
      description: variant % 2 === 0
        ? 'Computador dual-screen rodando o ambiente de desenvolvimento, terminal ativo e uma xícara de café quentinho.'
        : 'Workstation equipada com monitor ultrawide, teclado mecânico iluminado e gráficos de performance em tempo real.',
      seat: {
        x: chairX + 8,
        y: chairY + 7,
        dir: 'up',
        sortY: chairY + TILE_SIZE + 2,
        exitX: chairX + 8,
        exitY: (row + 2) * TILE_SIZE + 6
      }
    },
    draw: (x, y) => {
      // Ergonomic office chair (facing UP toward the desk)
      // Shadow
      pxRect(x + 3, y + 11, 10, 4, 'rgba(0,0,0,0.28)');
      // Wheels / base
      pxRect(x + 4, y + 12, 2, 2, '#1e293b');
      pxRect(x + 10, y + 12, 2, 2, '#1e293b');
      pxRect(x + 7, y + 10, 2, 4, '#334155');
      // Cushion
      const chairColor = variant % 2 === 0 ? '#2563eb' : '#059669';
      const chairBack = variant % 2 === 0 ? '#1d4ed8' : '#047857';
      pxRect(x + 3, y + 5, 10, 6, chairColor);
      // Armrests
      pxRect(x + 2, y + 5, 2, 5, '#1e293b');
      pxRect(x + 12, y + 5, 2, 5, '#1e293b');
      // Backrest (on the bottom side since chair faces UP)
      pxRect(x + 4, y + 9, 8, 4, chairBack);
      pxRect(x + 5, y + 10, 6, 1, '#93c5fd');
    }
  });

  // Desk (3 tiles wide x 1 tile deep)
  addFurniture({
    col,
    row,
    wTiles: 3,
    hTiles: 1,
    solid: true,
    interact: {
      label: `Usar ${deskName}`,
      title: `🖥️ ${deskName}`,
      description: 'Um computador de mesa completo com monitor LED de alta definição, teclado mecânico compacto, mouse sem fio e blocos de notas.'
    },
    draw: (x, y, t) => {
      const w = 48;
      // Floor shadow
      pxRect(x + 1, y + 13, w - 2, 5, 'rgba(0,0,0,0.3)');
      // Desk legs (dark metal)
      pxRect(x + 2, y + 10, 3, 6, '#334155');
      pxRect(x + w - 5, y + 10, 3, 6, '#334155');
      // Drawer cabinet on right side
      pxRect(x + w - 15, y + 8, 12, 8, '#7c4d2b');
      pxRect(x + w - 13, y + 10, 8, 2, '#5c371d');
      pxRect(x + w - 13, y + 13, 8, 2, '#5c371d');

      // Tabletop (warm wood with bevel)
      pxRect(x, y + 2, w, 10, '#a4683a');
      pxRect(x + 1, y + 2, w - 2, 8, '#be7e4a');
      pxRect(x, y + 10, w, 2, '#784824'); // front edge

      // PC Tower on left corner
      pxRect(x + 3, y - 4, 7, 10, '#1e293b');
      pxRect(x + 4, y - 3, 5, 8, '#334155');
      // Blinking power LED
      pxRect(x + 5, y - 1, 2, 1, (Math.floor(t / 25) + variant) % 2 === 0 ? '#4ade80' : '#22c55e');

      // Monitor stand
      pxRect(x + 21, y + 2, 6, 3, '#1e293b');
      pxRect(x + 23, y - 1, 2, 4, '#334155');

      // Monitor Screen (facing down/player with glowing top-down edge & code lines)
      pxRect(x + 14, y - 9, 20, 11, '#0f172a');
      pxRect(x + 15, y - 8, 18, 9, '#0284c7');
      // Animated code lines on screen
      const scroll = Math.floor(t / 18 + variant * 3) % 3;
      pxRect(x + 17, y - 6, 8, 1, '#bae6fd');
      pxRect(x + 17, y - 4, 12, 1, scroll === 0 ? '#4ade80' : '#7dd3fc');
      pxRect(x + 17, y - 2, 6 + scroll * 3, 1, '#fde047');

      // Secondary tilted monitor on dual-monitor desks
      if (variant % 2 === 0) {
        pxRect(x + 34, y - 7, 10, 9, '#0f172a');
        pxRect(x + 35, y - 6, 8, 7, '#1e1b4b');
        pxRect(x + 36, y - 4, 6, 1, '#f472b6');
        pxRect(x + 36, y - 2, 4, 1, '#a78bfa');
      }

      // Keyboard & Mouse
      pxRect(x + 17, y + 5, 12, 4, '#1e293b');
      pxRect(x + 18, y + 6, 10, 2, '#94a3b8');
      // Mousepad & mouse
      pxRect(x + 31, y + 5, 5, 4, '#1e3a8a');
      pxRect(x + 32, y + 6, 3, 2, '#e2e8f0');

      // Coffee Mug on desk
      pxRect(x + 11, y + 5, 3, 4, '#ef4444');
      pxRect(x + 11, y + 5, 3, 1, '#fca5a5');
      // Animated Steam
      const steamOffset = Math.floor(t / 15 + variant) % 3;
      pxRect(x + 12, y + 2 - steamOffset, 1, 2, 'rgba(255,255,255,0.65)');
    }
  });
}

// 2) Tall Bookshelf (Estante de Livros)
function createBookshelf(col, row, shelfIndex = 0) {
  addFurniture({
    col,
    row,
    wTiles: 2,
    hTiles: 2,
    solid: true,
    interact: {
      label: 'Explorar Estante de Livros',
      title: `📚 Estante de Livros #${shelfIndex + 1}`,
      description: shelfIndex === 0
        ? 'Coleção de livros de Arquitetura de Software, Clean Code, Algoritmos e Design de Jogos em Pixel Art.'
        : shelfIndex === 1
        ? 'Enciclopédias técnicas, cadernos de rascunho, manuais de inteligência artificial e um troféu dourado da equipe.'
        : 'Romances de ficção científica, revistas de design, pastas de projetos antigos e uma pequena suculenta decorativa.'
    },
    draw: (x, y) => {
      const w = 32;
      const h = 32;
      // Floor shadow
      pxRect(x + 1, y + h - 2, w - 2, 5, 'rgba(0,0,0,0.35)');
      // Outer dark oak frame
      pxRect(x + 1, y + 2, w - 2, h - 2, '#4a2c18');
      pxRect(x + 2, y + 3, w - 4, h - 4, '#694127');
      // Top cornice
      pxRect(x, y + 1, w, 3, '#5c371e');
      pxRect(x + 1, y + 1, w - 2, 1, '#855332');

      // 3 Shelf cavities
      const shelfY = [6, 14, 22];
      const bookPalettes = [
        ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#a855f7', '#f97316', '#ec4899'],
        ['#06b6d4', '#f43f5e', '#84cc16', '#eab308', '#6366f1', '#14b8a6', '#f59e0b'],
        ['#8b5cf6', '#ec4899', '#3b82f6', '#22c55e', '#ef4444', '#eab308', '#64748b']
      ];

      shelfY.forEach((sy, idx) => {
        // Dark interior recess
        pxRect(x + 3, y + sy, w - 6, 6, '#2b180c');
        // Wooden shelf plank below recess
        pxRect(x + 2, y + sy + 6, w - 4, 2, '#7c4d2b');

        // Draw colorful pixel books
        const colors = bookPalettes[(shelfIndex + idx) % bookPalettes.length];
        let bx = x + 4;
        for (let b = 0; b < 7; b++) {
          if (shelfIndex === 1 && idx === 0 && b === 4) {
            // Golden trophy on middle bookshelf top row
            pxRect(bx + 1, y + sy + 1, 4, 3, '#facc15');
            pxRect(bx + 2, y + sy + 4, 2, 2, '#ca8a04');
            bx += 6;
            continue;
          }
          const bh = 4 + ((b + idx) % 2);
          const bw = (b % 3 === 0) ? 4 : 3;
          if (bx + bw <= x + w - 4) {
            pxRect(bx, y + sy + (6 - bh), bw, bh, colors[b % colors.length]);
            // Book spine stripe
            pxRect(bx, y + sy + (6 - bh) + 1, bw, 1, 'rgba(255,255,255,0.35)');
            bx += bw + 1;
          }
        }
      });
    }
  });
}

// 3) Lounge Area: Plush Sofa, Armchair, Coffee Table
function createLoungeArea() {
  // Main 3-Seater Plush Sofa (top of lounge, facing down)
  addFurniture({
    col: 15,
    row: 9,
    wTiles: 4,
    hTiles: 2,
    solid: true,
    sortYOffset: -6,
    interact: {
      label: 'Descansar no Sofá',
      title: '🛋️ Sofá do Lounge',
      description: 'Um sofá super confortável de tecido terracota com almofadas macias — perfeito para pausas criativas, leitura ou bate-papo.',
      seat: {
        x: 17 * TILE_SIZE,
        y: 10 * TILE_SIZE + 4,
        dir: 'down',
        sortY: 11 * TILE_SIZE + 4, // Always drawn ON TOP of the sofa
        exitX: 17 * TILE_SIZE,
        exitY: 11 * TILE_SIZE + 8  // Free walkway row right in front of the sofa
      }
    },
    draw: (x, y) => {
      const w = 64;
      // Shadow
      pxRect(x + 2, y + 24, w - 4, 5, 'rgba(0,0,0,0.35)');
      // Backrest
      pxRect(x + 2, y + 4, w - 4, 9, '#9a3412');
      pxRect(x + 4, y + 5, w - 8, 6, '#c2410c');
      // Left & Right Armrests
      pxRect(x + 1, y + 8, 7, 16, '#9a3412');
      pxRect(x + 2, y + 9, 5, 13, '#ea580c');
      pxRect(x + w - 8, y + 8, 7, 16, '#9a3412');
      pxRect(x + w - 7, y + 9, 5, 13, '#ea580c');
      // 3 Seat Cushions
      for (let i = 0; i < 3; i++) {
        const cx = x + 8 + i * 16;
        pxRect(cx, y + 12, 16, 11, '#ea580c');
        pxRect(cx + 1, y + 13, 14, 8, '#f97316');
        pxRect(cx, y + 22, 16, 3, '#7c2d12');
      }
      // Throw pillows
      pxRect(x + 10, y + 9, 7, 6, '#fde047');
      pxRect(x + 11, y + 10, 5, 4, '#fef08a');
      pxRect(x + w - 18, y + 9, 7, 6, '#38bdf8');
      pxRect(x + w - 17, y + 10, 5, 4, '#bae6fd');
    }
  });

  // Side Armchair (left of coffee table, facing right)
  addFurniture({
    col: 14,
    row: 11,
    wTiles: 1,
    hTiles: 2,
    solid: true,
    sortYOffset: -4,
    interact: {
      label: 'Sentar na Poltrona',
      title: '🪑 Poltrona de Leitura',
      description: 'Poltrona individual estofada, ótima para ler um livro da estante ou tomar um expresso.',
      seat: {
        x: 14 * TILE_SIZE + 9,
        y: 12 * TILE_SIZE + 2,
        dir: 'right',
        sortY: 13 * TILE_SIZE + 4, // Always drawn ON TOP of the armchair
        exitX: 15 * TILE_SIZE + 8,
        exitY: 11 * TILE_SIZE + 8
      }
    },
    draw: (x, y) => {
      pxRect(x + 1, y + 25, 14, 4, 'rgba(0,0,0,0.32)');
      pxRect(x + 2, y + 4, 12, 22, '#9a3412');
      pxRect(x + 5, y + 7, 9, 16, '#f97316');
      pxRect(x + 2, y + 4, 4, 22, '#c2410c'); // backrest on left
    }
  });

  // Coffee Table (Centro do Lounge — positioned at row 12 so row 11 is an open walkway in front of sofa)
  addFurniture({
    col: 16,
    row: 12,
    wTiles: 3,
    hTiles: 1,
    solid: true,
    interact: {
      label: 'Ver Mesa de Centro',
      title: '☕ Mesa de Centro do Lounge',
      description: 'Sobre a mesa há revistas de design, um notebook em modo de espera e uma bandeja com biscoitos e café.'
    },
    draw: (x, y) => {
      const w = 48;
      // Shadow
      pxRect(x + 3, y + 13, w - 6, 4, 'rgba(0,0,0,0.3)');
      // Wooden legs
      pxRect(x + 4, y + 11, 3, 5, '#451a03');
      pxRect(x + w - 7, y + 11, 3, 5, '#451a03');
      // Table surface
      pxRect(x + 3, y + 1, w - 6, 12, '#78350f');
      pxRect(x + 4, y + 2, w - 8, 9, '#b45309');
      // Glass center inlay
      pxRect(x + 8, y + 3, w - 16, 7, '#67e8f9');
      pxRect(x + 9, y + 4, w - 18, 5, '#22d3ee');
      // Magazines & Open Laptop on coffee table
      pxRect(x + 11, y + 4, 7, 5, '#f43f5e');
      pxRect(x + 12, y + 5, 5, 3, '#fda4af');
      // Small laptop
      pxRect(x + 26, y + 3, 8, 6, '#334155');
      pxRect(x + 27, y + 4, 6, 3, '#93c5fd');
    }
  });
}

// 4) Coffee Counter & Water Cooler (Copa / Pantry)
function createCoffeeCorner() {
  addFurniture({
    col: 20,
    row: 7,
    wTiles: 3,
    hTiles: 1,
    solid: true,
    interact: {
      label: 'Pegar um Café Expresso',
      title: '☕ Estação de Café & Água',
      description: 'Cafeteira expresso italiana moendo grãos na hora e bebedouro com água gelada para recarregar as energias!'
    },
    draw: (x, y, t) => {
      // Counter cabinet
      pxRect(x + 2, y + 2, 30, 14, '#334155');
      pxRect(x + 2, y + 2, 30, 4, '#e2e8f0'); // marble countertop
      // Espresso Machine
      pxRect(x + 6, y - 6, 10, 9, '#1e293b');
      pxRect(x + 7, y - 5, 8, 3, '#ef4444');
      pxRect(x + 9, y - 1, 3, 3, '#f8fafc'); // cup
      // Steam
      if (Math.floor(t / 12) % 2 === 0) {
        pxRect(x + 10, y - 8, 1, 2, 'rgba(255,255,255,0.7)');
      }

      // Water Cooler on right tile
      const wx = x + 34;
      pxRect(wx, y + 3, 10, 13, '#f1f5f9');
      pxRect(wx + 1, y + 5, 8, 3, '#cbd5e1');
      pxRect(wx + 3, y + 6, 1, 1, '#ef4444'); // hot tap
      pxRect(wx + 6, y + 6, 1, 1, '#3b82f6'); // cold tap
      // Blue water jug on top
      pxRect(wx + 1, y - 6, 8, 9, '#38bdf8');
      pxRect(wx + 2, y - 5, 6, 7, '#7dd3fc');
      // Rising bubble in water cooler
      const bubbleY = Math.floor(t / 10) % 6;
      pxRect(wx + 4, y - bubbleY, 2, 2, '#e0f2fe');
    }
  });
}

// 5) Potted Plants & Server Rack
function createPlant(col, row) {
  addFurniture({
    col,
    row,
    wTiles: 1,
    hTiles: 1,
    solid: true,
    draw: (x, y) => {
      // Shadow
      pxRect(x + 3, y + 12, 10, 4, 'rgba(0,0,0,0.3)');
      // Terracotta pot
      pxRect(x + 4, y + 8, 8, 6, '#c2410c');
      pxRect(x + 3, y + 7, 10, 2, '#ea580c');
      // Lush pixel leaves
      pxRect(x + 3, y + 1, 10, 7, '#15803d');
      pxRect(x + 2, y + 3, 12, 4, '#16a34a');
      pxRect(x + 5, y - 1, 6, 5, '#22c55e');
      pxRect(x + 6, y + 1, 2, 2, '#86efac');
    }
  });
}

function createServerAndPrinter(col, row) {
  addFurniture({
    col,
    row,
    wTiles: 2,
    hTiles: 1,
    solid: true,
    interact: {
      label: 'Checar Servidor & Impressora',
      title: '🖧 Rack de Servidores & Impressora',
      description: 'Status do Servidor Local: ONLINE (Ping: 2ms). A impressora multifuncional está pronta na fila de rede.'
    },
    draw: (x, y, t) => {
      // Server Rack (left tile)
      pxRect(x + 2, y - 8, 12, 22, '#0f172a');
      pxRect(x + 3, y - 6, 10, 18, '#1e293b');
      for (let i = 0; i < 4; i++) {
        const sy = y - 5 + i * 4;
        pxRect(x + 4, sy, 8, 3, '#0f172a');
        const ledOn = (Math.floor(t / 10) + i) % 2 === 0;
        pxRect(x + 5, sy + 1, 2, 1, ledOn ? '#4ade80' : '#166534');
        pxRect(x + 8, sy + 1, 1, 1, '#38bdf8');
      }
      // Office Printer (right tile)
      const px = x + 17;
      pxRect(px, y + 2, 13, 12, '#cbd5e1');
      pxRect(px + 1, y + 1, 11, 4, '#94a3b8');
      pxRect(px + 3, y - 2, 7, 3, '#f8fafc'); // paper tray
      pxRect(px + 3, y + 7, 7, 2, '#334155'); // output slot
    }
  });
}

// ============================================================================
// POPULATE THE OFFICE ENVIRONMENT
// ============================================================================
// 1. Workstations (4 desks with computers in left/center area)
createWorkstation(2, 4, 0, 'Mesa Dev 01 (Front-end)');
createWorkstation(6, 4, 1, 'Mesa Dev 02 (Back-end)');
createWorkstation(2, 9, 2, 'Mesa Design 03 (Pixel Art)');
createWorkstation(6, 9, 3, 'Mesa Produto 04 (DevOps)');

// Tech corner (Server + Printer + Whiteboard interaction)
createServerAndPrinter(1, 13);

interactables.push({
  cx: 11.5 * TILE_SIZE,
  cy: 2.5 * TILE_SIZE,
  radius: 28,
  label: 'Ver Quadro Kanban',
  title: '📋 Quadro Kanban do Projeto',
  description: 'Tarefas da Sprint:\n✅ 1. Criar área do escritório com mesas e computadores, estante de livros e sofá\n🔜 2. Customizar bonecos e interações multiplayer!'
});

// 2. Bookshelves (Estante de Livros in Top-Right Library Zone)
createBookshelf(14, 2, 0);
createBookshelf(16, 2, 1);
createBookshelf(18, 2, 2);

// Decorative plants around the office
createPlant(1, 3);
createPlant(12, 3);
createPlant(21, 3);
createPlant(13, 13);
createPlant(22, 13);

// 3. Lounge Area with Sofa, Armchair, and Coffee Table
createLoungeArea();

// 4. Coffee & Water Cooler Bar
createCoffeeCorner();

// ============================================================================
// 4. ROSTER OF 6 PIXEL CHARACTERS (3 WOMEN & 3 MEN) + PLAYER CONTROLLER
// ============================================================================
const CHARACTERS = [
  // --- 3 MULHERES ---
  {
    id: 'clara',
    key: '1',
    gender: 'female',
    name: 'Clara',
    role: 'Tech Lead',
    skin: '#fed7aa',
    skinShadow: '#fdba74',
    hair: '#9a3412',
    hairHighlight: '#c2410c',
    hairStyle: 'long',      // Long flowing hair over shoulders
    top: '#7e22ce',
    topHighlight: '#a855f7',
    detailColor: '#f3e8ff', // Blouse collar
    bottom: '#1e1b4b',
    shoes: '#0f172a',
    accessory: 'glasses'
  },
  {
    id: 'marina',
    key: '2',
    gender: 'female',
    name: 'Marina',
    role: 'UX / Pixel Artist',
    skin: '#ffedd5',
    skinShadow: '#fed7aa',
    hair: '#0f172a',
    hairHighlight: '#334155',
    hairStyle: 'bun',       // High bun + bangs + pink tie
    top: '#db2777',
    topHighlight: '#f472b6',
    detailColor: '#ffffff',
    bottom: '#2563eb',
    shoes: '#f8fafc',
    accessory: 'ribbon'
  },
  {
    id: 'bia',
    key: '3',
    gender: 'female',
    name: 'Bia',
    role: 'Full-Stack Dev',
    skin: '#c27848',
    skinShadow: '#9a5830',
    hair: '#27170e',
    hairHighlight: '#452817',
    hairStyle: 'curly',     // Voluminous curly afro puffs
    top: '#ca8a04',
    topHighlight: '#facc15',
    detailColor: '#ffffff',
    bottom: '#334155',
    shoes: '#451a03',
    accessory: 'earrings'
  },

  // --- 3 HOMENS ---
  {
    id: 'lucas',
    key: '4',
    gender: 'male',
    name: 'Lucas',
    role: 'Front-end Dev',
    skin: '#fed7aa',
    skinShadow: '#fdba74',
    hair: '#3f271d',
    hairHighlight: '#523428',
    hairStyle: 'short',     // Classic short hair
    top: '#059669',
    topHighlight: '#34d399',
    detailColor: '#ffffff',
    bottom: '#1e3a8a',
    shoes: '#0f172a',
    accessory: 'glasses'
  },
  {
    id: 'rafael',
    key: '5',
    gender: 'male',
    name: 'Rafael',
    role: 'Back-end / DevOps',
    skin: '#d99066',
    skinShadow: '#b46d45',
    hair: '#18181b',
    hairHighlight: '#27272a',
    hairStyle: 'fade',      // Short fade + beard + headphones
    top: '#b91c1c',
    topHighlight: '#ef4444',
    detailColor: '#1e293b',
    bottom: '#78350f',
    shoes: '#18181b',
    accessory: 'beard_headphones'
  },
  {
    id: 'tiago',
    key: '6',
    gender: 'male',
    name: 'Tiago',
    role: 'Product Manager',
    skin: '#ffedd5',
    skinShadow: '#fed7aa',
    hair: '#ca8a04',
    hairHighlight: '#fde047',
    hairStyle: 'parted',    // Blonde side-part hair + red tie
    top: '#1e3a8a',
    topHighlight: '#2563eb',
    detailColor: '#ef4444', // Red tie
    bottom: '#475569',
    shoes: '#451a03',
    accessory: 'tie'
  }
];

let selectedCharIndex = 0; // Starts with Clara (1)

const player = {
  x: 11 * TILE_SIZE + 8,
  y: 8 * TILE_SIZE + 8,
  radius: 5,
  speed: 1.35,
  dir: 'down', // 'down' | 'up' | 'left' | 'right'
  moving: false,
  sitting: false,
  seatSortY: null,
  standUpPos: null,
  walkFrame: 0
};

// Character Selection Modal DOM Elements
const btnCharSelect = document.getElementById('btn-char-select');
const currentCharNameEl = document.getElementById('current-char-name');
const charModal = document.getElementById('char-modal');
const charModalClose = document.getElementById('char-modal-close');
const charGridWomen = document.getElementById('char-grid-women');
const charGridMen = document.getElementById('char-grid-men');
const previewCanvases = [];

function selectCharacter(index, closeModal = true) {
  if (index < 0 || index >= CHARACTERS.length) return;
  selectedCharIndex = index;
  const charDef = CHARACTERS[selectedCharIndex];
  if (currentCharNameEl) {
    currentCharNameEl.textContent = charDef.name;
  }
  document.querySelectorAll('.char-card').forEach((card, idx) => {
    card.classList.toggle('selected', idx === selectedCharIndex);
  });
  if (closeModal && charModal) {
    charModal.classList.add('hidden');
  }
}

function buildCharacterSelectorModal() {
  if (!charGridWomen || !charGridMen) return;
  charGridWomen.innerHTML = '';
  charGridMen.innerHTML = '';

  CHARACTERS.forEach((charDef, idx) => {
    const card = document.createElement('div');
    card.className = `char-card ${idx === selectedCharIndex ? 'selected' : ''}`;
    card.innerHTML = `
      <span class="char-card-key">${charDef.key}</span>
      <canvas class="char-preview-canvas" width="24" height="26"></canvas>
      <div class="char-card-name">${charDef.name}</div>
      <div class="char-card-role">${charDef.role}</div>
    `;
    const pCanvas = card.querySelector('canvas');
    const pCtx = pCanvas.getContext('2d');
    pCtx.imageSmoothingEnabled = false;
    previewCanvases.push({ ctx: pCtx, charDef, idx });

    card.addEventListener('click', () => {
      selectCharacter(idx, true);
    });

    if (charDef.gender === 'female') {
      charGridWomen.appendChild(card);
    } else {
      charGridMen.appendChild(card);
    }
  });

  selectCharacter(selectedCharIndex, false);
}

const keys = {};

function standUp() {
  if (!player.sitting) return;
  player.sitting = false;
  player.seatSortY = null;
  if (player.standUpPos && !canMoveTo(player.x, player.y)) {
    player.x = player.standUpPos.x;
    player.y = player.standUpPos.y;
  }
  dialogBox.classList.add('hidden');
}

function toggleCharModal() {
  if (!charModal) return;
  charModal.classList.toggle('hidden');
}

window.addEventListener('keydown', (e) => {
  const code = e.code;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
    e.preventDefault();
  }
  keys[code] = true;

  // Quick character selection with keys 1 to 6
  if (code >= 'Digit1' && code <= 'Digit6') {
    const idx = parseInt(code.replace('Digit', ''), 10) - 1;
    selectCharacter(idx, true);
    return;
  }

  if (code === 'KeyP') {
    toggleCharModal();
    return;
  }

  if (code === 'KeyG') toggleGrid();
  if (code === 'KeyC') toggleCollisions();
  if (code === 'KeyL') toggleLabels();
  if (code === 'KeyE' || code === 'Space') {
    if (charModal && !charModal.classList.contains('hidden')) {
      charModal.classList.add('hidden');
      return;
    }
    handleInteraction();
  }
  if (code === 'Escape') {
    if (charModal && !charModal.classList.contains('hidden')) {
      charModal.classList.add('hidden');
      return;
    }
    dialogBox.classList.add('hidden');
    if (player.sitting) standUp();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function canMoveTo(nx, ny) {
  // Check 4 corners of player's feet hitbox
  const halfW = 5;
  const halfH = 4;
  const checkPoints = [
    { x: nx - halfW, y: ny - halfH },
    { x: nx + halfW, y: ny - halfH },
    { x: nx - halfW, y: ny + halfH },
    { x: nx + halfW, y: ny + halfH }
  ];

  for (const pt of checkPoints) {
    const col = Math.floor(pt.x / TILE_SIZE);
    const row = Math.floor(pt.y / TILE_SIZE);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
    if (collisionMap[row][col]) return false;
  }
  return true;
}

let activeInteractable = null;

function updatePlayer() {
  // Pause movement if character selection modal is open
  if (charModal && !charModal.classList.contains('hidden')) {
    player.moving = false;
    return;
  }

  let dx = 0;
  let dy = 0;

  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

  if (dx !== 0 || dy !== 0) {
    // If sitting on sofa/chair, stand up onto the free walkway first so player never gets stuck
    if (player.sitting) {
      standUp();
    }

    // Normalize diagonal speed
    const len = Math.hypot(dx, dy);
    const sprint = (keys['ShiftLeft'] || keys['ShiftRight']) ? 1.55 : 1.0;
    const vx = (dx / len) * player.speed * sprint;
    const vy = (dy / len) * player.speed * sprint;

    if (Math.abs(dx) >= Math.abs(dy)) {
      player.dir = dx > 0 ? 'right' : 'left';
    } else {
      player.dir = dy > 0 ? 'down' : 'up';
    }

    if (canMoveTo(player.x + vx, player.y)) player.x += vx;
    if (canMoveTo(player.x, player.y + vy)) player.y += vy;

    player.moving = true;
    player.walkFrame += sprint * 0.18;
  } else {
    player.moving = false;
    player.walkFrame = 0;
  }

  // Update current zone badge in HUD
  updateZoneBadge();

  if (player.sitting) {
    interactionText.textContent = 'Levantar (ou use WASD / Setas)';
    interactionPrompt.classList.remove('hidden');
    return;
  }

  // Find closest interactable object
  let best = null;
  let bestDist = Infinity;
  for (const item of interactables) {
    const dist = Math.hypot(player.x - item.cx, player.y - item.cy);
    if (dist <= item.radius && dist < bestDist) {
      best = item;
      bestDist = dist;
    }
  }

  activeInteractable = best;
  if (activeInteractable) {
    interactionText.textContent = activeInteractable.label;
    interactionPrompt.classList.remove('hidden');
  } else {
    interactionPrompt.classList.add('hidden');
  }
}

function handleInteraction() {
  if (!dialogBox.classList.contains('hidden')) {
    dialogBox.classList.add('hidden');
    return;
  }
  if (player.sitting) {
    standUp();
    return;
  }
  if (!activeInteractable) return;

  if (activeInteractable.seat) {
    const seat = activeInteractable.seat;
    // Save valid walkable exit position before moving onto solid furniture
    player.standUpPos = {
      x: seat.exitX ?? player.x,
      y: seat.exitY ?? player.y
    };
    player.x = seat.x;
    player.y = seat.y;
    player.dir = seat.dir;
    player.seatSortY = seat.sortY ?? (seat.y + TILE_SIZE);
    player.sitting = true;
  }

  dialogTitle.textContent = activeInteractable.title;
  dialogBody.textContent = activeInteractable.description;
  dialogBox.classList.remove('hidden');
}

dialogClose.addEventListener('click', () => {
  dialogBox.classList.add('hidden');
});

function updateZoneBadge() {
  const col = Math.floor(player.x / TILE_SIZE);
  const row = Math.floor(player.y / TILE_SIZE);
  const f = floorMap[row]?.[col] ?? 2;

  if (f === 3) {
    zoneBadge.textContent = '📚 Biblioteca & Estante de Livros';
  } else if (f === 4) {
    zoneBadge.textContent = '🛋️ Área do Sofá & Lounge';
  } else if (f === 5) {
    zoneBadge.textContent = '☕ Copa & Café';
  } else if (col <= 10) {
    zoneBadge.textContent = '💻 Área das Mesas & Computadores';
  } else {
    zoneBadge.textContent = '📍 Corredor Central';
  }
}

/**
 * Draw any of the 6 Pixel Characters onto a target 2D context
 */
function drawCharacterSprite(targetCtx, cx, cy, charDef, { dir = 'down', moving = false, walkFrame = 0, sitting = false, t = 0, showTag = true }) {
  const fill = (rx, ry, rw, rh, color) => {
    targetCtx.fillStyle = color;
    targetCtx.fillRect(Math.round(rx), Math.round(ry), Math.round(rw), Math.round(rh));
  };

  const x = Math.round(cx - 8);
  const y = Math.round(cy - 18);

  const bob = moving ? (Math.floor(walkFrame) % 2 === 0 ? -1 : 0) : (Math.floor(t / 28) % 2 === 0 ? 0 : 1);
  const step = moving ? Math.sin(walkFrame * Math.PI) : 0;

  // 1. Shadow & Legs / Shoes
  if (sitting) {
    fill(x + 3, y + 14, 10, 3, 'rgba(0,0,0,0.25)');
    if (dir === 'down') {
      fill(x + 4, y + 13, 3, 3, charDef.bottom);
      fill(x + 9, y + 13, 3, 3, charDef.bottom);
      fill(x + 4, y + 16, 3, 2, charDef.shoes);
      fill(x + 9, y + 16, 3, 2, charDef.shoes);
    } else if (dir === 'right') {
      fill(x + 8, y + 13, 5, 3, charDef.bottom);
      fill(x + 12, y + 14, 2, 2, charDef.shoes);
    } else if (dir === 'left') {
      fill(x + 3, y + 13, 5, 3, charDef.bottom);
      fill(x + 2, y + 14, 2, 2, charDef.shoes);
    }
  } else {
    fill(x + 3, y + 17, 10, 4, 'rgba(0,0,0,0.35)');
    const leftLegY = y + 14 + (step > 0.2 ? -1 : 0);
    const rightLegY = y + 14 + (step < -0.2 ? -1 : 0);
    fill(x + 4, leftLegY, 3, 4, charDef.bottom);
    fill(x + 9, rightLegY, 3, 4, charDef.bottom);
    fill(x + 4, leftLegY + 3, 3, 1, charDef.shoes);
    fill(x + 9, rightLegY + 3, 3, 1, charDef.shoes);
  }

  // 2. Torso (Shirt / Blazer / Hoodie)
  fill(x + 3, y + 8 + bob, 10, 7, charDef.top);
  fill(x + 4, y + 8 + bob, 8, 6, charDef.topHighlight);

  // Female skirt/waist trim or Male collar/tie details
  if (charDef.id === 'marina' && !sitting) {
    fill(x + 3, y + 13 + bob, 10, 2, charDef.bottom); // Denim skirt/overalls line
  }
  if (dir === 'down') {
    if (charDef.accessory === 'tie') {
      fill(x + 6, y + 8 + bob, 4, 2, '#ffffff');
      fill(x + 7, y + 9 + bob, 2, 4, charDef.detailColor); // Red tie
    } else {
      fill(x + 6, y + 8 + bob, 4, 2, charDef.detailColor);
    }
    if (charDef.accessory === 'beard_headphones') {
      // Cyan headphones resting on neck
      fill(x + 4, y + 8 + bob, 2, 2, '#22d3ee');
      fill(x + 10, y + 8 + bob, 2, 2, '#22d3ee');
    }
  }

  // 3. Arms
  const armSwing = moving ? Math.round(step * 1.5) : 0;
  if (dir === 'left' || dir === 'right') {
    fill(x + 6, y + 9 + bob + armSwing, 4, 5, charDef.top);
    fill(x + 6, y + 13 + bob + armSwing, 3, 2, charDef.skin);
  } else {
    fill(x + 2, y + 9 + bob + armSwing, 2, 5, charDef.top);
    fill(x + 2, y + 13 + bob + armSwing, 2, 2, charDef.skin);
    fill(x + 12, y + 9 + bob - armSwing, 2, 5, charDef.top);
    fill(x + 12, y + 13 + bob - armSwing, 2, 2, charDef.skin);
  }

  // 4. Head & Skin
  fill(x + 3, y + 1 + bob, 10, 8, charDef.skinShadow);
  fill(x + 4, y + 2 + bob, 8, 6, charDef.skin);

  // 5. Hairstyles & Facial Features by Direction
  if (charDef.hairStyle === 'curly') {
    // Bia: Voluminous afro puffs on top & sides
    fill(x + 2, y - 1 + bob, 12, 4, charDef.hair);
    fill(x + 1, y + 1 + bob, 2, 5, charDef.hair);
    fill(x + 13, y + 1 + bob, 2, 5, charDef.hair);
    fill(x + 4, y - 1 + bob, 8, 2, charDef.hairHighlight);
  } else if (charDef.hairStyle === 'bun') {
    // Marina: High bun on crown + pink ribbon
    fill(x + 5, y - 3 + bob, 6, 3, charDef.hair);
    fill(x + 6, y - 2 + bob, 4, 1, charDef.hairHighlight);
    fill(x + 5, y + bob, 6, 1, '#ec4899'); // Pink hair ribbon
    fill(x + 3, y + bob, 10, 3, charDef.hair);
  } else if (charDef.hairStyle === 'long') {
    // Clara: Long auburn hair framing head and flowing over shoulders
    fill(x + 3, y + bob, 10, 3, charDef.hair);
    fill(x + 4, y + bob, 8, 1, charDef.hairHighlight);
    if (dir !== 'up') {
      fill(x + 2, y + 2 + bob, 2, 8, charDef.hair);
      fill(x + 12, y + 2 + bob, 2, 8, charDef.hair);
    }
  } else if (charDef.hairStyle === 'parted') {
    // Tiago: Blonde side-part
    fill(x + 3, y + bob, 10, 3, charDef.hair);
    fill(x + 4, y + bob, 6, 2, charDef.hairHighlight);
  } else {
    // Lucas / Rafael short or fade hair
    fill(x + 3, y + bob, 10, 3, charDef.hair);
    fill(x + 4, y + bob, 8, 1, charDef.hairHighlight);
  }

  if (dir === 'up') {
    // Back of hair covers head
    fill(x + 3, y + 1 + bob, 10, 7, charDef.hair);
    fill(x + 4, y + 2 + bob, 8, 5, charDef.hairHighlight);
    if (charDef.hairStyle === 'long') {
      fill(x + 2, y + 2 + bob, 12, 9, charDef.hair);
      fill(x + 4, y + 3 + bob, 8, 7, charDef.hairHighlight);
    }
  } else if (dir === 'down') {
    if (charDef.hairStyle !== 'fade') {
      fill(x + 3, y + 2 + bob, 2, 2, charDef.hair);
      fill(x + 11, y + 2 + bob, 2, 2, charDef.hair);
    }
    // Eyes
    fill(x + 5, y + 5 + bob, 2, 2, '#0f172a');
    fill(x + 9, y + 5 + bob, 2, 2, '#0f172a');

    // Accessories (Glasses, Beard, Earrings)
    if (charDef.accessory === 'glasses') {
      fill(x + 4, y + 4 + bob, 4, 3, 'rgba(147, 197, 253, 0.45)');
      fill(x + 8, y + 4 + bob, 4, 3, 'rgba(147, 197, 253, 0.45)');
      fill(x + 5, y + 5 + bob, 1, 1, '#ffffff');
      fill(x + 9, y + 5 + bob, 1, 1, '#ffffff');
    } else {
      fill(x + 5, y + 5 + bob, 1, 1, '#ffffff');
      fill(x + 9, y + 5 + bob, 1, 1, '#ffffff');
    }

    if (charDef.accessory === 'beard_headphones') {
      // Short beard along jawline
      fill(x + 4, y + 7 + bob, 8, 2, '#18181b');
      fill(x + 6, y + 7 + bob, 4, 1, '#b46d45');
    }

    if (charDef.accessory === 'earrings') {
      fill(x + 2, y + 6 + bob, 1, 2, '#facc15');
      fill(x + 13, y + 6 + bob, 1, 2, '#facc15');
    }
  } else if (dir === 'left') {
    fill(x + 6, y + 1 + bob, 7, 6, charDef.hair);
    if (charDef.hairStyle === 'long') {
      fill(x + 7, y + 2 + bob, 6, 9, charDef.hair);
    }
    fill(x + 4, y + 5 + bob, 2, 2, '#0f172a');
    if (charDef.accessory === 'beard_headphones') {
      fill(x + 4, y + 7 + bob, 4, 2, '#18181b');
    }
  } else if (dir === 'right') {
    fill(x + 3, y + 1 + bob, 7, 6, charDef.hair);
    if (charDef.hairStyle === 'long') {
      fill(x + 3, y + 2 + bob, 6, 9, charDef.hair);
    }
    fill(x + 10, y + 5 + bob, 2, 2, '#0f172a');
    if (charDef.accessory === 'beard_headphones') {
      fill(x + 8, y + 7 + bob, 4, 2, '#18181b');
    }
  }

  // Floating Name Tag above player on the main map
  if (showTag) {
    const label = charDef.name.toUpperCase();
    const tagW = Math.max(20, label.length * 4 + 6);
    targetCtx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    targetCtx.fillRect(Math.round(cx - tagW / 2), y - 10, tagW, 7);
    targetCtx.fillStyle = '#4ade80';
    targetCtx.font = 'bold 6px monospace';
    targetCtx.textAlign = 'center';
    targetCtx.fillText(label, cx, y - 4);
  }
}

// ============================================================================
// 5. LIGHTING, OVERLAYS & MAIN RENDER LOOP
// ============================================================================
function drawSunbeams() {
  // Subtle warm sunbeams coming through the two north windows
  ctx.fillStyle = 'rgba(254, 249, 195, 0.06)';
  ctx.beginPath();
  ctx.moveTo(3 * TILE_SIZE, 2 * TILE_SIZE);
  ctx.lineTo(5 * TILE_SIZE, 2 * TILE_SIZE);
  ctx.lineTo(6.5 * TILE_SIZE, 7 * TILE_SIZE);
  ctx.lineTo(2.5 * TILE_SIZE, 7 * TILE_SIZE);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(7 * TILE_SIZE, 2 * TILE_SIZE);
  ctx.lineTo(9 * TILE_SIZE, 2 * TILE_SIZE);
  ctx.lineTo(10.5 * TILE_SIZE, 7 * TILE_SIZE);
  ctx.lineTo(6.5 * TILE_SIZE, 7 * TILE_SIZE);
  ctx.closePath();
  ctx.fill();
}

function drawZoneLabels() {
  if (!showZoneLabels) return;
  const labels = [
    { text: 'ÁREA DE TRABALHO', x: 5.5 * TILE_SIZE, y: 3.3 * TILE_SIZE, color: '#93c5fd' },
    { text: 'ESTANTE DE LIVROS', x: 17 * TILE_SIZE, y: 5.6 * TILE_SIZE, color: '#fde047' },
    { text: 'ÁREA DO SOFÁ / LOUNGE', x: 17.5 * TILE_SIZE, y: 13.7 * TILE_SIZE, color: '#fdba74' }
  ];

  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  for (const lbl of labels) {
    const w = lbl.text.length * 4 + 8;
    pxRect(lbl.x - w / 2, lbl.y - 6, w, 8, 'rgba(15, 23, 42, 0.72)');
    ctx.fillStyle = lbl.color;
    ctx.fillText(lbl.text, Math.round(lbl.x), Math.round(lbl.y));
  }
}

function drawDebugOverlays() {
  if (showGrid) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= MAP_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * TILE_SIZE + 0.5, 0);
      ctx.lineTo(c * TILE_SIZE + 0.5, NATIVE_HEIGHT);
      ctx.stroke();
    }
    for (let r = 0; r <= MAP_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * TILE_SIZE + 0.5);
      ctx.lineTo(NATIVE_WIDTH, r * TILE_SIZE + 0.5);
      ctx.stroke();
    }
  }

  if (showCollisions) {
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        if (collisionMap[r][c]) {
          pxRect(c * TILE_SIZE + 1, r * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2, 'rgba(239, 68, 68, 0.38)');
        }
      }
    }
  }
}

function renderCharacterPreviews() {
  if (!charModal || charModal.classList.contains('hidden')) return;
  for (const item of previewCanvases) {
    item.ctx.clearRect(0, 0, 24, 26);
    const isSelected = item.idx === selectedCharIndex;
    drawCharacterSprite(item.ctx, 12, 21, item.charDef, {
      dir: 'down',
      moving: isSelected,
      walkFrame: tick * 0.12,
      sitting: false,
      t: tick + item.idx * 10,
      showTag: false
    });
  }
}

function render() {
  tick++;
  updatePlayer();

  // 1. Draw static floor & wall canvas
  ctx.drawImage(bgCanvas, 0, 0);

  // 2. Draw sunbeams on floor
  drawSunbeams();

  // 3. Y-Sort all furniture and the player character so depth works naturally
  const activeChar = CHARACTERS[selectedCharIndex];
  const playerSortY = (player.sitting && player.seatSortY != null) ? player.seatSortY : (player.y + 4);
  const renderList = [
    ...objects,
    {
      sortY: playerSortY,
      draw: (t) => drawCharacterSprite(ctx, player.x, player.y, activeChar, {
        dir: player.dir,
        moving: player.moving,
        walkFrame: player.walkFrame,
        sitting: player.sitting,
        t,
        showTag: true
      })
    }
  ];

  renderList.sort((a, b) => a.sortY - b.sortY);

  for (const item of renderList) {
    item.draw(tick);
  }

  // 4. Optional Zone Labels & Debug Overlays
  drawZoneLabels();
  drawDebugOverlays();

  // 5. Animate previews if Character Modal is open
  renderCharacterPreviews();

  requestAnimationFrame(render);
}

// ============================================================================
// 6. HUD BUTTON CONTROLS
// ============================================================================
function toggleGrid() {
  showGrid = !showGrid;
  btnGrid.classList.toggle('active', showGrid);
}

function toggleCollisions() {
  showCollisions = !showCollisions;
  btnCollision.classList.toggle('active', showCollisions);
}

function toggleLabels() {
  showZoneLabels = !showZoneLabels;
  btnLabels.classList.toggle('active', showZoneLabels);
}

btnGrid.addEventListener('click', toggleGrid);
btnCollision.addEventListener('click', toggleCollisions);
btnLabels.addEventListener('click', toggleLabels);
if (btnCharSelect) btnCharSelect.addEventListener('click', toggleCharModal);
if (charModalClose) charModalClose.addEventListener('click', () => charModal.classList.add('hidden'));

btnZoomIn.addEventListener('click', () => {
  if (zoom < 5) {
    zoom++;
    applyZoom();
  }
});

btnZoomOut.addEventListener('click', () => {
  if (zoom > 1) {
    zoom--;
    applyZoom();
  }
});

// Build the 6-character selector modal and start loop
buildCharacterSelectorModal();
requestAnimationFrame(render);
