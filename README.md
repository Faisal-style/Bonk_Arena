# BONK Arena — Multiplayer

Game arena web dengan pertarungan senjata, kristal XP, dan 12 evolusi. Versi ini mendukung **multiplayer sungguhan melalui satu server Node.js**. Damage, gerakan, XP, evolusi, dan leaderboard dihitung oleh server.

## Mulai bermain bersama

Butuh **Node.js 24+**. Tidak ada dependency yang perlu diinstal.

```sh
cd /home/odoo/new_game/bonk-arena
npm start
```

1. Buka **http://localhost:3000** di komputer server.
2. Pilih **Multiplayer**, isi nama, lalu gunakan kode room seperti `RIMBA`.
3. Buka tab/browser kedua dengan alamat dan kode room yang sama untuk mencoba dua pemain.
4. Teman di Wi-Fi/LAN yang sama membuka **http://IP-KOMPUTER-SERVER:3000**, lalu masuk ke kode room yang sama. Server mendengarkan pada `0.0.0.0`; jaringan dan firewall harus mengizinkan koneksi ke port tersebut.
5. Gunakan **Buat kode baru** untuk arena terpisah. Tombol **Undang teman** menyediakan tautan dengan kode room. Pada HTTP LAN yang tidak menyediakan clipboard API, tautan dapat disalin manual.

`localhost` hanya menunjuk perangkat sendiri. Tautan yang berisi `localhost` perlu diganti dengan IP komputer server saat dibagikan ke teman. Semua pemain harus terhubung ke **server yang sama**, bukan menjalankan server masing-masing.

Room dibuat saat pemain pertama masuk dan dihapus ketika semua sesi keluar. Maksimal **16 pemain manusia + 6 bot per room**, serta 24 room per proses. Siapa pun yang mengetahui kode dapat masuk; kode room bukan kata sandi. Mode **Latihan Bot** tetap tersedia dengan 22 bot lokal.

Port dapat diubah:

```sh
PORT=8080 npm start
```

## Fitur

- Pertarungan melee berarah, cooldown, knockback, health, regenerasi, dan dash dengan kekebalan singkat.
- 12 evolusi dengan siluet, kostum, warna aksen, dan senjata bawaan berbeda; pratinjau tersedia di menu bantuan.
- Arena, kristal, damage, XP, kill, dan leaderboard yang sama bagi seluruh pemain satu room.
- Interpolasi gerakan untuk tampilan lebih halus, indikator koneksi dan waktu respons input.
- Pemulihan koneksi otomatis; input berhenti setelah 350 ms tanpa paket baru. Sesi yang terputus disimpan maksimal 15 detik untuk penyambungan ulang.
- Respawn melalui **Coba lagi** setelah tumbang, tetap di room yang sama dengan XP direset.
- Joystick sentuh, efek partikel, suara sintetis, minimap, nama dan warna karakter.
- Sembilan jenis obstacle, hamparan bunga, dan empat altar batu yang tetap menyediakan ruang bertarung.
- Boss berkala dengan serangan area berperingatan, bar HP bersama, serta tiga drop equipment Rare–Legendary.
- Rekor pribadi lokal disimpan di browser, bukan leaderboard global permanen.
- Avatar custom dari gambar PNG/JPG/WebP atau preset Kucing, Robot, dan Ninja; crop, zoom, putar, cermin, serta penyimpanan lokal.

**Mode online tidak bisa dijeda.** Membuka menu, bantuan, atau undangan menghentikan kontrol, tetapi karakter tetap ada dan dapat diserang. Di mode latihan, menu benar-benar menjeda simulasi. Sesi tanpa input/heartbeat selama 60 detik dibersihkan, termasuk tab yang dibekukan browser.

## Custom avatar

Klik **Custom Avatar** di lobi, lalu pilih gambar **PNG, JPG, atau WebP maksimal 5 MB** atau salah satu preset **Kucing, Robot, Ninja**. Geser gambar di pratinjau bulat atau gunakan slider posisi horizontal/vertikal. Zoom tersedia 1–3×, dengan tombol putar 90° dan cermin. Klik **Pakai Avatar** untuk menerapkan; **Batal** mempertahankan pilihan sebelumnya. Untuk menghapus gambar, pilih **Bawaan → Pakai Avatar**.

Gambar menjadi wajah karakter dan tetap tegak saat karakter membidik. Warna badan, ornamen evolusi, armor pada badan/bahu, senjata, sepatu, serta aura tetap dirender. Avatar custom tidak mengubah stats atau hitbox. Pilihan yang sama digunakan di latihan bot dan multiplayer, bertahan setelah respawn, serta dimuat lagi saat browser dibuka. Ganti avatar melalui lobi sebelum memasuki pertandingan berikutnya.

Editor menolak gambar di atas 24 megapiksel atau sisi 8192 piksel, lalu mengecilkan sumber menjadi maksimal 1024 piksel untuk proses crop. Hasil akhir adalah **128×128 piksel RGBA**. Hanya hasil crop yang disimpan dalam localStorage browser ini; file asli dan metadata foto tidak dikirim ke server. Jika localStorage tidak tersedia/penuh, avatar tetap aktif untuk sesi halaman ini dan UI memberi informasi bahwa penyimpanan tidak berhasil. Penyimpanan ini bukan akun atau sinkronisasi antarperangkat.

Pada multiplayer, hasil crop dikirim sekali bersama permintaan join sebagai buffer piksel base64 berukuran tetap. Server memvalidasi ukuran/encoding dan membuat PNG sendiri memakai pustaka bawaan Node, tanpa menerima SVG, URL gambar, atau file gambar arbitrer. PNG disimpan di memori room dan diidentifikasi dengan hash konten. Snapshot membawa `avatarId`, bukan data gambar; klien mengambil PNG sekali dan menyimpan teksturnya selama digunakan. Endpoint gambar memerlukan token sesi anggota room tersebut. Gambar dihapus dari memori ketika tidak ada lagi karakter dalam room yang memakai ID itu, atau room dihapus. Respawn dan reconnect mempertahankan ID. Ketika gambar pemain lain belum tersedia, karakter memakai tampilan bawaan sementara.

## Map dan boss arena

Map memiliki pohon rindang, batu, pinus, tunggul, batang tumbang, reruntuhan, gugusan kristal, jamur raksasa, dan semak duri. Semua obstacle tersebut menghalangi gerakan dengan collision lingkaran pada pangkalnya. Bunga kecil dan rumput adalah dekorasi tanpa collision. Layout obstacle dibuat dari seed yang sama dan dikirim server saat bergabung. Area tengah dan empat altar di kuadran arena dikosongkan dari obstacle; boss memilih koordinat spawn acak di seluruh map dan bergerak dalam radius 160 unit dari titik kemunculannya. Altar tetap menjadi dekorasi, bukan daftar titik spawn boss.

Ada **empat variasi boss**, masing-masing dengan siluet dan pola serangan berbeda. Pratinjau tersedia di menu bantuan. Satu boss aktif per arena, baik multiplayer maupun latihan.

| Boss | HP dasar | Damage dasar | Pola serangan | Peringatan / cooldown |
| --- | ---: | ---: | --- | --- |
| Penjaga Rimba Purba | 1.200 | 40 | Hentakan lingkaran radius 145 | 1,2 / 3,4 detik |
| Ratu Embun Beku | 1.050 | 28 | Nova radius 170; gerak korban melambat 38% selama 2 detik | 1,5 / 3,2 detik |
| Naga Bara | 1.400 | 52 | Kerucut api radius 235, sudut total sekitar 75°; arah terkunci sejak windup | 1,4 / 3,8 detik |
| Mata Kehampaan | 1.100 | 44 | Cincin radius 165–245; tengah dan luar aman jika seluruh tubuh berada di luar zona damage | 1,6 / 3,5 detik |

Golem memiliki kepalan batu dan tanduk; ratu es memiliki sayap kristal dan mahkota; naga memiliki sayap merah, moncong, tanduk, serta ekor; mata void melayang dengan enam tentakel. Warna area peringatan mengikuti jenis boss. Damage menggunakan lingkar tubuh korban, dan bentuk area peringatan mengikuti definisi serangan yang sama di server.

Serangan memiliki efek persiapan, benturan, dan sisa visual yang memudar:

- **Naga Bara:** energi panas berkumpul di mulut, lalu semburan dengan inti putih-kuning, lapisan api oranye-merah, lidah api bergelombang, bara, asap, dan tanah hangus.
- **Ratu Embun Beku:** kristal mengorbit saat menyiapkan serangan; nova melepaskan gelombang es, pecahan kristal, pola beku di tanah, dan serpihan salju.
- **Penjaga Rimba Purba:** kerikil terangkat sebelum hentakan; saat benturan muncul retakan bercabang, gelombang kejut, batu terpental, debu, serta guncangan kamera singkat bagi pemain terdekat.
- **Mata Kehampaan:** energi berputar di sekitar mata, kemudian membentuk cincin gelap dengan pusaran ungu, garis energi, dan kilatan bintang. Efek cincin dibatasi ke area serangan agar zona aman tengah tetap terlihat.

Efek digambar dalam dua lapisan Canvas: bekas benturan di tanah dan efek api/kristal/batu/energi di atas karakter. Server menyimpan waktu, posisi, dan arah benturan (`castTime`, `castX`, `castY`, `castAngle`); klien membangun visual dari snapshot agar efek tetap berada di lokasi serangan, juga saat reconnect atau boss tumbang. Efek visual memudar dalam 1,35 detik; sisa asap, retakan, dan serpihan tidak memberi damage tambahan. Damage, cooldown, dan waktu persiapan tetap mengikuti aturan serangan sebelumnya. Suara benturan berbeda untuk setiap jenis dan hanya diputar bagi pemain terdekat jika suara diaktifkan.

Efek di luar layar dilewati, jumlah ornamen dibatasi, dan tidak ada penambahan partikel permanen setiap frame. Pengaturan reduced motion mengurangi gerakan, jumlah serpihan, serta menonaktifkan guncangan kamera. Menu bantuan menampilkan pratinjau statis boss beserta efek serangannya.

Lokasi diundi dari koordinat map dengan margin 280 unit dari tepi, jarak minimal 320 unit dari pusat arena, ruang 125 unit dari pinggir obstacle, serta jarak 180 unit dari petarung saat lokasi dipilih. Spawn berikutnya berjarak minimal 450 unit dari **titik spawn** sebelumnya. Pencarian acak memiliki batas percobaan dengan fallback pemindaian grid berawal acak yang memakai batas keamanan sama; jika tidak ada lokasi aman, spawn ditunda dan pencarian diulang. Titik yang sudah diumumkan tidak berpindah selama peringatan. Pemain dapat mendekat setelah titik dipilih; boss tetap memiliki cooldown awal 2 detik sebelum menyiapkan serangan pertama.


- Boss pertama muncul **75 detik** setelah arena dimulai. Peringatan muncul 10 detik sebelumnya; panel boss dan simbol ♛ di minimap menunjukkan lokasi serta hitung mundur. Waktu dihitung per room, bukan sejak tiap pemain bergabung.
- Setelah dikalahkan, boss berikutnya muncul **150 detik** kemudian dengan jenis yang diacak dari tiga jenis selain boss terakhir, di koordinat acak baru. Tidak ada respawn bot biasa untuk boss. Jika dibiarkan hidup, boss tetap tersedia sampai dikalahkan.
- HP awal adalah **HP dasar jenis boss + 300 per pemain manusia tambahan** saat boss muncul. Jumlah ini tetap selama pertarungan; boss tidak regen, mengumpulkan XP, mengambil loot, atau masuk leaderboard.
- Boss mengejar target di sekitar lokasi spawn dan mencoba menghindari obstacle. Boss berhenti bergerak saat menyiapkan serangan; jenis, arah serangan, serta sisa windup dikirim ke semua pemain. Dash kebal, armor, aura, dan perisai tetap berlaku. Boss dapat diperlambat Pedang Es, tetapi tidak terdorong knockback.
- Pemain dan bot bisa menyerang boss. Penyerang terakhir memperoleh **300 XP**; boss tidak dihitung sebagai KO rival. Pemain yang terbunuh boss mengikuti alur kematian/respawn biasa.

Boss menjatuhkan **tiga jenis equipment berbeda** dekat lokasi tumbangnya. Satu drop dijamin **Epic (80%) atau Legendary (20%)**. Masing-masing dari dua drop lain memakai peluang **Rare 55%, Epic 35%, Legendary 10%**. Item dipilih acak dari tier yang terpilih, termasuk senjata, armor, sepatu, dan aura; tidak ada Common/Uncommon. Random dan kepemilikan loot diputuskan server.

Peti hadiah memiliki lingkar tier dan tanda mahkota, bertahan **90 detik**, dan bisa diambil siapa pun termasuk bot. Batas tas serta larangan mengambil item duplikat tetap berlaku; kosongkan tas jika perlu. Ketika loot arena penuh, hadiah menggantikan loot tertua agar ketiga hadiah tetap muncul. Jadwal, HP, posisi, windup, dan loot ikut snapshot, termasuk bagi pemain yang baru bergabung atau menyambung ulang. Menu online tidak menghentikan boss; menu latihan menjedanya bersama simulasi.

Konfigurasi waktu tersedia melalui konstanta `BOSS_FIRST_SPAWN`, `BOSS_RESPAWN`, `BOSS_WARNING`, serta katalog stats, visual, dan serangan `BOSS_TYPES` di `dist/engine.js`. Pemilihan koordinat ada di `chooseBossSite`; peluang hadiah juga didefinisikan di engine yang sama. `RUIN_SITES` hanya mengatur landmark map.

## Evolusi dan tingkat kesulitan

Ada 12 tahap. Ambang berikut adalah **total XP saat ini**, bukan biaya yang dihabiskan. Pengurangan XP 5% setiap 30 detik tetap berlaku, sehingga level tinggi membutuhkan pemasukan XP lebih besar untuk dipertahankan.

| Level | Bentuk | Total XP | Ciri visual | Senjata bawaan |
| --- | --- | ---: | --- | --- |
| 1 | Perintis | 0 | Rambut liar, tunik sederhana | Tongkat kayu |
| 2 | Petarung | 180 | Ikat kepala, balutan tinju | Gada batu |
| 3 | Viking | 450 | Helm tanduk, mantel bulu | Kapak perang |
| 4 | Ksatria | 900 | Helm baja, jambul, jubah biru | Pedang baja |
| 5 | Samurai | 1.550 | Kabuto sabit, bahu merah | Katana |
| 6 | Titan | 2.400 | Bahu batu, retakan kristal | Palu legenda |
| 7 | Penjaga Rimba | 3.500 | Tanduk bercabang, mantel daun | Tombak akar |
| 8 | Assassin Senja | 4.900 | Tudung, syal bercabang | Sabit bayangan |
| 9 | Penyihir Rune | 6.500 | Topi runcing, lingkar rune | Tongkat kristal |
| 10 | Ksatria Naga | 8.400 | Sayap bersisik, tanduk, ekor | Tombak naga |
| 11 | Phoenix | 10.600 | Sayap bulu api, ekor bercabang | Bilah surya |
| 12 | Penguasa Astral | 13.200 | Mahkota melayang, satelit kristal | Tombak bintang |

Stats dasar bertambah dengan level, dengan ukuran/jangkauan yang dibatasi: radius 20–44,2, kecepatan 205–144,5, HP 100–342, jangkauan 63–151, damage 29–95, dan cooldown 0,56–0,857 detik. Level tinggi lebih kuat tetapi lebih lambat. Angka ini adalah konfigurasi awal, belum divalidasi melalui playtest.

Kostum dan ornamen digambar terpisah dari equipment: memakai armor atau senjata tidak menghilangkan identitas evolusi. Senjata equipment/power-up mengganti senjata bawaan selama dipakai. Sayap, tanduk, dan jubah bersifat visual; collision tetap menggunakan radius tubuh. Pemain lain melihat bentuk yang sama dari level yang dikirim server. Menu bantuan menampilkan thumbnail semua tahap, kebutuhan XP, dan cirinya.

## Pickup skill dan senjata sementara

Rune bercahaya muncul di arena dan ditandai belah ketupat berwarna pada minimap. **Berjalan melewatinya** untuk mengambil dan langsung mengaktifkan efek, tanpa tombol tambahan. Berlaku di multiplayer dan latihan; bot juga bisa merebut pickup.

| Pickup | Slot | Durasi | Efek |
| --- | --- | --- | --- |
| Palu Petir | Senjata | 14 detik | Damage +65%, jangkauan +25%, knockback lebih kuat; cooldown ayunan +15% |
| Pedang Es | Senjata | 14 detik | Damage +15%, jangkauan +18 unit; pukulan memperlambat gerakan lawan 38% selama 1,5 detik |
| Langkah Angin | Skill | 10 detik | Kecepatan gerak +40%, cooldown dash menjadi 1,6 detik |
| Perisai Rimba | Skill | 12 detik | Mengurangi damage pukulan 50% |

- Bisa membawa **1 senjata dan 1 skill sekaligus**. Pickup berbeda pada slot yang sama mengganti efek sebelumnya. Pickup sejenis memperbarui timer ke durasi penuh, bukan menumpuk bonus/durasi.
- Senjata kembali mengikuti evolusi karakter setelah efek berakhir. Semua power-up hilang saat mati atau respawn. Evolusi tidak menghapus power-up yang masih aktif.
- Awal arena menempatkan hingga 6 pickup, dengan beberapa lokasi awal dekat bagian tengah. Server mencoba spawn satu pickup setiap 8 detik, maksimal 6 di tanah. Pickup yang tidak diambil menghilang setelah 35 detik. Lokasi menghindari penghalang dan karakter.
- Timer senjata/skill ada di panel pemain. Warna ayunan, bentuk senjata, dan aura karakter menunjukkan efek aktif; lingkaran biru menunjukkan efek lambat.
- Posisi pickup, perebutan, timer, dan efek damage/kecepatan diputuskan server. Klien tidak dapat mengirim klaim mengambil item. Item hanya bisa dimiliki satu petarung.
- Menu tidak menghentikan timer di multiplayer. Di latihan, timer ikut berhenti saat dijeda.

## Equipment dan pengurangan XP

Inventory memakai grid gelap 4×4 sesuai gambar referensi, ikon SVG lokal berwarna, indikator item terpakai, dan panel detail. Klik ikon di tas atau slot terpakai, lalu gunakan tombol Pakai/Simpan/Buang. Panel detail membandingkan stats sebelum dan sesudah tindakan. Tas berkapasitas 16 item unik dari 24 variasi equipment. Layout menyesuaikan layar HP dan dapat dioperasikan dengan Tab/Enter.

Tekan **I** atau tombol **I** di pojok layar untuk membuka inventory. Lewati **peti equipment berwarna tier** di arena untuk memasukkan equipment ke tas; lokasinya ditandai kotak berwarna tier pada minimap. Klik **Pakai**, **Simpan ke Tas**, atau **Buang ke Arena** untuk mengatur empat slot: senjata, armor, sepatu, dan aura. Setiap slot hanya memakai satu item, dan tas menampung 16 jenis item unik; loot duplikat tetap di tanah. Bot juga bisa mengambil dan memakai equipment.

| Tier / warna | Peluang spawn | Equipment |
| --- | --- | --- |
| Common / abu-abu | 45% | Pedang Besi, Armor Besi, Armor Ringan, Sepatu Pelari |
| Uncommon / hijau | 28% | Tombak Pemburu, Sepatu Tempur, Jubah Penjaga Rimba, Jejak Senyap, Nature Aura |
| Rare / biru | 17% | Kapak Bara, Bastion, Langkah Badai, Wisdom Aura, Frost Aura |
| Epic / ungu | 8% | Durendal, Runekeeper, Penjelajah Senja, Saiyan Aura, Void Aura |
| Legendary / emas | 2% | Excalibur, Gungnir, Mahkota Fajar, Jejak Sang Fajar, Celestial Aura |

Peluang berlaku per tier saat spawn acak, lalu item dipilih merata dalam tier tersebut. Drop pemain mempertahankan jenis, nama, dan tier. Nilai bonus lengkap ditampilkan pada detail inventory; definisi ada di `EQUIPMENT` pada `dist/engine.js`.

- **Pakai:** item memberi bonus, langsung tampil pada avatar, dan terlihat oleh semua pemain dalam room. Armor memiliki pelat dada/bahu; pedang, tombak, dan kapak memiliki bentuk berbeda; sepatu memiliki aksen warna tier; aura membentuk efek animasi di sekeliling tubuh.
- **Simpan ke Tas:** lepas dari slot, hilangkan bonus dan tampilannya, tetapi pertahankan item di tas. Item yang sudah tidak dipakai tetap tersimpan otomatis. Ini penyimpanan selama hidup karakter, bukan bank atau penyimpanan lintas pertandingan.
- **Buang ke Arena:** keluarkan item dari tas, lepaskan jika sedang dipakai, dan letakkan sebagai loot di dekat karakter. Pemilik tidak bisa mengambil ulang selama 3 detik; petarung lain bisa langsung mengambilnya. Bila tidak ada lokasi aman, aksi ditolak dan item tetap di tas. Drop menggantikan loot tanah tertua jika batas 10 loot tercapai.

Senjata power-up sementara mengambil alih bentuk senjata selama efeknya aktif; equipment tetap memberi stats dan tampil kembali setelah efek berakhir. Menyimpan, mengganti, atau membuang armor tidak memberikan heal.

Nama **Excalibur**, **Durendal**, dan **Gungnir** diambil sebagai inspirasi legenda: [University of British Columbia — Arthurian Swords](https://faculty.arts.ubc.ca/sechard/344swrd.htm), [National Museum of Denmark — Legendary swords](https://en.natmus.dk/historical-knowledge/denmark/middle-ages-1000-1536/j-r-r-tolkien/legendary-swords/), dan [Historical Museum Oslo — Vikingr](https://www.historiskmuseum.no/english/exhibitions/undermappe-utstillinger/handout-vikingr-web-engelsk.pdf). Tier, stats, bentuk, dan nama lain adalah desain game ini, bukan klaim sejarah.

Equipment tidak memiliki timer dan bertahan sepanjang hidup karakter. Saat mati, equipment yang dipakai jatuh sebagai loot; item lain di tas hilang. Respawn dimulai dengan tas kosong. Arena menyediakan hingga 10 loot, mencoba menambah satu setiap 10 detik; loot tanah kedaluwarsa setelah 60 detik. Drop kematian dapat menggantikan loot tanah tertua ketika kapasitas penuh.

Bonus equipment diterapkan sebelum pengali power-up sementara. Armor dan Perisai Rimba mengalikan pengurangan damage (10% dan 50% menjadi total 55%). Mengganti armor tidak memberi heal; HP dibatasi maksimum baru saat armor dilepas. Nilai aktual termasuk equipment, power-up, dan efek lambat ditampilkan di inventory. Server memverifikasi bahwa item yang dipakai benar-benar ada di tas pemilik sesi melalui `POST /api/equipment`.

### Aura

Aura adalah equipment pada slot keempat, terpisah dari skill/power-up sementara. Loot aura ditandai ikon SVG melayang di atas peti. Ambil lalu tekan **I → pilih aura → Pakai Equipment**. Mengganti aura menyimpan aura sebelumnya di tas; hanya satu aura memberi bonus pada satu waktu. Tombol Simpan/Buang, batas tas, drop kematian, serta validasi kepemilikan server juga berlaku untuk aura.

| Item | Tier | Efek visual | Bonus |
| --- | --- | --- | --- |
| Nature Aura | Uncommon | Daun hijau mengorbit | HP +25, damage masuk −5% |
| Wisdom Aura | Rare | Dua lingkar rune biru dan kristal orbit | Jangkauan +12, HP +20 |
| Frost Aura | Rare | Enam kristal es melayang | HP +20, damage masuk −8% |
| Saiyan Aura | Epic | Energi emas menjulang dan petir putih | Damage +12, gerak +12 |
| Void Aura | Epic | Tiga sabit pusaran ungu dengan satelit | Damage +8, gerak +18 |
| Celestial Aura | Legendary | Halo emas dan empat bintang putih | HP +40, damage +12, damage masuk −8% |

Warna efek berbeda dari warna tier: misalnya Saiyan Aura berefek emas tetapi bingkai item Epic tetap ungu. Galeri di menu **?** menampilkan pratinjau karakter, tier, bentuk, dan bonus keenam aura. Ikon lokal tersedia di `dist/assets/equipment/*_aura.svg`; efek arena digambar dengan Canvas di belakang kostum agar senjata dan armor tetap terbaca. Efek tidak menambah hitbox; hanya bonus jangkauan Wisdom yang menambah jangkauan serang. Animasi aura mengikuti pengaturan reduced motion perangkat. ID aura ikut snapshot equipment sehingga efek tampil pada karakter sendiri, bot, dan pemain lain. Bonus HP tidak menyembuhkan saat dipakai; melepas aura membatasi HP ke maksimum baru. Reduksi damage aura dikalikan dengan reduksi armor dan skill.

**XP berkurang 5% setiap 30 detik**, dihitung per karakter sejak spawn. Nilai pengurangan dibulatkan ke atas, minimal 1 jika masih memiliki XP, dan XP tidak bisa negatif. Evolusi ikut turun jika melewati ambang level; HP maksimum serta stats menyesuaikan. Heal evolusi hanya diberikan saat mencapai level tertinggi baru dalam hidup tersebut agar turun-naik level tidak menghasilkan heal berulang. Rekor pribadi menyimpan XP tertinggi yang sempat dicapai, bukan hanya XP akhir.

Hitung mundur pengurangan XP tampil di HUD. Inventory menjeda latihan, tetapi di multiplayer arena, efek sementara, serta pengurangan XP tetap berjalan dan karakter masih bisa diserang. Equipment dan XP disimpan dalam pertandingan, bukan akun permanen.

## Kontrol

| Aksi | Desktop | Ponsel |
| --- | --- | --- |
| Gerak | Mengikuti kursor mouse | Joystick |
| Bidik | Ke arah kursor mouse | Arah joystick |
| Pukul | Klik kiri / J, tahan untuk berulang | Tombol pedang |
| Dash | Space | Tombol petir |
| Inventory | I | Tombol I |
| Menu / jeda latihan | Esc / P | Tombol jeda |

Di desktop, arahkan kursor untuk bergerak sekaligus membidik. Karakter berhenti saat kursor berada di dekat tubuhnya dan berakselerasi sesuai jarak kursor sampai batas kecepatan stats. Klik/J tetap untuk menyerang; Space melakukan dash menuju arah kursor. WASD dan tombol panah tidak lagi menggerakkan karakter. Input kursor direset saat membuka menu, kehilangan fokus, atau keluar dari arena; gerakkan mouse lagi setelah melanjutkan. Mode sentuh tetap memakai joystick. Kontrol ini berlaku di latihan dan multiplayer; server tetap membatasi kecepatan dan menentukan posisi sebenarnya.

## Arsitektur

Server memakai `node:http`, tanpa dependency eksternal. Server menjalankan simulasi **30 tick/detik**, mengirim snapshot **15 kali/detik** melalui HTTP streaming/SSE, dan menerima kontrol melalui POST hingga **20 kali/detik** dari setiap klien. Browser memakai Fetch Streams, tanpa WebSocket. Interpolasi hanya menghaluskan tampilan; browser tidak menentukan hasil pertarungan.

Setiap sesi mendapat token acak yang dikirim pada header `Authorization: Bearer …`. Token hanya disimpan di memori tab, tidak di URL, localStorage, atau snapshot. Server memvalidasi dan membatasi input; nilai posisi, damage, health, XP, dan ID kiriman klien tidak dipercaya. Nomor urut mencegah paket lama mengulang kontrol atau dash. Origin berbeda ditolak. Request JSON dibatasi 2 KiB, koneksi lambat diputus, dan room/sesi kosong dibersihkan.

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/health` | Status server, jumlah room dan pemain |
| `POST /api/join` | Membuat sesi dan masuk room; opsional `avatarPixels` base64 RGBA 128×128, batas body 128 KiB |
| `GET /api/avatar/:id` | PNG avatar milik room sesi pemanggil; memerlukan bearer token, tanpa cache HTTP publik |
| `GET /api/stream` | Snapshot arena melalui streaming |
| `POST /api/input` | Kontrol pemain pemilik sesi |
| `POST /api/respawn` | Memulai hidup baru setelah mati |
| `POST /api/leave` | Keluar dan menghapus karakter |

## Hosting internet

Jalankan **seluruh aplikasi Node.js** pada satu VPS/container/hosting yang mendukung proses Node yang terus aktif dan HTTP streaming. Arahkan domain HTTPS ke port aplikasi dengan reverse proxy. Set `PUBLIC_ORIGIN` ke origin publik persis, tanpa slash akhir:

```sh
PUBLIC_ORIGIN=https://game.example.com PORT=3000 npm start
```

Aplikasi mengirim `X-Accel-Buffering: no` dan `Cache-Control: no-cache, no-transform` untuk stream. Proxy harus meneruskan header `Host` dan `Authorization`, menonaktifkan buffering/cache/compression pada `/api/stream`, serta mengizinkan koneksi streaming berumur panjang. Seluruh halaman dan `/api/*` harus berada pada origin yang sama.

**Hosting folder `dist/` saja tidak menjalankan multiplayer.** Manifest `.openai/hosting.json` masih menyimpan identitas Sites dari versi statis sebelumnya, bukan konfigurasi backend multiplayer. Versi ini belum dipublikasikan. Jangan gunakan publikasi statis Sites sebagai deployment multiplayer.

Room disimpan dalam memori satu proses: restart server mengakhiri pertandingan. Belum ada akun, penyimpanan pertandingan, matchmaking global, atau sinkronisasi antarmesin. Kapasitas 16 pemain adalah batas aplikasi, belum hasil load test internet; ukur bandwidth dan latensi sebelum memperbesar kapasitas.

## Struktur

- `server.mjs`: server HTTP, API, streaming, dan loop simulasi.
- `server/rooms.mjs`: room, sesi, validasi kontrol, respawn, dan snapshot.
- `dist/engine.js`: aturan permainan bersama server dan latihan lokal.
- `dist/network.js`: koneksi browser, pengiriman input, retry, dan stream parser.
- `dist/game.js`: Canvas renderer, input, UI, suara, dan integrasi snapshot.
- `dist/boss-effects.js`: efek persiapan dan serangan boss yang digambar dari waktu/posisi benturan server.
- `dist/avatar.js`: editor crop/preset, penyimpanan lokal, dan cache tekstur avatar multiplayer.
- `server/avatars.mjs`: validasi buffer piksel dan pembuatan PNG kanonis tanpa dependency tambahan.
- `dist/index.html`, `dist/style.css`: lobi, pemilihan mode, room, HUD, dan dialog.
- `tests/engine.test.mjs`: aturan pertarungan dan simulasi dua menit.
- `tests/multiplayer.test.mjs`: isolasi room, kepemilikan kontrol, PvP, respawn, lifecycle, dan validasi.
- `tests/http.test.mjs`: API dan dua klien multiplayer melalui handler HTTP yang sama, reconnect, serta smoke test TCP jika diizinkan.

```sh
npm run check
npm test
```

## Verifikasi

Pada versi multiplayer sebelum penambahan pickup, 24 tes lolos dan 1 smoke test TCP dilewati karena sandbox menolak `listen` dengan `EPERM`. Pengujian dua klien menggunakan HTTP handler dan kode network client yang sebenarnya melalui stream dalam memori; hasil ini belum memverifikasi jaringan TCP nyata, reverse proxy, atau browser visual. Pengujian visual desktop/ponsel belum tersedia di lingkungan pengerjaan ini. Deployment internet belum dilakukan.

Perubahan pickup, equipment (termasuk aura), pengurangan XP, variasi obstacle, variasi boss, spawn acak, efek serangan, dan custom avatar hanya diperiksa lewat pembacaan kode dan `npm run check` (pemeriksaan sintaks), sesuai permintaan. Referensi elemen HTML dan import lokal juga diperiksa secara statis. Tes otomatis, simulasi gameplay, dan tes browser tidak dijalankan ulang untuk fitur ini. Balance boss, performa efek, upload/crop gambar di browser, serta tampilan desktop/ponsel belum diverifikasi melalui permainan langsung.

## Aset

Karakter, senjata, pohon, batu, kristal, dan partikel dibuat secara prosedural di Canvas. Favicon adalah SVG proyek. Tidak ada aset yang disalin dari EvoWars atau Gamelabs. Google Fonts menyediakan DM Sans dan Barlow Condensed, dengan font sistem sebagai cadangan.

Ikon inventory menggunakan tujuh bentuk SVG equipment dasar (termasuk kapak), dipakai ulang untuk variasi bernama dengan penanda tier, serta enam ikon aura khusus. Ikon inventory tersedia di `dist/assets/equipment/`. SVG dibuat khusus untuk proyek berdasarkan arah visual referensi pengguna. Koleksi [Game Assets di SVG Repo](https://www.svgrepo.com/collection/game-assets/) ditinjau sebagai referensi; asetnya tidak disalin karena unduhan langsung terhalang DNS. Pemeriksaan perubahan UI ini terbatas pada sintaks dan struktur sumber, tanpa tes gameplay atau browser.

Update variasi/tier, visual avatar, simpan, dan buang diperiksa melalui pembacaan sumber serta `npm run check`. Tes gameplay dan browser tidak dijalankan sesuai preferensi pengguna.

Perubahan gerak mengikuti kursor diperiksa melalui `npm run check` saja; tes gameplay/browser tidak dijalankan.

Update 12 evolusi diperiksa melalui `npm run check`; tes gameplay, simulasi, dan browser tidak dijalankan. Hasil tes versi terdahulu tidak memverifikasi kurva XP dan balance baru.
