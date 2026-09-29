/* =========================================================================
 * app.js — Logika antarmuka & fitur pembelajaran
 * ======================================================================= */

/* ---------- Utilitas ---------- */
const $ = s => document.querySelector(s);

const angka = (n, d) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('id-ID', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 0 : d });
};

const fmtTanggal = d => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtTanggalPendek = d => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const isoTanggal = d => {
  const p = n => String(n).padStart(2, '0');
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate());
};

/* Durasi (hari) -> teks yang mudah dipahami siswa */
function fmtDurasi(hari) {
  if (hari < 1) return angka(hari * 24, 1) + ' jam';
  if (hari < 400) return angka(hari, hari < 10 ? 2 : 0) + ' hari';
  const tahun = hari / 365.25;
  return angka(tahun, tahun < 10 ? 2 : 0) + ' tahun';
}

function fmtPeriodeRotasi(jam) {
  const arah = jam < 0 ? ' (retrograde)' : '';
  const j = Math.abs(jam);
  if (j < 48) return angka(j, 2) + ' jam' + arah;
  return angka(j / 24, 1) + ' hari' + arah;
}

let _toastTimer = null;
function toast(pesan, ms) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = pesan;
  el.classList.add('tampil');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('tampil'), ms || 2400);
}

/* Mendapatkan data lengkap sebuah benda langit */
function dataBenda(id) {
  if (id === 'Matahari') return SUN_DATA;
  if (id === 'Bulan') return MOON_DATA;
  return PLANET_DATA.find(p => p.id === id) || null;
}

/* Kecepatan orbit rata-rata (km/s) dari hukum Kepler ketiga */
function kecepatanOrbit(d) {
  if (!d || !d.periodeOrbit || d.id === 'Bulan') return null;
  const aKm = d.jarakRata * 1e6;
  const tSekon = d.periodeOrbit * 86400;
  return 2 * Math.PI * aKm / tSekon;
}

/* =========================================================================
 * Keadaan aplikasi
 * ======================================================================= */
const App = {
  sim: null,
  terpilih: null,
  tur: { aktif: false, indeks: 0, sisa: 0, jeda: false },
  kuis: null,
  _terakhirInfo: 0
};

/* =========================================================================
 * Pemuat
 * ======================================================================= */
async function mulai() {
  const wadah = $('#panggung');
  const isiBar = $('#pemuat-isi');
  const teks = $('#pemuat-teks');

  /* Periksa dukungan WebGL lebih dahulu */
  try {
    const uji = document.createElement('canvas');
    const ok = uji.getContext('webgl2') || uji.getContext('webgl');
    if (!ok) throw new Error('WebGL tidak tersedia');
  } catch (e) {
    $('#pemuat-galat').hidden = false;
    $('#pemuat-galat').innerHTML =
      'Peramban ini tidak mendukung WebGL, sehingga simulasi 3D tidak dapat dijalankan.<br>' +
      'Coba gunakan Google Chrome, Microsoft Edge, atau Firefox versi terbaru, ' +
      'dan pastikan akselerasi perangkat keras (hardware acceleration) aktif.';
    teks.textContent = 'Gagal memulai.';
    return;
  }

  let sistem;
  try {
    sistem = new TataSurya(wadah, {});
  } catch (e) {
    $('#pemuat-galat').hidden = false;
    $('#pemuat-galat').textContent = 'Terjadi kesalahan saat membuat tampilan 3D: ' + e.message;
    return;
  }
  App.sim = sistem;

  /* Bangun isi Tata Surya tahap demi tahap agar layar pemuatan bergerak */
  const iter = sistem.bangun();
  await new Promise(resolve => {
    const langkah = () => {
      const t0 = performance.now();
      let hasil;
      /* Kerjakan beberapa tahap sekaligus, tetapi jangan lebih dari 120 ms */
      do {
        hasil = iter.next();
        if (hasil.done) break;
        isiBar.style.width = hasil.value.persen + '%';
        teks.textContent = hasil.value.pesan;
      } while (performance.now() - t0 < 120);
      if (hasil.done) { resolve(); return; }
      requestAnimationFrame(langkah);
    };
    requestAnimationFrame(langkah);
  });

  /* Tanggal awal: hari ini */
  sistem.hariSimulasi = (Date.now() - J2000_MS) / 86400000;
  sistem._perbaruiPosisi(0);

  siapkanDaftarBenda();
  siapkanKontrol();
  siapkanPintasan();
  siapkanTanggal();

  sistem.onPilih = id => {
    App.terpilih = id;
    tampilkanInfo(id);
    tandaiDaftar(id);
  };
  sistem.onFrame = dt => { perbaruiBerkala(dt); if (App.tur.aktif) perbaruiTur(dt); };

  sistem.mulai();
  tandaiTanggal();
  window.addEventListener('resize', () => sistem.ubahUkuran());
  window.addEventListener('orientationchange', () => setTimeout(() => sistem.ubahUkuran(), 220));

  setTimeout(() => {
    $('#pemuat').classList.add('selesai');
    setTimeout(() => { const p = $('#pemuat'); if (p) p.remove(); }, 800);
    toast('Selamat datang! Klik sebuah planet untuk melihat datanya.', 4200);
    setTimeout(() => { const t = $('#petunjuk-singkat'); if (t) t.classList.add('sembunyi'); }, 9000);
  }, 320);
}

/* =========================================================================
 * Daftar benda langit
 * ======================================================================= */
function siapkanDaftarBenda() {
  const wadah = $('#daftar-benda');
  const urut = ['Matahari', 'Merkurius', 'Venus', 'Bumi', 'Bulan', 'Mars', 'Jupiter', 'Saturnus', 'Uranus', 'Neptunus'];
  wadah.innerHTML = '';
  urut.forEach(id => {
    const b = App.sim.benda[id];
    if (!b) return;
    const d = b.data;
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.className = 'item-benda' + (id === 'Bulan' ? ' sub' : '');
    tombol.dataset.id = id;
    const warna = id === 'Matahari' ? '#ffb74d'
      : id === 'Bulan' ? '#bdbdbd'
        : '#' + d.warna.toString(16).padStart(6, '0');
    let ket;
    if (id === 'Matahari') ket = 'Bintang';
    else if (id === 'Bulan') ket = 'Satelit Bumi';
    else if (['Jupiter', 'Saturnus', 'Uranus', 'Neptunus'].includes(id)) ket = 'Planet luar';
    else ket = 'Planet dalam';
    tombol.innerHTML =
      '<span class="bola" style="background:radial-gradient(circle at 32% 30%, #fff3, ' + warna + ' 70%)"></span>' +
      '<span class="nama">' + id + '</span><span class="ket">' + ket + '</span>';
    tombol.addEventListener('click', () => {
      App.sim.pilih(id);
      if (window.innerWidth <= 900) tutupPanelKiri();
    });
    wadah.appendChild(tombol);
  });
}

function tandaiDaftar(id) {
  document.querySelectorAll('.item-benda').forEach(el => {
    el.classList.toggle('aktif', el.dataset.id === id);
  });
}

/* =========================================================================
 * Panel informasi
 * ======================================================================= */
function tampilkanInfo(id) {
  const isi = $('#isi-info');
  if (!id) {
    isi.innerHTML =
      '<div class="kosong"><div class="kosong-ikon">🪐</div>' +
      '<p>Klik salah satu planet di layar atau pada daftar <em>Benda Langit</em> untuk melihat datanya.</p></div>';
    return;
  }
  const d = dataBenda(id);
  const b = App.sim.benda[id];
  if (!d || !b) return;

  const warna = id === 'Matahari' ? '#ffb74d' : id === 'Bulan' ? '#bdbdbd' : '#' + d.warna.toString(16).padStart(6, '0');
  const diameter = d.radius * 2;
  const kecepatan = kecepatanOrbit(d);

  let html = '';
  html += '<div class="info-kepala">' +
    '<span class="info-bola" style="background:radial-gradient(circle at 32% 28%, #ffffffcc, ' + warna + ' 62%, #0008)"></span>' +
    '<div><div class="info-nama">' + d.nama + '</div><div class="info-jenis">' + d.jenis + '</div></div></div>';

  /* Ringkasan dinamis */
  html += '<div class="info-jarak-ringkas">';
  if (id === 'Matahari') {
    html += kotakRingkas(angka(d.radius, 0), 'RADIUS (KM)') +
            kotakRingkas(angka(d.suhu, 0) + '°', 'SUHU PERMUKAAN') +
            kotakRingkas('8 mnt 20 s', 'CAHAYA KE BUMI');
  } else if (id === 'Bulan') {
    html += kotakRingkas(angka(384400, 0), 'JARAK DARI BUMI (KM)') +
            kotakRingkas(angka(d.periodeOrbit, 1), 'PERIODE ORBIT (HARI)') +
            kotakRingkas(angka(d.gravitasi, 2), 'GRAVITASI (M/S²)');
  } else {
    html += '<div class="ringkas-kotak" id="rk-jarak"><b>—</b><span>JARAK DARI MATAHARI (JUTA KM)</span></div>' +
            kotakRingkas(angka(d.periodeOrbit, d.periodeOrbit < 100 ? 2 : 1), 'PERIODE REVOLUSI (HARI)') +
            kotakRingkas(angka(kecepatan, 1), 'KECEPATAN ORBIT (KM/S)');
  }
  html += '</div>';

  /* Tabel data */
  html += '<table class="tabel-data"><tbody>';
  if (id !== 'Matahari' && id !== 'Bulan') {
    html += baris('Jarak rata-rata dari Matahari', angka(d.jarakRata, 1) + ' juta km');
    html += baris('Jarak dalam satuan astronomi', angka(d.jarakRata / 149.6, 3) + ' SA');
    html += baris('Periode revolusi (1 tahun)', fmtDurasi(d.periodeOrbit));
  }
  html += baris('Diameter', angka(diameter, 0) + ' km');
  html += baris('Diameter dibanding Bumi', angka(diameter / 12742, 2) + ' ×');
  html += baris('Periode rotasi (1 hari)', fmtPeriodeRotasi(d.rotasi));
  html += baris('Massa (Bumi = 1)', angka(d.massa, d.massa < 1 ? 3 : 1) + ' ×');
  html += baris('Gravitasi permukaan', angka(d.gravitasi, 2) + ' m/s²');
  html += baris('Kemiringan sumbu', angka(d.kemiringanSumbu, 2) + '°');
  if (d.suhuMin !== undefined && d.suhuMax !== undefined) {
    html += baris('Suhu permukaan', angka(d.suhuMin, 0) + ' °C s.d. ' + angka(d.suhuMax, 0) + ' °C');
  } else {
    html += baris('Suhu permukaan', angka(d.suhu, 0) + ' °C');
  }
  if (id !== 'Matahari') html += baris('Jumlah satelit alami', angka(d.satelit, 0) + ' buah');
  html += baris('Cincin', d.cincin ? 'Ada' : 'Tidak ada');
  html += '</tbody></table>';

  /* Fakta menarik */
  html += '<div class="blok-judul">Fakta Menarik</div><ul class="fakta">';
  (d.fakta || []).forEach(f => { html += '<li>' + f + '</li>'; });
  html += '</ul>';
  if (d.catatan) html += '<div class="catatan-kotak">💡 ' + d.catatan + '</div>';

  /* Satelit terkenal */
  const terkenal = FAMOUS_MOONS.find(m => m.planet === id);
  if (terkenal) {
    html += '<div class="catatan-kotak">🌙 <b>' + terkenal.nama + '</b> — ' + terkenal.catatan + '</div>';
  }

  isi.innerHTML = html;
}

function kotakRingkas(nilai, label) {
  return '<div class="ringkas-kotak"><b>' + nilai + '</b><span>' + label + '</span></div>';
}
function baris(kiri, kanan) {
  return '<tr><td>' + kiri + '</td><td>' + kanan + '</td></tr>';
}

/* Memperbarui nilai dinamis (jarak & tanggal) beberapa kali per detik */
function perbaruiBerkala() {
  const now = performance.now();
  if (now - App._terakhirInfo < 180) return;
  App._terakhirInfo = now;

  if (App.terpilih && App.sim.benda[App.terpilih] && App.terpilih !== 'Matahari' && App.terpilih !== 'Bulan') {
    const el = document.getElementById('rk-jarak');
    const b = App.sim.benda[App.terpilih];
    if (el && b.terakhir) el.querySelector('b').textContent = angka(b.terakhir.r * 149.59787, 1);
  }
  tandaiTanggal();
}

function tandaiTanggal() {
  const d = App.sim.tanggalSimulasi();
  const input = $('#tanggal-sim');
  const iso = isoTanggal(d);
  if (input && document.activeElement !== input && input.value !== iso) input.value = iso;
}

/* =========================================================================
 * Kontrol waktu
 * ======================================================================= */
const KECEPATAN_MIN = 0.02;
const KECEPATAN_MAKS = 2000;
const nilaiKeHari = v => KECEPATAN_MIN * Math.pow(KECEPATAN_MAKS / KECEPATAN_MIN, v / 100);

function siapkanKontrol() {
  const sim = App.sim;

  /* Jalankan / jeda */
  const btnMain = $('#btn-main');
  const perbaruiIkonMain = () => {
    btnMain.querySelector('.ikon-jalan').hidden = sim.berjalan;
    btnMain.querySelector('.ikon-jeda').hidden = !sim.berjalan;
    btnMain.classList.toggle('aktif', !sim.berjalan);
  };
  btnMain.addEventListener('click', () => { sim.berjalan = !sim.berjalan; perbaruiIkonMain(); });
  perbaruiIkonMain();

  /* Penggeser kecepatan */
  const geser = $('#kecepatan');
  const label = $('#kecepatan-teks');
  const terapkan = () => {
    const hari = nilaiKeHari(Number(geser.value));
    sim.hariPerDetik = hari;
    label.textContent = hari < 1
      ? angka(hari * 24, 1) + ' jam/detik'
      : hari < 2 ? angka(hari, 2) + ' hari/detik'
        : hari < 400 ? angka(hari, 0) + ' hari/detik'
          : angka(hari / 365.25, 1) + ' tahun/detik';
    geser.style.setProperty('--isi', geser.value + '%');
    document.querySelectorAll('.preset button').forEach(b => {
      b.classList.toggle('aktif', Math.abs(Number(b.dataset.hari) - hari) < hari * 0.02 + 1e-6);
    });
  };
  geser.addEventListener('input', terapkan);
  geser.value = 48;
  terapkan();

  document.querySelectorAll('.preset button').forEach(b => {
    b.addEventListener('click', () => {
      const hari = Number(b.dataset.hari);
      /* Cari nilai penggeser yang paling mendekati */
      const v = Math.round(100 * Math.log(hari / KECEPATAN_MIN) / Math.log(KECEPATAN_MAKS / KECEPATAN_MIN));
      geser.value = Math.max(0, Math.min(100, v));
      terapkan();
      sim.hariPerDetik = hari;
      label.textContent = hari < 1 ? angka(hari * 24, 1) + ' jam/detik'
        : hari < 400 ? angka(hari, 0) + ' hari/detik'
          : angka(hari / 365.25, 1) + ' tahun/detik';
    });
  });

  /* Tanggal */
  $('#btn-hari-ini').addEventListener('click', () => {
    sim.hariSimulasi = (Date.now() - J2000_MS) / 86400000;
    sim._perbaruiPosisi(0);
    tandaiTanggal();
    toast('Posisi planet disesuaikan dengan tanggal hari ini.');
  });
  $('#tanggal-sim').addEventListener('change', e => {
    const bagian = e.target.value.split('-').map(Number);
    if (bagian.length !== 3 || bagian.some(Number.isNaN)) return;
    const ms = Date.UTC(bagian[0], bagian[1] - 1, bagian[2], 12, 0, 0);
    sim.hariSimulasi = (ms - J2000_MS) / 86400000;
    sim._perbaruiPosisi(0);
    toast('Posisi planet pada ' + fmtTanggal(sim.tanggalSimulasi()));
  });

  /* Kembalikan pandangan */
  $('#btn-reset').addEventListener('click', () => {
    sim.lihatKeseluruhan();
    tandaiDaftar(null);
  });

  /* Layar penuh */
  $('#btn-layar').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || (() => {})).call(document.documentElement);
    } else {
      document.exitFullscreen();
    }
  });

  /* Sakelar tampilan */
  const pasangan = [
    ['#tg-orbit', 'orbitAktif'], ['#tg-label', 'labelAktif'], ['#tg-sabuk', 'sabukAktif'],
    ['#tg-sumbu', 'sumbuAktif'], ['#tg-ekliptika', 'ekliptikaAktif'], ['#tg-bintang', 'bintangAktif']
  ];
  pasangan.forEach(([sel, kunci]) => {
    const el = $(sel);
    el.addEventListener('change', () => sim.aturTampilan(kunci, el.checked));
  });

  /* Mode skala */
  document.querySelectorAll('.pilihan-skala button').forEach(b => {
    b.addEventListener('click', () => {
      const mode = b.dataset.skala;
      document.querySelectorAll('.pilihan-skala button').forEach(x => {
        const aktif = x === b;
        x.classList.toggle('aktif', aktif);
        x.setAttribute('aria-checked', aktif ? 'true' : 'false');
      });
      sim.aturSkala(mode);
      $('#catatan-skala').textContent = mode === 'nyata'
        ? 'Perbandingan sebenarnya: Matahari hanya sebesar titik dan planet-planet praktis tak terlihat. Inilah gambaran Tata Surya yang sesungguhnya — sangat luas dan kosong.'
        : 'Ukuran & jarak dimampatkan agar seluruh Tata Surya mudah diamati dalam satu layar.';
      toast(mode === 'nyata'
        ? 'Mode skala nyata: planet tampak sebagai titik yang hampir tak terlihat. Scroll untuk mendekat!'
        : 'Mode skala terlihat aktif.', 5000);
    });
  });

  /* Pelipat panel pada layar kecil */
  document.querySelectorAll('.panel-pelipat').forEach(b => {
    b.addEventListener('click', () => {
      const p = document.getElementById(b.dataset.sasaran);
      p.classList.toggle('terlipat');
      if (!p.classList.contains('terlipat')) {
        document.querySelectorAll('.panel').forEach(o => { if (o !== p) o.classList.add('terlipat'); });
      }
    });
  });
  if (window.innerWidth <= 900) {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('terlipat'));
  }

  /* Tombol fitur belajar */
  $('#btn-tur').addEventListener('click', mulaiTur);
  $('#btn-kuis').addEventListener('click', mulaiKuis);
  $('#btn-banding').addEventListener('click', tampilkanPerbandingan);
  $('#btn-tabel').addEventListener('click', tampilkanTabel);
  $('#btn-materi').addEventListener('click', tampilkanMateri);
  $('#btn-bantuan').addEventListener('click', tampilkanBantuan);
}

function tutupPanelKiri() {
  const p = document.getElementById('panel-kiri');
  if (p) p.classList.add('terlipat');
}

/* =========================================================================
 * Modal
 * ======================================================================= */
function bukaModal(judul, isiHtml, kakiHtml) {
  $('#modal-judul').textContent = judul;
  $('#modal-isi').innerHTML = isiHtml;
  $('#modal-kaki').innerHTML = kakiHtml || '';
  $('#modal').hidden = false;
}
function tutupModal() { $('#modal').hidden = true; }

function siapkanModal() {
  $('#modal-tutup').addEventListener('click', tutupModal);
  $('#modal').addEventListener('click', e => { if (e.target.dataset.tutup) tutupModal(); });
}

/* =========================================================================
 * Perbandingan ukuran
 * ======================================================================= */
function tampilkanPerbandingan() {
  const daftar = [
    { id: 'Matahari', warna: '#ffb74d' },
    ...PLANET_ORDER.map(id => ({ id, warna: '#' + PLANET_DATA.find(p => p.id === id).warna.toString(16).padStart(6, '0') })),
    { id: 'Bulan', warna: '#bdbdbd' }
  ];
  const diameterMaks = SUN_DATA.radius * 2;
  let html = '<p style="font-size:12.6px;line-height:1.65;color:#ccd8ee;margin-bottom:16px">' +
    'Panjang batang menunjukkan diameter benda langit. Agar semua tetap terlihat, digunakan <b>skala akar</b> ' +
    '(bukan skala lurus), sehingga perbedaan yang sangat besar dapat ditampilkan dalam satu gambar.</p>';

  daftar.forEach(o => {
    const d = dataBenda(o.id);
    const dia = d.radius * 2;
    const lebar = Math.sqrt(dia / diameterMaks) * 100;
    html += '<div class="banding-baris">' +
      '<div class="banding-nama">' + o.id + '</div>' +
      '<div class="banding-luar"><div class="banding-dalam" style="width:' + lebar.toFixed(2) + '%;background:linear-gradient(90deg,' + o.warna + ',' + o.warna + '99)"></div></div>' +
      '<div class="banding-nilai">' + angka(dia, 0) + ' km</div></div>';
  });

  html += '<div class="banding-catatan">' +
    'Diameter Matahari ' + angka(diameterMaks / 12742, 0) + ' kali diameter Bumi, dan Jupiter ' +
    angka(142984 / 12742, 1) + ' kali diameter Bumi. Bandingkan dengan Merkurius yang hanya ' +
    angka(4879 / 12742, 2) + ' kali diameter Bumi.</div>';

  bukaModal('Perbandingan Ukuran Benda Langit', html,
    '<button class="tombol-mini" id="bd-tutup">Tutup</button>');
  $('#bd-tutup').addEventListener('click', tutupModal);
}

/* =========================================================================
 * Tabel data lengkap
 * ======================================================================= */
function tampilkanTabel() {
  const kolom = ['Benda', 'Diameter (km)', 'Jarak (juta km)', 'Revolusi', 'Rotasi', 'Satelit', 'Massa (Bumi=1)', 'Gravitasi (m/s²)', 'Suhu (°C)'];
  let html = '<div class="tabel-gulir"><table class="tabel-lengkap"><thead><tr>';
  kolom.forEach(k => { html += '<th>' + k + '</th>'; });
  html += '</tr></thead><tbody>';

  html += '<tr class="baris-matahari"><td>Matahari</td><td>' + angka(SUN_DATA.radius * 2, 0) + '</td><td>—</td>' +
    '<td>—</td><td>' + fmtPeriodeRotasi(SUN_DATA.rotasi) + '</td><td>—</td><td>' + angka(SUN_DATA.massa, 0) +
    '</td><td>' + angka(SUN_DATA.gravitasi, 1) + '</td><td>' + angka(SUN_DATA.suhu, 0) + '</td></tr>';

  PLANET_DATA.forEach(p => {
    html += '<tr><td>' + p.nama + '</td><td>' + angka(p.radius * 2, 0) + '</td><td>' + angka(p.jarakRata, 1) + '</td>' +
      '<td>' + angka(p.periodeOrbit, p.periodeOrbit < 100 ? 2 : 1) + ' hari</td>' +
      '<td>' + fmtPeriodeRotasi(p.rotasi) + '</td><td>' + p.satelit + '</td>' +
      '<td>' + angka(p.massa, p.massa < 1 ? 3 : 1) + '</td><td>' + angka(p.gravitasi, 1) + '</td>' +
      '<td>' + angka(p.suhu, 0) + '</td></tr>';
  });

  const bl = MOON_DATA;
  html += '<tr><td>Bulan</td><td>' + angka(bl.radius * 2, 0) + '</td><td>0,384 (dari Bumi)</td>' +
    '<td>27,32 hari</td><td>' + fmtPeriodeRotasi(bl.rotasi) + '</td><td>—</td><td>' + angka(bl.massa, 3) +
    '</td><td>' + angka(bl.gravitasi, 2) + '</td><td>' + angka(bl.suhu, 0) + '</td></tr>';

  html += '</tbody></table></div>';
  html += '<div class="banding-catatan">Satuan SA (Satuan Astronomi): 1 SA = 149,6 juta km = jarak rata-rata Bumi–Matahari. ' +
    'Tanda negatif pada periode rotasi berarti planet berputar berlawanan arah (retrograde).</div>';

  bukaModal('Tabel Data Tata Surya', html, '<button class="tombol-mini" id="tb-tutup">Tutup</button>');
  $('#tb-tutup').addEventListener('click', tutupModal);
}

/* =========================================================================
 * Materi ringkas
 * ======================================================================= */
function tampilkanMateri() {
  let html = '';
  MATERI.forEach(m => {
    html += '<div class="materi-item"><h3>' + m.judul + '</h3><p>' + m.isi + '</p></div>';
  });
  html += '<div class="catatan-kotak">Gunakan fitur <b>Tur terpandu</b> dan <b>Kuis</b> untuk menguji pemahaman setelah membaca materi ini.</div>';
  bukaModal('Materi Ringkas: Sistem Tata Surya', html, '<button class="tombol-mini" id="mt-tutup">Tutup</button>');
  $('#mt-tutup').addEventListener('click', tutupModal);
}

/* =========================================================================
 * Bantuan & pintasan papan ketik
 * ======================================================================= */
function tampilkanBantuan() {
  const html = '<div class="bantuan-grid">' +
    '<div><h3>Menggunakan simulasi</h3><ul>' +
    '<li>🖱️ <span><b>Seret kiri</b> untuk memutar sudut pandang</span></li>' +
    '<li>🔍 <span><b>Scroll</b> atau cubit dua jari untuk memperbesar</span></li>' +
    '<li>✋ <span><b>Seret kanan</b> (atau Shift + seret) untuk menggeser pandangan</span></li>' +
    '<li>🪐 <span><b>Klik planet</b> untuk melihat data dan mengikuti pergerakannya</span></li>' +
    '<li>📅 <span>Ubah <b>tanggal simulasi</b> untuk melihat posisi planet yang sebenarnya</span></li>' +
    '</ul></div>' +
    '<div><h3>Pintasan papan ketik</h3><ul>' +
    '<li><kbd>Spasi</kbd> <span>Jalankan / jeda waktu</span></li>' +
    '<li><kbd>←</kbd> <kbd>→</kbd> <span>Perlambat / percepat waktu</span></li>' +
    '<li><kbd>1</kbd>–<kbd>8</kbd> <span>Fokus ke planet (1 = Merkurius … 8 = Neptunus)</span></li>' +
    '<li><kbd>0</kbd> <span>Fokus ke Matahari</span></li>' +
    '<li><kbd>R</kbd> <span>Kembalikan sudut pandang</span></li>' +
    '<li><kbd>L</kbd> <span>Nama benda · </span><kbd>O</kbd> <span>Garis orbit</span></li>' +
    '<li><kbd>T</kbd> <span>Tur terpandu · </span><kbd>Q</kbd> <span>Kuis</span></li>' +
    '<li><kbd>F</kbd> <span>Layar penuh · </span><kbd>Esc</kbd> <span>Tutup jendela</span></li>' +
    '</ul></div>' +
    '<div><h3>Catatan untuk pembelajaran</h3><ul>' +
    '<li>📐 <span>Mode <b>Terlihat</b> memampatkan jarak dan memperbesar ukuran agar mudah diamati.</span></li>' +
    '<li>📏 <span>Mode <b>Nyata</b> menampilkan perbandingan sebenarnya — planet tampak sangat kecil.</span></li>' +
    '<li>☀️ <span>Posisi planet dihitung dari elemen orbit J2000 sehingga sesuai tanggal nyata.</span></li>' +
    '<li>🎓 <span>Gunakan <b>Kuis</b> untuk penilaian dan <b>Tur terpandu</b> untuk pengenalan.</span></li>' +
    '</ul></div></div>';
  bukaModal('Bantuan & Panduan', html, '<button class="tombol-mini" id="bt-tutup">Mengerti</button>');
  $('#bt-tutup').addEventListener('click', tutupModal);
}

function siapkanPintasan() {
  window.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea')) return;
    const sim = App.sim;
    if (e.key === 'Escape') { tutupModal(); hentikanTur(); return; }
    if ($('#modal').hidden === false) return;

    const geser = $('#kecepatan');
    switch (e.key) {
      case ' ':
        e.preventDefault();
        sim.berjalan = !sim.berjalan;
        $('#btn-main .ikon-jalan').hidden = sim.berjalan;
        $('#btn-main .ikon-jeda').hidden = !sim.berjalan;
        break;
      case 'ArrowRight':
        geser.value = Math.min(100, Number(geser.value) + 4);
        geser.dispatchEvent(new Event('input'));
        break;
      case 'ArrowLeft':
        geser.value = Math.max(0, Number(geser.value) - 4);
        geser.dispatchEvent(new Event('input'));
        break;
      case 'l': case 'L':
        $('#tg-label').checked = !$('#tg-label').checked;
        sim.aturTampilan('labelAktif', $('#tg-label').checked);
        break;
      case 'o': case 'O':
        $('#tg-orbit').checked = !$('#tg-orbit').checked;
        sim.aturTampilan('orbitAktif', $('#tg-orbit').checked);
        break;
      case 'r': case 'R':
        sim.lihatKeseluruhan(); tandaiDaftar(null); break;
      case 'f': case 'F':
        $('#btn-layar').click(); break;
      case 't': case 'T':
        App.tur.aktif ? hentikanTur() : mulaiTur(); break;
      case 'q': case 'Q':
        mulaiKuis(); break;
      case 'h': case 'H':
        tampilkanBantuan(); break;
      default:
        if (e.key === '0') { sim.pilih('Matahari'); }
        else if (/^[1-8]$/.test(e.key)) { sim.pilih(PLANET_ORDER[Number(e.key) - 1]); }
    }
  });
}

/* =========================================================================
 * Tur terpandu
 * ======================================================================= */
function siapkanTanggal() { siapkanModal(); }

function mulaiTur() {
  App.tur = { aktif: true, indeks: 0, sisa: TOUR_STOPS[0].durasi, jeda: false };
  const panel = $('#narasi-tur');
  panel.hidden = false;
  const sim = App.sim;
  sim.berjalan = true;
  $('#btn-main .ikon-jalan').hidden = true;
  $('#btn-main .ikon-jeda').hidden = false;
  if (window.innerWidth <= 900) {
    document.querySelectorAll('.panel').forEach(p => p.classList.add('terlipat'));
  }
  tampilkanLangkahTur();
}

function tampilkanLangkahTur() {
  const s = TOUR_STOPS[App.tur.indeks];
  const b = App.sim.benda[s.id];
  $('#narasi-langkah').textContent = 'Langkah ' + (App.tur.indeks + 1) + '/' + TOUR_STOPS.length;
  $('#narasi-judul').textContent = s.id === 'Bulan' ? 'Bulan (satelit Bumi)' : s.id;
  $('#narasi-teks').textContent = s.narasi;
  $('#narasi-jeda').textContent = App.tur.jeda ? 'Lanjut' : 'Jeda';
  if (b) App.sim.pilih(s.id, { jarak: s.id === 'Matahari' ? 5.4 : 6.4 });
  App.tur.sisa = s.durasi;
  $('#narasi-kemajuan').style.width = '0%';
}

function perbaruiTur(dt) {
  if (App.tur.jeda) return;
  App.tur.sisa -= dt;
  const durasi = TOUR_STOPS[App.tur.indeks].durasi;
  $('#narasi-kemajuan').style.width = Math.max(0, Math.min(100, (1 - App.tur.sisa / durasi) * 100)) + '%';
  if (App.tur.sisa <= 0) {
    if (App.tur.indeks < TOUR_STOPS.length - 1) {
      App.tur.indeks++;
      tampilkanLangkahTur();
    } else {
      hentikanTur();
      toast('Tur selesai. Coba kuis untuk menguji pemahaman! 🎓', 4200);
    }
  }
}

function hentikanTur() {
  if (!App.tur.aktif) return;
  App.tur.aktif = false;
  $('#narasi-tur').hidden = true;
}

function siapkanTurTombol() {
  $('#narasi-tutup').addEventListener('click', () => { hentikanTur(); App.sim.lihatKeseluruhan(); });
  $('#narasi-maju').addEventListener('click', () => {
    if (App.tur.indeks < TOUR_STOPS.length - 1) { App.tur.indeks++; tampilkanLangkahTur(); }
    else { hentikanTur(); }
  });
  $('#narasi-mundur').addEventListener('click', () => {
    if (App.tur.indeks > 0) { App.tur.indeks--; tampilkanLangkahTur(); }
    else tampilkanLangkahTur();
  });
  $('#narasi-jeda').addEventListener('click', () => {
    App.tur.jeda = !App.tur.jeda;
    $('#narasi-jeda').textContent = App.tur.jeda ? 'Lanjut' : 'Jeda';
  });
}

/* =========================================================================
 * Kuis
 * ======================================================================= */
function acak(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function mulaiKuis() {
  hentikanTur();
  const soal = acak(QUIZ_BANK).slice(0, 10);
  App.kuis = { soal, indeks: 0, jawaban: [], dijawab: false };
  bukaModal('Kuis Tata Surya', '<div id="kuis-isi"></div>', '');
  gambarSoal();
}

function gambarSoal() {
  const k = App.kuis;
  const s = k.soal[k.indeks];
  const huruf = ['A', 'B', 'C', 'D'];

  let html = '<div class="kuis-progres"><span class="kuis-skor">Soal ' + (k.indeks + 1) + ' dari ' + k.soal.length + '</span>' +
    '<div class="kuis-progres-bar"><div style="width:' + (k.indeks / k.soal.length * 100) + '%"></div></div>' +
    '<span class="kuis-skor">Benar: ' + k.jawaban.filter(j => j.benar).length + '</span></div>';

  html += '<div class="kuis-soal">' + s.q + '</div><div class="kuis-pilihan">';
  s.o.forEach((o, i) => {
    html += '<button class="kuis-opsi" data-i="' + i + '"><span class="huruf">' + huruf[i] + '</span><span>' + o + '</span></button>';
  });
  html += '</div><div id="kuis-umpan"></div>';

  $('#kuis-isi').innerHTML = html;
  $('#modal-kaki').innerHTML = '';

  document.querySelectorAll('.kuis-opsi').forEach(b => {
    b.addEventListener('click', () => jawabKuis(Number(b.dataset.i)));
  });
  k.dijawab = false;
}

function jawabKuis(pilih) {
  const k = App.kuis;
  if (k.dijawab) return;
  k.dijawab = true;
  const s = k.soal[k.indeks];
  const benar = pilih === s.a;
  k.jawaban.push({ soal: s, pilih, benar });

  document.querySelectorAll('.kuis-opsi').forEach(b => {
    b.classList.add('mati');
    const i = Number(b.dataset.i);
    if (i === s.a) b.classList.add('benar');
    else if (i === pilih) b.classList.add('salah');
  });

  $('#kuis-umpan').innerHTML = '<div class="kuis-umpan ' + (benar ? 'ok' : 'no') + '">' +
    '<b>' + (benar ? '✅ Tepat sekali!' : '❌ Belum tepat') + '</b>' + s.e + '</div>';

  const terakhir = k.indeks === k.soal.length - 1;
  $('#modal-kaki').innerHTML = '<button class="tombol-mini" id="kuis-lanjut">' +
    (terakhir ? 'Lihat hasil' : 'Soal berikutnya ▶') + '</button>';
  $('#kuis-lanjut').addEventListener('click', () => {
    if (terakhir) {
      gambarHasilKuis();
    } else {
      k.indeks++;
      gambarSoal();
    }
  });
  $('#kuis-lanjut').focus();
}

function gambarHasilKuis() {
  const k = App.kuis;
  const benar = k.jawaban.filter(j => j.benar).length;
  const total = k.soal.length;
  const persen = Math.round(benar / total * 100);
  let pesan;
  if (persen >= 90) pesan = 'Luar biasa! Pemahamanmu tentang Tata Surya sangat baik. 🌟';
  else if (persen >= 70) pesan = 'Bagus! Pelajari kembali bagian yang masih salah agar makin mantap. 👍';
  else if (persen >= 50) pesan = 'Cukup baik. Baca kembali panel informasi tiap planet, lalu coba lagi. 💪';
  else pesan = 'Jangan menyerah! Buka menu Materi ringkas dan Tur terpandu, lalu ulangi kuis ini. 📚';

  let html = '<div class="hasil-lingkaran"><div class="angka" style="--persen:' + persen + '%">' +
    '<span>' + benar + '/' + total + '<small>skor ' + persen + '</small></span></div></div>' +
    '<div class="hasil-pesan">' + pesan + '</div><div class="ulasan">';

  k.jawaban.forEach((j, i) => {
    html += '<div class="ulasan-item"><span class="tanda ' + (j.benar ? 'ok' : 'no') + '">' + (j.benar ? '✓' : '✕') + '</span>' +
      '<span><b>' + (i + 1) + '. ' + j.soal.q + '</b><br>Jawaban benar: <b>' + j.soal.o[j.soal.a] + '</b>' +
      (j.benar ? '' : '<br>Jawabanmu: ' + j.soal.o[j.pilih]) + '<br><span style="color:#94a5c5">' + j.soal.e + '</span></span></div>';
  });
  html += '</div>';

  bukaModal('Hasil Kuis', html,
    '<button class="tombol-mini" id="kuis-ulang">Ulangi kuis</button>' +
    '<button class="tombol-mini" id="kuis-selesai">Selesai</button>');
  $('#kuis-ulang').addEventListener('click', mulaiKuis);
  $('#kuis-selesai').addEventListener('click', tutupModal);
}

/* =========================================================================
 * Titik masuk
 * ======================================================================= */
document.addEventListener('DOMContentLoaded', () => {
  siapkanTurTombol();
  mulai();
});
