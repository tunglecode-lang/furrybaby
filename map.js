/* ==========================================================================
   FURRYBABY - HIGH-DEFINITION PROCEDURAL PIXEL MAP ENGINE
   Comprehensive 2000x1600 Multi-Biome World with Rich Textures,
   Organic Tile Transitions, Detailed Foliage & Vibrant Pixel Art Props
   ========================================================================== */

(function(window) {
  'use strict';

  // Tile size & map dimensions
  const TILE_SIZE = 40;
  const MAP_COLS = 50;
  const MAP_ROWS = 40;
  const MAP_WIDTH = MAP_COLS * TILE_SIZE;  // 2000px
  const MAP_HEIGHT = MAP_ROWS * TILE_SIZE; // 1600px

  // Rich, vibrant, tailored pixel color palettes
  const PALETTE = {
    meadow: {
      base: '#6db842',
      alt: '#7bc44e',
      dark: '#589b33',
      light: '#8dd45e',
      accent: '#9ee06b',
      shadow: '#498028'
    },
    shrine: {
      base: '#a4de83',
      alt: '#93d472',
      dark: '#7fb860',
      light: '#bbf09a',
      accent: '#f8b4cb',
      stone: '#cfc6d4',
      stoneDark: '#9b8eab'
    },
    forest: {
      base: '#2b6938',
      alt: '#23592e',
      dark: '#1a4522',
      light: '#3d824d',
      moss: '#7cc752',
      spore: '#68ffd4'
    },
    galaxy: {
      base: '#181135',
      alt: '#231849',
      dark: '#100b24',
      light: '#332367',
      cyan: '#47e5df',
      purple: '#ac3cf0',
      pink: '#ff4b8e'
    },
    lagoon: {
      deep: '#144f77',
      mid: '#1a7099',
      shallow: '#2d9db0',
      shore: '#3eb8c4',
      foam: '#d8f4ea',
      sand: '#ebd8a4',
      sandDark: '#cfa869'
    },
    volcano: {
      base: '#241a29',
      alt: '#32233a',
      dark: '#16101a',
      light: '#422f4c',
      lava: '#e83800',
      lavaHot: '#ff7700',
      neonPink: '#f72585',
      neonCyan: '#00f5d4',
      neonGold: '#fee440'
    },
    path: {
      light: '#d4ad78',
      mid: '#b88d55',
      dark: '#946d3a',
      stone: '#ece0cb',
      stoneDark: '#78572b'
    }
  };

  class PixelMap {
    constructor() {
      this.width = MAP_WIDTH;
      this.height = MAP_HEIGHT;
      this.cols = MAP_COLS;
      this.rows = MAP_ROWS;
      this.tileSize = TILE_SIZE;

      // Offscreen static canvas cache for rendering at 60+ FPS
      this.bgCanvas = document.createElement('canvas');
      this.bgCanvas.width = MAP_WIDTH;
      this.bgCanvas.height = MAP_HEIGHT;
      this.bgCtx = this.bgCanvas.getContext('2d');

      this.grid = [];
      this.lights = [];
      this.particles = [];

      this.initGrid();
      this.renderStaticWorld();

      // Ultra-crisp pre-scaled minimap background (170x136)
      this.minimapBgCanvas = document.createElement('canvas');
      this.minimapBgCanvas.width = 170;
      this.minimapBgCanvas.height = 136;
      const mmCtx = this.minimapBgCanvas.getContext('2d');
      mmCtx.imageSmoothingEnabled = false;
      mmCtx.drawImage(this.bgCanvas, 0, 0, 170, 136);

      this.initParticles();
    }

    getBiomeAt(c, r) {
      if (c < 17 && r < 15) return 'shrine';
      if (c < 18 && r >= 15 && r < 28) return 'forest';
      if (c < 20 && r >= 28) return 'lagoon';
      if (c >= 28 && r < 16) return 'galaxy';
      if (c >= 28 && r >= 25) return 'volcano';
      return 'meadow';
    }

    initGrid() {
      this.grid = [];
      for (let r = 0; r < this.rows; r++) {
        const row = [];
        for (let c = 0; c < this.cols; c++) {
          const biome = this.getBiomeAt(c, r);
          row.push({ biome, c, r });
        }
        this.grid.push(row);
      }
    }

    renderStaticWorld() {
      const ctx = this.bgCtx;
      ctx.imageSmoothingEnabled = false;

      // 1. Draw detailed procedural terrain
      this.drawHighDefTerrain(ctx);

      // 2. Draw organic winding cobblestone paths with shading & grass tufts
      this.drawArtisticPathways(ctx);

      // 3. Draw high-detail natural boundaries & biome props
      this.drawShrineBiome(ctx);
      this.drawForestBiome(ctx);
      this.drawGalaxyBiome(ctx);
      this.drawLagoonBiome(ctx);
      this.drawVolcanoBiome(ctx);
      this.drawMeadowVillage(ctx);
    }

    // ====================================================
    // HIGH-DEFINITION TERRAIN GENERATION
    // ====================================================
    drawHighDefTerrain(ctx) {
      const ts = this.tileSize;

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const biome = this.grid[r][c].biome;
          const x = c * ts;
          const y = r * ts;

          // Pseudo-random deterministic hash based on coordinates
          const hash1 = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
          const seed1 = Math.floor((hash1 - Math.floor(hash1)) * 100);
          const hash2 = Math.cos(c * 37.719 + r * 19.381) * 29183.1841;
          const seed2 = Math.floor((hash2 - Math.floor(hash2)) * 100);

          switch (biome) {
            case 'shrine':
              this.drawShrineTile(ctx, x, y, c, r, seed1, seed2);
              break;
            case 'forest':
              this.drawForestTile(ctx, x, y, c, r, seed1, seed2);
              break;
            case 'galaxy':
              this.drawGalaxyTile(ctx, x, y, c, r, seed1, seed2);
              break;
            case 'lagoon':
              this.drawLagoonTile(ctx, x, y, c, r, seed1, seed2);
              break;
            case 'volcano':
              this.drawVolcanoTile(ctx, x, y, c, r, seed1, seed2);
              break;
            default:
              this.drawMeadowTile(ctx, x, y, c, r, seed1, seed2);
              break;
          }
        }
      }

      // Smooth organic blending along biome borders (dithering)
      this.drawBiomeEdgeTransitions(ctx);
    }

    drawMeadowTile(ctx, x, y, c, r, s1, s2) {
      const p = PALETTE.meadow;
      ctx.fillStyle = (c + r) % 2 === 0 ? p.base : p.alt;
      ctx.fillRect(x, y, 40, 40);

      // Micro pixel grass blades
      ctx.fillStyle = p.dark;
      if (s1 > 30) {
        ctx.fillRect(x + (s1 % 32), y + (s2 % 32), 2, 4);
        ctx.fillRect(x + (s1 % 32) + 1, y + (s2 % 32) + 1, 2, 3);
      }
      if (s2 > 50) {
        ctx.fillStyle = p.light;
        ctx.fillRect(x + (s2 % 30) + 4, y + (s1 % 30) + 2, 2, 4);
      }

      // Dainty wild flowers (daisies, buttercups, pink blossoms)
      if (s1 > 82) {
        const flowerCol = s2 > 60 ? '#ffffff' : (s2 > 30 ? '#fee440' : '#ff70a6');
        const fx = x + (s1 % 28) + 4;
        const fy = y + (s2 % 28) + 4;
        ctx.fillStyle = flowerCol;
        ctx.fillRect(fx, fy - 1, 2, 4);
        ctx.fillRect(fx - 1, fy, 4, 2);
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(fx, fy, 2, 2);
      }
    }

    drawShrineTile(ctx, x, y, c, r, s1, s2) {
      const p = PALETTE.shrine;
      ctx.fillStyle = (c + r) % 2 === 0 ? p.base : p.alt;
      ctx.fillRect(x, y, 40, 40);

      // Gentle pale grass pattern
      ctx.fillStyle = p.dark;
      if (s1 > 40) ctx.fillRect(x + (s1 % 34), y + (s2 % 34), 2, 3);
      if (s2 > 55) {
        ctx.fillStyle = p.light;
        ctx.fillRect(x + (s2 % 30), y + (s1 % 30), 3, 2);
      }

      // Scattered fallen sakura petals
      if (s1 > 65) {
        ctx.fillStyle = '#fcaec9';
        const px = x + (s1 % 32);
        const py = y + (s2 % 32);
        ctx.fillRect(px, py, 3, 2);
        ctx.fillRect(px + 1, py + 1, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px, py, 1, 1);
      }
    }

    drawForestTile(ctx, x, y, c, r, s1, s2) {
      const p = PALETTE.forest;
      ctx.fillStyle = (c * 3 + r * 7) % 3 === 0 ? p.base : p.alt;
      ctx.fillRect(x, y, 40, 40);

      // Deep emerald moss patches
      if (s1 > 35) {
        ctx.fillStyle = p.moss;
        const mx = x + (s1 % 26);
        const my = y + (s2 % 26);
        ctx.fillRect(mx, my, 8, 5);
        ctx.fillRect(mx + 2, my - 2, 5, 8);
      }
      if (s2 > 65) {
        ctx.fillStyle = p.dark;
        ctx.fillRect(x + (s2 % 30), y + (s1 % 30), 4, 4);
      }
      // Glowing luminescent spore specks
      if (s1 > 88) {
        ctx.fillStyle = p.spore;
        ctx.fillRect(x + (s1 % 34), y + (s2 % 34), 2, 2);
      }
    }

    drawGalaxyTile(ctx, x, y, c, r, s1, s2) {
      const p = PALETTE.galaxy;
      ctx.fillStyle = (c + r) % 2 === 0 ? p.base : p.alt;
      ctx.fillRect(x, y, 40, 40);

      // Cosmic dust nebulas
      if (s1 > 40) {
        ctx.fillStyle = p.light;
        ctx.fillRect(x + (s1 % 24), y + (s2 % 24), 14, 10);
      }
      // Stardust and cosmic crystal specks
      if (s2 > 50) {
        const starCol = s1 > 80 ? p.cyan : (s1 > 50 ? p.pink : '#ffffff');
        ctx.fillStyle = starCol;
        ctx.fillRect(x + (s2 % 34), y + (s1 % 34), 2, 2);
      }
    }

    drawLagoonTile(ctx, x, y, c, r, s1, s2) {
      const p = PALETTE.lagoon;
      // Water depth layering
      ctx.fillStyle = r > 33 ? p.deep : p.mid;
      ctx.fillRect(x, y, 40, 40);

      // Dynamic pixel water ripples & caustics
      ctx.fillStyle = p.shallow;
      const rx1 = x + (s1 % 24);
      const ry1 = y + (s2 % 14);
      ctx.fillRect(rx1, ry1, 14, 2);
      ctx.fillRect(rx1 + 2, ry1 + 2, 10, 2);

      const rx2 = x + ((s2 * 3) % 20);
      const ry2 = y + 20 + ((s1 * 2) % 14);
      ctx.fillRect(rx2, ry2, 16, 2);

      // Foam caps
      if (s1 > 70) {
        ctx.fillStyle = p.foam;
        ctx.fillRect(rx1 + 4, ry1 - 1, 6, 1);
      }
    }

    drawVolcanoTile(ctx, x, y, c, r, s1, s2) {
      const p = PALETTE.volcano;
      ctx.fillStyle = (c * 2 + r * 3) % 2 === 0 ? p.base : p.alt;
      ctx.fillRect(x, y, 40, 40);

      // Cracked obsidian & glowing magma veins
      if (s1 > 45) {
        ctx.fillStyle = p.dark;
        ctx.fillRect(x + (s1 % 28), y + (s2 % 28), 12, 8);
      }
      if (s2 > 65) {
        ctx.fillStyle = s1 > 75 ? p.lavaHot : p.lava;
        const vx = x + (s2 % 26);
        const vy = y + (s1 % 26);
        ctx.fillRect(vx, vy, 10, 2);
        ctx.fillRect(vx + 4, vy + 2, 6, 2);
      }
      if (s1 > 90) {
        ctx.fillStyle = p.neonPink;
        ctx.fillRect(x + (s1 % 32), y + (s2 % 32), 3, 3);
      }
    }

    drawBiomeEdgeTransitions(ctx) {
      // Natural organic blending between biomes using dither clusters
      for (let r = 0; r < this.rows - 1; r++) {
        for (let c = 0; c < this.cols - 1; c++) {
          const cur = this.grid[r][c].biome;
          const right = this.grid[r][c + 1].biome;
          const down = this.grid[r + 1][c].biome;

          if (cur !== right) {
            this.ditherVerticalBorder(ctx, (c + 1) * 40, r * 40, cur, right);
          }
          if (cur !== down) {
            this.ditherHorizontalBorder(ctx, c * 40, (r + 1) * 40, cur, down);
          }
        }
      }
    }

    ditherVerticalBorder(ctx, x, y, b1, b2) {
      // Smooth gradient fringe
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(x - 2, y, 4, 40);
    }

    ditherHorizontalBorder(ctx, x, y, b1, b2) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(x, y - 2, 40, 4);
    }

    // ====================================================
    // ARTISTIC ORGANIC PATHWAYS & COBBLESTONES
    // ====================================================
    drawArtisticPathways(ctx) {
      const paths = [
        // Main Crossroad Avenue (East-West)
        { x1: 340, y1: 820, x2: 1680, y2: 820, w: 56 },
        // Main Sanctuary Promenade (North-South)
        { x1: 1020, y1: 280, x2: 1020, y2: 1380, w: 56 },
        // Sacred Shrine Walkway
        { x1: 520, y1: 820, x2: 390, y2: 440, w: 46 },
        // Celestial Observatory Path
        { x1: 1020, y1: 520, x2: 1480, y2: 380, w: 46 },
        // Dragon Peak Trail
        { x1: 1240, y1: 820, x2: 1560, y2: 1180, w: 48 },
        // Azure Lagoon Boardwalk Trail
        { x1: 820, y1: 920, x2: 500, y2: 1220, w: 48 }
      ];

      paths.forEach(p => {
        ctx.save();

        // 1. Path Earth Foundation & Border Shadow
        ctx.strokeStyle = '#5a4224';
        ctx.lineWidth = p.w + 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();

        // 2. Light Sandy Dirt Base
        ctx.strokeStyle = PALETTE.path.light;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();

        // 3. Inner Pathway Shading
        ctx.strokeStyle = PALETTE.path.mid;
        ctx.lineWidth = p.w - 14;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();

        // 4. Detailed Handcrafted Cobblestones along path
        const dist = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
        const steps = Math.floor(dist / 22);
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const bx = p.x1 + (p.x2 - p.x1) * t;
          const by = p.y1 + (p.y2 - p.y1) * t;

          // Perpendicular offset for cobblestone rows
          const nx = -(p.y2 - p.y1) / dist;
          const ny = (p.x2 - p.x1) / dist;

          for (let row = -1; row <= 1; row++) {
            const jitter = ((i * 17 + row * 31) % 9) - 4;
            const sx = bx + nx * (row * (p.w * 0.28) + jitter);
            const sy = by + ny * (row * (p.w * 0.28) + jitter);

            // Shadow
            ctx.fillStyle = '#6a4e28';
            ctx.fillRect(sx - 6, sy - 5, 13, 11);

            // Stone body
            const stoneCol = (i + row) % 3 === 0 ? PALETTE.path.stone : (row === 0 ? '#ded1ba' : '#c4a67e');
            ctx.fillStyle = stoneCol;
            ctx.fillRect(sx - 5, sy - 4, 11, 9);

            // Highlight bevel
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx - 5, sy - 4, 11, 2);
            ctx.fillRect(sx - 5, sy - 4, 2, 9);
          }
        }

        ctx.restore();
      });
    }

    // ====================================================
    // BIOME 1: SACRED SHRINE & SAKURA GARDEN (Đền Thần Cổ Kính)
    // ====================================================
    drawShrineBiome(ctx) {
      // 1. Grand Sacred Torii Gate
      this.drawGrandTorii(ctx, 390, 240);
      this.lights.push({ x: 390, y: 250, r: 100, color: 'rgba(255, 190, 160, 0.5)' });

      // 2. High-Def Sakura Cherry Blossom Trees
      this.drawDeluxeSakuraTree(ctx, 220, 200, 48);
      this.drawDeluxeSakuraTree(ctx, 560, 210, 52);
      this.drawDeluxeSakuraTree(ctx, 150, 410, 44);
      this.drawDeluxeSakuraTree(ctx, 590, 450, 46);

      // 3. Stone Lanterns (Toro)
      this.drawToroLantern(ctx, 300, 360);
      this.drawToroLantern(ctx, 480, 360);
      this.lights.push({ x: 300, y: 350, r: 70, color: 'rgba(255, 230, 140, 0.55)' });
      this.lights.push({ x: 480, y: 350, r: 70, color: 'rgba(255, 230, 140, 0.55)' });

      // 4. Sacred Pagoda Altar
      this.drawShrineAltar(ctx, 390, 350, 140, 75);

      // 5. Koi & Lotus Pond with crystal water reflections
      this.drawKoiPond(ctx, 390, 490, 95, 55);
    }

    drawGrandTorii(ctx, x, y) {
      ctx.save();
      // Drop Shadow
      ctx.fillStyle = 'rgba(25, 20, 35, 0.35)';
      ctx.fillRect(x - 60, y + 5, 120, 16);

      // Pillars
      [-48, 38].forEach(px => {
        // Black stone base plinth
        ctx.fillStyle = '#222026';
        ctx.fillRect(x + px - 3, y - 8, 16, 12);
        ctx.fillStyle = '#44404c';
        ctx.fillRect(x + px - 1, y - 6, 12, 10);

        // Vermilion pillar
        ctx.fillStyle = '#941b1e';
        ctx.fillRect(x + px, y - 75, 10, 70);
        ctx.fillStyle = '#df3539';
        ctx.fillRect(x + px + 2, y - 75, 6, 70);
        ctx.fillStyle = '#ff6b6e';
        ctx.fillRect(x + px + 3, y - 75, 2, 70);
      });

      // Lower tie-beam (Nuki)
      ctx.fillStyle = '#941b1e';
      ctx.fillRect(x - 56, y - 56, 112, 8);
      ctx.fillStyle = '#df3539';
      ctx.fillRect(x - 56, y - 54, 112, 4);

      // Upper main lintel (Kasagi & Shimaki)
      ctx.fillStyle = '#18161c';
      ctx.fillRect(x - 68, y - 84, 136, 10);
      ctx.fillStyle = '#3a3642';
      ctx.fillRect(x - 66, y - 82, 132, 4);

      ctx.fillStyle = '#941b1e';
      ctx.fillRect(x - 62, y - 74, 124, 8);
      ctx.fillStyle = '#df3539';
      ctx.fillRect(x - 62, y - 72, 124, 4);

      // Sacred Gold Plaque & Crest
      ctx.fillStyle = '#fee440';
      ctx.fillRect(x - 9, y - 68, 18, 14);
      ctx.fillStyle = '#b78b02';
      ctx.strokeRect(x - 9, y - 68, 18, 14);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 4, y - 63, 8, 4);
      ctx.restore();
    }

    drawDeluxeSakuraTree(ctx, x, y, r) {
      ctx.save();
      // Drop shadow
      ctx.fillStyle = 'rgba(25, 20, 35, 0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y + 24, r * 1.25, r * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ancient textured trunk & roots
      ctx.fillStyle = '#402920';
      ctx.fillRect(x - 10, y - 35, 20, 55);
      ctx.fillRect(x - 22, y - 10, 16, 25);
      ctx.fillRect(x + 8, y - 6, 16, 22);

      ctx.fillStyle = '#6e4a3c';
      ctx.fillRect(x - 6, y - 35, 10, 55);
      ctx.fillRect(x - 18, y - 7, 8, 20);
      ctx.fillRect(x + 11, y - 3, 8, 18);

      // Lush layered sakura blossom clusters
      const blossomShades = ['#fcaec9', '#ff8fae', '#ffa6c0', '#ffd3e1', '#ffffff'];
      const canopyNodes = [
        { dx: 0, dy: -42, rad: r * 0.75 },
        { dx: -r * 0.45, dy: -32, rad: r * 0.65 },
        { dx: r * 0.45, dy: -34, rad: r * 0.65 },
        { dx: -r * 0.3, dy: -56, rad: r * 0.6 },
        { dx: r * 0.3, dy: -54, rad: r * 0.6 },
        { dx: 0, dy: -68, rad: r * 0.55 }
      ];

      canopyNodes.forEach((node, idx) => {
        // Deep shading
        ctx.fillStyle = blossomShades[1];
        ctx.beginPath();
        ctx.arc(x + node.dx, y + node.dy + 3, node.rad, 0, Math.PI * 2);
        ctx.fill();

        // Main pink foliage
        ctx.fillStyle = blossomShades[0];
        ctx.beginPath();
        ctx.arc(x + node.dx, y + node.dy, node.rad, 0, Math.PI * 2);
        ctx.fill();

        // Highlight petals
        ctx.fillStyle = blossomShades[(idx % 2 === 0) ? 3 : 4];
        ctx.beginPath();
        ctx.arc(x + node.dx - node.rad * 0.25, y + node.dy - node.rad * 0.25, node.rad * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    drawToroLantern(ctx, x, y) {
      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(25, 20, 35, 0.28)';
      ctx.beginPath();
      ctx.ellipse(x, y + 14, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stone base & plinth
      ctx.fillStyle = '#7a7082';
      ctx.fillRect(x - 10, y + 8, 20, 8);
      ctx.fillStyle = '#a69ba8';
      ctx.fillRect(x - 8, y + 6, 16, 4);

      // Column
      ctx.fillStyle = '#8f8494';
      ctx.fillRect(x - 5, y - 10, 10, 18);
      ctx.fillStyle = '#b3a8b8';
      ctx.fillRect(x - 3, y - 10, 4, 18);

      // Fire chamber with warm golden light
      ctx.fillStyle = '#fee440';
      ctx.fillRect(x - 8, y - 22, 16, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 4, y - 20, 8, 8);

      // Stone roof with pagoda flares
      ctx.fillStyle = '#5c5264';
      ctx.fillRect(x - 15, y - 28, 30, 7);
      ctx.fillStyle = '#9b8fa3';
      ctx.fillRect(x - 13, y - 27, 26, 4);
      ctx.fillStyle = '#e0d8e4';
      ctx.fillRect(x - 4, y - 32, 8, 5);
      ctx.restore();
    }

    drawShrineAltar(ctx, x, y, w, h) {
      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(20, 15, 30, 0.35)';
      ctx.fillRect(x - w / 2 - 4, y - h / 2 + 8, w + 8, h);

      // Dark lacquered wooden base
      ctx.fillStyle = '#3c2415';
      ctx.fillRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8);
      ctx.fillStyle = '#9c663b';
      ctx.fillRect(x - w / 2, y - h / 2, w, h);

      // Floor polished planks
      ctx.fillStyle = '#7a4e2b';
      for (let px = x - w / 2 + 16; px < x + w / 2; px += 16) {
        ctx.fillRect(px, y - h / 2, 2, h);
      }

      // Red ceremonial carpet
      ctx.fillStyle = '#b72025';
      ctx.fillRect(x - w * 0.38, y - h * 0.38, w * 0.76, h * 0.76);
      ctx.strokeStyle = '#fee440';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - w * 0.38, y - h * 0.38, w * 0.76, h * 0.76);

      // Central lotus emblem
      ctx.fillStyle = '#fee440';
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawKoiPond(ctx, x, y, rw, rh) {
      ctx.save();
      // Cobblestone retaining wall
      ctx.fillStyle = '#7a7082';
      ctx.beginPath();
      ctx.ellipse(x, y, rw + 8, rh + 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#a69ba8';
      ctx.beginPath();
      ctx.ellipse(x, y, rw + 4, rh + 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Clear aquamarine pond water
      ctx.fillStyle = '#1a6485';
      ctx.beginPath();
      ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deep water gradient effect
      ctx.fillStyle = '#329bbd';
      ctx.beginPath();
      ctx.ellipse(x, y - 4, rw * 0.85, rh * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Caustic ripples
      ctx.fillStyle = '#72d8fa';
      ctx.fillRect(x - rw * 0.45, y - 6, 24, 3);
      ctx.fillRect(x + rw * 0.15, y + 8, 28, 3);
      ctx.fillRect(x - rw * 0.1, y + 16, 20, 2);

      // Swimming Koi Fish blips
      ctx.fillStyle = '#ff5400';
      ctx.fillRect(x - 28, y + 4, 8, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 30, y + 5, 3, 2);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 24, y - 8, 8, 4);
      ctx.fillStyle = '#ff2052';
      ctx.fillRect(x + 26, y - 7, 4, 2);

      // Blooming Lotus pads & flowers
      ctx.fillStyle = '#2d8c52';
      ctx.beginPath();
      ctx.arc(x - 40, y - 12, 14, 0, Math.PI * 2);
      ctx.arc(x + 36, y + 10, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff758f';
      ctx.beginPath();
      ctx.arc(x - 40, y - 14, 7, 0, Math.PI * 2);
      ctx.arc(x + 36, y + 8, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 41, y - 15, 3, 3);
      ctx.fillRect(x + 35, y + 7, 3, 3);
      ctx.restore();
    }

    // ====================================================
    // BIOME 2: ENCHANTED ANCIENT FOREST (Rừng Cổ Thảo Linh)
    // ====================================================
    drawForestBiome(ctx) {
      // 1. Giant Ancient Oak & Willow Trees
      this.drawAncientGreatTree(ctx, 210, 840, 62);
      this.drawAncientGreatTree(ctx, 450, 710, 56);
      this.drawAncientGreatTree(ctx, 160, 1040, 58);
      this.drawAncientGreatTree(ctx, 640, 1010, 54);

      // 2. Mossy Standing Runestones
      this.drawMossyRunestone(ctx, 330, 890, 28, 22);
      this.drawMossyRunestone(ctx, 510, 810, 32, 24);

      // 3. Bioluminescent Enchanted Mushrooms
      this.drawGlowingMushroomCluster(ctx, 270, 780, '#ff477e');
      this.drawGlowingMushroomCluster(ctx, 310, 800, '#48cae4');
      this.drawGlowingMushroomCluster(ctx, 470, 760, '#9d4edd');

      this.lights.push({ x: 270, y: 780, r: 80, color: 'rgba(255, 120, 160, 0.45)' });
      this.lights.push({ x: 310, y: 800, r: 85, color: 'rgba(100, 240, 255, 0.5)' });
      this.lights.push({ x: 470, y: 760, r: 85, color: 'rgba(180, 120, 255, 0.45)' });
    }

    drawAncientGreatTree(ctx, x, y, r) {
      ctx.save();
      // Drop Shadow
      ctx.fillStyle = 'rgba(8, 24, 12, 0.38)';
      ctx.beginPath();
      ctx.ellipse(x, y + 28, r * 1.35, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heavy twisted bark trunk
      ctx.fillStyle = '#2b1b13';
      ctx.fillRect(x - 16, y - 40, 32, 68);
      ctx.fillRect(x - 28, y - 12, 18, 36);
      ctx.fillRect(x + 10, y - 8, 18, 34);

      ctx.fillStyle = '#4a3325';
      ctx.fillRect(x - 11, y - 40, 16, 68);
      ctx.fillRect(x - 22, y - 8, 10, 30);
      ctx.fillRect(x + 13, y - 4, 10, 28);

      // Lush leafy layered foliage
      const leafGreens = ['#1a4e2b', '#266c3a', '#348e4d', '#52b769', '#78d488'];
      const treePuffs = [
        { dx: 0, dy: -50, rad: r * 0.75 },
        { dx: -r * 0.45, dy: -38, rad: r * 0.65 },
        { dx: r * 0.45, dy: -40, rad: r * 0.65 },
        { dx: -r * 0.35, dy: -68, rad: r * 0.6 },
        { dx: r * 0.35, dy: -66, rad: r * 0.6 },
        { dx: 0, dy: -84, rad: r * 0.55 }
      ];

      treePuffs.forEach((puff, idx) => {
        ctx.fillStyle = leafGreens[1];
        ctx.beginPath();
        ctx.arc(x + puff.dx, y + puff.dy + 4, puff.rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = leafGreens[2];
        ctx.beginPath();
        ctx.arc(x + puff.dx, y + puff.dy, puff.rad, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = leafGreens[(idx % 2 === 0) ? 3 : 4];
        ctx.beginPath();
        ctx.arc(x + puff.dx - puff.rad * 0.25, y + puff.dy - puff.rad * 0.25, puff.rad * 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    drawMossyRunestone(ctx, x, y, w, h) {
      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(10, 25, 12, 0.3)';
      ctx.beginPath();
      ctx.ellipse(x, y + h * 0.7, w * 1.1, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stone boulder
      ctx.fillStyle = '#39463c';
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5c6e61';
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 2, w * 0.85, h * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rich emerald moss blanket
      ctx.fillStyle = '#6ab848';
      ctx.beginPath();
      ctx.ellipse(x, y - h * 0.35, w * 0.8, h * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ancient glowing rune glyph
      ctx.fillStyle = '#9ef01a';
      ctx.fillRect(x - 4, y - 2, 8, 2);
      ctx.fillRect(x - 1, y - 6, 2, 10);
      ctx.fillRect(x - 3, y + 2, 6, 2);
      ctx.restore();
    }

    drawGlowingMushroomCluster(ctx, x, y, col) {
      ctx.save();
      // Big Mushroom
      ctx.fillStyle = '#eae4d9';
      ctx.fillRect(x - 3, y - 4, 6, 16);

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y - 4, 14, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 6, y - 11, 3, 3);
      ctx.fillRect(x + 3, y - 12, 3, 3);
      ctx.fillRect(x - 1, y - 6, 3, 3);

      // Baby Mushroom
      ctx.fillStyle = '#eae4d9';
      ctx.fillRect(x + 12, y + 2, 4, 10);

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x + 14, y + 2, 8, Math.PI, 0);
      ctx.fill();
      ctx.restore();
    }

    // ====================================================
    // BIOME 3: COSMIC GALAXY & NEBULA ABYSS (Vực Ngân Hà)
    // ====================================================
    drawGalaxyBiome(ctx) {
      // 1. Towering Luminescent Crystal Formations
      this.drawGiantCrystal(ctx, 1380, 240, PALETTE.galaxy.cyan);
      this.drawGiantCrystal(ctx, 1690, 250, PALETTE.galaxy.purple);
      this.drawGiantCrystal(ctx, 1500, 480, PALETTE.galaxy.pink);
      this.drawGiantCrystal(ctx, 1820, 430, PALETTE.galaxy.cyan);

      this.lights.push({ x: 1380, y: 240, r: 120, color: 'rgba(71, 229, 223, 0.55)' });
      this.lights.push({ x: 1690, y: 250, r: 120, color: 'rgba(172, 60, 240, 0.55)' });
      this.lights.push({ x: 1500, y: 480, r: 110, color: 'rgba(255, 75, 142, 0.55)' });

      // 2. Cosmic Constellation Platform
      this.drawConstellationPlatform(ctx, 1540, 360, 150, 85);
    }

    drawGiantCrystal(ctx, x, y, col) {
      ctx.save();
      // Drop Shadow
      ctx.fillStyle = 'rgba(15, 10, 35, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x, y + 14, 42, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Faceted Crystals Cluster
      const shards = [
        { ox: 0, oy: -18, w: 14, h: 54 },
        { ox: -16, oy: -6, w: 10, h: 38 },
        { ox: 16, oy: -8, w: 11, h: 42 },
        { ox: -8, oy: 2, w: 8, h: 26 },
        { ox: 10, oy: 4, w: 9, h: 28 }
      ];

      shards.forEach(s => {
        // Dark Obsidian Backing
        ctx.fillStyle = '#100824';
        ctx.fillRect(x + s.ox - s.w / 2 - 2, y + s.oy - s.h, s.w + 4, s.h + 8);

        // Vibrant crystal body
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x + s.ox, y + s.oy - s.h);
        ctx.lineTo(x + s.ox + s.w / 2, y + s.oy - s.h * 0.35);
        ctx.lineTo(x + s.ox + s.w / 2, y + s.oy);
        ctx.lineTo(x + s.ox - s.w / 2, y + s.oy);
        ctx.lineTo(x + s.ox - s.w / 2, y + s.oy - s.h * 0.35);
        ctx.closePath();
        ctx.fill();

        // Shimmering white reflection facet
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x + s.ox, y + s.oy - s.h);
        ctx.lineTo(x + s.ox + 2, y + s.oy - s.h * 0.35);
        ctx.lineTo(x + s.ox + 2, y + s.oy - 2);
        ctx.lineTo(x + s.ox - 2, y + s.oy - 2);
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();
    }

    drawConstellationPlatform(ctx, x, y, w, h) {
      ctx.save();
      // Cosmic Basalt Platform
      ctx.fillStyle = '#140c2e';
      ctx.fillRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12);
      ctx.fillStyle = '#2c1a5e';
      ctx.fillRect(x - w / 2, y - h / 2, w, h);

      // Glowing Zodiac Constellation Lines
      ctx.strokeStyle = PALETTE.galaxy.cyan;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 45, y - 12);
      ctx.lineTo(x - 15, y - 24);
      ctx.lineTo(x + 25, y - 8);
      ctx.lineTo(x + 50, y + 15);
      ctx.lineTo(x + 10, y + 25);
      ctx.lineTo(x - 25, y + 15);
      ctx.closePath();
      ctx.stroke();

      // Brilliant Star Nodes
      [[-45,-12], [-15,-24], [25,-8], [50,15], [10,25], [-25,15]].forEach(([ox, oy]) => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + ox - 3, y + oy - 3, 7, 7);
        ctx.fillStyle = PALETTE.galaxy.pink;
        ctx.fillRect(x + ox - 1, y + oy - 1, 3, 3);
      });
      ctx.restore();
    }

    // ====================================================
    // BIOME 4: AZURE LAGOON & CORAL BAY (Vịnh Sứa & Thủy Cung)
    // ====================================================
    drawLagoonBiome(ctx) {
      // 1. Hand-crafted Wooden Boardwalk & Stilted Pier
      this.drawBoardwalk(ctx, 420, 1150, 180, 50);
      this.drawBoardwalk(ctx, 590, 1260, 55, 130);

      // 2. Bioluminescent Coral Reefs
      this.drawCoralReef(ctx, 270, 1310, '#ff70a6');
      this.drawCoralReef(ctx, 690, 1370, '#ff9e00');
      this.drawCoralReef(ctx, 350, 1460, '#48cae4');
      this.drawCoralReef(ctx, 530, 1480, '#b5179e');

      // 3. Pier Nautical Lanterns
      this.drawNauticalLantern(ctx, 420, 1135);
      this.drawNauticalLantern(ctx, 600, 1370);
      this.lights.push({ x: 420, y: 1135, r: 85, color: 'rgba(80, 230, 255, 0.55)' });
      this.lights.push({ x: 600, y: 1370, r: 85, color: 'rgba(80, 230, 255, 0.55)' });
    }

    drawBoardwalk(ctx, x, y, w, h) {
      ctx.save();
      // Drop Shadow on water
      ctx.fillStyle = 'rgba(5, 20, 40, 0.45)';
      ctx.fillRect(x - w / 2, y - h / 2 + 10, w, h);

      // Sturdy Timber Deck
      ctx.fillStyle = '#4a331e';
      ctx.fillRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6);
      ctx.fillStyle = '#a8794c';
      ctx.fillRect(x - w / 2, y - h / 2, w, h);

      // Weathered wood grain
      ctx.fillStyle = '#825932';
      if (w > h) {
        for (let px = x - w / 2 + 14; px < x + w / 2; px += 14) {
          ctx.fillRect(px, y - h / 2, 2, h);
        }
      } else {
        for (let py = y - h / 2 + 14; py < y + h / 2; py += 14) {
          ctx.fillRect(x - w / 2, py, w, 2);
        }
      }

      // Massive Stilted Pilings
      ctx.fillStyle = '#322112';
      ctx.fillRect(x - w / 2, y - h / 2 - 8, 8, 12);
      ctx.fillRect(x + w / 2 - 8, y - h / 2 - 8, 8, 12);
      ctx.fillRect(x - w / 2, y + h / 2 - 4, 8, 12);
      ctx.fillRect(x + w / 2 - 8, y + h / 2 - 4, 8, 12);
      ctx.restore();
    }

    drawCoralReef(ctx, x, y, col) {
      ctx.save();
      // Soft water aura
      ctx.fillStyle = 'rgba(40, 160, 220, 0.25)';
      ctx.beginPath();
      ctx.ellipse(x, y + 6, 26, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Branched coral antler
      ctx.fillStyle = col;
      ctx.fillRect(x - 6, y - 24, 12, 26);
      ctx.fillRect(x - 16, y - 18, 12, 8);
      ctx.fillRect(x - 18, y - 28, 8, 14);

      ctx.fillRect(x + 6, y - 16, 12, 8);
      ctx.fillRect(x + 12, y - 26, 8, 14);

      // Glowing tips
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 4, y - 26, 8, 3);
      ctx.fillRect(x - 18, y - 29, 6, 3);
      ctx.fillRect(x + 13, y - 27, 6, 3);
      ctx.restore();
    }

    drawNauticalLantern(ctx, x, y) {
      ctx.save();
      // Brass post
      ctx.fillStyle = '#2b1d12';
      ctx.fillRect(x - 4, y - 20, 8, 20);
      // Sea glass lamp
      ctx.fillStyle = '#48cae4';
      ctx.fillRect(x - 6, y - 30, 12, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 3, y - 28, 6, 6);
      // Cap
      ctx.fillStyle = '#1c120a';
      ctx.fillRect(x - 8, y - 34, 16, 4);
      ctx.restore();
    }

    // ====================================================
    // BIOME 5: VOLCANIC DRAGON PEAK (Đỉnh Hắc Long & Neon)
    // ====================================================
    drawVolcanoBiome(ctx) {
      // 1. Dragon Obsidian Throne (x: 1620, y: 1140)
      this.drawObsidianThrone(ctx, 1620, 1140, 160, 85);

      // 2. Cozy Campfire for Dragon Cub (x: 1400, y: 1290)
      this.drawDragonCampfire(ctx, 1400, 1290);
      this.lights.push({ x: 1400, y: 1285, r: 110, color: 'rgba(255, 120, 30, 0.65)' });
      this.lights.push({ x: 1620, y: 1140, r: 130, color: 'rgba(0, 245, 212, 0.55)' });

      // 3. Towering Neon Obsidian Spikes
      this.drawNeonSpireTower(ctx, 1340, 1160, PALETTE.volcano.neonPink);
      this.drawNeonSpireTower(ctx, 1800, 1090, PALETTE.volcano.neonCyan);
      this.drawNeonSpireTower(ctx, 1760, 1340, PALETTE.volcano.neonGold);
    }

    drawObsidianThrone(ctx, x, y, w, h) {
      ctx.save();
      // Drop Shadow
      ctx.fillStyle = 'rgba(10, 5, 15, 0.48)';
      ctx.fillRect(x - w / 2 - 6, y - h / 2 + 10, w + 12, h);

      // Basalt Tier 1
      ctx.fillStyle = '#130e17';
      ctx.fillRect(x - w / 2 - 6, y - h / 2 - 6, w + 12, h + 12);
      ctx.fillStyle = '#261b2e';
      ctx.fillRect(x - w / 2, y - h / 2, w, h);

      // Neon Runes glowing in basalt
      ctx.strokeStyle = PALETTE.volcano.neonCyan;
      ctx.lineWidth = 3;
      ctx.strokeRect(x - w * 0.42, y - h * 0.38, w * 0.84, h * 0.76);

      // Center Dragon Sigil
      ctx.fillStyle = PALETTE.volcano.neonPink;
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x + 18, y);
      ctx.lineTo(x, y + 18);
      ctx.lineTo(x - 18, y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.restore();
    }

    drawDragonCampfire(ctx, x, y) {
      ctx.save();
      // Volcanic rock circle
      ctx.fillStyle = '#443c4a';
      for (let i = 0; i < 10; i++) {
        const th = (i / 10) * Math.PI * 2;
        ctx.fillRect(x + Math.cos(th) * 20 - 5, y + Math.sin(th) * 12 - 4, 10, 8);
      }

      // Hot Glowing Ash Bed
      ctx.fillStyle = '#6b1800';
      ctx.beginPath();
      ctx.ellipse(x, y, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crossed logs
      ctx.fillStyle = '#452b1b';
      ctx.fillRect(x - 15, y - 4, 30, 6);
      ctx.fillRect(x - 4, y - 12, 6, 22);

      // Blazing Fire Core
      ctx.fillStyle = '#ff4d00';
      ctx.fillRect(x - 8, y - 7, 16, 8);
      ctx.fillStyle = '#fee440';
      ctx.fillRect(x - 4, y - 5, 8, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 3, 4, 3);
      ctx.restore();
    }

    drawNeonSpireTower(ctx, x, y, col) {
      ctx.save();
      // Heavy jagged basalt base
      ctx.fillStyle = '#16101c';
      ctx.fillRect(x - 14, y - 6, 28, 20);

      // Sharp Neon Crystal Spike
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, y - 56);
      ctx.lineTo(x + 10, y);
      ctx.lineTo(x - 10, y);
      ctx.closePath();
      ctx.fill();

      // Blazing central filament
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 2, y - 50, 4, 44);
      ctx.restore();
    }

    // ====================================================
    // BIOME 6: MEADOW VILLAGE SANCTUARY (Nông Trại & Làng Pet)
    // ====================================================
    drawMeadowVillage(ctx) {
      // 1. Cozy Pet Sanctuary Cottage (x: 1020, y: 580)
      this.drawSanctuaryCottage(ctx, 1020, 570);
      this.lights.push({ x: 1020, y: 570, r: 120, color: 'rgba(255, 215, 120, 0.65)' });

      // 2. Luxury Velvet Pet Beds with Paw Prints
      this.drawDeluxePetBed(ctx, 940, 740, '#f28482', '#f7cad0');
      this.drawDeluxePetBed(ctx, 1100, 850, '#84d2f6', '#90e0ef');

      // 3. Wooden Ranch Fences
      this.drawFencing(ctx, 830, 720, 6, true);
      this.drawFencing(ctx, 830, 720, 5, false);
      this.drawFencing(ctx, 1180, 720, 5, false);

      // 4. Food & Water Feeders
      this.drawFeeder(ctx, 970, 790);
      this.drawFeeder(ctx, 1060, 810);

      // 5. Golden Hay Bales & Flower Planters
      this.drawHayStack(ctx, 880, 675);
      this.drawHayStack(ctx, 910, 680);
    }

    drawSanctuaryCottage(ctx, x, y) {
      ctx.save();
      // Drop Shadow
      ctx.fillStyle = 'rgba(15, 30, 10, 0.38)';
      ctx.fillRect(x - 75, y + 30, 150, 28);

      // Timber walls
      ctx.fillStyle = '#5c391f';
      ctx.fillRect(x - 65, y - 30, 130, 65);
      ctx.fillStyle = '#9e6d44';
      ctx.fillRect(x - 60, y - 25, 120, 60);

      // Horizontal wood siding planks
      ctx.fillStyle = '#7a5233';
      for (let py = y - 20; py < y + 35; py += 10) {
        ctx.fillRect(x - 60, py, 120, 2);
      }

      // Elegant Sloped Cottage Roof
      ctx.fillStyle = '#ab3232';
      ctx.beginPath();
      ctx.moveTo(x, y - 76);
      ctx.lineTo(x + 76, y - 26);
      ctx.lineTo(x - 76, y - 26);
      ctx.closePath();
      ctx.fill();

      // Roof Edge trim
      ctx.fillStyle = '#701c1c';
      ctx.fillRect(x - 80, y - 28, 160, 6);

      // Cozy glowing paned window
      ctx.fillStyle = '#fee440';
      ctx.fillRect(x - 42, y - 12, 26, 26);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 39, y - 9, 10, 10);

      ctx.strokeStyle = '#4a2f1a';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x - 42, y - 12, 26, 26);
      ctx.strokeRect(x - 29, y - 12, 1, 26);
      ctx.strokeRect(x - 42, y + 1, 26, 1);

      // Oak Entrance Door
      ctx.fillStyle = '#422815';
      ctx.fillRect(x + 12, y - 5, 28, 40);
      ctx.fillStyle = '#f4c542';
      ctx.fillRect(x + 32, y + 14, 4, 4);

      // Stone Chimney with warm brick texture
      ctx.fillStyle = '#5a545c';
      ctx.fillRect(x + 28, y - 72, 16, 30);
      ctx.fillStyle = '#827a85';
      ctx.fillRect(x + 26, y - 76, 20, 5);
      ctx.restore();
    }

    drawDeluxePetBed(ctx, x, y, cOuter, cInner) {
      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(15, 25, 10, 0.25)';
      ctx.fillRect(x - 36, y - 20, 72, 40);

      // Plush rim
      ctx.fillStyle = cOuter;
      ctx.fillRect(x - 34, y - 18, 68, 36);
      // Soft cushion interior
      ctx.fillStyle = cInner;
      ctx.fillRect(x - 28, y - 13, 56, 26);

      // Golden embroidered paw icon in center
      ctx.fillStyle = '#fee440';
      ctx.beginPath();
      ctx.arc(x, y + 2, 6, 0, Math.PI * 2);
      ctx.arc(x - 6, y - 5, 3, 0, Math.PI * 2);
      ctx.arc(x, y - 7, 3, 0, Math.PI * 2);
      ctx.arc(x + 6, y - 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawFencing(ctx, x, y, count, horizontal) {
      ctx.save();
      ctx.fillStyle = '#54361c';
      for (let i = 0; i < count; i++) {
        const px = horizontal ? x + i * 24 : x;
        const py = horizontal ? y : y + i * 24;

        // Post
        ctx.fillRect(px - 4, py - 20, 8, 24);
        ctx.fillStyle = '#9e6d44';
        ctx.fillRect(px - 2, py - 18, 4, 20);
        ctx.fillStyle = '#54361c';
      }
      // Rails
      if (horizontal) {
        ctx.fillRect(x - 4, y - 16, count * 24, 4);
        ctx.fillRect(x - 4, y - 7, count * 24, 4);
      } else {
        ctx.fillRect(x - 2, y - 16, 4, count * 24);
        ctx.fillRect(x - 2, y - 7, 4, count * 24);
      }
      ctx.restore();
    }

    drawFeeder(ctx, x, y) {
      ctx.save();
      ctx.fillStyle = '#3c2311';
      ctx.fillRect(x - 14, y - 7, 28, 14);
      ctx.fillStyle = '#a67245';
      ctx.fillRect(x - 12, y - 5, 24, 10);
      // Delicious food pellets
      ctx.fillStyle = '#e76f51';
      ctx.fillRect(x - 8, y - 3, 7, 6);
      ctx.fillStyle = '#f4a261';
      ctx.fillRect(x + 1, y - 3, 8, 6);
      ctx.restore();
    }

    drawHayStack(ctx, x, y) {
      ctx.save();
      ctx.fillStyle = '#b08044';
      ctx.fillRect(x - 14, y - 10, 28, 20);
      ctx.fillStyle = '#fad07a';
      ctx.fillRect(x - 12, y - 8, 24, 16);
      ctx.fillStyle = '#e9b354';
      ctx.fillRect(x - 6, y - 8, 3, 16);
      ctx.fillRect(x + 4, y - 8, 3, 16);
      ctx.restore();
    }

    // ====================================================
    // AMBIENT PARTICLES (Sakura, Starlight, Bubbles, Leaves)
    // ====================================================
    initParticles() {
      this.particles = [];
      // 35 Sakura Petals in Shrine
      for (let i = 0; i < 35; i++) {
        this.particles.push({
          type: 'sakura',
          x: Math.random() * 640,
          y: Math.random() * 560,
          vx: 0.4 + Math.random() * 0.6,
          vy: 0.6 + Math.random() * 0.8,
          sway: Math.random() * Math.PI * 2,
          size: 3 + Math.random() * 2,
          color: '#fcaec9'
        });
      }
      // 35 Stardust & Nebulae in Galaxy
      for (let i = 0; i < 35; i++) {
        this.particles.push({
          type: 'stardust',
          x: 1140 + Math.random() * 820,
          y: Math.random() * 600,
          phase: Math.random() * Math.PI * 2,
          size: 1.5 + Math.random() * 2,
          color: Math.random() > 0.5 ? PALETTE.galaxy.cyan : '#ffffff'
        });
      }
      // 30 Floating Bubbles in Lagoon
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          type: 'bubble',
          x: 180 + Math.random() * 620,
          y: 1100 + Math.random() * 500,
          vy: -(0.5 + Math.random() * 0.8),
          wobble: Math.random() * Math.PI * 2,
          size: 2.5 + Math.random() * 4
        });
      }
      // 30 Golden Autumn Leaves in Meadow
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          type: 'leaf',
          x: 750 + Math.random() * 520,
          y: 540 + Math.random() * 520,
          vx: 0.5 + Math.random() * 0.7,
          vy: 0.4 + Math.random() * 0.5,
          rot: Math.random() * Math.PI * 2,
          color: Math.random() > 0.5 ? '#d9a066' : '#e76f51'
        });
      }
    }

    updateAndDrawParticles(ctx, camera, t) {
      ctx.save();
      this.particles.forEach(p => {
        if (p.type === 'sakura') {
          p.x += p.vx + Math.sin(t * 2 + p.sway) * 0.5;
          p.y += p.vy;
          if (p.y > 600) { p.y = 0; p.x = Math.random() * 640; }
          const sx = p.x - camera.x;
          const sy = p.y - camera.y;
          if (sx > -20 && sx < camera.viewWidth + 20 && sy > -20 && sy < camera.viewHeight + 20) {
            ctx.fillStyle = p.color;
            ctx.fillRect(sx, sy, p.size, p.size * 0.7);
          }
        } else if (p.type === 'stardust') {
          const alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 3 + p.phase));
          const sx = p.x - camera.x;
          const sy = p.y - camera.y;
          if (sx > -20 && sx < camera.viewWidth + 20 && sy > -20 && sy < camera.viewHeight + 20) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.fillRect(sx, sy, p.size, p.size);
            ctx.globalAlpha = 1.0;
          }
        } else if (p.type === 'bubble') {
          p.y += p.vy;
          p.x += Math.sin(t * 2 + p.wobble) * 0.4;
          if (p.y < 1120) { p.y = 1600; p.x = 200 + Math.random() * 600; }
          const sx = p.x - camera.x;
          const sy = p.y - camera.y;
          if (sx > -20 && sx < camera.viewWidth + 20 && sy > -20 && sy < camera.viewHeight + 20) {
            ctx.strokeStyle = 'rgba(160, 230, 255, 0.75)';
            ctx.fillStyle = 'rgba(210, 245, 255, 0.28)';
            ctx.beginPath();
            ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        } else if (p.type === 'leaf') {
          p.x += p.vx + Math.sin(t * 1.5 + p.rot) * 0.6;
          p.y += p.vy;
          if (p.y > 1050) { p.y = 540; p.x = 750 + Math.random() * 500; }
          const sx = p.x - camera.x;
          const sy = p.y - camera.y;
          if (sx > -20 && sx < camera.viewWidth + 20 && sy > -20 && sy < camera.viewHeight + 20) {
            ctx.fillStyle = p.color;
            ctx.fillRect(sx, sy, 3, 2);
            ctx.fillRect(sx + 1, sy + 1, 2, 2);
          }
        }
      });
      ctx.restore();
    }

    // ====================================================
    // DYNAMIC LIGHTING PASS (Day, Sunset, Night)
    // ====================================================
    renderLightingPass(ctx, camera, timeOfDay) {
      if (timeOfDay === 'day') return;

      ctx.save();
      const tint = timeOfDay === 'sunset' ? 'rgba(240, 120, 60, 0.22)' : 'rgba(12, 14, 38, 0.62)';

      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, camera.viewWidth, camera.viewHeight);

      if (timeOfDay === 'night' || timeOfDay === 'sunset') {
        ctx.globalCompositeOperation = 'destination-out';
        this.lights.forEach(light => {
          const sx = light.x - camera.x;
          const sy = light.y - camera.y;
          if (sx > -light.r && sx < camera.viewWidth + light.r && sy > -light.r && sy < camera.viewHeight + light.r) {
            const rad = ctx.createRadialGradient(sx, sy, 5, sx, sy, light.r);
            rad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
            rad.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
            rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = rad;
            ctx.beginPath();
            ctx.arc(sx, sy, light.r, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        ctx.globalCompositeOperation = 'source-over';
        this.lights.forEach(light => {
          const sx = light.x - camera.x;
          const sy = light.y - camera.y;
          if (sx > -light.r && sx < camera.viewWidth + light.r && sy > -light.r && sy < camera.viewHeight + light.r) {
            const rad = ctx.createRadialGradient(sx, sy, 5, sx, sy, light.r);
            rad.addColorStop(0, light.color);
            rad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = rad;
            ctx.beginPath();
            ctx.arc(sx, sy, light.r, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }
      ctx.restore();
    }
  }

  window.PixelMap = PixelMap;
  window.MAP_WIDTH = MAP_WIDTH;
  window.MAP_HEIGHT = MAP_HEIGHT;

})(window);
