/* =========================================================================
 * uji.mjs — Menguji index.html di peramban Chrome tanpa antarmuka (headless)
 * Memakai Chrome DevTools Protocol melalui WebSocket bawaan Node.js.
 *
 * Pengujian:
 *  1. tidak ada galat JavaScript (exception / console.error)
 *  2. layar pemuatan benar-benar selesai (artinya pembangunan scene berhasil)
 *  3. jumlah benda langit yang terbentuk sesuai harapan
 *  4. kanvas WebGL benar-benar menggambar sesuatu (tangkapan layar)
 *
 * Jalankan:  node uji.mjs
 * ======================================================================= */

import { spawn } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = dirname(fileURLToPath(import.meta.url));
const PORTO = 9333;
const KROM = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find(existsSync);

if (!KROM) { console.error('Peramban tidak ditemukan.'); process.exit(1); }

const argumen = [
  '--headless=new',
  '--remote-debugging-port=' + PORTO,
  '--enable-unsafe-swiftshader',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--window-size=1600,900',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--user-data-dir=' + join(AKAR, '.profil-uji'),
  'about:blank'
];

const anak = spawn(KROM, argumen, { stdio: 'ignore' });

const tunggu = ms => new Promise(r => setTimeout(r, ms));

async function ambilJson(path) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + PORTO + path);
      return await r.json();
    } catch { await tunggu(300); }
  }
  throw new Error('Tidak dapat menghubungi CDP');
}

/* --- Klien CDP sederhana ------------------------------------------------ */
class Klien {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.tunggu = new Map();
    this.pendengar = [];
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.tunggu.has(m.id)) {
        const { resolve, reject } = this.tunggu.get(m.id);
        this.tunggu.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      } else if (m.method) {
        this.pendengar.forEach(f => f(m));
      }
    });
  }
  kirim(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.tunggu.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.tunggu.has(id)) { this.tunggu.delete(id); reject(new Error('timeout: ' + method)); }
      }, 60000);
    });
  }
  on(f) { this.pendengar.push(f); }
}

function sambung(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(new Klien(ws)));
    ws.addEventListener('error', e => reject(new Error('WebSocket gagal: ' + (e.message || 'unknown'))));
  });
}

/* --- Jalankan pengujian ------------------------------------------------- */
const galat = [];
const konsol = [];
const faviconAkar = [];
let klien, sukses = true;

try {
  await ambilJson('/json/version');
  const daftar = await ambilJson('/json/list');
  const halaman = daftar.find(t => t.type === 'page');
  if (!halaman) throw new Error('Tidak ada tab halaman');

  klien = await sambung(halaman.webSocketDebuggerUrl);

  klien.on(m => {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      galat.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
    }
    if (m.method === 'Runtime.consoleAPICalled') {
      const teks = m.params.args.map(a => a.value !== undefined ? a.value : (a.description || a.type)).join(' ');
      konsol.push(m.params.type + ': ' + teks);
      if (m.params.type === 'error') galat.push(teks);
    }
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      const e = m.params.entry;
      /* Peramban selalu meminta /favicon.ico pada AKAR domain (misalnya
         https://pengguna.github.io/favicon.ico). Berkas itu milik situs akar
         pengguna, bukan milik repositori proyek ini, sehingga tidak dapat
         disediakan dari sini. Permintaan tersebut diabaikan, tetapi favicon
         pada jalur proyek (…/tata-surya/favicon.ico) tetap dianggap galat. */
      if (/^https?:\/\/[^/]+\/favicon\.ico$/.test(e.url || '')) {
        faviconAkar.push(e.url);
        return;
      }
      galat.push(e.text + (e.url ? '  [' + e.url + ']' : ''));
    }
  });

  await klien.kirim('Runtime.enable');
  await klien.kirim('Log.enable');
  await klien.kirim('Page.enable');
  /* Matikan cache peramban agar yang diuji benar-benar berkas terbaru dari
     server, bukan salinan lama yang tersimpan dari pengujian sebelumnya. */
  await klien.kirim('Network.enable');
  await klien.kirim('Network.setCacheDisabled', { cacheDisabled: true });

  /* Alamat yang diuji: berkas lokal, atau URL bila diberikan sebagai argumen
     (misalnya untuk memeriksa hasil publikasi di GitHub Pages). */
  const urlArgumen = process.argv[2];
  const urlBerkas = urlArgumen || ('file:///' + join(AKAR, 'index.html').replace(/\\/g, '/'));
  console.log('Membuka: ' + urlBerkas);
  const mulaiMuat = Date.now();
  await klien.kirim('Page.navigate', { url: urlBerkas });

  /* Tunggu sampai layar pemuatan hilang (maksimal 60 detik) */
  const batas = Date.now() + 60000;
  let siap = false;
  while (Date.now() < batas) {
    await tunggu(600);
    const r = await klien.kirim('Runtime.evaluate', {
      expression: 'document.getElementById("pemuat") === null && typeof App !== "undefined" && !!App.sim',
      returnByValue: true
    });
    if (r.result && r.result.value === true) { siap = true; break; }
  }
  const detikMuat = ((Date.now() - mulaiMuat) / 1000).toFixed(1);

  const periksa = async expr => {
    const r = await klien.kirim('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r.result ? r.result.value : undefined;
  };

  const jumlahBenda = await periksa('Object.keys(App.sim.benda).length');
  const namaBenda = await periksa('Object.keys(App.sim.benda).join(",")');
  const ukuranKanvas = await periksa('(function(){var c=document.querySelector("#panggung canvas");return c? c.width+"x"+c.height : "tidak ada kanvas"})()');
  const orbitDibuat = await periksa('App.sim._orbitGaris.length');
  const labelDibuat = await periksa('document.querySelectorAll(".label-benda").length');
  const modeSkala = await periksa('App.sim.opsi.skala');
  const tanggal = await periksa('App.sim.tanggalSimulasi().toISOString().slice(0,10)');
  const infoMerkurius = await periksa('(function(){App.sim.pilih("Merkurius");return document.querySelector("#isi-info .info-nama") ? document.querySelector("#isi-info .info-nama").textContent : "tidak ada"})()');

  /* Uji posisi nyata: sudut Bumi harus mendekati posisi pada tanggal nyata */
  const posisiUji = await periksa(`(function(){
    var hasil = {};
    var sim = App.sim;
    var asli = sim.hariSimulasi;
    sim.aturHariSimulasi((Date.UTC(2025,0,1,12)-J2000_MS)/86400000);
    var b = sim.benda['Bumi'].terakhir;
    hasil.bumi2025 = { x:+b.x.toFixed(4), y:+b.y.toFixed(4), z:+b.z.toFixed(4), r:+b.r.toFixed(4) };
    sim.aturHariSimulasi((Date.UTC(2025,6,4,12)-J2000_MS)/86400000);
    b = sim.benda['Bumi'].terakhir;
    hasil.bumiJuli = { r:+b.r.toFixed(4) };
    sim.aturHariSimulasi((Date.UTC(2025,0,3,12)-J2000_MS)/86400000);
    b = sim.benda['Bumi'].terakhir;
    hasil.bumiPerihelion = { r:+b.r.toFixed(4) };
    hasil.hariMerkurius = (function(){ sim.aturHariSimulasi(asli); return +(sim.benda['Merkurius'].terakhir.r).toFixed(4); })();
    sim.aturHariSimulasi(asli);
    return JSON.stringify(hasil);
  })()`);

  /* Uji mode skala nyata */
  const ujiSkala = await periksa(`(function(){
    try {
      App.sim.aturSkala('nyata');
      var r = { ok:true, bumiRadius:+App.sim.benda['Bumi'].radius.toFixed(5), matahariRadius:+App.sim.benda['Matahari'].radius.toFixed(3), orbitGaris:App.sim._orbitGaris.length };
      App.sim.aturSkala('terlihat');
      r.kembali = +App.sim.benda['Bumi'].radius.toFixed(4);
      return JSON.stringify(r);
    } catch(e) { return 'GALAT: ' + e.message; }
  })()`);

  /* Uji kuis & tabel data */
  const ujiFitur = await periksa(`(function(){
    var l = [];
    try { document.getElementById('btn-banding').click(); l.push('banding:' + (document.querySelector('#modal-isi .banding-baris') ? 'ok' : 'gagal')); tutupModal(); } catch(e){ l.push('banding:GALAT '+e.message); }
    try { document.getElementById('btn-tabel').click(); l.push('tabel:' + (document.querySelectorAll('#modal-isi .tabel-lengkap tbody tr').length) + ' baris'); tutupModal(); } catch(e){ l.push('tabel:GALAT '+e.message); }
    try { document.getElementById('btn-materi').click(); l.push('materi:' + document.querySelectorAll('#modal-isi .materi-item').length + ' bagian'); tutupModal(); } catch(e){ l.push('materi:GALAT '+e.message); }
    try { mulaiKuis(); document.querySelector('.kuis-opsi').click(); l.push('kuis:' + (document.querySelector('.kuis-umpan') ? 'ok' : 'gagal')); tutupModal(); } catch(e){ l.push('kuis:GALAT '+e.message); }
    try { mulaiTur(); l.push('tur:' + document.getElementById('narasi-judul').textContent); hentikanTur(); } catch(e){ l.push('tur:GALAT '+e.message); }
    try { document.getElementById('btn-bantuan').click(); l.push('bantuan:' + (document.querySelector('#modal-isi .bantuan-grid') ? 'ok' : 'gagal')); tutupModal(); } catch(e){ l.push('bantuan:GALAT '+e.message); }
    return l.join(' | ');
  })()`);

  /* Pastikan semua lapisan penutup benar-benar tersembunyi setelah ditutup.
     (Bug CSS dahulu membuat modal tetap tampil karena display:grid
      menimpa atribut hidden.) */
  const ujiTersembunyi = await periksa(`(function(){
    var hasil = {};
    ['modal','narasi-tur'].forEach(function(id){
      var el = document.getElementById(id);
      var g = getComputedStyle(el);
      hasil[id] = g.display;
    });
    /* Pastikan pula tidak ada elemen yang menutupi seluruh layar */
    var titik = document.elementFromPoint(innerWidth/2, innerHeight/2);
    hasil.titikTengah = titik ? (titik.id || titik.className || titik.tagName) : 'null';
    var kanvas = document.querySelector('#panggung canvas');
    hasil.kanvasTerlihat = kanvas ? getComputedStyle(kanvas).display : 'tidak ada';
    return JSON.stringify(hasil);
  })()`);

  /* Uji klik planet melalui simulasi klik pada kanvas (bukan pemanggilan langsung) */
  const ujiKlikKanvas = await periksa(`(function(){
    try {
      var sim = App.sim;
      sim.lihatKeseluruhan();
      sim.hariSimulasi = (Date.now()-J2000_MS)/86400000;
      sim._perbaruiPosisi(0);
      /* Pindahkan kamera ke posisi akhirnya lebih dahulu, karena di dalam
         gelung animasi kamera baru berpindah pada bingkai berikutnya. */
      sim.kontrol.perbarui(1);
      sim.kamera.updateMatrixWorld(true);
      sim.kamera.matrixWorldInverse.copy(sim.kamera.matrixWorld).invert();
      sim.scene.updateMatrixWorld(true);

      var hasil = [];
      ['Bumi','Jupiter','Merkurius'].forEach(function(id){
        var p = new THREE.Vector3();
        sim.benda[id].mesh.getWorldPosition(p);
        var proy = p.clone().project(sim.kamera);
        var rect = sim.renderer.domElement.getBoundingClientRect();
        var px = rect.left + (proy.x*0.5+0.5)*rect.width;
        var py = rect.top + (-proy.y*0.5+0.5)*rect.height;
        sim._klik(px, py);
        hasil.push(id + '->' + (App.terpilih || 'kosong'));
      });
      return hasil.join(', ');
    } catch(e) { return 'GALAT: ' + e.message; }
  })()`);

  /* Pastikan halaman benar-benar mendeklarasikan ikon tab sendiri */
  const ujiFavicon = await periksa(`(function(){
    var l = document.querySelector('link[rel~="icon"]');
    if (!l) return 'tidak ada';
    return l.href.slice(0, 22) + '… (panjang ' + l.href.length + ')';
  })()`);

  await tunggu(1500);
  const bidik = await klien.kirim('Page.captureScreenshot', { format: 'png' });
  const berkasGambar = join(AKAR, 'uji-1-ikhtisar.png');
  writeFileSync(berkasGambar, Buffer.from(bidik.data, 'base64'));

  /* Periksa tata letak label pada tampilan ikhtisar: pastikan tidak ada
     label yang saling bertumpuk dan label planet dalam tetap tampil. */
  await periksa('(function(){ App.sim.lihatKeseluruhan(); return 1; })()');
  await tunggu(1200);
  const ujiLabel = await periksa(`(function(){
    var nyala = [], semua = [], tumpuk = [];
    document.querySelectorAll('.label-benda').forEach(function(el){
      var r = el.getBoundingClientRect();
      semua.push(el.textContent);
      if (getComputedStyle(el).display !== 'none') {
        nyala.push(el.textContent);
        el._r = r;
      }
    });
    var arr = [];
    document.querySelectorAll('.label-benda').forEach(function(el){
      if (getComputedStyle(el).display !== 'none') arr.push([el.textContent, el.getBoundingClientRect()]);
    });
    for (var i=0;i<arr.length;i++) for (var j=i+1;j<arr.length;j++) {
      var a=arr[i][1], b=arr[j][1];
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) tumpuk.push(arr[i][0]+'/'+arr[j][0]);
    }
    return JSON.stringify({ terlihat: nyala, jumlah: nyala.length, tumpangTindih: tumpuk });
  })()`);

  /* Tampilan 2: ikhtisar seluruh Tata Surya */
  await periksa('(function(){ App.sim.lihatKeseluruhan(); App.sim.hariSimulasi=(Date.now()-J2000_MS)/86400000; App.sim._perbaruiPosisi(0); return 1; })()');
  await tunggu(1600);
  const bidik2 = await klien.kirim('Page.captureScreenshot', { format: 'png' });
  const berkasGambar2 = join(AKAR, 'uji-2-ikhtisar.png');
  writeFileSync(berkasGambar2, Buffer.from(bidik2.data, 'base64'));

  /* Tampilan 3: Saturnus (memeriksa cincin) */
  await periksa('App.sim.pilih("Saturnus", { jarak: 4.2 })');
  await tunggu(1800);
  const bidik3 = await klien.kirim('Page.captureScreenshot', { format: 'png' });
  const berkasGambar3 = join(AKAR, 'uji-3-saturnus.png');
  writeFileSync(berkasGambar3, Buffer.from(bidik3.data, 'base64'));

  /* Tampilan 4: Bumi (memeriksa awan, Bulan, tekstur) */
  await periksa('App.sim.pilih("Bumi", { jarak: 3.4 })');
  await tunggu(1800);
  const bidik4 = await klien.kirim('Page.captureScreenshot', { format: 'png' });
  const berkasGambar4 = join(AKAR, 'uji-4-bumi.png');
  writeFileSync(berkasGambar4, Buffer.from(bidik4.data, 'base64'));

  /* Tampilan 5: mode skala nyata */
  await periksa('(function(){ App.sim.lihatKeseluruhan(); document.querySelector("[data-skala=nyata]").click(); return 1; })()');
  await tunggu(1800);
  const bidik5 = await klien.kirim('Page.captureScreenshot', { format: 'png' });
  const berkasGambar5 = join(AKAR, 'uji-5-nyata.png');
  writeFileSync(berkasGambar5, Buffer.from(bidik5.data, 'base64'));
  await periksa('(function(){ document.querySelector("[data-skala=terlihat]").click(); return 1; })()');

  console.log('\n=== HASIL PENGUJIAN ===');
  console.log('Layar pemuatan selesai :', siap, '(' + detikMuat + ' detik)');
  console.log('Jumlah benda langit    :', jumlahBenda);
  console.log('Daftar benda           :', namaBenda);
  console.log('Ukuran kanvas WebGL    :', ukuranKanvas);
  console.log('Garis orbit            :', orbitDibuat);
  console.log('Label dibuat           :', labelDibuat);
  console.log('Mode skala awal        :', modeSkala);
  console.log('Tanggal simulasi       :', tanggal);
  console.log('Panel info Merkurius   :', infoMerkurius);
  console.log('Posisi (uji)           :', posisiUji);
  console.log('Uji mode skala         :', ujiSkala);
  console.log('Uji fitur              :', ujiFitur);
  console.log('Uji lapisan tersembunyi:', ujiTersembunyi);
  console.log('Uji klik pada kanvas   :', ujiKlikKanvas);
  console.log('Uji label ikhtisar     :', ujiLabel);
  console.log('Tangkapan layar        :', berkasGambar);
  console.log('Tangkapan layar 2-5    :', berkasGambar2, '|', berkasGambar3, '|', berkasGambar4, '|', berkasGambar5);
  console.log('Ikon tab (favicon)     :', ujiFavicon);
  console.log('Galat JavaScript       :', galat.length ? galat : '(tidak ada)');
  if (faviconAkar.length) {
    console.log('Catatan                : permintaan favicon akar domain diabaikan ->', faviconAkar.join(', '));
  }

  const lapisan = JSON.parse(ujiTersembunyi || '{}');
  if (lapisan.modal !== 'none' || lapisan['narasi-tur'] !== 'none') {
    console.log('>> PERINGATAN: lapisan penutup masih tampil!');
    sukses = false;
  }
  if (!siap || galat.length || jumlahBenda !== 10 || orbitDibuat !== 8) sukses = false;
} catch (e) {
  console.error('Pengujian gagal:', e.message);
  sukses = false;
} finally {
  try { if (klien) klien.ws.close(); } catch {}
  anak.kill();
}

console.log('\nSTATUS: ' + (sukses ? 'LULUS' : 'PERLU DIPERIKSA'));
process.exit(sukses ? 0 : 1);
