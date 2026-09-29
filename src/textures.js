/* =========================================================================
 * textures.js — Pembuat tekstur prosedural (canvas 2D -> THREE.Texture)
 * Semua tekstur dibuat saat program berjalan supaya simulasi tetap dapat
 * dibuka tanpa koneksi internet (offline) dan tanpa berkas gambar eksternal.
 * ======================================================================= */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buatCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* Nilai kebisingan sederhana berbasis nilai acak bertetangga.
 * Ukuran kisi dibulatkan ke pangkat dua supaya pembungkusan koordinat dapat
 * memakai operasi bitwise (jauh lebih cepat daripada operator modulo). */
function buatNoise2D(seed, gridSize) {
  let n = 1;
  while (n < gridSize) n <<= 1;
  const rnd = mulberry32(seed);
  const g = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) g[i] = rnd();
  const mask = n - 1;
  const at = (x, y) => g[((y & mask) * n) + (x & mask)];
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
}

function fbm(noise, x, y, oktaf, lacunarity, gain) {
  let amp = 0.5, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oktaf; i++) {
    sum += amp * noise(x * freq, y * freq);
    norm += amp;
    amp *= gain; freq *= lacunarity;
  }
  return sum / norm;
}

function warnaRGB(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function campur(c1, c2, t) {
  return [c1[0] + (c2[0] - c1[0]) * t, c1[1] + (c2[1] - c1[1]) * t, c1[2] + (c2[2] - c1[2]) * t];
}

function selesai(canvas, repeatX) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  if (repeatX) tex.repeat.set(repeatX, 1);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/* Peta ketinggian untuk bump map dari kanvas grayscale yang sama */
function bumpDariCanvas(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

/* --- Planet berbatu: kawah + variasi warna ----------------------------- */
function teksturBatuan(cfg) {
  const W = 512, H = 256;
  const cv = buatCanvas(W, H);
  const ctx = cv.getContext('2d');
  const dasar = warnaRGB(cfg.dasar || '#8c8378');
  const noise = buatNoise2D(cfg.seed || 1, 24);
  const img = ctx.createImageData(W, H);
  const kontras = cfg.kontras === undefined ? 1 : cfg.kontras;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(noise, x / W * 8, y / H * 4, 5, 2.1, 0.55);
      const n2 = fbm(noise, x / W * 28 + 11, y / H * 14 + 7, 3, 2.3, 0.5);
      let t = (n * 0.7 + n2 * 0.3 - 0.5) * kontras;
      const c = campur(dasar, t > 0 ? [255, 250, 240] : [25, 20, 18], Math.min(1, Math.abs(t) * 1.5));
      const idx = (y * W + x) * 4;
      img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2]; img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  /* Kawah tumbukan */
  const rnd = mulberry32((cfg.seed || 1) * 7 + 3);
  const jumlah = cfg.kawah || 120;
  for (let i = 0; i < jumlah; i++) {
    const cx = rnd() * W, cy = rnd() * H;
    const r = 2 + rnd() * rnd() * 26;
    const gelap = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    gelap.addColorStop(0, 'rgba(35,30,26,0.45)');
    gelap.addColorStop(0.62, 'rgba(60,52,45,0.22)');
    gelap.addColorStop(0.9, 'rgba(255,248,238,0.30)');
    gelap.addColorStop(1, 'rgba(255,248,238,0)');
    ctx.fillStyle = gelap;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  /* Bintik terang acak (ejecta) */
  for (let i = 0; i < jumlah * 0.5; i++) {
    const cx = rnd() * W, cy = rnd() * H, r = 1 + rnd() * 5;
    ctx.fillStyle = 'rgba(255,252,245,' + (0.05 + rnd() * 0.12).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  return cv;
}

/* --- Planet berawan / pita atmosfer (Venus, raksasa gas) --------------- */
function teksturPita(cfg) {
  /* Pita awan bersifat mendatar, sehingga resolusi tegak dapat lebih rendah
     tanpa mengurangi mutu tampilan — sekaligus mempercepat pemuatan. */
  const W = 1024, H = 256;
  const cv = buatCanvas(W, H);
  const ctx = cv.getContext('2d');
  const palet = (cfg.palet || ['#d8ca9d', '#b08d5f', '#e8dcc0']).map(warnaRGB);
  const noise = buatNoise2D(cfg.seed || 5, 32);
  const img = ctx.createImageData(W, H);
  const pita = cfg.pitaY || 12;

  for (let y = 0; y < H; y++) {
    /* Posisi relatif terhadap ekuator (-1 .. 1) */
    const lat = (y / H) * 2 - 1;
    /* Warna dasar pita: fungsi sinus + noise untuk menyambung pita */
    for (let x = 0; x < W; x++) {
      const turb = fbm(noise, x / W * 10, y / H * 3, 5, 2.2, 0.55);
      const gel = Math.sin((lat * pita + turb * 1.6) * Math.PI);
      let t = (gel + 1) / 2;
      t = Math.min(0.999, Math.max(0, t));
      const pos = t * (palet.length - 1);
      const i0 = Math.floor(pos), i1 = Math.min(palet.length - 1, i0 + 1);
      let c = campur(palet[i0], palet[i1], pos - i0);
      /* Variasi halus tambahan */
      const v = (fbm(noise, x / W * 34 + 5, y / H * 20 + 3, 3, 2.4, 0.5) - 0.5) * 26;
      c = [c[0] + v, c[1] + v, c[2] + v];
      /* Sedikit penggelapan di daerah kutub */
      const kutub = 1 - Math.pow(Math.abs(lat), 3) * 0.35;
      const idx = (y * W + x) * 4;
      img.data[idx] = Math.min(255, c[0] * kutub);
      img.data[idx + 1] = Math.min(255, c[1] * kutub);
      img.data[idx + 2] = Math.min(255, c[2] * kutub);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  /* Badai oval (mis. Bintik Merah Raksasa Jupiter) */
  if (cfg.badai) {
    const cx = W * 0.66, cy = H * 0.63, rx = 78, ry = 40;
    const g1 = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
    g1.addColorStop(0, 'rgba(196,74,44,0.95)');
    g1.addColorStop(0.5, 'rgba(176,86,52,0.75)');
    g1.addColorStop(0.85, 'rgba(214,168,120,0.35)');
    g1.addColorStop(1, 'rgba(230,210,180,0)');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
    ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(cx, cy, rx, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    /* Pusaran halus di sekitar badai */
    ctx.strokeStyle = 'rgba(255,235,215,0.20)';
    for (let i = 0; i < 7; i++) {
      ctx.lineWidth = 1 + i * 0.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * (1.15 + i * 0.22), ry * (1.15 + i * 0.22), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  return cv;
}

/* --- Bumi: benua, laut, tudung es, awan -------------------------------- */
function teksturBumi() {
  const W = 1024, H = 512;
  const cv = buatCanvas(W, H);
  const ctx = cv.getContext('2d');
  const noise = buatNoise2D(1337, 40);
  const detail = buatNoise2D(4242, 96);
  const img = ctx.createImageData(W, H);
  const lautDalam = [12, 42, 96], lautDangkal = [22, 96, 150];
  const hijau = [46, 106, 52], gurun = [186, 158, 96], gunung = [120, 110, 96];

  for (let y = 0; y < H; y++) {
    const lat = (y / H) * 2 - 1;
    for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      /* Benua: fbm dengan beberapa oktaf, sedikit dipengaruhi lintang */
      let h = fbm(noise, u * 6, v * 3, 6, 2.15, 0.55);
      h += (fbm(detail, u * 26 + 3, v * 13 + 9, 4, 2.2, 0.5) - 0.5) * 0.16;
      h -= Math.pow(Math.abs(lat), 2.2) * 0.10;
      let c;
      if (h < 0.50) {
        const t = Math.max(0, (h - 0.40) / 0.10);
        c = campur(lautDalam, lautDangkal, Math.min(1, t));
      } else if (h < 0.545) {
        c = campur([214, 198, 150], hijau, (h - 0.50) / 0.045);   /* pesisir */
      } else if (h < 0.60) {
        c = campur(hijau, gurun, (h - 0.545) / 0.055);
      } else {
        const t = Math.min(1, (h - 0.60) / 0.09);
        c = campur(gurun, gunung, t);
      }
      /* Tudung es kutub */
      const esT = Math.max(0, (Math.abs(lat) - 0.80) / 0.20);
      if (esT > 0) c = campur(c, [242, 248, 252], Math.min(1, esT * 1.3));
      const idx = (y * W + x) * 4;
      img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2]; img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/* Lapisan awan Bumi (RGBA, transparan) */
function teksturAwanBumi() {
  const W = 512, H = 256;
  const cv = buatCanvas(W, H);
  const ctx = cv.getContext('2d');
  const noise = buatNoise2D(909, 48);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const lat = (y / H) * 2 - 1;
    for (let x = 0; x < W; x++) {
      const n = fbm(noise, x / W * 9, y / H * 4.5, 6, 2.2, 0.55);
      /* Pita awan lebih banyak di sekitar ekuator dan lintang menengah */
      const pita = 0.5 + 0.5 * Math.cos(lat * Math.PI * 3.0);
      let a = (n - 0.52) * 3.4 * (0.55 + pita * 0.75);
      a = Math.max(0, Math.min(0.92, a));
      const idx = (y * W + x) * 4;
      img.data[idx] = 255; img.data[idx + 1] = 255; img.data[idx + 2] = 255;
      img.data[idx + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/* --- Permukaan Matahari: granulasi & bintik ---------------------------- */
function teksturMatahari() {
  const W = 512, H = 256;
  const cv = buatCanvas(W, H);
  const ctx = cv.getContext('2d');
  const noise = buatNoise2D(2024, 40);
  const noise2 = buatNoise2D(777, 90);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(noise, x / W * 14, y / H * 7, 5, 2.2, 0.55);
      const n2 = fbm(noise2, x / W * 46, y / H * 23, 3, 2.4, 0.5);
      const t = Math.min(1, Math.max(0, n * 0.7 + n2 * 0.3));
      /* Warna: kuning terang -> oranye */
      const c = campur([255, 168, 40], [255, 250, 220], Math.pow(t, 1.35));
      const idx = (y * W + x) * 4;
      img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2]; img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  /* Bintik Matahari */
  const rnd = mulberry32(31337);
  for (let i = 0; i < 14; i++) {
    const cx = rnd() * W, cy = H * 0.2 + rnd() * H * 0.6;
    const r = 5 + rnd() * 20;
    const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
    g.addColorStop(0, 'rgba(120,44,10,0.85)');
    g.addColorStop(0.6, 'rgba(170,80,20,0.45)');
    g.addColorStop(1, 'rgba(255,190,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  }
  return cv;
}

/* --- Cincin planet: pita radial dengan celah --------------------------- */
function teksturCincin(palet, seed, celah, pita) {
  const W = 1024, H = 8;
  const cv = buatCanvas(W, H);
  const ctx = cv.getContext('2d');
  const noise = buatNoise2D(seed, 60);
  const cols = (palet || ['#e6dcc0', '#b8a888', '#f2ecd8']).map(warnaRGB);
  const img = ctx.createImageData(W, H);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const n = fbm(noise, t * 30, 0.5, 4, 2.2, 0.55);
    const gel = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * (pita || 22) + n * 4);
    const pos = Math.min(0.999, gel) * (cols.length - 1);
    const i0 = Math.floor(pos), i1 = Math.min(cols.length - 1, i0 + 1);
    const c = campur(cols[i0], cols[i1], pos - i0);
    let a = 0.30 + 0.55 * n;
    /* Celah (divisi) di dalam cincin */
    (celah || []).forEach(([p, w, d]) => {
      const dd = Math.abs(t - p);
      if (dd < w) a *= (1 - (1 - (dd / w)) * d);
    });
    /* Tepi luar & dalam memudar */
    if (t < 0.06) a *= t / 0.06;
    if (t > 0.94) a *= (1 - t) / 0.06;
    for (let y = 0; y < H; y++) {
      const idx = (y * W + x) * 4;
      img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2];
      img.data[idx + 3] = Math.max(0, Math.min(255, a * 255));
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

/* --- Titik bercahaya (untuk partikel bintang & sabuk asteroid) --------- */
function teksturTitik() {
  const S = 64;
  const cv = buatCanvas(S, S);
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  return cv;
}

/* --- Pabrik: buat tekstur sesuai deskriptor pada data.js -------------- */
const Textures = {
  /* Mengembalikan { map, bump } untuk sebuah benda langit */
  buat(cfg) {
    if (!cfg) return {};
    let cv = null, bumpCv = null;
    switch (cfg.tipe) {
      case 'batuan':
        cv = teksturBatuan(cfg); bumpCv = cv; break;
      case 'pita':
        cv = teksturPita(cfg); break;
      case 'awan':
        cv = teksturPita({
          seed: cfg.seed, pitaY: 9, palet: [cfg.dasar, cfg.aksen || cfg.dasar, cfg.dasar, '#f3e3c0']
        }); break;
      case 'bumi':
        cv = teksturBumi(); bumpCv = cv; break;
      default:
        cv = teksturBatuan(cfg); bumpCv = cv;
    }
    const out = { map: selesai(cv) };
    if (bumpCv && (cfg.tipe === 'batuan' || cfg.tipe === 'bumi')) {
      out.bump = bumpDariCanvas(bumpCv);
      out.bumpScale = cfg.tipe === 'bumi' ? 0.02 : 0.06;
    }
    return out;
  },
  matahari: () => selesai(teksturMatahari()),
  awanBumi: () => selesai(teksturAwanBumi()),
  cincin: (palet, seed, celah, pita) => selesai(teksturCincin(palet, seed, celah, pita)),
  titik: () => selesai(teksturTitik())
};
