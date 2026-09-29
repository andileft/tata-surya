/* =========================================================================
 * data.js — Data astronomi & materi pembelajaran
 * Simulasi Tata Surya untuk Siswa Kelas 9
 * Sumber angka: NASA Planetary Fact Sheet (JPL) & JPL Keplerian Elements
 * ======================================================================= */

/* Elemen orbit Keplerian pada epoch J2000 (Standish, JPL).
 * a  = setengah sumbu mayor (AU)
 * e  = eksentrisitas
 * I  = inklinasi terhadap ekliptika (derajat)
 * L  = bujur rata-rata / mean longitude (derajat)
 * w  = bujur perihelion (derajat)
 * O  = bujur titik simpul naik (derajat)
 * rate = perubahan nilai tersebut per abad (abad Julian) */
const ORBITAL_ELEMENTS = {
  Merkurius: { a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.25032350, w: 77.45779628, O: 48.33076593,
               rate: { a: 0.00000037, e: 0.00001906, I: -0.00594749, L: 149472.67411175, w: 0.16047689, O: -0.12534081 } },
  Venus:     { a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.97909950, w: 131.60246718, O: 76.67984255,
               rate: { a: 0.00000390, e: -0.00004107, I: -0.00078890, L: 58517.81538729, w: 0.00268329, O: -0.27769418 } },
  Bumi:      { a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, w: 102.93768193, O: 0.0,
               rate: { a: 0.00000562, e: -0.00004392, I: -0.01294668, L: 35999.37244981, w: 0.32327364, O: 0.0 } },
  Mars:      { a: 1.52371034, e: 0.09339410, I: 1.84969142, L: -4.55343205, w: -23.94362959, O: 49.55953891,
               rate: { a: 0.00001847, e: 0.00007882, I: -0.00813131, L: 19140.30268499, w: 0.44441088, O: -0.29257343 } },
  Jupiter:   { a: 5.20288700, e: 0.04838624, I: 1.30439695, L: 34.39644051, w: 14.72847983, O: 100.47390909,
               rate: { a: -0.00011607, e: -0.00013253, I: -0.00183714, L: 3034.74612775, w: 0.21252668, O: 0.20469106 } },
  Saturnus:  { a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, w: 92.59887831, O: 113.66242448,
               rate: { a: -0.00125060, e: -0.00050991, I: 0.00193609, L: 1222.49362201, w: -0.41897216, O: -0.28867794 } },
  Uranus:    { a: 19.18916464, e: 0.04725744, I: 0.77263783, L: 313.23810451, w: 170.95427630, O: 74.01692503,
               rate: { a: -0.00196176, e: -0.00004397, I: -0.00242939, L: 428.48202785, w: 0.40805281, O: 0.04240589 } },
  Neptunus:  { a: 30.06992276, e: 0.00859048, I: 1.77004347, L: -55.12002969, w: 44.96476227, O: 131.78422574,
               rate: { a: 0.00026291, e: 0.00005105, I: 0.00035372, L: 218.45945325, w: -0.32241464, O: -0.00508664 } }
};

/* Data fisis. radius = radius ekuator (km), jarakRata = jarak rata-rata dari
 * Matahari (juta km), periodeOrbit = periode revolusi (hari Bumi),
 * rotasi = periode rotasi (jam, negatif = retrograde),
 * massa = massa relatif terhadap Bumi, gravitasi = m/s^2,
 * suhu = suhu permukaan rata-rata (Celsius), satelit = jumlah bulan diketahui */
const SUN_DATA = {
  id: 'Matahari',
  nama: 'Matahari',
  jenis: 'Bintang (Bintang Deret Utama Tipe G)',
  radius: 696340,
  massa: 333000,
  gravitasi: 274,
  rotasi: 609.12,
  suhu: 5505,
  satelit: 0,
  warna: 0xffcc55,
  fakta: [
    'Matahari adalah bintang, bukan planet. Ia memancarkan cahayanya sendiri dari reaksi fusi nuklir.',
    'Setiap detik, Matahari mengubah sekitar 600 juta ton hidrogen menjadi helium.',
    'Massa Matahari mencakup 99,86% dari seluruh massa Tata Surya.',
    'Cahaya Matahari butuh 8 menit 20 detik untuk sampai ke Bumi.',
    'Suhu inti Matahari sekitar 15 juta derajat Celsius.'
  ]
};

const PLANET_DATA = [
  {
    id: 'Merkurius', nama: 'Merkurius', jenis: 'Planet Terestrial (berbatu)',
    radius: 2439.7, jarakRata: 57.9, periodeOrbit: 87.969, rotasi: 1407.6,
    massa: 0.055, gravitasi: 3.7, suhu: 167, suhuMin: -173, suhuMax: 427,
    satelit: 0, warna: 0x9c9086, kemiringanSumbu: 0.034, cincin: false,
    tekstur: { tipe: 'batuan', dasar: '#8c8378', kawah: 140, seed: 11, kontras: 1.0 },
    fakta: [
      'Merkurius adalah planet terdekat dengan Matahari sekaligus planet terkecil.',
      'Satu tahun di Merkurius hanya 88 hari Bumi, tetapi satu harinya (siang ke siang) 176 hari Bumi.',
      'Tidak punya atmosfer tebal, sehingga suhunya ekstrem: 427 °C saat siang dan -173 °C saat malam.',
      'Permukaannya penuh kawah, mirip Bulan, karena tidak ada atmosfer pelindung.',
      'Merkurius tidak memiliki satelit dan tidak memiliki cincin.'
    ],
    catatan: 'Merkurius sulit dilihat karena selalu dekat dengan cahaya Matahari. Waktu terbaik mengamatinya adalah saat fajar atau senja.'
  },
  {
    id: 'Venus', nama: 'Venus', jenis: 'Planet Terestrial (berbatu)',
    radius: 6051.8, jarakRata: 108.2, periodeOrbit: 224.701, rotasi: -5832.5,
    massa: 0.815, gravitasi: 8.9, suhu: 464, suhuMin: 437, suhuMax: 497,
    satelit: 0, warna: 0xe8cda2, kemiringanSumbu: 177.4, cincin: false,
    tekstur: { tipe: 'awan', dasar: '#e6cfa4', aksen: '#c9a86a', seed: 23 },
    fakta: [
      'Venus adalah planet terpanas, meskipun bukan yang terdekat dengan Matahari.',
      'Atmosfernya 96% karbon dioksida yang menimbulkan efek rumah kaca sangat kuat.',
      'Venus berputar terbalik (retrograde): Matahari terbit dari barat.',
      'Satu hari di Venus (243 hari Bumi) lebih lama daripada satu tahunnya (225 hari Bumi).',
      'Venus sering disebut "Bintang Fajar" atau "Bintang Kejora".'
    ],
    catatan: 'Tekanan udara di Venus 92 kali tekanan di Bumi — setara dengan tekanan di kedalaman 900 meter di laut.'
  },
  {
    id: 'Bumi', nama: 'Bumi', jenis: 'Planet Terestrial (berbatu)',
    radius: 6371.0, jarakRata: 149.6, periodeOrbit: 365.256, rotasi: 23.934,
    massa: 1.0, gravitasi: 9.8, suhu: 15, suhuMin: -89, suhuMax: 58,
    satelit: 1, warna: 0x3b7dd8, kemiringanSumbu: 23.44, cincin: false,
    tekstur: { tipe: 'bumi', seed: 7 },
    fakta: [
      'Bumi adalah satu-satunya planet yang diketahui memiliki kehidupan.',
      'Sekitar 71% permukaan Bumi tertutup air.',
      'Kemiringan sumbu Bumi 23,44° menyebabkan terjadinya musim.',
      'Atmosfer Bumi tersusun dari 78% nitrogen dan 21% oksigen.',
      'Bumi memiliki medan magnet yang melindungi dari angin Matahari.'
    ],
    catatan: 'Jarak Bumi–Matahari disebut 1 Satuan Astronomi (SA/AU) = 149,6 juta km. Satuan ini dipakai untuk mengukur jarak antarplanet.'
  },
  {
    id: 'Mars', nama: 'Mars', jenis: 'Planet Terestrial (berbatu)',
    radius: 3389.5, jarakRata: 227.9, periodeOrbit: 686.980, rotasi: 24.623,
    massa: 0.107, gravitasi: 3.7, suhu: -63, suhuMin: -143, suhuMax: 35,
    satelit: 2, warna: 0xc1440e, kemiringanSumbu: 25.19, cincin: false,
    tekstur: { tipe: 'batuan', dasar: '#b4512a', kawah: 90, seed: 31, kontras: 0.9 },
    fakta: [
      'Mars disebut "Planet Merah" karena permukaannya banyak mengandung besi oksida (karat).',
      'Di Mars terdapat Olympus Mons, gunung tertinggi di Tata Surya (± 22 km).',
      'Mars memiliki dua satelit kecil: Phobos dan Deimos.',
      'Mars punya musim seperti Bumi karena kemiringan sumbunya mirip (25°).',
      'Terdapat bukti kuat bahwa Mars pernah memiliki air yang mengalir.'
    ],
    catatan: 'Saat Mars dan Bumi berada pada posisi terdekat (oposisi), Mars tampak paling terang di langit malam.'
  },
  {
    id: 'Jupiter', nama: 'Jupiter', jenis: 'Raksasa Gas (Gas Giant)',
    radius: 69911, jarakRata: 778.6, periodeOrbit: 4332.589, rotasi: 9.925,
    massa: 317.8, gravitasi: 23.1, suhu: -108,
    satelit: 95, warna: 0xd8ca9d, kemiringanSumbu: 3.13, cincin: true,
    tekstur: { tipe: 'pita', seed: 41, palet: ['#d8ca9d', '#b08d5f', '#e8dcc0', '#8a6a45', '#f0e6d2', '#a87f52'], pitaY: 14, badai: true },
    fakta: [
      'Jupiter adalah planet terbesar — diameternya 11 kali diameter Bumi.',
      'Bintik Merah Raksasa (Great Red Spot) adalah badai yang berlangsung lebih dari 350 tahun.',
      'Jupiter berputar paling cepat: satu hari hanya 9 jam 55 menit.',
      'Jupiter memiliki puluhan satelit; empat terbesar adalah Io, Europa, Ganymede, dan Callisto.',
      'Gravitasi Jupiter berperan sebagai "pelindung" Bumi dengan menyerap banyak komet dan asteroid.'
    ],
    catatan: 'Massa Jupiter 2,5 kali massa seluruh planet lain di Tata Surya jika digabungkan.'
  },
  {
    id: 'Saturnus', nama: 'Saturnus', jenis: 'Raksasa Gas (Gas Giant)',
    radius: 58232, jarakRata: 1433.5, periodeOrbit: 10759.22, rotasi: 10.656,
    massa: 95.2, gravitasi: 9.0, suhu: -139,
    satelit: 146, warna: 0xe3d9b0, kemiringanSumbu: 26.73, cincin: true,
    tekstur: { tipe: 'pita', seed: 53, palet: ['#e8dfbb', '#d6c79b', '#f2ecd4', '#c4b184', '#efe6c8'], pitaY: 11, badai: false },
    fakta: [
      'Saturnus terkenal karena sistem cincinnya yang sangat lebar dan terang.',
      'Cincin Saturnus tersusun dari miliaran bongkahan es dan batuan, bukan benda padat.',
      'Kepadatan Saturnus lebih kecil daripada air — ia akan mengapung jika ada bak air raksasa.',
      'Satelit terbesarnya, Titan, memiliki atmosfer tebal dan danau metana.',
      'Celah besar di cincinnya disebut Divisi Cassini.'
    ],
    catatan: 'Lebar cincin Saturnus mencapai 280.000 km, tetapi tebalnya rata-rata hanya sekitar 10 meter sampai 1 km.'
  },
  {
    id: 'Uranus', nama: 'Uranus', jenis: 'Raksasa Es (Ice Giant)',
    radius: 25362, jarakRata: 2872.5, periodeOrbit: 30688.5, rotasi: -17.24,
    massa: 14.5, gravitasi: 8.7, suhu: -197,
    satelit: 28, warna: 0xa9dfe8, kemiringanSumbu: 97.77, cincin: true,
    tekstur: { tipe: 'pita', seed: 67, palet: ['#a9dfe8', '#bfe9ef', '#95d3e0', '#cdf0f4'], pitaY: 6, badai: false },
    fakta: [
      'Uranus berputar "miring" — sumbunya miring 98°, hampir berbaring.',
      'Akibat kemiringan itu, satu musim di Uranus berlangsung sekitar 21 tahun.',
      'Warna biru-hijaunya berasal dari gas metana di atmosfernya.',
      'Uranus ditemukan tahun 1781 oleh William Herschel — planet pertama yang ditemukan dengan teleskop.',
      'Uranus memiliki 13 cincin tipis yang gelap.'
    ],
    catatan: 'Karena sumbunya hampir berbaring, kutub Uranus bisa menghadap Matahari selama 42 tahun lalu gelap selama 42 tahun.'
  },
  {
    id: 'Neptunus', nama: 'Neptunus', jenis: 'Raksasa Es (Ice Giant)',
    radius: 24622, jarakRata: 4495.1, periodeOrbit: 60195, rotasi: 16.11,
    massa: 17.1, gravitasi: 11.0, suhu: -201,
    satelit: 16, warna: 0x3f6fd8, kemiringanSumbu: 28.32, cincin: true,
    tekstur: { tipe: 'pita', seed: 79, palet: ['#3f6fd8', '#5a86e0', '#2f57b8', '#7ba0ea'], pitaY: 8, badai: true },
    fakta: [
      'Neptunus adalah planet terjauh dari Matahari dalam Tata Surya kita.',
      'Neptunus ditemukan melalui perhitungan matematika sebelum benar-benar diamati (1846).',
      'Kecepatan angin di Neptunus bisa mencapai 2.100 km/jam — tercepat di Tata Surya.',
      'Satu tahun di Neptunus sama dengan 165 tahun Bumi.',
      'Satelit terbesarnya, Triton, bergerak berlawanan arah dengan rotasi Neptunus.'
    ],
    catatan: 'Sejak ditemukan tahun 1846, Neptunus baru menyelesaikan satu kali revolusi penuh pada tahun 2011.'
  }
];

/* Data Bulan (satelit Bumi) */
const MOON_DATA = {
  id: 'Bulan', nama: 'Bulan', jenis: 'Satelit Alami Bumi',
  radius: 1737.4, jarakRata: 0.3844, periodeOrbit: 27.322, rotasi: 655.7,
  massa: 0.0123, gravitasi: 1.62, suhu: -20, suhuMin: -173, suhuMax: 127,
  satelit: 0, warna: 0xbdbdbd, kemiringanSumbu: 6.68, cincin: false,
  tekstur: { tipe: 'batuan', dasar: '#b9b6b0', kawah: 160, seed: 97, kontras: 1.1 },
  fakta: [
    'Bulan adalah satu-satunya satelit alami Bumi.',
    'Bulan selalu memperlihatkan sisi yang sama ke Bumi (rotasi sinkron).',
    'Gravitasi Bulan menyebabkan pasang naik dan pasang surut air laut.',
    'Periode rotasi Bulan sama dengan periode revolusinya, yaitu 27,3 hari.',
    'Fase Bulan (baru, sabit, purnama) terjadi karena posisi Bulan terhadap Bumi dan Matahari.'
  ],
  catatan: 'Jarak Bumi–Bulan rata-rata 384.400 km. Cahaya Bulan hanyalah pantulan cahaya Matahari.'
};

/* Urutan objek untuk daftar di panel kiri */
const BODY_ORDER = ['Matahari', 'Merkurius', 'Venus', 'Bumi', 'Bulan', 'Mars', 'Jupiter', 'Saturnus', 'Uranus', 'Neptunus'];
const PLANET_ORDER = ['Merkurius', 'Venus', 'Bumi', 'Mars', 'Jupiter', 'Saturnus', 'Uranus', 'Neptunus'];

/* Beberapa satelit terkenal (bukan Bulan) — hanya untuk label & wawasan */
const FAMOUS_MOONS = [
  { planet: 'Mars', nama: 'Phobos & Deimos', catatan: 'Dua satelit kecil berbentuk tidak beraturan.' },
  { planet: 'Jupiter', nama: 'Io, Europa, Ganymede, Callisto', catatan: 'Empat satelit Galileo, ditemukan tahun 1610.' },
  { planet: 'Saturnus', nama: 'Titan', catatan: 'Punya atmosfer tebal dan danau metana.' },
  { planet: 'Neptunus', nama: 'Triton', catatan: 'Mengorbit berlawanan arah (retrograde).' }
];

/* --- Bank soal kuis ---------------------------------------------------- */
const QUIZ_BANK = [
  { q: 'Planet manakah yang paling dekat dengan Matahari?',
    o: ['Venus', 'Merkurius', 'Bumi', 'Mars'], a: 1,
    e: 'Merkurius berjarak rata-rata 57,9 juta km dari Matahari — paling dekat di antara semua planet.' },
  { q: 'Planet terpanas di Tata Surya adalah ...',
    o: ['Merkurius', 'Venus', 'Mars', 'Jupiter'], a: 1,
    e: 'Venus paling panas (464 °C) karena atmosfernya 96% karbon dioksida sehingga terjadi efek rumah kaca ekstrem.' },
  { q: 'Apa yang menyebabkan terjadinya musim di Bumi?',
    o: ['Jarak Bumi ke Matahari berubah', 'Kemiringan sumbu Bumi 23,44°', 'Rotasi Bumi 24 jam', 'Gravitasi Bulan'], a: 1,
    e: 'Kemiringan sumbu Bumi membuat penyinaran Matahari di belahan Bumi utara dan selatan berbeda sepanjang tahun.' },
  { q: 'Cincin Saturnus tersusun dari ...',
    o: ['Gas hidrogen padat', 'Bongkahan es dan batuan', 'Debu gunung berapi', 'Cairan metana'], a: 1,
    e: 'Cincin Saturnus terdiri dari miliaran bongkahan es dan batuan yang mengorbit planet.' },
  { q: 'Planet yang berputar dengan sumbu hampir "berbaring" (miring 98°) adalah ...',
    o: ['Neptunus', 'Uranus', 'Saturnus', 'Venus'], a: 1,
    e: 'Uranus memiliki kemiringan sumbu 97,77°, sehingga tampak berputar sambil berbaring.' },
  { q: 'Satu Satuan Astronomi (1 SA) sama dengan ...',
    o: ['Jarak Bumi ke Bulan', 'Jarak Bumi ke Matahari', 'Diameter Matahari', 'Jarak Matahari ke Jupiter'], a: 1,
    e: '1 SA = 149,6 juta km, yaitu jarak rata-rata Bumi ke Matahari.' },
  { q: 'Planet yang dikenal sebagai "Planet Merah" adalah ...',
    o: ['Venus', 'Mars', 'Jupiter', 'Merkurius'], a: 1,
    e: 'Mars tampak merah karena permukaannya banyak mengandung besi oksida (karat).' },
  { q: 'Kelompok planet raksasa gas/raksasa es adalah ...',
    o: ['Merkurius, Venus, Bumi, Mars', 'Jupiter, Saturnus, Uranus, Neptunus', 'Bumi, Mars, Jupiter, Saturnus', 'Venus, Bumi, Mars, Jupiter'], a: 1,
    e: 'Empat planet luar (Jupiter, Saturnus, Uranus, Neptunus) berukuran raksasa dan tersusun dari gas serta es.' },
  { q: 'Kemiringan sumbu Bumi adalah ...',
    o: ['0°', '23,44°', '45°', '98°'], a: 1,
    e: 'Sumbu Bumi miring 23,44° terhadap bidang orbitnya (ekliptika).' },
  { q: 'Berapa lama cahaya Matahari sampai ke Bumi?',
    o: ['8 detik', '8 menit 20 detik', '1 jam', '24 jam'], a: 1,
    e: 'Jarak 149,6 juta km dibagi kecepatan cahaya 300.000 km/s menghasilkan sekitar 8 menit 20 detik.' },
  { q: 'Planet yang arah rotasinya berlawanan dengan sebagian besar planet lain (retrograde) adalah ...',
    o: ['Mars', 'Venus', 'Jupiter', 'Neptunus'], a: 1,
    e: 'Venus berputar retrograde sehingga Matahari terbit dari arah barat.' },
  { q: 'Benda langit yang memancarkan cahayanya sendiri disebut ...',
    o: ['Planet', 'Bintang', 'Satelit', 'Asteroid'], a: 1,
    e: 'Bintang menghasilkan cahaya sendiri dari reaksi fusi nuklir, contohnya Matahari.' },
  { q: 'Planet terbesar di Tata Surya adalah ...',
    o: ['Saturnus', 'Jupiter', 'Neptunus', 'Uranus'], a: 1,
    e: 'Diameter Jupiter 142.984 km, sekitar 11 kali diameter Bumi.' },
  { q: 'Apa yang dimaksud dengan revolusi Bumi?',
    o: ['Perputaran Bumi pada porosnya', 'Peredaran Bumi mengelilingi Matahari', 'Peredaran Bulan mengelilingi Bumi', 'Perubahan posisi bintang'], a: 1,
    e: 'Revolusi = Bumi mengelilingi Matahari selama 365¼ hari; rotasi = Bumi berputar pada porosnya selama 24 jam.' },
  { q: 'Sabuk asteroid terletak di antara orbit ...',
    o: ['Bumi dan Mars', 'Mars dan Jupiter', 'Jupiter dan Saturnus', 'Venus dan Bumi'], a: 1,
    e: 'Sabuk asteroid utama berada di antara orbit Mars dan Jupiter.' },
  { q: 'Planet dengan angin tercepat di Tata Surya adalah ...',
    o: ['Jupiter', 'Saturnus', 'Neptunus', 'Uranus'], a: 2,
    e: 'Angin di Neptunus dapat mencapai 2.100 km/jam.' },
  { q: 'Gaya yang membuat planet tetap mengorbit Matahari adalah ...',
    o: ['Gaya magnet', 'Gaya gravitasi', 'Gaya gesek', 'Gaya listrik'], a: 1,
    e: 'Gravitasi Matahari menarik planet, sedangkan gerak planet menahan agar tidak jatuh — inilah orbit.' },
  { q: 'Terjadinya siang dan malam di Bumi disebabkan oleh ...',
    o: ['Revolusi Bumi', 'Rotasi Bumi', 'Gerhana', 'Kemiringan Bulan'], a: 1,
    e: 'Rotasi Bumi (24 jam) menyebabkan bagian Bumi yang menghadap Matahari mengalami siang.' }
];

/* Materi ringkas untuk panel "Belajar" */
const MATERI = [
  {
    judul: 'Apa itu Tata Surya?',
    isi: 'Tata Surya adalah sistem yang terdiri dari Matahari sebagai pusatnya, delapan planet, planet kerdil, satelit, asteroid, meteoroid, dan komet. Semua anggota Tata Surya bergerak mengelilingi Matahari karena pengaruh gaya gravitasi Matahari.'
  },
  {
    judul: 'Rotasi dan Revolusi',
    isi: 'Rotasi adalah perputaran benda langit pada porosnya (Bumi: 24 jam) yang menyebabkan siang-malam. Revolusi adalah peredaran benda langit mengelilingi Matahari (Bumi: 365¼ hari) yang bersama kemiringan sumbu menyebabkan pergantian musim.'
  },
  {
    judul: 'Planet Dalam dan Planet Luar',
    isi: 'Planet dalam (Merkurius, Venus, Bumi, Mars) disebut planet terestrial: kecil, padat, dan berbatu. Planet luar (Jupiter, Saturnus, Uranus, Neptunus) berukuran raksasa; Jupiter dan Saturnus adalah raksasa gas, sedangkan Uranus dan Neptunus adalah raksasa es. Sabuk asteroid memisahkan keduanya.'
  },
  {
    judul: 'Hukum Kepler (Pengayaan)',
    isi: 'Hukum I: orbit planet berbentuk elips dengan Matahari di salah satu titik fokus. Hukum II: planet bergerak lebih cepat saat dekat Matahari. Hukum III: semakin jauh planet dari Matahari, semakin lama periode revolusinya (T² sebanding dengan a³).'
  },
  {
    judul: 'Skala Tata Surya',
    isi: 'Jarak antarplanet sangat besar dibandingkan ukuran planet. Jika Matahari sebesar bola basket, Bumi hanya sebutir kacang dan berjarak puluhan meter. Karena itu, dalam simulasi ini tersedia mode "Terlihat" (jarak dimampatkan agar mudah diamati) dan mode "Nyata" (perbandingan sebenarnya).'
  },
  {
    judul: 'Satelit, Asteroid, Meteoroid, Komet',
    isi: 'Satelit adalah benda langit yang mengelilingi planet (contoh: Bulan). Asteroid adalah batuan kecil di sabuk antara Mars dan Jupiter. Meteoroid yang masuk atmosfer dan terbakar disebut meteor; jika sampai ke permukaan Bumi disebut meteorit. Komet adalah benda es dan debu dengan ekor yang menguap saat mendekati Matahari.'
  }
];

/* Tahapan tur terpandu */
const TOUR_STOPS = [
  { id: 'Matahari', durasi: 12, narasi: 'Inilah Matahari, pusat Tata Surya. Massanya 99,86% dari seluruh massa Tata Surya. Gravitasi Matahari inilah yang menjaga planet-planet tetap beredar pada orbitnya.' },
  { id: 'Merkurius', durasi: 11, narasi: 'Merkurius, planet terkecil dan terdekat dari Matahari. Satu tahunnya hanya 88 hari Bumi, tetapi rotasinya sangat lambat sehingga satu hari di Merkurius sama dengan 176 hari Bumi.' },
  { id: 'Venus', durasi: 11, narasi: 'Venus, planet terpanas dengan suhu 464 °C. Atmosfernya didominasi karbon dioksida yang memerangkap panas. Venus juga berputar terbalik — Matahari terbit dari barat.' },
  { id: 'Bumi', durasi: 12, narasi: 'Bumi, rumah kita. Jarak ke Matahari 1 SA (149,6 juta km). Kemiringan sumbu 23,44° dan revolusi 365¼ hari menghasilkan pergantian musim. Bumi punya satu satelit alami: Bulan.' },
  { id: 'Bulan', durasi: 10, narasi: 'Bulan mengelilingi Bumi setiap 27,3 hari. Rotasinya sinkron dengan revolusinya, sehingga sisi yang menghadap Bumi selalu sama. Gravitasi Bulan menyebabkan pasang surut air laut.' },
  { id: 'Mars', durasi: 11, narasi: 'Mars, Planet Merah. Di sini terdapat Olympus Mons, gunung tertinggi di Tata Surya dengan tinggi ± 22 km. Mars memiliki dua satelit kecil: Phobos dan Deimos.' },
  { id: 'Jupiter', durasi: 12, narasi: 'Jupiter, planet terbesar. Diameternya 11 kali Bumi dan rotasinya hanya 9 jam 55 menit — tercepat di Tata Surya. Perhatikan Bintik Merah Raksasa, badai yang telah berlangsung ratusan tahun.' },
  { id: 'Saturnus', durasi: 12, narasi: 'Saturnus dengan cincinnya yang menakjubkan. Cincin itu tersusun dari miliaran bongkahan es. Menariknya, kepadatan Saturnus lebih kecil daripada air.' },
  { id: 'Uranus', durasi: 11, narasi: 'Uranus, raksasa es berwarna biru-hijau karena gas metana. Sumbunya miring 98°, hampir berbaring, sehingga satu musimnya berlangsung sekitar 21 tahun.' },
  { id: 'Neptunus', durasi: 12, narasi: 'Neptunus, planet terjauh. Satu tahun di sini sama dengan 165 tahun Bumi. Anginnya tercepat di Tata Surya, mencapai 2.100 km/jam. Perjalanan kita berakhir di sini — Tata Surya sangat luas!' }
];
