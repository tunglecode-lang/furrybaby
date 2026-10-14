import json
import re

def extract_obj(content, prefix='const D='):
    idx = content.find(prefix)
    if idx == -1: return None
    start = content.find('{', idx)
    depth = 0; in_str = False; escape = False
    for i in range(start, len(content)):
        ch = content[i]
        if escape: escape = False; continue
        if ch == '\\': escape = True; continue
        if ch == '"': in_str = not in_str; continue
        if not in_str:
            if ch == '{': depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return json.loads(content[start:i+1])
    return None

data = {}
for name, file in [
    ('dragon_cub', 'Pixel Dragon Cub.html'),
    ('forest_spirit', 'Pixel Forest Spirit.html'),
    ('galaxy_serpent', 'Pixel Galaxy Serpent.html'),
    ('jellyfish_girl', 'Pixel Jellyfish Girl.html'),
    ('leaf_dragon', 'Pixel Leaf Dragon.html'),
    ('neon_dragon', 'Pixel Neon Dragon.html'),
    ('ghost_cat', 'Bé Ma Mèo Tím – Pixel.html'),
    ('puppy_girl', 'Bé Tai Chó – Pixel.html'),
]:
    with open(file, 'r', encoding='utf-8') as f:
        data[name] = extract_obj(f.read())

c = open('Pixel Pet.html', 'r', encoding='utf-8').read()
m = re.search(r'const ROWS=(\[.*?\]),PAL=(\[.*?\]),N=', c, re.DOTALL)
data['pixel_pet'] = {
    'rows': json.loads(m.group(1)),
    'pal': json.loads(m.group(2))
}

ho_ly_c = open('Hồ Ly 5 Màu × 6 Tư Thế.html', 'r', encoding='utf-8').read()
ho_ly_start = ho_ly_c.find('const N=128')
ho_ly_end = ho_ly_c.find('if(typeof module')
ho_ly_code = ho_ly_c[ho_ly_start:ho_ly_end].replace('function shadow(c,w,y)', 'function hl_pixel_shadow(c,w,y)')

code = '''/* === FurryBaby Unified Pixel Pet System === */
(function(window) {
  'use strict';

  const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const ALPH = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/';

  function bake(rows, pal) {
    if (!rows || !rows.length) return null;
    const w = rows[0].length, h = rows.length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const r = rows[y];
      for (let x = 0; x < w; x++) {
        const ch = r[x];
        if (ch !== '.') {
          const idx = CHARS.indexOf(ch);
          if (idx >= 0 && idx < pal.length) {
            ctx.fillStyle = pal[idx];
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }
    return c;
  }

  function shadow(ctx, x, y, rw, rh, a) {
    ctx.save();
    ctx.fillStyle = 'rgba(20, 15, 35, ' + (a || 0.28) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
'''

for k, v in data.items():
    code += f'  const DATA_{k.upper()} = {json.dumps(v, ensure_ascii=False)};\n'

code += '''
  // --- HỒ LY PROCEDURAL ENGINE ---
'''
code += '  ' + ho_ly_code.replace('\n', '\n  ') + '\n'

renderers_js = '''
  // ==========================================
  // PET 1: DRAGON CUB (RỒNG CON CỔ ĐIỂN)
  // ==========================================
  const DC_S = DATA_DRAGON_CUB.spr.map(r => bake(r, DATA_DRAGON_CUB.pal));
  const DC_SB = DATA_DRAGON_CUB.blk.map(r => bake(r, DATA_DRAGON_CUB.pal));
  function dc_bl(t, i) {
    const m = t % 3300, k = Math.floor(t / 3300);
    return (m < 140 || (k % 3 === 0 && m > 300 && m < 440)) ? DC_SB[i] : DC_S[i];
  }

  // ==========================================
  // PET 2: FOREST SPIRIT (TINH LINH RỪNG XANH)
  // ==========================================
  const FS_S = DATA_FOREST_SPIRIT.spr.map(r => bake(r, DATA_FOREST_SPIRIT.pal));
  const FS_K = DATA_FOREST_SPIRIT.blk.map(r => bake(r, DATA_FOREST_SPIRIT.pal));
  const ez = f => f * f * (3 - 2 * f);
  const cl = (v, a, b) => Math.min(b, Math.max(a, v));
  const FS_RK = [[0,1,1,0],[1,1,1,1],[1,1,1,0],[0,1,0,0]], FS_RK2 = [[1,1,0],[1,1,1],[0,1,1]];
  const FS_ROCKS = Array.from({length: 7}, (_, i) => ({
    ph: i * 0.9, rx: 75 + (i % 3) * 18, ry: 25 + (i % 2) * 14,
    w: 0.0011 + (i % 4) * 0.00018, sz: 2.8 + (i % 2), sh: i % 2
  }));
  function fs_flut(x, s, x0, y0, sc, t, dir, amp, lean, hb) {
    const h = s.height, w = s.width;
    for (let r = 0; r < h; r++) {
      const pr = r >= hb ? 0 : ez(cl((r - 64) / (hb - 70), 0, 1));
      const rip = 0.5 + 0.5 * Math.sin(r * 0.28 - t / 210);
      const sh = ((dir * amp * (0.3 + 0.7 * rip) + Math.sin(r * 0.17 - t / 330) * amp * 0.35) * pr + lean * cl((hb - r) / hb, 0, 1)) * sc;
      const ya = Math.round(y0 + r * sc), yb = Math.round(y0 + (r + 1) * sc);
      x.drawImage(s, 0, r, w, 1, Math.round(x0 + sh), ya, Math.round(w * sc), yb - ya);
    }
  }
  function fs_drawRocks(ctx, t, cx, cy, front, sc, isGliding) {
    ctx.save();
    FS_ROCKS.forEach(r => {
      const th = r.ph + t * r.w;
      const px = cx + Math.cos(th) * r.rx * (sc || 1);
      const py = cy + Math.sin(th) * r.ry * (sc || 1);
      const z = Math.sin(th);
      if ((z > 0) !== front) return;
      if (isGliding) {
        for (let k = 5; k >= 1; k--) {
          const qth = r.ph + (t - k * 45) * r.w;
          const qx = cx + Math.cos(qth) * r.rx * (sc || 1);
          const qy = cy + Math.sin(qth) * r.ry * (sc || 1);
          const s = Math.max(1.5, Math.round(r.sz * (1 - k * 0.1) * (sc || 1)));
          ctx.fillStyle = 'rgba(150, 255, 110, ' + (0.32 - k * 0.05) + ')';
          ctx.fillRect(Math.round(qx - s * 1.5), Math.round(qy - s * 1.5), s * 3, s * 3);
        }
      }
      const g = ctx.createRadialGradient(px, py, 1, px, py, 16 * (sc || 1));
      g.addColorStop(0, 'rgba(170, 255, 120, 0.45)');
      g.addColorStop(1, 'rgba(170, 255, 120, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(px - 16 * (sc || 1), py - 16 * (sc || 1), 32 * (sc || 1), 32 * (sc || 1));
      const sz = Math.round(r.sz * (1 + z * 0.25) * (sc || 1));
      const m = r.sh ? FS_RK2 : FS_RK;
      m.forEach((row, yy) => row.forEach((v, xx) => {
        if (v) {
          ctx.fillStyle = (xx + yy) % 3 === 0 ? '#d8ffa8' : (yy >= m.length - 1 || xx === 0 ? '#2f8a3a' : '#7be05a');
          ctx.fillRect(Math.round(px + (xx - m[0].length / 2) * sz), Math.round(py + (yy - m.length / 2) * sz), sz, sz);
        }
      }));
    });
    ctx.restore();
  }

  // ==========================================
  // PET 3: GALAXY SERPENT (MÃNG XÀ NGÂN HÀ)
  // ==========================================
  const GS_I = bake(DATA_GALAXY_SERPENT.spr[0], DATA_GALAXY_SERPENT.pal);
  const GS_S = DATA_GALAXY_SERPENT.spr.slice(1).map(r => bake(r, DATA_GALAXY_SERPENT.pal));
  function gs_star(ctx, px, py, s) {
    ctx.fillRect(px - 1, py - s, 2, s * 2 + 1);
    ctx.fillRect(px - s, py - 1, s * 2 + 1, 2);
  }

  // ==========================================
  // PET 4: JELLYFISH GIRL (THIẾU NỮ SỨA BIỂN)
  // ==========================================
  const JG_S = DATA_JELLYFISH_GIRL.spr.map(r => bake(r, DATA_JELLYFISH_GIRL.pal));
  const JG_SB = DATA_JELLYFISH_GIRL.blk.map(r => bake(r, DATA_JELLYFISH_GIRL.pal));
  const JG_BUBBLES = Array.from({length: 12}, (_, i) => ({
    x: Math.random() * 120 - 60,
    y: Math.random() * 100 - 50,
    r: 2 + Math.random() * 4,
    speed: 0.2 + Math.random() * 0.4,
    alpha: 0.3 + Math.random() * 0.5
  }));
  const JG_MOTION_ROCKS = Array.from({length: 7}, (_, i) => ({
    ph: i * 0.9, rx: 75 + (i % 3) * 18, ry: 26 + (i % 2) * 14,
    w: 0.0011 + (i % 4) * 0.00018, sz: 4.5 + (i % 3) * 1.5
  }));
  function jg_wave(x, s, x0, y0, sc, t, c0, c1, from, amp) {
    const h = s.height;
    for (let i = c0; i < c1; i++) {
      const d = Math.abs(i - from);
      const dy = Math.sin(d * 0.17 - t / 240) * amp * ez(cl(d / 30, 0, 1)) * sc;
      x.drawImage(s, i, 0, 1, h, Math.round(x0 + i * sc), Math.round(y0 + dy), Math.ceil(sc), Math.round(h * sc));
    }
  }
  function jg_flut(x, s, x0, y0, sc, t, dir, amp, lean, hb, c0, c1) {
    const h = s.height, w = s.width;
    c0 = c0 || 0;
    c1 = c1 == null ? w : c1;
    for (let r = 0; r < h; r++) {
      const pr = r >= hb ? 0 : ez(cl((r - (hb - 32)) / 26, 0, 1));
      const rip = 0.5 + 0.5 * Math.sin(r * 0.28 - t / 210);
      const sh = ((dir * amp * (0.3 + 0.7 * rip) + Math.sin(r * 0.17 - t / 330) * amp * 0.35) * pr + lean * cl((hb - r) / hb, 0, 1)) * sc;
      const ya = Math.round(y0 + r * sc), yb = Math.round(y0 + (r + 1) * sc);
      x.drawImage(s, c0, r, c1 - c0, 1, Math.round(x0 + sh + c0 * sc), ya, Math.round((c1 - c0) * sc), yb - ya);
    }
  }
  function jg_bub(x, px, py, r, a) {
    x.fillStyle = 'rgba(190, 232, 255, ' + (0.3 * a) + ')';
    x.beginPath();
    x.arc(px, py, r, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = 'rgba(60, 140, 225, ' + (0.85 * a) + ')';
    x.lineWidth = 1.5;
    x.stroke();
  }
  function jg_drawBubbles(ctx, t, cx, cy, sc) {
    ctx.save();
    JG_BUBBLES.forEach(b => {
      const by = (b.y - t * 0.03 * b.speed) % 80;
      const py = cy + (by < 0 ? by + 80 : by) * (sc || 1) - 40;
      const px = cx + (b.x + Math.sin(t * 0.002 + b.speed) * 8) * (sc || 1);
      jg_bub(ctx, px, py, b.r * (sc || 1), b.alpha);
    });
    ctx.restore();
  }
  function jg_drawBubblesMotion(ctx, t, cx, cy, front, sc) {
    ctx.save();
    JG_MOTION_ROCKS.forEach(r => {
      const th = r.ph + t * r.w;
      const px = cx + Math.cos(th) * r.rx * (sc || 1);
      const py = cy + Math.sin(th) * r.ry * (sc || 1);
      const z = Math.sin(th);
      if ((z > 0) !== front) return;
      for (let k = 5; k >= 1; k--) {
        const qth = r.ph + (t - k * 45) * r.w;
        const qx = cx + Math.cos(qth) * r.rx * (sc || 1);
        const qy = cy + Math.sin(qth) * r.ry * (sc || 1);
        jg_bub(ctx, qx, qy, Math.max(1.5, r.sz * (1 - k * 0.12) * (sc || 1)), 0.3 - k * 0.04);
      }
      const rr = r.sz * (1 + z * 0.2) * (sc || 1);
      jg_bub(ctx, px, py, rr, 1);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(Math.round(px - rr * 0.4), Math.round(py - rr * 0.45), 2.5 * (sc || 1), 2.5 * (sc || 1));
    });
    ctx.restore();
  }

  // ==========================================
  // PET 5: LEAF DRAGON (THẢO LONG)
  // ==========================================
  const LD_S = DATA_LEAF_DRAGON.spr.map(r => bake(r, DATA_LEAF_DRAGON.pal));
  const LD_SB = DATA_LEAF_DRAGON.blk.map(r => bake(r, DATA_LEAF_DRAGON.pal));

  // ==========================================
  // PET 6: NEON DRAGON (HẮC LONG DẠ QUANG)
  // ==========================================
  const ND_S = DATA_NEON_DRAGON.spr.map(r => bake(r, DATA_NEON_DRAGON.pal));
  const ND_SB = DATA_NEON_DRAGON.blk.map(r => bake(r, DATA_NEON_DRAGON.pal));

  // ==========================================
  // PET 7: GHOST CAT (BÉ MA MÈO TÍM)
  // ==========================================
  function gc_lumHex(h) {
    const r = parseInt(h.slice(1,3), 16), g = parseInt(h.slice(3,5), 16), b = parseInt(h.slice(5,7), 16);
    return 0.3 * r + 0.59 * g + 0.11 * b;
  }
  function gc_prep(D) {
    const G = D.rows.map(r => [...r].map(c => c === '.' ? -1 : parseInt(c, 36)));
    const W = D.w, H = D.h;
    const white = new Set();
    D.pal.forEach((p, i) => { if (gc_lumHex(p) > 236) white.add(i); });
    const tw = [];
    for (let j = 58; j < H - 1; j++) {
      for (let i = 1; i < W - 1; i++) {
        const v = G[j][i];
        if (v < 0 || !white.has(v)) continue;
        const nb = [G[j-1][i], G[j+1][i], G[j][i-1], G[j][i+1]];
        if (nb.every(x => x >= 0 && !white.has(x))) {
          const cnt = {}; nb.forEach(x => cnt[x] = (cnt[x] || 0) + 1);
          const m = +Object.keys(cnt).sort((a,b) => cnt[b] - cnt[a])[0];
          tw.push([j, i, m]);
        }
      }
    }
    return { G, W, H, tw, face: D.face, dark: D.dark };
  }
  function gc_compose(S, t, opt) {
    opt = opt || {};
    const { G, W, H } = S;
    if (opt.static) return { grid: G.map(r => r.slice()), dy: 0 };
    const base = G.map(r => r.slice());
    S.tw.forEach(([j, i, m], n) => { if (((t * 1.6 + n * 0.9) % 4) < 0.9) base[j][i] = m; });
    const top = 50, res = [];
    for (let j = 0; j < H; j++) {
      const row = base[j];
      let sh = 0;
      if (j >= top) {
        const k = (j - top) / (H - top);
        sh = Math.round(Math.sin(t * 2.6 + j * 0.16) * 2.4 * k * k + Math.sin(t * 1.3) * 1.2 * k);
      }
      const nr = new Array(W).fill(-1);
      for (let i = 0; i < W; i++) {
        const v = row[i]; if (v < 0) continue;
        const ni = i + sh; if (ni >= 0 && ni < W) nr[ni] = v;
      }
      res.push(nr);
    }
    const cyc = t % 4.2;
    if (cyc > 3.95 || (cyc > 1.9 && cyc < 2.05)) {
      [[23, 29], [40, 47]].forEach(([x0, x1], k) => {
        for (let j = 27; j <= 37; j++) {
          for (let i = x0; i <= x1; i++) {
            if (res[j][i] >= 0) res[j][i] = S.face;
          }
        }
        const L = k ? [[41,32],[42,33],[43,33],[44,33],[45,33],[46,32]] : [[24,32],[25,33],[26,33],[27,33],[28,32]];
        L.forEach(([x, y]) => { res[y][x] = S.dark; });
      });
    }
    return { grid: res, dy: Math.round(Math.sin(t * 2.2) * 1) };
  }
  const GC_STATE = gc_prep(DATA_GHOST_CAT);

  // ==========================================
  // PET 8: PUPPY GIRL (BÉ TAI CHÓ)
  // ==========================================
  function pg_rgbOf(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
  function pg_clsOf(h) {
    const [r, g, b] = pg_rgbOf(h), lum = 0.3 * r + 0.59 * g + 0.11 * b;
    if (g > r + 6 && g > b + 6) return 'green';
    if (r > 120 && g < 62 && b < 75) return 'red';
    if (lum > 190) return 'light';
    if (lum > 135) return 'tan';
    return 'dark';
  }
  function pg_prep(D) {
    const W = D.w, H = D.h, G = D.rows.map(r => [...r].map(c => c === '.' ? -1 : ALPH.indexOf(c)));
    const C = D.pal.map(pg_clsOf);
    const bl = [], br = [];
    for (let j = 0; j < H; j++) {
      let a = 1e9, b = -1;
      for (let i = 0; i < W; i++) {
        const v = G[j][i];
        if (v >= 0 && (C[v] === 'light' || C[v] === 'green')) {
          if (i < a) a = i;
          if (i > b) b = i;
        }
      }
      bl.push(a); br.push(b);
    }
    return { G, W, H, C, bl, br, skin: D.skin, line: D.line };
  }
  function pg_place(res, j, i, v, oj, oi) {
    if (j < 0 || j >= res.length || i < 0 || i >= res[0].length) return;
    if (res[j][i] < 0) { res[j][i] = v; return; }
    if (res[oj][oi] < 0) res[oj][oi] = v;
  }
  function pg_compose(S, t, opt) {
    opt = opt || {};
    const { G, W, H, C, bl, br } = S;
    if (opt.static) return { grid: G.map(r => r.slice()), dy: 0 };
    let base = G.map(r => r.slice());
    const move = [];
    for (let j = 50; j < H; j++) {
      const k = (j - 50) / 75;
      for (let i = 0; i < W; i++) {
        const v = base[j][i]; if (v < 0) continue;
        const c = C[v]; if (c !== 'dark' && c !== 'tan') continue;
        if (j >= 98 && i >= 22 && i <= 66) continue;
        const left = i < bl[j] - 1, right = i > br[j] + 1;
        if (!left && !right) continue;
        const sh = Math.round(Math.sin(t * 1.7 + j * 0.1 + (left ? 0 : 1.6)) * 3 * k);
        if (sh !== 0) move.push([j, i, v, sh]);
      }
    }
    move.forEach(([j, i]) => { base[j][i] = -1; });
    move.forEach(([j, i, v, sh]) => { pg_place(base, j, i + sh, v, j, i); });
    const mv2 = [];
    for (let j = 62; j <= 86; j++) {
      for (let i = 21; i <= 66; i++) {
        const v = base[j][i]; if (v < 0 || C[v] !== 'green') continue;
        const sh = Math.round(Math.sin(t * 2.1 + j * 0.3) * 1.1 * ((j - 62) / 24));
        if (sh !== 0) mv2.push([j, i, v, sh]);
      }
    }
    mv2.forEach(([j, i]) => { base[j][i] = -1; });
    mv2.forEach(([j, i, v, sh]) => { pg_place(base, j, i + sh, v, j, i); });
    const tap = (t % 3.4) < 0.4;
    if (tap) {
      const mv = [];
      for (let j = 98; j <= 124; j++) {
        for (let i = 47; i <= 65; i++) {
          const v = base[j][i]; if (v >= 0) mv.push([j, i, v]);
        }
      }
      mv.forEach(([j, i]) => { base[j][i] = -1; });
      mv.forEach(([j, i, v]) => { pg_place(base, j - 1, i, v, j, i); });
    }
    const bob = Math.sin(t * 2.0) > 0.35 ? 1 : 0;
    let res = base;
    if (bob) {
      res = base.map(r => r.slice());
      for (let j = 0; j < 97; j++) res[j] = base[j + 1].slice();
    }
    const cyc = t % 4.4;
    if (cyc > 4.15 || (cyc > 2.0 && cyc < 2.15)) {
      [[33, 39], [50, 56]].forEach(([x0, x1]) => {
        const dj = bob ? -1 : 0;
        for (let j = 38; j <= 45; j++) {
          for (let i = x0; i <= x1; i++) {
            const jj = j + dj; if (jj < 0) continue;
            if (res[jj][i] >= 0) res[jj][i] = S.skin;
          }
        }
        for (let i = x0; i <= x1; i++) {
          const jj = 43 + dj; res[jj][i] = S.line;
        }
      });
    }
    return { grid: res, dy: 0 };
  }
  const PG_STATE = pg_prep(DATA_PUPPY_GIRL);

  // ==========================================
  // PET 9: PIXEL PET (BẠCH HỔ BĂNG TUYẾT)
  // ==========================================
  const PP_N = 115, PP_PAD = 30, PP_H = PP_N + PP_PAD;
  const PP_EYE = '`', PP_PUP = 'a', PP_LIGHT = 'A', PP_DARK = '_';
  const PP_RGB = DATA_PIXEL_PET.pal.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)));
  const PP_SRC = DATA_PIXEL_PET.rows.map(r => [...r]);
  const PP_PID = PP_SRC.map((r, y) => r.map((c, x) => {
    if (c === '.') return -1;
    if (x <= 72 && y <= 57) return 3;
    if ((x >= 74 && y <= 76) || (x >= 82 && y > 76) || (x >= 68 && y <= 58)) return 1;
    if (x <= 37 && y >= 80) return 2;
    if (x >= 36 && x <= 54 && y >= 98) return 4;
    if (x >= 57 && x <= 74 && y >= 99) return 5;
    return 0;
  }));
  const PP_EYES = [];
  PP_SRC.forEach((r, y) => r.forEach((c, x) => { if (c === PP_EYE) PP_EYES.push([x, y]); }));

  function pp_build(act, t) {
    const o = Array.from({length: PP_H}, () => Array(PP_N).fill('.'));
    const s = Math.sin;
    let by = 0, tail = s(t * 1.5) * 0.05, hy = s(t * 2) > 0 ? 0 : 1, leg = 0, fp = 0, bp = 0;
    let blink = (t % 3.6) < 0.18;
    if (act === 'wag') tail = s(t * 9) * 0.2;
    if (act === 'walk') {
      by = s(t * 12) > 0.6 ? -1 : 0;
      tail = s(t * 3) * 0.08;
      fp = -Math.round(Math.max(0, s(t * 6)) * 3);
      bp = -Math.round(Math.max(0, -s(t * 6)) * 3);
      hy = by === 0 ? 1 : 0;
    }
    if (act === 'jump') { by = -Math.round(Math.abs(s(t * 3)) * 24); tail = s(t * 6) * 0.12; }
    if (act === 'wave') leg = s(t * 8) * 0.32;
    if (act === 'sleep') { hy = 3 + (s(t * 1.2) > 0 ? 0 : 1); blink = true; tail = s(t * 0.8) * 0.03; }

    const put = (x, y, c) => { if (x >= 0 && x < PP_N && y >= 0 && y < PP_H) o[y][x] = c; };
    const rot = (part, px, py, a, dx, dy) => {
      const ca = Math.cos(a), sa = Math.sin(a);
      for (let y = 0; y < PP_N; y++) {
        for (let x = 0; x < PP_N; x++) {
          const rx = x - dx - px, ry = y - dy - py;
          const sx = Math.round(px + ca * rx + sa * ry), sy = Math.round(py - sa * rx + ca * ry);
          if (sx >= 0 && sx < PP_N && sy >= 0 && sy < PP_N && PP_PID[sy][sx] === part) {
            put(x, y + PP_PAD, PP_SRC[sy][sx]);
          }
        }
      }
    };
    const shift = (part, dx, dy) => {
      for (let y = 0; y < PP_N; y++) {
        for (let x = 0; x < PP_N; x++) {
          if (PP_PID[y][x] === part) {
            let c = PP_SRC[y][x];
            if (part === 3 && blink) {
              if (c === PP_EYE) c = PP_LIGHT;
              if (c === PP_PUP) c = PP_DARK;
            }
            put(x + dx, y + dy + PP_PAD, c);
          }
        }
      }
    };
    rot(1, 84, 82, tail, 0, by);
    shift(5, 0, by + bp);
    shift(0, 0, by);
    rot(2, 36, 80, leg, 0, by);
    shift(4, 0, by + fp);
    shift(3, 0, by + hy);
    if (blink) {
      PP_EYES.forEach(([x, y]) => {
        const below = !PP_EYES.some(e => e[0] === x && e[1] === y + 1);
        if (below) put(x, y + hy + by + PP_PAD, PP_DARK);
      });
    }
    return o;
  }

  // ==========================================
  // UNIFIED PET ROSTER DEFINITIONS
  // ==========================================
  const PETS = [
    {
      id: 'ho_ly',
      name: 'Cửu Vĩ Hồ Ly',
      englishName: 'Nine-Tails Mystic Fox',
      species: 'Thần Thú Cổ Đại',
      element: '🌸 Tiên Đạo',
      biome: 'shrine',
      biomeName: 'Đền Thần Cổ Kính',
      colorIndex: 2,
      poseIndex: 0,
      x: 390, y: 390,
      w: 128, h: 128,
      anchorX: 64, anchorY: 120,
      scale: 0.85,
      favoriteFood: 'Bánh Mật Hoa Sen 🥮',
      personality: 'Cao quý, thông tuệ, vẫy chín đuôi hộ mệnh cho thung lũng',
      dialogues: [
        'Ta ngửi thấy hương hoa đào thoang thoảng trong gió...',
        'Ngươi muốn chải lại chín chiếc đuôi mượt mà này không?',
        'Hương trà thanh khiết quá, tâm cảnh thật an yên.',
        'Ngươi chăm sóc thung lũng này rất chu đáo, ta ghi nhận!',
        'Tiên đạo trường sinh, nhưng ở bên ngươi lại ấm áp hơn cả.'
      ],
      stats: { affection: 85, hunger: 90, energy: 95, mood: 'Hoan Hỉ' },
      poses: ['Ngồi', 'Ngủ Cuộn', 'Ngồi Ôm Sen', 'Ngồi Nghiêng', 'Vươn Vai', 'Nằm Ngửa'],
      colors: ['Tím Huyền 🟣', 'Ngọc Lục 🟢', 'Hoa Anh Đào 🌸', 'Hỏa Diệm 🔥', 'Băng Lam ❄️'],
      draw: function(ctx, px, py, sc, t, state) {
        state = state || {};
        const pose = state.pose !== undefined ? state.pose : this.poseIndex;
        const color = state.color !== undefined ? state.color : this.colorIndex;
        const tick = Math.floor(t * 6);
        const buf = renderPet(SPECIES[color], pose, tick);
        shadow(ctx, px, py, 45 * sc, 12 * sc, 0.35);
        ctx.save();
        ctx.translate(Math.round(px - this.anchorX * sc), Math.round(py - this.anchorY * sc));
        for (let i = 0; i < N * N; i++) {
          const col = buf[i];
          if (col) {
            ctx.fillStyle = col;
            ctx.fillRect((i % N) * sc, Math.floor(i / N) * sc, sc, sc);
          }
        }
        ctx.restore();
      }
    },
    {
      id: 'forest_spirit',
      name: 'Tinh Linh Rừng Xanh',
      englishName: 'Pixel Forest Spirit',
      species: 'Vạn Tượng Thảo Linh',
      element: '🌿 Mộc Thần',
      biome: 'forest',
      biomeName: 'Rừng Cổ Thảo Linh',
      x: 320, y: 780,
      w: 96, h: 120,
      anchorX: 48, anchorY: 110,
      scale: 0.9,
      handlesFacing: true,
      favoriteFood: 'Quả Linh Mộc Phát Sáng 🫐',
      personality: 'Nhẹ nhàng, bay lơ lửng, triệu hồi những viên đá rêu bay quanh',
      dialogues: [
        'Lá cây xào xạc... rừng già đang kể chuyện đó.',
        'Những viên đá linh thạch này rất thích ngươi đấy!',
        'Gió xuân mang theo hương của mầm non và sự sống.',
        'Cùng bay lượn trên những tán cây xanh biếc nào!',
        'Ngươi có cảm nhận được nhịp thở của tự nhiên không?'
      ],
      stats: { affection: 75, hunger: 80, energy: 90, mood: 'Thanh Thản' },
      poses: ['Lơ Lửng (Đứng)', 'Lướt Gió (Di Chuyển)', 'Nghỉ Ngơi'],
      poseIndex: 0,
      draw: function(ctx, px, py, sc, t, state) {
        state = state || {};
        const pose = state.pose !== undefined ? state.pose : this.poseIndex;
        const isMoving = state.isMoving || pose === 1;
        const facing = state.facing !== undefined ? state.facing : 1;
        const tm = t * 1000;

        if (isMoving) {
          // GLIDING MOVEMENT (LƯỚT GIÓ MỀM MẠI TỪ PIXEL FOREST SPIRIT)
          const right = facing >= 0;
          const s = right ? FS_S[2] : FS_S[1];
          const fx = (DATA_FOREST_SPIRIT.fx && DATA_FOREST_SPIRIT.fx[right ? 2 : 1]) || 50;
          const bob = Math.sin(t * 3.6) * 6 * sc;
          const cy = py - 36 * sc + bob;

          // Vệt sáng năng lượng lướt dưới chân
          ctx.save();
          const g = ctx.createRadialGradient(px, py - 6 * sc, 2, px, py - 6 * sc, 45 * sc);
          g.addColorStop(0, 'rgba(120, 255, 80, 0.42)');
          g.addColorStop(1, 'rgba(120, 255, 80, 0)');
          ctx.fillStyle = g;
          ctx.fillRect(px - 50 * sc, py - 20 * sc, 100 * sc, 30 * sc);
          ctx.restore();

          shadow(ctx, px, py, 45 * sc, 11 * sc, 0.32);

          // Thiên thạch bay sau lưng và kéo vệt dài
          fs_drawRocks(ctx, tm, px, cy, false, sc * 0.85, true);

          // Tà áo váy lướt bay theo chiều gió
          ctx.save();
          fs_flut(ctx, s, px - fx * sc * 0.85, cy - s.height * sc * 0.85, sc * 0.85, tm, right ? -1 : 1, 3.2, Math.sin(t * 3.2) * 1.6, right ? 90 : 92);
          ctx.restore();

          // Thiên thạch bay trước mặt
          fs_drawRocks(ctx, tm, px, cy, true, sc * 0.85, true);
        } else {
          // ĐỨNG IM LƠ LỬNG
          const right = facing >= 0;
          const bob = Math.sin(t * 1.8) * 6 * sc;
          const cy = py - 38 * sc + bob;
          shadow(ctx, px, py, 40 * sc, 10 * sc, 0.3);
          fs_drawRocks(ctx, tm, px, cy, false, sc * 0.75, false);

          const isBlink = (t % 3.6) < 0.16;
          const spr = isBlink ? (Array.isArray(FS_K) ? FS_K[0] : FS_K) : FS_S[0];
          const w = spr.width, h = spr.height;
          ctx.save();
          if (!right) {
            ctx.translate(px, 0);
            ctx.scale(-1, 1);
            ctx.translate(-px, 0);
          }
          fs_flut(ctx, spr, px - (w * sc * 0.85) / 2, cy - (h * sc * 0.85) / 2, sc * 0.85, tm, Math.sin(t * 1.4), 1.2, Math.sin(t * 1.2) * 0.8, 92);
          ctx.restore();

          fs_drawRocks(ctx, tm, px, cy, true, sc * 0.75, false);
        }
      }
    },
    {
      id: 'leaf_dragon',
      name: 'Thảo Long Tinh Nghịch',
      englishName: 'Pixel Leaf Dragon',
      species: 'Ấu Long Cỏ Xanh',
      element: '🍃 Phong Mộc',
      biome: 'forest',
      biomeName: 'Rừng Cổ Thảo Linh',
      x: 520, y: 920,
      w: 120, h: 80,
      anchorX: 60, anchorY: 70,
      scale: 0.85,
      favoriteFood: 'Lá Ngọt Thanh Sương 🥗',
      personality: 'Nhanh nhẹn, bật nhảy thoăn thoắt, chạy tung bụi cỏ',
      dialogues: [
        'Vèo! Thấy ta chạy nhanh như gió chưa?',
        'Có lá cỏ ngọt giòn rụm nào cho ta nhai không?',
        'Nằm phơi nắng trên thảm cỏ xanh là tuyệt nhất trần đời!',
        'Đua với ta một vòng quanh hồ nước không bạn ơi?',
        'Gâu gâu... à nhầm, Roarrr tí hon!'
      ],
      stats: { affection: 65, hunger: 60, energy: 95, mood: 'Hiếu Động' },
      poses: ['Nằm Nghỉ', 'Chạy Nhanh', 'Bật Nhảy'],
      poseIndex: 0,
      draw: function(ctx, px, py, sc, t, state) {
        state = state || {};
        shadow(ctx, px, py, 48 * sc, 12 * sc, 0.32);
        const pose = state.pose !== undefined ? state.pose : this.poseIndex;
        let sprIdx = 0;
        let bobY = 0;
        if (pose === 1 || state.isMoving) {
          sprIdx = Math.floor(t * 6) % 2 === 0 ? 1 : 2;
          bobY = Math.sin(t * 12) * 4;
        } else if (pose === 2) {
          sprIdx = 2;
          bobY = -Math.abs(Math.sin(t * 4)) * 14;
        } else {
          sprIdx = 0;
          bobY = Math.sin(t * 2) * 1.5;
        }
        const spr = (t % 3.2 < 0.18) ? LD_SB[sprIdx] : LD_S[sprIdx];
        const w = spr.width * sc * 0.75, h = spr.height * sc * 0.75;
        ctx.save();
        ctx.drawImage(spr, px - w / 2, py - h + bobY, w, h);
        ctx.restore();
      }
    },
    {
      id: 'galaxy_serpent',
      name: 'Mãng Xà Ngân Hà',
      englishName: 'Pixel Galaxy Serpent',
      species: 'Thiên Cực Tinh Long',
      element: '🌌 Tinh Tú',
      biome: 'galaxy',
      biomeName: 'Vực Ngân Hà & Tinh Tú',
      x: 1540, y: 340,
      w: 140, h: 100,
      anchorX: 70, anchorY: 85,
      scale: 0.85,
      favoriteFood: 'Bụi Sao Lấp Lánh ✨',
      personality: 'Thần bí, lướt uốn lượn trên bầu trời sao, phát ra ánh hào quang vũ trụ',
      dialogues: [
        'Những vì sao đang hát bản tình ca cổ xưa...',
        'Thân thể ta mang dòng chảy của hàng triệu thiên hà.',
        'Ngươi có thấy viên tinh thạch xanh lam trên trán ta phát sáng không?',
        'Vũ trụ bao la, nhưng ta chọn dừng chân ở chốn bình yên này.',
        'Lướt theo ta, chạm vào vệt sáng của dải ngân hà nhé!'
      ],
      stats: { affection: 80, hunger: 75, energy: 90, mood: 'Kỳ Ảo' },
      poses: ['Lơ Lửng Tinh Tú', 'Trườn Uốn Lượn (Di Chuyển)', 'Nghỉ Ngơi'],
      poseIndex: 0,
      handlesFacing: true,
      draw: function(ctx, px, py, sc, t, state) {
        state = state || {};
        const pose = state.pose !== undefined ? state.pose : this.poseIndex;
        const isMoving = state.isMoving || pose === 1;
        const facing = state.facing !== undefined ? state.facing : 1;
        const right = facing >= 0;

        if (isMoving) {
          // HIỆU ỨNG TRƯỜN UỐN LƯỢN MỀM MẠI KHI DI CHUYỂN
          const curSc = sc * 0.75;
          const s = GS_S[1] || GS_S[0];
          const w = s.width;
          const h = s.height;
          const kk = 6.283 / 280;
          const om = kk * 80;

          // Vệt bóng mờ ngân hà uốn lượn dưới đất
          shadow(ctx, px, py, 68 * sc, 13 * sc, 0.28);

          ctx.save();
          if (right) {
            ctx.translate(px, 0);
            ctx.scale(-1, 1);
            ctx.translate(-px, 0);
          }

          // Cắt từng cột dọc và áp dụng hàm sóng sine uốn lượn hình sin mềm mại
          for (let i = 0; i < w; i++) {
            const u = i / w;
            const amp = ez(Math.min(1, Math.max(0, (u - 0.18) / 0.82))) * 18 * sc;
            const dy = Math.round(Math.sin(kk * i * curSc - om * t) * amp + Math.sin(t * 3.2) * 2 * (1 - u) * sc);
            const dx = Math.round(px - (w * curSc) / 2 + i * curSc);
            const targetY = Math.round(py - h * curSc + dy);
            ctx.drawImage(s, i, 0, 1, h, dx, targetY, Math.ceil(curSc), Math.round(h * curSc));
          }
          ctx.restore();

          // Tinh thể sao lấp lánh bay theo vệt chuyển động
          for (let i = 0; i < 4; i++) {
            const k = (Math.sin(t * 4 + i * 1.8) + 1) / 2;
            if (k > 0.25) {
              ctx.fillStyle = i % 2 ? 'rgba(71, 229, 223, 0.9)' : 'rgba(255, 220, 120, 0.95)';
              const starX = px - 45 * sc + (i * 30 * sc) + Math.cos(t * 3 + i) * 12 * sc;
              const starY = py - 55 * sc + Math.sin(t * 4.5 + i) * 16 * sc;
              gs_star(ctx, Math.round(starX), Math.round(starY), Math.max(1, Math.round(2 * sc * k)));
            }
          }
        } else {
          // TRẠNG THÁI LƠ LỬNG YÊN BÌNH (IDLE)
          shadow(ctx, px, py, 60 * sc, 14 * sc, 0.25);
          const floatY = Math.sin(t * 2.2) * 7 * sc;
          const spr = GS_I;
          const w = spr.width * sc * 0.7, h = spr.height * sc * 0.7;

          ctx.save();
          if (right) {
            ctx.translate(px, 0);
            ctx.scale(-1, 1);
            ctx.translate(-px, 0);
          }
          ctx.drawImage(spr, Math.round(px - w / 2), Math.round(py - h + floatY), Math.round(w), Math.round(h));
          ctx.restore();

          for (let i = 0; i < 4; i++) {
            const k = (Math.sin(t * 3 + i * 2) + 1) / 2;
            if (k > 0.3) {
              ctx.fillStyle = i % 2 ? 'rgba(120, 200, 255, 0.8)' : 'rgba(255, 220, 140, 0.85)';
              gs_star(ctx, Math.round(px - 40 * sc + (i * 28 * sc)), Math.round(py - 60 * sc + floatY + Math.sin(t * 4 + i) * 15 * sc), 2 * sc);
            }
          }
        }
      }
    },
    {
      id: 'ghost_cat',
      name: 'Bé Ma Mèo Tím',
      englishName: 'Ghost Kitty Violet',
      species: 'Linh Miêu U Huyền',
      element: '🔮 Huyền Bí',
      biome: 'galaxy',
      biomeName: 'Vực Ngân Hà & Tinh Tú',
      x: 1320, y: 490,
      w: 80, h: 100,
      anchorX: 40, anchorY: 90,
      scale: 0.9,
      defaultFacing: -1,
      favoriteFood: 'Kẹo Tinh Thể Tím 🍬',
      personality: 'Dễ thương, lơ lửng bồng bềnh, gấu áo bay nhẹ cùng ánh sao',
      dialogues: [
        'Meo meo... ta là ma mèo dễ thương nhất trần gian!',
        'Gấu áo ta có thêu chấm sao lấp lánh đấy, nhìn kĩ xem!',
        'Đừng sợ ma mèo nha, ta chỉ thích được xoa cằm thôi à.',
        'Hôm nay bầu trời sao đẹp quá chừng meooo~',
        'Cho ta một viên kẹo tím ngọt lịm đi mà!'
      ],
      stats: { affection: 90, hunger: 85, energy: 75, mood: 'Nũng Nịu' },
      poses: ['Bay Lơ Lửng', 'Chớp Mắt Vẫy Áo', 'Ngủ'],
      poseIndex: 0,
      draw: function(ctx, px, py, sc, t, state) {
        shadow(ctx, px, py, 35 * sc, 9 * sc, 0.28);
        const f = gc_compose(GC_STATE, t, { static: false });
        ctx.save();
        const startX = Math.round(px - (GC_STATE.W * sc) / 2);
        const startY = Math.round(py - GC_STATE.H * sc + f.dy * sc);
        for (let j = 0; j < GC_STATE.H; j++) {
          for (let i = 0; i < GC_STATE.W; i++) {
            const v = f.grid[j][i];
            if (v >= 0) {
              ctx.fillStyle = DATA_GHOST_CAT.pal[v];
              ctx.fillRect(startX + i * sc, startY + j * sc, sc, sc);
            }
          }
        }
        for (let s = 0; s < 3; s++) {
          const sy = (startY + (s * 30 + t * 20) % (GC_STATE.H * sc));
          const sx = startX + Math.sin(t * 3 + s) * 20 + (s * 30 * sc);
          ctx.fillStyle = '#d8c8f8';
          ctx.fillRect(sx, sy - 1, 1, 3);
          ctx.fillRect(sx - 1, sy, 3, 1);
        }
        ctx.restore();
      }
    },
    {
      id: 'jellyfish_girl',
      name: 'Thiếu Nữ Sứa Biển',
      englishName: 'Pixel Jellyfish Girl',
      species: 'Hải Tinh Thủy Cung',
      element: '💧 Hải Thủy',
      biome: 'lagoon',
      biomeName: 'Vịnh Sứa & Thủy Cung',
      x: 480, y: 1220,
      w: 100, h: 130,
      anchorX: 50, anchorY: 115,
      scale: 0.85,
      handlesFacing: true,
      favoriteFood: 'Thạch Tảo Biển Trong Suốt 🍮',
      personality: 'Dịu dàng, tóc xúc tu mềm mại uyển chuyển, bơi lướt cùng bong bóng nước',
      dialogues: [
        'Nước ở vịnh này trong vắt và mát lạnh quá...',
        'Mỗi chiếc bong bóng là một ước nguyện của biển cả.',
        'Tóc sứa của ta không chích đâu, sờ thử êm lắm!',
        'Cùng thả trôi theo dòng nước bình yên này nhé.',
        'Ngươi có muốn cùng ta ngắm rạn san hô phát sáng không?'
      ],
      stats: { affection: 82, hunger: 78, energy: 88, mood: 'Dịu Êm' },
      poses: ['Nổi Nhẹ', 'Bơi Lướt', 'Ngủ Dưới Nước'],
      poseIndex: 0,
      draw: function(ctx, px, py, sc, t, state) {
        state = state || {};
        const pose = state.pose !== undefined ? state.pose : this.poseIndex;
        const isMoving = state.isMoving || pose === 1;
        const facing = state.facing !== undefined ? state.facing : 1;
        const tm = t * 1000;

        if (isMoving) {
          // BƠI LƯỚT DI CHUYỂN DƯỚI NƯỚC (TỪ PIXEL JELLYFISH GIRL)
          const right = facing >= 0;
          const i = right ? 1 : 2;
          const s = JG_S[i];
          const fx = (DATA_JELLYFISH_GIRL.fx && DATA_JELLYFISH_GIRL.fx[i]) || 50;
          const cb = (DATA_JELLYFISH_GIRL.cb && DATA_JELLYFISH_GIRL.cb[i]) || 50;
          const hb = (DATA_JELLYFISH_GIRL.hb && DATA_JELLYFISH_GIRL.hb[i]) || 90;
          const by = Math.sin(t * 2.8) * 8 * sc;
          const cy = py - 32 * sc + by;
          const curSc = sc * 0.85;
          const x0 = px - fx * curSc;
          const y0 = cy - s.height * curSc;

          shadow(ctx, px, py, 46 * sc, 12 * sc, 0.32);

          // Bong bóng bọt biển kéo vệt phía sau
          jg_drawBubblesMotion(ctx, tm, px, cy, false, sc * 0.85);

          // Hiệu ứng xúc tu sứa uốn lượn wave & flut
          ctx.save();
          if (right) {
            jg_wave(ctx, s, x0, y0, curSc, tm, 0, cb, cb, 7);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x0 + (cb - 1) * curSc, y0 - 60, 1000, s.height * curSc + 120);
            ctx.clip();
            jg_flut(ctx, s, x0, y0, curSc, tm, -1, 2.6, Math.sin(t * 2.2) * 1.2, hb);
            ctx.restore();
          } else {
            jg_wave(ctx, s, x0, y0, curSc, tm, cb, s.width, cb, 7);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x0 - 60, y0 - 60, (cb + 1) * curSc + 60, s.height * curSc + 120);
            ctx.clip();
            jg_flut(ctx, s, x0, y0, curSc, tm, 1, 2.6, Math.sin(t * 2.2) * 1.2, hb);
            ctx.restore();
          }
          ctx.restore();

          // Bong bóng bọt biển phía trước
          jg_drawBubblesMotion(ctx, tm, px, cy, true, sc * 0.85);
        } else {
          // NỔI BỒNG BỀNH (IDLE)
          const right = facing >= 0;
          const floatY = Math.sin(t * 1.8) * 6 * sc;
          const cy = py - 35 * sc + floatY;
          shadow(ctx, px, py, 44 * sc, 11 * sc, 0.28);
          jg_drawBubbles(ctx, tm, px, cy, sc);

          const isBlink = (t % 3.8) < 0.18;
          const si = isBlink ? (Array.isArray(JG_SB) ? JG_SB[0] : JG_SB) : JG_S[0];
          const w = si.width * sc * 0.85, h = si.height * sc * 0.85;
          const x0 = px - w / 2;
          const y0 = cy - h;

          ctx.save();
          if (!right) {
            ctx.translate(px, 0);
            ctx.scale(-1, 1);
            ctx.translate(-px, 0);
          }
          jg_flut(ctx, si, x0, y0, sc * 0.85, tm, Math.sin(t * 1.4), 1.3, Math.sin(t * 1.2) * 0.8, (DATA_JELLYFISH_GIRL.hb && DATA_JELLYFISH_GIRL.hb[0]) || 89);
          ctx.restore();
        }
      }
    },
    {
      id: 'neon_dragon',
      name: 'Hắc Long Dạ Quang',
      englishName: 'Pixel Neon Dragon',
      species: 'Ma Long Lôi Điện',
      element: '⚡ Ma Lôi',
      biome: 'volcano',
      biomeName: 'Đỉnh Hắc Long & Neon',
      x: 1620, y: 1180,
      w: 130, h: 120,
      anchorX: 65, anchorY: 110,
      scale: 0.85,
      favoriteFood: 'Khoáng Thạch Dung Nham 💎',
      personality: 'Uy nghiêm, sừng và cánh neon phát sáng rực rỡ trong bóng tối',
      dialogues: [
        'Dòng năng lượng neon chảy rần rật trong huyết quản ta!',
        'Cánh của ta có thể thắp sáng cả đỉnh núi hắc thạch.',
        'Ngươi không sợ sấm sét và lửa ma sao? Rất có khí phách!',
        'Ta sẽ bảo vệ thung lũng này khỏi mọi giông bão.',
        'Khi màn đêm buông xuống, hào quang của ta sẽ dẫn lối cho ngươi.'
      ],
      stats: { affection: 78, hunger: 70, energy: 98, mood: 'Oai Phong' },
      poses: ['Ngồi Tĩnh Lặng', 'Bước Oai Dũng', 'Nghỉ Ngơi'],
      poseIndex: 0,
      draw: function(ctx, px, py, sc, t, state) {
        state = state || {};
        shadow(ctx, px, py, 55 * sc, 14 * sc, 0.35);
        const pose = state.pose !== undefined ? state.pose : this.poseIndex;
        let sprIdx = 0;
        let bobY = 0;
        if (pose === 1 || state.isMoving) {
          sprIdx = 1 + (Math.floor(t * 5) % 3);
          bobY = Math.sin(t * 10) * 3;
        } else {
          sprIdx = 0;
          bobY = Math.sin(t * 2.2) * 1.5;
        }
        const spr = (t % 3.5 < 0.18) ? ND_SB[sprIdx] : ND_S[sprIdx];
        const w = spr.width * sc * 0.75, h = spr.height * sc * 0.75;
        ctx.save();
        ctx.drawImage(spr, px - w / 2, py - h + bobY, w, h);
        ctx.restore();
      }
    },
    {
      id: 'dragon_cub',
      name: 'Ấu Long Hỏa Diệm',
      englishName: 'Pixel Dragon Cub',
      species: 'Tiểu Hồng Long',
      element: '🔥 Nguyên Hỏa',
      biome: 'volcano',
      biomeName: 'Đỉnh Hắc Long & Neon',
      x: 1400, y: 1310,
      w: 90, h: 80,
      anchorX: 45, anchorY: 75,
      scale: 0.85,
      favoriteFood: 'Thịt Xiên Nướng Đỏ 🥩',
      personality: 'Đáng yêu, thở phập phồng, lon ton bước đi bên cạnh anh đại Neon Dragon',
      dialogues: [
        'Grừ... ta là rồng dũng mãnh đây! Sợ chưa, sợ chưa?',
        'Bụng ta kêu ùng ục rồi, có gì nóng hổi ăn không?',
        'Lửa của ta sưởi ấm được cả mùa đông đấy nhé!',
        'Đi dạo với ta nào, bước ngắn nhưng chăm chỉ lắm!',
        'Ngủ cuộn tròn bên lò than hồng là số một!'
      ],
      stats: { affection: 92, hunger: 68, energy: 82, mood: 'Vui Vẻ' },
      poses: ['Ngồi Sưởi Ấm', 'Đi Lon Ton', 'Ngủ Say'],
      poseIndex: 0,
      draw: function(ctx, px, py, sc, t, state) {
        state = state || {};
        shadow(ctx, px, py, 42 * sc, 11 * sc, 0.32);
        const pose = state.pose !== undefined ? state.pose : this.poseIndex;
        let spr;
        let bobY = 0;
        if (pose === 1 || state.isMoving) {
          const seq = [1, 2, 3, 2];
          const f = seq[Math.floor(t * 5.5) % 4];
          spr = dc_bl(t * 1000, f);
          bobY = (Math.floor(t * 5.5) % 2) ? -3 * sc : 0;
        } else {
          spr = dc_bl(t * 1000, 0);
          bobY = Math.sin(t * 2.2) * 1.5;
        }
        const w = spr.width * sc * 0.8, h = spr.height * sc * 0.8;
        ctx.save();
        ctx.drawImage(spr, px - w / 2, py - h + bobY, w, h);
        ctx.restore();
      }
    },
    {
      id: 'puppy_girl',
      name: 'Bé Tai Chó Ngoan',
      englishName: 'Anime Puppy Girl',
      species: 'Khuyển Tộc Đáng Yêu',
      element: '🍂 Thảo Nguyên',
      biome: 'meadow',
      biomeName: 'Nông Trại & Thảo Nguyên',
      x: 940, y: 720,
      w: 90, h: 130,
      anchorX: 45, anchorY: 125,
      scale: 0.85,
      favoriteFood: 'Bánh Quy Xương Giòn 🦴',
      personality: 'Trung thành, nhịp chân vui sướng, tóc bay theo làn gió thu vàng',
      dialogues: [
        'Gâu! Chào chủ nhân, em đợi người mãi đó!',
        'Em đang gõ nhịp ủng nè, bài hát vui nhộn lắm!',
        'Xoa đầu em đi mà, tai em mềm lắm luôn đó!',
        'Hôm nay nông trại có nhiều quả chín ngọt ngào lắm.',
        'Em sẽ luôn luôn ở bên cạnh bảo vệ chủ nhân!'
      ],
      stats: { affection: 96, hunger: 84, energy: 92, mood: 'Cực Vui' },
      poses: ['Đứng Nhịp Chân', 'Vẫy Chào', 'Nghỉ Ngơi'],
      poseIndex: 0,
      draw: function(ctx, px, py, sc, t, state) {
        shadow(ctx, px, py, 40 * sc, 11 * sc, 0.32);
        const f = pg_compose(PG_STATE, t, { static: false });
        ctx.save();
        const startX = Math.round(px - (PG_STATE.W * sc) / 2);
        const startY = Math.round(py - PG_STATE.H * sc + f.dy * sc);
        for (let j = 0; j < PG_STATE.H; j++) {
          for (let i = 0; i < PG_STATE.W; i++) {
            const v = f.grid[j][i];
            if (v >= 0) {
              ctx.fillStyle = DATA_PUPPY_GIRL.pal[v];
              ctx.fillRect(startX + i * sc, startY + j * sc, sc, sc);
            }
          }
        }
        for (let l = 0; l < 3; l++) {
          const ly = startY + ((l * 40 + t * 25) % (PG_STATE.H * sc));
          const lx = startX + Math.sin(t * 1.5 + l) * 20 + l * 25 * sc;
          ctx.fillStyle = ['#d9a066', '#b5703f', '#e8c08a'][l % 3];
          ctx.fillRect(lx, ly, 2 * sc, 1 * sc);
          ctx.fillRect(lx + sc, ly + sc, 2 * sc, 1 * sc);
        }
        ctx.restore();
      }
    },
    {
      id: 'pixel_pet',
      name: 'Bạch Hổ Tuyết (Pixel Pet)',
      englishName: 'Arctic White Tiger',
      species: 'Linh Thú Tuyết Sơn',
      element: '❄️ Băng Tuyết',
      biome: 'meadow',
      biomeName: 'Nông Trại & Thảo Nguyên',
      x: 1100, y: 840,
      w: 115, h: 130,
      anchorX: 58, anchorY: 115,
      scale: 0.8,
      defaultFacing: -1,
      favoriteFood: 'Cá Tuyết Tươi Ngon 🐟',
      personality: 'Thông minh, làm trò đủ kiểu: vẫy đuôi, nhảy cao, vẫy chân và ngủ ngáy',
      dialogues: [
        'Gừ gừ... lông tuyết trắng muốt của ta dày và ấm lắm!',
        'Nhìn ta nhảy cao chưa nè, bật tung nóc luôn!',
        'Vẫy đuôi chào đón chủ nhân yêu quý mỗi ngày!',
        'Cho ta ăn cá tuyết đi, ta sẽ làm trò vẫy chân cho xem!',
        'Khò khò... zZZ... mơ thấy một dòng sông đầy cá...'
      ],
      stats: { affection: 88, hunger: 72, energy: 80, mood: 'Hạnh Phúc' },
      poses: ['Đứng Yên', 'Vẫy Đuôi', 'Đi Bộ', 'Nhảy Bật', 'Vẫy Chân', 'Ngủ Ngáy'],
      poseMap: ['idle', 'wag', 'walk', 'jump', 'wave', 'sleep'],
      poseIndex: 0,
      draw: function(ctx, px, py, sc, t, state) {
        state = state || {};
        shadow(ctx, px, py, 46 * sc, 12 * sc, 0.32);
        const poseIdx = state.pose !== undefined ? state.pose : this.poseIndex;
        const act = this.poseMap[poseIdx] || 'idle';
        const grid = pp_build(act, t);
        ctx.save();
        const startX = Math.round(px - (PP_N * sc) / 2);
        const startY = Math.round(py - (PP_H - 15) * sc);
        for (let y = 0; y < PP_H; y++) {
          for (let x = 0; x < PP_N; x++) {
            const ch = grid[y][x];
            if (ch !== '.') {
              const p = PP_RGB[ch.charCodeAt(0) - 65];
              if (p) {
                ctx.fillStyle = `rgb(${p[0]},${p[1]},${p[2]})`;
                ctx.fillRect(startX + x * sc, startY + y * sc, sc, sc);
              }
            }
          }
        }
        if (act === 'sleep') {
          ctx.fillStyle = '#6ab8ff';
          ctx.font = `bold ${Math.round(10 * sc)}px monospace`;
          const k = (t % 2) * 8;
          ctx.fillText('z', px + 28 * sc, py - 55 * sc - k);
          ctx.fillText('Z', px + 38 * sc, py - 65 * sc - k);
        }
        ctx.restore();
      }
    }
  ];

  window.FurryBabyPets = PETS;
  window.FurryBabyRaw = {
    bake, shadow, CHARS, ALPH, SPECIES, renderPet, N, POSES, THEMES,
    DATA_DRAGON_CUB, DATA_FOREST_SPIRIT, DATA_GALAXY_SERPENT, DATA_JELLYFISH_GIRL,
    DATA_LEAF_DRAGON, DATA_NEON_DRAGON, DATA_GHOST_CAT, DATA_PUPPY_GIRL, DATA_PIXEL_PET
  };

})(window);
'''

with open('pets-bundle.js', 'w', encoding='utf-8') as f:
    f.write(code + renderers_js)

print('Full pets-bundle.js generated successfully!')
