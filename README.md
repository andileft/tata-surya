# Tata Surya Kita — Simulasi 3D untuk Pembelajaran IPA

Simulasi Tata Surya interaktif berbasis **three.js** yang dirancang untuk pembelajaran
siswa **Sekolah Nasional Plus kelas 9** (dapat diadaptasi untuk kelas 7–9).

Seluruh simulasi berada dalam **satu berkas** `index.html`. Cukup klik dua kali untuk
membukanya — **tidak perlu internet, tidak perlu memasang aplikasi apa pun**.

---

## 1. Cara Menjalankan

| Langkah | Keterangan |
|---|---|
| 1 | Salin berkas `index.html` ke komputer guru / laptop siswa (dapat lewat flashdisk, surel, atau Google Drive). |
| 2 | Klik dua kali `index.html`. Simulasi akan terbuka di peramban. |
| 3 | Tunggu beberapa detik saat layar pemuatan menyiapkan tekstur planet. |

**Peramban yang disarankan:** Google Chrome, Microsoft Edge, atau Firefox versi terbaru.

**Persyaratan minimum:** peramban yang mendukung WebGL. Bila WebGL tidak tersedia,
simulasi akan menampilkan pesan arahan secara otomatis (biasanya karena
*hardware acceleration* dimatikan pada pengaturan peramban).

> Simulasi juga dapat ditayangkan melalui proyektor kelas. Tekan **F** atau tombol
> layar penuh pada bilah atas untuk mode presentasi.

---

## 2. Fitur

### Tampilan 3D
- Matahari bercahaya beserta korona, 8 planet, Bulan, sabuk asteroid, dan sabuk Kuiper.
- **Tekstur planet dibuat secara prosedural** (bintik Matahari, kawah Merkurius,
  pita awan Jupiter, benua dan lapisan awan Bumi, cincin Saturnus) sehingga tetap
  tampil tanpa berkas gambar eksternal.
- Garis orbit berbentuk elips sesuai elemen orbit sebenarnya, lengkap dengan kemiringan
  terhadap bidang ekliptika.
- Cincin Saturnus dengan celah (Divisi Cassini) dan cincin tipis Uranus serta Neptunus.

### Ketepatan ilmiah
- Posisi planet dihitung memakai **elemen orbit Keplerian epoch J2000** dari JPL
  (Jet Propulsion Laboratory), sehingga posisi planet **sesuai tanggal yang dipilih**.
  Contoh: pada 3 Januari, Bumi berada di titik terdekat dengan Matahari (perihelion,
  ± 0,983 SA) — dapat dibuktikan langsung dengan mengubah tanggal simulasi.
- Sudut kemiringan sumbu, periode rotasi (termasuk rotasi retrograde Venus dan Uranus),
  serta kemiringan bidang orbit memakai nilai pengamatan yang sebenarnya.

### Dua mode skala
| Mode | Kegunaan |
|---|---|
| **Terlihat** (bawaan) | Jarak dan ukuran dimampatkan (pangkat 0,62 untuk jarak dan akar untuk ukuran) agar seluruh Tata Surya terlihat dalam satu layar. Cocok untuk pengenalan. |
| **Nyata** | Perbandingan sebenarnya. Pada mode ini Matahari hanya sebesar titik terang dan planet praktis tak terlihat — inilah pelajaran penting tentang betapa luas dan kosongnya Tata Surya. |

### Perangkat pembelajaran
| Tombol | Fungsi |
|---|---|
| **Tur terpandu** | Perjalanan otomatis dari Matahari sampai Neptunus (10 perhentian) dengan narasi. |
| **Kuis (10 soal)** | Soal pilihan ganda yang diacak dari 18 soal, lengkap dengan pembahasan dan skor. |
| **Bandingkan ukuran** | Diagram batang diameter seluruh benda langit. |
| **Tabel data lengkap** | Tabel 9 kolom: diameter, jarak, revolusi, rotasi, satelit, massa, gravitasi, suhu. |
| **Materi ringkas** | Enam ringkasan konsep: Tata Surya, rotasi–revolusi, planet dalam/luar, Hukum Kepler, skala, dan benda langit lain. |

### Kendali
| Aksi | Cara |
|---|---|
| Memutar sudut pandang | Seret dengan tombol kiri |
| Memperbesar / memperkecil | Gulir tetikus (*scroll*) atau cubit dua jari |
| Menggeser pandangan | Seret tombol kanan, atau Shift + seret |
| Melihat data planet | Klik planet pada layar atau pada daftar *Benda Langit* |
| Mengubah tanggal | Isi kolom **Tanggal simulasi** di bilah atas |

### Pintasan papan ketik
`Spasi` jalankan/jeda · `←` `→` atur kecepatan · `0` Matahari · `1`–`8` planet ·
`R` kembalikan pandangan · `L` nama benda · `O` garis orbit · `T` tur · `Q` kuis ·
`F` layar penuh · `H` bantuan · `Esc` tutup jendela

---

## 3. Rencana Pembelajaran (Usulan)

### Pertemuan 1 — Mengenal Tata Surya (2 × 40 menit)
1. **Apersepsi (10')** — Tampilkan mode *Terlihat*. Tanya: ada berapa planet? Mengapa
   semuanya bergerak mengelilingi Matahari?
2. **Tur terpandu (25')** — Jalankan **Tur terpandu**. Siswa mengisi LKPD bagian A.
3. **Diskusi (20')** — Bandingkan planet dalam dan planet luar. Gunakan **Tabel data**.
4. **Penutup (25')** — Kerjakan **Kuis** secara individu, bahas soal yang salah.

### Pertemuan 2 — Rotasi, Revolusi, dan Skala (2 × 40 menit)
1. **Percobaan waktu (20')** — Atur kecepatan 1 hari/detik, amati rotasi Bumi.
   Ubah ke 30 hari/detik, amati revolusi. Diskusikan perbedaan siang-malam dan musim.
2. **Penyelidikan Hukum Kepler (25')** — Aktifkan **Sumbu rotasi** dan **Garis orbit**.
   Ubah tanggal simulasi dan catat jarak Bumi–Matahari (Januari vs Juli).
3. **Demonstrasi skala (20')** — Bandingkan mode *Terlihat* dan *Nyata*. Minta siswa
   menjelaskan mengapa buku teks sering memakai gambar yang tidak berskala.
4. **Penutup (15')** — Presentasi hasil LKPD.

---

## 4. Lembar Kerja Peserta Didik (LKPD)

Tersedia dalam berkas **`LKPD.html`** — buka lalu cetak (Ctrl + P) atau simpan sebagai PDF.
LKPD memuat lima kegiatan:

| Bagian | Kegiatan | Tujuan pembelajaran |
|---|---|---|
| A | Mengenal anggota Tata Surya | Mengidentifikasi dan mengurutkan planet |
| B | Rotasi dan revolusi | Membedakan rotasi dan revolusi beserta akibatnya |
| C | Membandingkan planet dalam dan planet luar | Mengklasifikasikan planet berdasarkan sifat fisis |
| D | Menyelidiki jarak Bumi–Matahari | Membuktikan orbit elips dan Hukum Kepler |
| E | Uji pemahaman | Menilai pemahaman melalui kuis |

**Kunci jawaban** tersedia pada bagian akhir `LKPD.html` (dapat dipisahkan sebelum dicetak
untuk siswa).

---

## 5. Catatan Teknis

- **Sumber data:** NASA Planetary Fact Sheet (JPL) dan JPL Keplerian Elements for
  Approximate Positions of the Major Planets (epoch J2000). Tampilan tata letak
  disederhanakan untuk keperluan pembelajaran (misalnya pencahayaan Matahari tidak
  memakai peluruhan kuadrat jarak agar planet terjauh tetap terlihat).
- **Penyelesaian orbit:** anomali eksentrik dihitung dengan metode Newton–Raphson
  (toleransi 10⁻¹²), sehingga posisi planet akurat untuk rentang tahun 1800–2050.
- **Struktur berkas sumber:**

```
tata-surya/
├─ index.html            ← HASIL AKHIR (satu berkas), buka berkas ini
├─ LKPD.html             ← lembar kerja siswa, siap cetak
├─ README.md             ← berkas ini
├─ build.mjs             ← penggabung berkas sumber menjadi index.html
├─ uji.mjs               ← pengujian otomatis di peramban (opsional)
├─ hitung-jarak.mjs      ← penghitung jarak Bumi–Matahari (dipakai untuk kunci jawaban LKPD)
├─ vendor/
│   └─ three.min.js      ← pustaka three.js (r160)
└─ src/
    ├─ index.template.html   ← kerangka HTML & panel antarmuka
    ├─ styles.css            ← tampilan
    ├─ data.js               ← data astronomi, soal kuis, materi, narasi tur
    ├─ textures.js           ← pembuat tekstur prosedural (canvas → WebGL)
    ├─ solar.js              ← mesin simulasi: orbit Kepler, kamera, pencahayaan
    └─ app.js                ← logika antarmuka dan fitur pembelajaran
```

- **Mengubah isi simulasi:** sunting berkas di dalam `src/`, lalu jalankan
  `node build.mjs` untuk membentuk ulang `index.html`. (Memerlukan Node.js.)
- **Pengujian otomatis:** `node uji.mjs` membuka simulasi di Chrome tanpa antarmuka,
  memeriksa galat JavaScript, ketepatan posisi planet, tata letak label, dan
  menyimpan tangkapan layar. Berguna setelah mengubah kode.
- **Menambah soal kuis:** tambahkan objek baru pada larik `QUIZ_BANK` di `src/data.js`
  dengan bentuk `{ q: 'pertanyaan', o: ['A','B','C','D'], a: indeksJawaban, e: 'pembahasan' }`.

---

## 6. Pemecahan Masalah

| Gejala | Penyebab & solusi |
|---|---|
| Layar menampilkan pesan "WebGL tidak tersedia" | Aktifkan *Use hardware acceleration* pada pengaturan peramban (Chrome/Edge: Setelan → Sistem), lalu jalankan ulang. |
| Simulasi terasa lambat | Tutup tab lain, atau matikan **Sabuk asteroid & Kuiper** dan **Latar bintang** pada panel *Tampilan*. |
| Planet tidak terlihat pada mode **Nyata** | Hal ini memang benar secara ilmiah. Pilih planet dari daftar *Benda Langit* — kamera akan mendekat sehingga planet terlihat. |
| Tekstur planet hitam atau tidak muncul | Tunggu sampai layar pemuatan selesai. Bila tetap gagal, muat ulang halaman. |
| Tanggal tidak berubah saat diketik | Klik di luar kolom tanggal setelah memilih, atau tekan Enter. |

---

## 7. Lisensi dan Kredit

- Pustaka 3D: [three.js](https://threejs.org) (lisensi MIT), disertakan dalam berkas `vendor/`.
- Data astronomi: NASA/JPL (domain publik).
- Simulasi, teks, dan materi ajar: dibuat untuk keperluan pembelajaran di Sekolah Nasional Plus.
