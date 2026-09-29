/* =========================================================================
 * build.mjs — Menggabungkan seluruh berkas sumber menjadi SATU berkas
 * index.html yang mandiri (three.js, CSS, dan semua skrip disatukan).
 *
 * Tujuan: guru dan siswa dapat membuka simulasi hanya dengan klik dua kali
 * pada berkas index.html, tanpa server lokal dan tanpa koneksi internet.
 *
 * Jalankan:  node build.mjs
 * ======================================================================= */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = dirname(fileURLToPath(import.meta.url));
const baca = (...p) => readFileSync(join(AKAR, ...p), 'utf8');

const potongan = {
  '/*__CSS__*/': baca('src', 'styles.css'),
  '/*__THREE__*/': baca('vendor', 'three.min.js'),
  '/*__DATA__*/': baca('src', 'data.js'),
  '/*__TEXTURES__*/': baca('src', 'textures.js'),
  '/*__SOLAR__*/': baca('src', 'solar.js'),
  '/*__APP__*/': baca('src', 'app.js')
};

/* Pengaman: isi skrip tidak boleh mengandung "</script>" karena akan
 * memotong tag <script> di HTML. */
for (const [nama, isi] of Object.entries(potongan)) {
  if (isi.includes('</script')) {
    console.error(`GAGAL: berkas untuk ${nama} mengandung "</script" dan tidak dapat disatukan.`);
    process.exit(1);
  }
}

let html = baca('src', 'index.template.html');
for (const [penanda, isi] of Object.entries(potongan)) {
  if (!html.includes(penanda)) {
    console.error(`GAGAL: penanda ${penanda} tidak ditemukan di index.template.html`);
    process.exit(1);
  }
  html = html.replace(penanda, () => isi);
}

const keluar = join(AKAR, 'index.html');
writeFileSync(keluar, html, 'utf8');

const kb = (statSync(keluar).size / 1024).toFixed(0);
console.log('Berhasil membuat index.html (' + kb + ' KB)');
console.log('Buka berkas tersebut dengan peramban (klik dua kali) — tidak perlu internet.');
