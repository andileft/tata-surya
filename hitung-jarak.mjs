/* Menghitung jarak Bumi–Matahari pada tanggal tertentu untuk kunci jawaban LKPD.
   Memakai rumus yang sama dengan simulasi (elemen orbit Keplerian J2000). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = dirname(fileURLToPath(import.meta.url));
const sumber = readFileSync(join(AKAR, 'src', 'data.js'), 'utf8');
const el = new Function(sumber + '\nreturn ORBITAL_ELEMENTS;')();
const DEG = Math.PI / 180;
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

function jarak(id, tanggal) {
  const e0 = el[id];
  const abad = ((Date.UTC(tanggal[0], tanggal[1] - 1, tanggal[2], 12) - J2000) / 86400000) / 36525;
  const a = e0.a + e0.rate.a * abad;
  const e = e0.e + e0.rate.e * abad;
  const L = (e0.L + e0.rate.L * abad) * DEG;
  const w = (e0.w + e0.rate.w * abad) * DEG;
  const M = L - w;
  let E = M;
  for (let i = 0; i < 10; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return a * (1 - e * Math.cos(E));
}

const tanggal = [
  ['3 Januari 2025', [2025, 1, 3]],
  ['3 April 2025', [2025, 4, 3]],
  ['4 Juli 2025', [2025, 7, 4]],
  ['5 Oktober 2025', [2025, 10, 5]]
];

console.log('Jarak Bumi–Matahari (SA dan juta km):');
for (const [nama, t] of tanggal) {
  const r = jarak('Bumi', t);
  console.log('  ' + nama.padEnd(18) + r.toFixed(4) + ' SA  =  ' + (r * 149.59787).toFixed(1) + ' juta km');
}

console.log('\nJarak Mars–Matahari untuk pembanding:');
for (const [nama, t] of tanggal) {
  const r = jarak('Mars', t);
  console.log('  ' + nama.padEnd(18) + r.toFixed(4) + ' SA  =  ' + (r * 149.59787).toFixed(1) + ' juta km');
}

/* Periode orbit menurut Hukum Kepler III: T^2 = a^3 */
console.log('\nPemeriksaan Hukum Kepler III (T dalam tahun, a dalam SA):');
for (const id of ['Merkurius', 'Venus', 'Bumi', 'Mars', 'Jupiter', 'Saturnus', 'Uranus', 'Neptunus']) {
  const a = el[id].a;
  const T = Math.sqrt(a * a * a);
  console.log('  ' + id.padEnd(10) + 'a=' + a.toFixed(3).padStart(7) + '  a^3=' + (a * a * a).toFixed(3).padStart(8) +
    '  T hitung=' + T.toFixed(2).padStart(7) + ' th');
}
