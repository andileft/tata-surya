/* =========================================================================
 * solar.js — Mesin simulasi Tata Surya
 *  - Perhitungan posisi planet memakai elemen orbit Keplerian J2000 (JPL),
 *    sehingga posisi planet sesuai dengan tanggal yang dipilih.
 *  - Dua mode skala: "Terlihat" (dimampatkan) dan "Nyata" (perbandingan asli).
 * ======================================================================= */

const DEG = Math.PI / 180;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);   /* 2000-01-01 12:00 UTC */
const HARI_PER_ABAD = 36525;

/* --- Penyelesaian masalah Kepler & posisi heliosentris ------------------ */
function posisiHeliosentris(el, abad) {
  const a = el.a + el.rate.a * abad;
  const e = el.e + el.rate.e * abad;
  const I = (el.I + el.rate.I * abad) * DEG;
  const L = (el.L + el.rate.L * abad) * DEG;
  const w = (el.w + el.rate.w * abad) * DEG;   /* bujur perihelion */
  const O = (el.O + el.rate.O * abad) * DEG;   /* bujur simpul naik */

  const M = L - w;              /* anomali rata-rata */
  const omega = w - O;          /* argumen perihelion */

  /* Iterasi Newton-Raphson untuk anomali eksentrik E */
  let E = M;
  for (let i = 0; i < 10; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }

  /* Posisi pada bidang orbit */
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const r = Math.hypot(xv, yv);

  /* Rotasi ke koordinat ekliptika heliosentris */
  const cw = Math.cos(omega), sw = Math.sin(omega);
  const cO = Math.cos(O), sO = Math.sin(O);
  const cI = Math.cos(I), sI = Math.sin(I);

  const X = (cw * cO - sw * sO * cI) * xv + (-sw * cO - cw * sO * cI) * yv;
  const Y = (cw * sO + sw * cO * cI) * xv + (-sw * sO + cw * cO * cI) * yv;
  const Z = (sw * sI) * xv + (cw * sI) * yv;

  return { x: X, y: Y, z: Z, r: r, a: a, e: e, I: I, w: w, O: O };
}

/* Mengubah koordinat ekliptika (Z = utara) ke koordinat three.js (Y = atas) */
function keThree(p) { return new THREE.Vector3(p.x, p.z, -p.y); }

/* Sudut posisi pada orbit (untuk menggambar garis orbit) */
function titikOrbit(el, abad, sudut) {
  const a = el.a + el.rate.a * abad;
  const e = el.e + el.rate.e * abad;
  const I = (el.I + el.rate.I * abad) * DEG;
  const w = (el.w + el.rate.w * abad) * DEG;
  const O = (el.O + el.rate.O * abad) * DEG;
  const omega = w - O;
  /* Sudut eksentrik */
  const E = sudut;
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(omega), sw = Math.sin(omega);
  const cO = Math.cos(O), sO = Math.sin(O);
  const cI = Math.cos(I), sI = Math.sin(I);
  const X = (cw * cO - sw * sO * cI) * xv + (-sw * cO - cw * sO * cI) * yv;
  const Y = (cw * sO + sw * cO * cI) * xv + (-sw * sO + cw * cO * cI) * yv;
  const Z = (sw * sI) * xv + (cw * sI) * yv;
  return { x: X, y: Y, z: Z };
}

/* =========================================================================
 * Kontrol kamera sederhana (orbit / putar / zoom / geser)
 * Dibuat sendiri agar tidak bergantung pada berkas contoh three.js
 * ======================================================================= */
class KontrolKamera {
  constructor(kamera, dom) {
    this.kamera = kamera;
    this.dom = dom;
    this.target = new THREE.Vector3(0, 0, 0);
    this.theta = -Math.PI / 2;        /* azimuth */
    this.phi = 0.70;                  /* polar (0 = kutub utara) */
    this.radius = 120;
    this.radiusMin = 0.4;
    this.radiusMax = 90000;
    this.fokus = null;                /* objek yang diikuti */
    this.enabled = true;
    this._drag = null;
    this._pinch = 0;
    this._bergerak = 0;
    this.onKlik = null;

    const el = dom;
    el.style.touchAction = 'none';

    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      this._drag = { id: e.pointerId, x: e.clientX, y: e.clientY, tombol: e.button, shift: e.shiftKey, mulai: performance.now() };
      this._bergerak = 0;
    });
    el.addEventListener('pointermove', e => {
      if (!this._drag || this._drag.id !== e.pointerId) return;
      const dx = e.clientX - this._drag.x;
      const dy = e.clientY - this._drag.y;
      this._drag.x = e.clientX; this._drag.y = e.clientY;
      this._bergerak += Math.abs(dx) + Math.abs(dy);
      if (!this.enabled) return;
      if (this._drag.tombol === 2 || this._drag.shift) {
        this._geser(dx, dy);
      } else {
        this.theta -= dx * 0.005;
        this.phi = Math.max(0.02, Math.min(Math.PI - 0.02, this.phi - dy * 0.005));
      }
    });
    const lepas = e => {
      if (this._drag && this._drag.id === e.pointerId) {
        const cepat = performance.now() - this._drag.mulai < 350;
        if (this._bergerak < 6 && cepat && this.onKlik) this.onKlik(e.clientX, e.clientY);
        this._drag = null;
      }
    };
    el.addEventListener('pointerup', lepas);
    el.addEventListener('pointercancel', lepas);

    el.addEventListener('wheel', e => {
      e.preventDefault();
      if (!this.enabled) return;
      const f = Math.exp(e.deltaY * 0.0012);
      this.radius = Math.max(this.radiusMin, Math.min(this.radiusMax, this.radius * f));
    }, { passive: false });

    /* Sentuhan dua jari untuk zoom */
    el.addEventListener('touchstart', e => {
      if (e.touches.length === 2) this._pinch = this._jarak(e.touches);
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const j = this._jarak(e.touches);
        if (this._pinch > 0) {
          this.radius = Math.max(this.radiusMin, Math.min(this.radiusMax, this.radius * (this._pinch / j)));
        }
        this._pinch = j;
      }
    }, { passive: true });
    el.addEventListener('touchend', () => { this._pinch = 0; }, { passive: true });
  }

  _jarak(t) {
    const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy) || 1;
  }

  _geser(dx, dy) {
    /* Geser target pada bidang yang tegak lurus arah pandang */
    const skala = this.radius * 0.0016;
    const kanan = new THREE.Vector3().setFromMatrixColumn(this.kamera.matrix, 0);
    const atas = new THREE.Vector3().setFromMatrixColumn(this.kamera.matrix, 1);
    this.target.addScaledVector(kanan, -dx * skala);
    this.target.addScaledVector(atas, dy * skala);
    this.fokus = null;
  }

  fokuskan(obj) { this.fokus = obj; }

  perbarui(dt) {
    if (this.fokus) {
      const p = new THREE.Vector3();
      this.fokus.getWorldPosition(p);
      this.target.lerp(p, Math.min(1, dt * 6));
    }
    const sp = Math.sin(this.phi), cp = Math.cos(this.phi);
    const st = Math.sin(this.theta), ct = Math.cos(this.theta);
    this.kamera.position.set(
      this.target.x + this.radius * sp * ct,
      this.target.y + this.radius * cp,
      this.target.z + this.radius * sp * st
    );
    this.kamera.lookAt(this.target);
  }
}

/* =========================================================================
 * Kelas utama Tata Surya
 * ======================================================================= */
class TataSurya {
  constructor(wadah, opsi) {
    this.wadah = wadah;
    this.opsi = Object.assign({
      skala: 'terlihat',       /* 'terlihat' | 'nyata' */
      labelAktif: true,
      orbitAktif: true,
      sabukAktif: true,
      sumbuAktif: false,
      ekliptikaAktif: false,
      bintangAktif: true
    }, opsi || {});

    this.hariPerDetik = 5;
    this.hariSimulasi = 0;         /* hari sejak J2000 */
    this.berjalan = true;
    this.benda = {};               /* id -> data objek */
    this.urutan = [];
    this._label = [];
    this._orbitGaris = [];
    this.terpilih = null;
    this._abu = 0;

    this._siapkanRenderer();
    this._siapkanAdegan();
  }

  /* --- Pemetaan skala --------------------------------------------------- */
  auKeScene(r) {
    if (this.opsi.skala === 'nyata') return r * 380;
    /* Mode terlihat: jarak dimampatkan dengan pangkat 0.62 agar seluruh
       Tata Surya dapat diamati dalam satu layar. */
    return 16 * Math.pow(Math.max(r, 1e-6), 0.62);
  }
  radiusKeScene(rKm) {
    const rBumi = 6371;
    if (this.opsi.skala === 'nyata') return rKm * (380 / 149597870.7);
    /* Mode terlihat: ukuran diperbesar dengan pangkat 0.5 */
    return 0.42 * Math.sqrt(rKm / rBumi);
  }

  _siapkanRenderer() {
    const r = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(this.wadah.clientWidth, this.wadah.clientHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    this.renderer = r;
    this.wadah.appendChild(r.domElement);
  }

  _siapkanAdegan() {
    const sc = new THREE.Scene();
    this.scene = sc;
    const kam = new THREE.PerspectiveCamera(50, this.wadah.clientWidth / this.wadah.clientHeight, 0.01, 400000);
    kam.position.set(0, 60, 130);
    this.kamera = kam;

    sc.add(new THREE.AmbientLight(0xffffff, 0.16));

    /* Cahaya Matahari: decay 0 supaya planet terjauh tetap terlihat jelas
       (disederhanakan untuk keperluan pembelajaran). */
    const cahaya = new THREE.PointLight(0xfff4e0, 2.4, 0, 0);
    sc.add(cahaya);
    this.cahaya = cahaya;

    this.kontrol = new KontrolKamera(kam, this.renderer.domElement);
    this.kontrol.onKlik = (x, y) => this._klik(x, y);

    /* Garis bantu bidang ekliptika */
    const grid = new THREE.PolarGridHelper(this.auKeScene(31), 16, 12, 96, 0x2a4a6a, 0x1d3550);
    grid.rotation.x = 0;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    grid.visible = false;
    sc.add(grid);
    this.gridEkliptika = grid;

    this._siapkanBintang();
  }

  /* --- Latar bintang ---------------------------------------------------- */
  _siapkanBintang() {
    const N = 9000;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const ukuran = new Float32Array(N);
    const rnd = mulberry32(2718);
    const warna = [[1, 1, 1], [0.78, 0.85, 1], [1, 0.92, 0.78], [1, 0.82, 0.7], [0.85, 0.92, 1]];
    for (let i = 0; i < N; i++) {
      /* Sebaran pada kulit bola */
      const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u), R = 70000 + rnd() * 5000;
      pos[i * 3] = Math.cos(t) * s * R;
      pos[i * 3 + 1] = u * R;
      pos[i * 3 + 2] = Math.sin(t) * s * R;
      const c = warna[Math.floor(rnd() * warna.length)];
      const kecerahan = 0.45 + rnd() * 0.55;
      col[i * 3] = c[0] * kecerahan; col[i * 3 + 1] = c[1] * kecerahan; col[i * 3 + 2] = c[2] * kecerahan;
      ukuran[i] = 0.4 + rnd() * rnd() * 3.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(ukuran, 1));
    const m = new THREE.PointsMaterial({
      size: 900, map: Textures.titik(), vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    const p = new THREE.Points(g, m);
    p.frustumCulled = false;
    this.scene.add(p);
    this.bintang = p;
  }

  /* --- Membangun isi Tata Surya (dipanggil bertahap oleh pemuat) -------- */
  *bangun() {
    yield { pesan: 'Menyalakan Matahari…', persen: 6 };
    this._buatMatahari();
    yield { pesan: 'Membuat tekstur Merkurius…', persen: 14 };
    this._buatPlanet(PLANET_DATA[0]);
    yield { pesan: 'Membuat tekstur Venus…', persen: 24 };
    this._buatPlanet(PLANET_DATA[1]);
    yield { pesan: 'Membuat tekstur Bumi…', persen: 38 };
    this._buatPlanet(PLANET_DATA[2]);
    this._buatBulan();
    yield { pesan: 'Membuat tekstur Mars…', persen: 48 };
    this._buatPlanet(PLANET_DATA[3]);
    yield { pesan: 'Membuat tekstur Jupiter…', persen: 60 };
    this._buatPlanet(PLANET_DATA[4]);
    yield { pesan: 'Membuat tekstur Saturnus & cincinnya…', persen: 72 };
    this._buatPlanet(PLANET_DATA[5]);
    yield { pesan: 'Membuat tekstur Uranus…', persen: 80 };
    this._buatPlanet(PLANET_DATA[6]);
    yield { pesan: 'Membuat tekstur Neptunus…', persen: 88 };
    this._buatPlanet(PLANET_DATA[7]);
    yield { pesan: 'Menyusun sabuk asteroid…', persen: 94 };
    this._buatSabuk();
    this._buatSabukKuiper();
    yield { pesan: 'Menghitung garis orbit…', persen: 98 };
    this._buatGarisOrbit();
    this._perbaruiPosisi(0);
    this._pasangLabel();
    this.lihatKeseluruhan();
    yield { pesan: 'Selesai', persen: 100 };
  }

  _buatMatahari() {
    const radius = this.radiusKeScene(SUN_DATA.radius);
    const geo = new THREE.SphereGeometry(radius, 64, 48);
    const mat = new THREE.MeshBasicMaterial({ map: Textures.matahari() });
    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);

    /* Cahaya palsu (glow) berlapis */
    const glow = Textures.titik();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glow, color: 0xffb74d, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false
    }));
    sprite.scale.setScalar(radius * 7);
    this.scene.add(sprite);

    const korona = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.16, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide })
    );
    this.scene.add(korona);

    this.cahaya.position.set(0, 0, 0);
    this.benda['Matahari'] = {
      id: 'Matahari', data: SUN_DATA, kategori: 'matahari',
      mesh: mesh, pivot: mesh, radius: radius, glow: sprite, korona: korona, satelitAlami: []
    };
    this.urutan.push('Matahari');
  }

  _buatPlanet(d) {
    const radius = this.radiusKeScene(d.radius);
    const pivot = new THREE.Group();                 /* posisi heliosentris */
    const miring = new THREE.Group();                /* kemiringan sumbu (tetap di ruang) */
    miring.rotation.z = d.kemiringanSumbu * DEG;
    pivot.add(miring);
    this.scene.add(pivot);

    const tex = Textures.buat(d.tekstur);
    const mat = new THREE.MeshStandardMaterial({
      map: tex.map, bumpMap: tex.bump || null, bumpScale: tex.bumpScale || 0.01,
      roughness: 0.92, metalness: 0.0
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 48), mat);
    miring.add(mesh);

    /* Lapisan awan Bumi */
    let awan = null;
    if (d.id === 'Bumi') {
      awan = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.012, 64, 48),
        new THREE.MeshStandardMaterial({
          map: Textures.awanBumi(), transparent: true, opacity: 0.62,
          depthWrite: false, roughness: 1
        })
      );
      miring.add(awan);
    }

    /* Cincin */
    let cincin = null;
    if (d.cincin) {
      const dalam = d.id === 'Saturnus' ? 1.24 : 1.55;
      const luar = d.id === 'Saturnus' ? 2.32 : 1.95;
      const palet = d.id === 'Saturnus'
        ? ['#efe6c8', '#c9b98f', '#f7f2e0', '#b6a276']
        : ['#8fa9b8', '#b8ccd8', '#7d97a6'];
      const celah = d.id === 'Saturnus' ? [[0.62, 0.035, 0.85], [0.30, 0.02, 0.5]] : [[0.5, 0.03, 0.6]];
      const texCincin = Textures.cincin(palet, d.id === 'Saturnus' ? 5 : 9, celah, d.id === 'Saturnus' ? 26 : 12);
      const geo = new THREE.RingGeometry(radius * dalam, radius * luar, 128, 1);
      /* Perbaiki UV agar tekstur cincin membentang secara radial */
      const p = geo.attributes.position, uv = geo.attributes.uv, v3 = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v3.fromBufferAttribute(p, i);
        const t = (v3.length() - radius * dalam) / (radius * luar - radius * dalam);
        uv.setXY(i, t, 0.5);
      }
      cincin = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map: texCincin, transparent: true, side: THREE.DoubleSide, opacity: d.id === 'Saturnus' ? 0.95 : 0.5, depthWrite: false
      }));
      cincin.rotation.x = Math.PI / 2;
      miring.add(cincin);
    }

    /* Garis sumbu rotasi */
    const sumbu = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -radius * 2.1, 0), new THREE.Vector3(0, radius * 2.1, 0)]),
      new THREE.LineBasicMaterial({ color: 0x66d9ff, transparent: true, opacity: 0.75 })
    );
    sumbu.visible = this.opsi.sumbuAktif;
    miring.add(sumbu);

    this.benda[d.id] = {
      id: d.id, data: d, kategori: 'planet', pivot: pivot, miring: miring,
      mesh: mesh, awan: awan, cincin: cincin, sumbu: sumbu,
      radius: radius, sudutPutar: 0, satelitAlami: []
    };
    this.urutan.push(d.id);
  }

  _buatBulan() {
    const bumi = this.benda['Bumi'];
    const pivot = new THREE.Group();
    bumi.pivot.add(pivot);
    const d = MOON_DATA;
    const radius = this.radiusKeScene(d.radius);

    const tex = Textures.buat(d.tekstur);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 32),
      new THREE.MeshStandardMaterial({ map: tex.map, bumpMap: tex.bump, bumpScale: 0.05, roughness: 0.95 })
    );
    pivot.add(mesh);
    pivot.rotation.z = 5.14 * DEG;   /* kemiringan bidang orbit Bulan */

    /* Garis orbit Bulan di sekitar Bumi */
    const jarakBulan = this._jarakBulan();
    const titik = [];
    for (let i = 0; i <= 128; i++) {
      const a = i / 128 * Math.PI * 2;
      titik.push(new THREE.Vector3(Math.cos(a) * jarakBulan, 0, Math.sin(a) * jarakBulan));
    }
    const garis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(titik),
      new THREE.LineBasicMaterial({ color: 0x7f8fa6, transparent: true, opacity: 0.5 })
    );
    pivot.add(garis);

    this.benda['Bulan'] = {
      id: 'Bulan', data: d, kategori: 'satelit', pivot: pivot, mesh: mesh,
      radius: radius, jarak: jarakBulan, garis: garis, satelitAlami: []
    };
    bumi.satelitAlami.push('Bulan');
    this.urutan.push('Bulan');
  }

  _jarakBulan() {
    const bumi = this.benda['Bumi'];
    if (this.opsi.skala === 'nyata') return bumi.radius * 60.3;
    return Math.max(bumi.radius * 2.9, this.radiusKeScene(6371) * 2.9);
  }

  /* --- Sabuk asteroid & sabuk Kuiper ----------------------------------- */
  _buatSabuk() {
    const N = 2200;
    const geo = new THREE.DodecahedronGeometry(0.06, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9d8f7d, roughness: 1, metalness: 0 });
    const mesh = new THREE.InstancedMesh(geo, mat, N);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const rnd = mulberry32(555);
    this.sabukData = [];
    for (let i = 0; i < N; i++) {
      const a = 2.06 + rnd() * 1.24;                       /* AU */
      const sudut = rnd() * Math.PI * 2;
      const naik = (rnd() - 0.5) * 0.30;                    /* rad */
      const eks = 0.02 + rnd() * 0.09;
      this.sabukData.push({ a, sudut, naik, eks, skala: 0.5 + rnd() * 1.9, putar: rnd() * Math.PI });
    }
    this.scene.add(mesh);
    this.sabuk = mesh;
  }

  _buatSabukKuiper() {
    const N = 2600;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const rnd = mulberry32(8888);
    this.kuiperData = [];
    for (let i = 0; i < N; i++) {
      const a = 30 + rnd() * 20;
      const sudut = rnd() * Math.PI * 2;
      const naik = (rnd() - 0.5) * 0.5;
      this.kuiperData.push({ a, sudut, naik });
      const g = 0.35 + rnd() * 0.4;
      col[i * 3] = g * 0.85; col[i * 3 + 1] = g * 0.9; col[i * 3 + 2] = g;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({
      size: this.opsi.skala === 'nyata' ? 6 : 2.2, map: Textures.titik(), vertexColors: true,
      transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    p.frustumCulled = false;
    this.scene.add(p);
    this.kuiper = p;
    this._perbaruiKuiper();
  }

  _perbaruiKuiper() {
    if (!this.kuiper) return;
    const pos = this.kuiper.geometry.attributes.position;
    for (let i = 0; i < this.kuiperData.length; i++) {
      const d = this.kuiperData[i];
      const periode = 365.25 * Math.pow(d.a, 1.5);
      const sudut = d.sudut + (this.hariSimulasi / periode) * Math.PI * 2;
      const r = this.auKeScene(d.a);
      pos.setXYZ(i, Math.cos(sudut) * r, Math.sin(d.naik) * r * 0.12, Math.sin(sudut) * r);
    }
    pos.needsUpdate = true;
  }

  _perbaruiSabuk() {
    if (!this.sabuk) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const e = new THREE.Euler();
    /* Pada mode "nyata" ukuran bongkahan asteroid disesuaikan dengan jarak
       kamera supaya sabuk tetap terlihat sebagai titik-titik kecil. */
    const faktor = this.opsi.skala === 'nyata' ? this.kontrol.radius * 0.0012 : 1;
    for (let i = 0; i < this.sabukData.length; i++) {
      const d = this.sabukData[i];
      /* Periode orbit asteroid mengikuti hukum Kepler ketiga: T = a^1,5 tahun */
      const periode = 365.25 * Math.pow(d.a, 1.5);
      const sudut = d.sudut + (this.hariSimulasi / periode) * Math.PI * 2;
      const r = this.auKeScene(d.a * (1 + d.eks * Math.sin(sudut * 3)));
      p.set(Math.cos(sudut) * r, Math.sin(d.naik) * r * 0.14, Math.sin(sudut) * r);
      e.set(d.putar, sudut * 2, d.putar * 0.5);
      q.setFromEuler(e);
      const sk = d.skala * faktor;
      s.set(sk, sk * 0.8, sk);
      m.compose(p, q, s);
      this.sabuk.setMatrixAt(i, m);
    }
    this.sabuk.instanceMatrix.needsUpdate = true;
  }

  /* --- Garis orbit ------------------------------------------------------ */
  _buatGarisOrbit() {
    this._orbitGaris.forEach(o => this.scene.remove(o.line));
    this._orbitGaris = [];
    const warna = {
      Merkurius: 0x9c9086, Venus: 0xe8cda2, Bumi: 0x5aa9e6, Mars: 0xc1440e,
      Jupiter: 0xd8ca9d, Saturnus: 0xe3d9b0, Uranus: 0xa9dfe8, Neptunus: 0x5a86e0
    };
    const abad = this.hariSimulasi / HARI_PER_ABAD;
    PLANET_ORDER.forEach(id => {
      const el = ORBITAL_ELEMENTS[id];
      const titik = [];
      const N = 512;
      for (let i = 0; i <= N; i++) {
        const E = i / N * Math.PI * 2;
        const p = titikOrbit(el, abad, E);
        const r = Math.hypot(p.x, p.y, p.z);
        const skala = r > 0 ? this.auKeScene(r) / r : 0;
        titik.push(new THREE.Vector3(p.x * skala, p.z * skala, -p.y * skala));
      }
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(titik),
        new THREE.LineBasicMaterial({ color: warna[id], transparent: true, opacity: 0.42 })
      );
      line.visible = this.opsi.orbitAktif;
      this.scene.add(line);
      this._orbitGaris.push({ id, line });
    });
  }

  /* --- Menghitung posisi semua benda pada hari simulasi tertentu -------- */
  _perbaruiPosisi(dt) {
    const abad = this.hariSimulasi / HARI_PER_ABAD;

    PLANET_ORDER.forEach(id => {
      const b = this.benda[id];
      if (!b) return;
      const p = posisiHeliosentris(ORBITAL_ELEMENTS[id], abad);
      const r = Math.hypot(p.x, p.y, p.z);
      const skala = r > 0 ? this.auKeScene(r) / r : 0;
      b.pivot.position.set(p.x * skala, p.z * skala, -p.y * skala);
      b.terakhir = { x: p.x, y: p.y, z: p.z, r: r };
      /* Rotasi planet (retrograde bernilai negatif) */
      const jam = b.data.rotasi;
      b.sudutPutar = (this.hariSimulasi * 24 / jam) * Math.PI * 2;
      b.mesh.rotation.y = b.sudutPutar;
      if (b.awan) b.awan.rotation.y = b.sudutPutar * 1.08;
    });

    /* Bulan mengelilingi Bumi */
    const bulan = this.benda['Bulan'];
    if (bulan) {
      const sudut = (this.hariSimulasi / MOON_DATA.periodeOrbit) * Math.PI * 2;
      bulan.mesh.position.set(Math.cos(sudut) * bulan.jarak, 0, Math.sin(sudut) * bulan.jarak);
      bulan.mesh.rotation.y = -sudut + Math.PI;   /* selalu sisi yang sama menghadap Bumi */
    }

    /* Sabuk asteroid & sabuk Kuiper ikut mengorbit */
    if (this.sabuk && this.sabuk.visible) this._perbaruiSabuk();
    if (this.kuiper && this.kuiper.visible && (this._kuiperTunda || 0) <= 0) {
      this._perbaruiKuiper();
      this._kuiperTunda = 0.25;      /* cukup 4 kali per detik */
    }
    this._kuiperTunda = (this._kuiperTunda || 0) - dt;

    /* Cahaya Matahari: korona berdenyut halus, dan bintang tetap terlihat
       pada mode skala nyata dengan ukuran tetap di layar (efek visual). */
    const m = this.benda['Matahari'];
    if (m) {
      const denyut = 1 + Math.sin(performance.now() * 0.0011) * 0.012;
      if (this.opsi.skala === 'nyata') {
        /* Ukuran Matahari yang sebenarnya hanya sekitar satu piksel pada
           jarak ini, sehingga efek cahayanya dibuat berukuran tetap agar
           posisinya masih dapat dikenali siswa. */
        const kilau = this.kontrol.radius * 0.014 * denyut;
        m.glow.scale.setScalar(kilau);
        m.korona.scale.setScalar(1);
      } else {
        m.korona.scale.setScalar(denyut);
        m.glow.scale.setScalar(m.radius * 7 * denyut);
      }
    }
  }

  /* --- Label (HTML di atas kanvas) -------------------------------------- */
  _pasangLabel() {
    const lapis = document.getElementById('lapisan-label');
    this._label = [];
    BODY_ORDER.forEach(id => {
      const b = this.benda[id];
      if (!b) return;
      const el = document.createElement('button');
      el.className = 'label-benda';
      el.type = 'button';
      el.textContent = id;
      el.addEventListener('click', ev => { ev.stopPropagation(); this.pilih(id); });
      lapis.appendChild(el);
      this._label.push({ id, el, lebar: el.offsetWidth, tinggi: el.offsetHeight });
    });
  }

  /* Nilai kepentingan label: benda yang lebih besar dan benda terpilih
     didahulukan ketika beberapa label saling bertumpuk. Planet dalam
     didahulukan karena wilayahnya paling rapat. */
  _prioritasLabel(id) {
    const dasar = {
      Matahari: 100, Bumi: 95, Venus: 90, Merkurius: 85, Bulan: 80, Mars: 75,
      Jupiter: 60, Saturnus: 55, Uranus: 40, Neptunus: 35
    };
    return (dasar[id] || 0) + (id === this.terpilih ? 1000 : 0);
  }

  _perbaruiLabel() {
    const aktif = this.opsi.labelAktif;
    if (!aktif) { this._label.forEach(l => { l.el.style.display = 'none'; }); return; }

    this.scene.updateMatrixWorld();
    const v = new THREE.Vector3();
    const lebar = this.wadah.clientWidth, tinggi = this.wadah.clientHeight;
    const radiusKamera = Math.max(this.kontrol.radius, 0.001);
    const kotakTerpakai = [];

    /* Titik pusat layar Matahari, dipakai sebagai arah acuan penyebaran label */
    const vm = new THREE.Vector3();
    this.benda['Matahari'].mesh.getWorldPosition(vm);
    vm.project(this.kamera);
    const pusatX = (vm.x * 0.5 + 0.5) * lebar;
    const pusatY = (-vm.y * 0.5 + 0.5) * tinggi;

    /* Urutkan menurut kepentingan agar label penting lebih dahulu ditempatkan */
    const daftar = this._label.slice().sort((a, b) => this._prioritasLabel(b.id) - this._prioritasLabel(a.id));

    for (const l of daftar) {
      const b = this.benda[l.id];
      if (!b) { l.el.style.display = 'none'; continue; }

      b.mesh.getWorldPosition(v);
      const jarak = v.distanceTo(this.kamera.position);
      v.y += b.radius * 1.45;
      v.project(this.kamera);

      if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.3 || Math.abs(v.y) > 1.3) {
        l.el.style.display = 'none'; continue;
      }

      let x = (v.x * 0.5 + 0.5) * lebar;
      let y = (-v.y * 0.5 + 0.5) * tinggi;

      /* Geser label menjauhi Matahari agar planet-planet dalam tidak
         saling menumpuk di sekitar pusat Tata Surya. */
      let dx = x - pusatX, dy = y - pusatY;
      const panjang = Math.hypot(dx, dy);
      if (panjang > 1) { dx /= panjang; dy /= panjang; } else { dx = 0; dy = -1; }
      const geser = l.id === 'Matahari' ? 4 : 18;
      x += dx * geser;
      y += dy * geser;

      const w = l.lebar || 60, h = l.tinggi || 18;
      const langkah = h + 3;
      const bentrok = k => kotakTerpakai.some(t =>
        k.kiri < t.kanan && k.kanan > t.kiri && k.atas < t.bawah && k.bawah > t.atas);

      /* Cari posisi bebas: mula-mula di tempat aslinya, lalu bergantian
         digeser ke atas dan ke bawah sampai tidak menimpa label lain. */
      let yAkhir = null;
      for (let c = 0; c < 7; c++) {
        const dyy = c === 0 ? 0 : (c % 2 === 1 ? -1 : 1) * Math.ceil(c / 2) * langkah;
        const kotak = { kiri: x - w / 2 - 2, atas: y + dyy - h - 2, kanan: x + w / 2 + 2, bawah: y + dyy + 2 };
        if (!bentrok(kotak)) { kotakTerpakai.push(kotak); yAkhir = y + dyy; break; }
      }
      if (yAkhir === null) { l.el.style.display = 'none'; continue; }

      l.el.style.display = 'block';
      l.el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${yAkhir.toFixed(1)}px)`;
      /* Memudar sesuai jarak agar tidak mengganggu pandangan */
      const op = 1 - 0.6 * Math.min(1, jarak / (radiusKamera * 2.5));
      l.el.style.opacity = op.toFixed(2);
      l.el.classList.toggle('terpilih', this.terpilih === l.id);
    }
  }

  /* --- Pemilihan benda -------------------------------------------------- */
  _klik(px, py) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((px - rect.left) / rect.width) * 2 - 1,
      -((py - rect.top) / rect.height) * 2 + 1
    );
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.kamera);
    const daftar = this.urutan.map(id => this.benda[id]).filter(b => b && b.mesh).map(b => b.mesh);
    const kena = rc.intersectObjects(daftar, false);

    let hasil = null;
    if (kena.length) {
      hasil = Object.values(this.benda).find(x => x.mesh === kena[0].object);
    } else {
      /* Planet yang jauh tampak sangat kecil, sehingga dicari benda terdekat
         pada jarak beberapa piksel dari titik klik. */
      const v = new THREE.Vector3();
      const fovRad = this.kamera.fov * Math.PI / 180;
      const tinggiPx = rect.height / (2 * Math.tan(fovRad / 2));
      let jarakTerdekat = Infinity;
      const kx = px - rect.left, ky = py - rect.top;
      for (const id of this.urutan) {
        const b = this.benda[id];
        if (!b || !b.mesh) continue;
        b.mesh.getWorldPosition(v);
        const jrk = v.distanceTo(this.kamera.position);
        v.project(this.kamera);
        if (v.z > 1 || v.z < -1) continue;
        const sx = (v.x * 0.5 + 0.5) * rect.width;
        const sy = (-v.y * 0.5 + 0.5) * rect.height;
        /* Perkiraan radius benda di layar (dalam piksel) */
        const rPx = Math.min(90, Math.max(13, (b.radius / Math.max(jrk, 1e-6)) * tinggiPx));
        const d = Math.hypot(sx - kx, sy - ky);
        if (d <= rPx && d < jarakTerdekat) { jarakTerdekat = d; hasil = b; }
      }
    }

    if (hasil) {
      this.pilih(hasil.id);
    } else {
      /* Klik pada ruang kosong: hentikan mode ikuti */
      this.kontrol.fokus = null;
      this.terpilih = null;
      if (this.onPilih) this.onPilih(null);
    }
  }

  /* Memilih benda: kamera mengikuti dan radius disesuaikan */
  pilih(id, opsi) {
    opsi = opsi || {};
    const b = this.benda[id];
    if (!b) return;
    this.terpilih = id;
    this.kontrol.fokuskan(b.mesh);
    const f = opsi.jarak || 6.2;
    const target = Math.max(b.radius * f, b.radius + this.kamera.near * 4, 0.05);
    this.kontrol.radius = Math.max(this.kontrol.radiusMin, target);
    this.kontrol.phi = Math.min(this.kontrol.phi, 1.35);
    if (this.onPilih) this.onPilih(id);
  }

  /* Mengarahkan kamera tanpa mengubah pilihan */
  lihatKeseluruhan() {
    this.kontrol.fokus = null;
    this.terpilih = null;
    this.kontrol.target.set(0, 0, 0);
    this.kontrol.theta = -Math.PI / 2;
    this.kontrol.phi = 0.70;                 /* agak dari atas agar orbit terlihat jelas */
    this.kontrol.radius = this.radiusIkhtisar();
    if (this.onPilih) this.onPilih(null);
  }

  /* Menghitung jarak kamera agar orbit yang dituju masuk ke layar.
     Pada mode "terlihat" seluruh Tata Surya ditampilkan; pada mode "nyata"
     hanya Tata Surya bagian dalam, karena jarak sebenarnya sangat besar. */
  radiusIkhtisar() {
    const auTujuan = this.opsi.skala === 'nyata' ? 1.65 : 30.07;
    const perlu = this.auKeScene(auTujuan) * 1.12;
    const setengahFov = this.kamera.fov * DEG / 2;
    const olehTinggi = perlu / Math.tan(setengahFov);
    const olehLebar = perlu / (Math.tan(setengahFov) * Math.max(this.kamera.aspect, 0.2));
    return Math.max(olehTinggi, olehLebar) * 1.03;
  }

  aturSkala(mode) {
    if (this.opsi.skala === mode) return;
    const sebelum = this.opsi.skala;
    this.opsi.skala = mode;

    /* Ukuran Matahari & planet */
    const matahari = this.benda['Matahari'];
    const rBaru = this.radiusKeScene(SUN_DATA.radius);
    matahari.mesh.geometry.dispose();
    matahari.mesh.geometry = new THREE.SphereGeometry(rBaru, 64, 48);
    matahari.radius = rBaru;
    matahari.korona.geometry.dispose();
    matahari.korona.geometry = new THREE.SphereGeometry(rBaru * 1.16, 48, 32);
    matahari.glow.scale.setScalar(rBaru * 7);

    PLANET_ORDER.forEach(id => {
      const b = this.benda[id];
      const r = this.radiusKeScene(b.data.radius);
      b.mesh.geometry.dispose();
      b.mesh.geometry = new THREE.SphereGeometry(r, 64, 48);
      b.radius = r;
      if (b.awan) {
        b.awan.geometry.dispose();
        b.awan.geometry = new THREE.SphereGeometry(r * 1.012, 64, 48);
      }
      if (b.cincin) {
        const dalam = id === 'Saturnus' ? 1.24 : 1.55;
        const luar = id === 'Saturnus' ? 2.32 : 1.95;
        b.cincin.geometry.dispose();
        const geo = new THREE.RingGeometry(r * dalam, r * luar, 128, 1);
        const p = geo.attributes.position, uv = geo.attributes.uv, v3 = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
          v3.fromBufferAttribute(p, i);
          uv.setXY(i, (v3.length() - r * dalam) / (r * luar - r * dalam), 0.5);
        }
        b.cincin.geometry = geo;
      }
      b.sumbu.geometry.dispose();
      b.sumbu.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -r * 2.1, 0), new THREE.Vector3(0, r * 2.1, 0)
      ]);
    });

    /* Bulan */
    const bulan = this.benda['Bulan'];
    const rb = this.radiusKeScene(MOON_DATA.radius);
    bulan.mesh.geometry.dispose();
    bulan.mesh.geometry = new THREE.SphereGeometry(rb, 48, 32);
    bulan.radius = rb;
    bulan.jarak = this._jarakBulan();
    bulan.garis.geometry.dispose();
    const titik = [];
    for (let i = 0; i <= 128; i++) {
      const a = i / 128 * Math.PI * 2;
      titik.push(new THREE.Vector3(Math.cos(a) * bulan.jarak, 0, Math.sin(a) * bulan.jarak));
    }
    bulan.garis.geometry = new THREE.BufferGeometry().setFromPoints(titik);

    /* Bintang & sabuk */
    if (this.bintang) this.bintang.material.size = sebelum === 'nyata' ? 700 : 900;
    if (this.kuiper) this.kuiper.material.size = mode === 'nyata' ? 6 : 2.2;
    this._perbaruiKuiper();
    this._perbaruiSabuk();

    /* Grid ekliptika */
    this.scene.remove(this.gridEkliptika);
    const grid = new THREE.PolarGridHelper(this.auKeScene(31), 16, 12, 96, 0x2a4a6a, 0x1d3550);
    grid.material.opacity = 0.35; grid.material.transparent = true;
    grid.visible = this.opsi.ekliptikaAktif;
    this.scene.add(grid);
    this.gridEkliptika = grid;

    this._buatGarisOrbit();
    this._perbaruiPosisi(0);

    /* Sesuaikan kamera */
    if (this.terpilih && this.benda[this.terpilih]) {
      this.pilih(this.terpilih);
    } else {
      this.lihatKeseluruhan();
    }
  }

  aturTampilan(kunci, nilai) {
    this.opsi[kunci] = nilai;
    if (kunci === 'orbitAktif') this._orbitGaris.forEach(o => { o.line.visible = nilai; });
    if (kunci === 'sumbuAktif') PLANET_ORDER.forEach(id => { if (this.benda[id]) this.benda[id].sumbu.visible = nilai; });
    if (kunci === 'sabukAktif') { this.sabuk.visible = nilai; if (this.kuiper) this.kuiper.visible = nilai; }
    if (kunci === 'ekliptikaAktif') this.gridEkliptika.visible = nilai;
    if (kunci === 'bintangAktif') this.bintang.visible = nilai;
  }

  tanggalSimulasi() { return new Date(J2000_MS + this.hariSimulasi * 86400000); }

  aturHariSimulasi(hari) { this.hariSimulasi = hari; this._perbaruiPosisi(0); }

  /* --- Gelung utama ----------------------------------------------------- */
  mulai() {
    const gelung = () => {
      this._raf = requestAnimationFrame(gelung);
      const sekarang = performance.now();
      let dt = (sekarang - (this._terakhir || sekarang)) / 1000;
      this._terakhir = sekarang;
      dt = Math.min(dt, 0.1);

      if (this.berjalan) {
        this.hariSimulasi += dt * this.hariPerDetik;
        this._perbaruiPosisi(dt);
      }
      this.kontrol.perbarui(dt);
      this._perbaruiLabel();
      /* Bintang selalu mengelilingi kamera agar tidak pernah terlewati */
      this.bintang.position.copy(this.kamera.position);
      this.renderer.render(this.scene, this.kamera);
      if (this.onFrame) this.onFrame(dt);
    };
    gelung();
  }

  ubahUkuran() {
    const w = this.wadah.clientWidth, h = this.wadah.clientHeight;
    if (!w || !h) return;
    this.kamera.aspect = w / h;
    this.kamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
