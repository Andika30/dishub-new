'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app    = express();
const PORT   = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ─── Storage Backend ──────────────────────────────────────────────────────────
// Vercel Upstash integration menyediakan: KV_REST_API_URL + KV_REST_API_TOKEN
// Fallback: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (manual)
// Jika tidak ada keduanya (lokal), pakai JSON file di folder data/.

const REDIS_URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN  || process.env.UPSTASH_REDIS_REST_TOKEN;
const USE_REDIS   = !!REDIS_URL;
const DATA_DIR    = path.join(__dirname, 'data');
const KV_PFX      = 'dishub:';

let redis = null;

if (USE_REDIS) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({
    url:   REDIS_URL,
    token: REDIS_TOKEN,
  });
  console.log('📦 Storage: Upstash Redis');
} else {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log('📁 Storage: JSON file (lokal)');
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

async function rd(name, fallback) {
  if (USE_REDIS) {
    const val = await redis.get(KV_PFX + name);
    if (val !== null) return val;
    // Auto-seed Redis pada akses pertama (key belum ada)
    if (fallback !== undefined) await redis.set(KV_PFX + name, JSON.stringify(fallback));
    return fallback;
  }
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name + '.json'), 'utf-8')); }
  catch { return fallback; }
}

async function wr(name, data) {
  if (USE_REDIS) {
    await redis.set(KV_PFX + name, JSON.stringify(data));
    return;
  }
  fs.writeFileSync(path.join(DATA_DIR, name + '.json'), JSON.stringify(data, null, 2), 'utf-8');
}

function seedFile(name, data) {
  const fp = path.join(DATA_DIR, name + '.json');
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
    console.log('  ✔ data/' + name + '.json dibuat');
  }
}

// ─── Default Data ─────────────────────────────────────────────────────────────
const DEF_PENGADUAN = [
  { id:'TKT-2026-047', tanggal:'07 Mar 2026', nama:'Budi Santoso',   hp:'0812-1111-2222', email:'budi@mail.com',    kategori:'Rekayasa Lalu Lintas', lokasi:'Jl. Merdeka Barat',    uraian:'Lampu merah di simpang Jl. Merdeka Barat sudah mati sejak 3 hari lalu sehingga menyebabkan kemacetan panjang pada jam sibuk.', prioritas:'Tinggi', status:'Baru',     catatan:'' },
  { id:'TKT-2026-046', tanggal:'07 Mar 2026', nama:'Siti Rahayu',    hp:'0813-2222-3333', email:'siti@mail.com',    kategori:'Infrastruktur Jalan',  lokasi:'Jl. Gatot Subroto',    uraian:'Jalan berlubang besar di depan komplek perumahan sudah membahayakan pengendara motor.',                                         prioritas:'Tinggi', status:'Baru',     catatan:'' },
  { id:'TKT-2026-045', tanggal:'06 Mar 2026', nama:'Ahmad Fauzi',    hp:'0811-3333-4444', email:'',                kategori:'Perizinan Angkutan',   lokasi:'Kantor Dishub',        uraian:'Permohonan izin angkutan pariwisata yang diajukan sejak 2 minggu lalu belum ada pemberitahuan status.',                            prioritas:'Sedang', status:'Diproses', catatan:'' },
  { id:'TKT-2026-044', tanggal:'06 Mar 2026', nama:'Rina Lestari',   hp:'0819-4444-5555', email:'rina@mail.com',   kategori:'Pengelolaan Parkir',   lokasi:'Jl. Sudirman No. 45',  uraian:'Terdapat parkir liar yang menutup akses jalan di depan toko kami hampir setiap hari.',                                           prioritas:'Sedang', status:'Diproses', catatan:'' },
  { id:'TKT-2026-043', tanggal:'05 Mar 2026', nama:'Hendra Wijaya',  hp:'0878-5555-6666', email:'hendra@mail.com', kategori:'Keselamatan Jalan',    lokasi:'Jl. Ahmad Yani KM 12', uraian:'Tidak ada rambu peringatan di tikungan tajam yang sering terjadi kecelakaan.',                                                     prioritas:'Tinggi', status:'Diproses', catatan:'' },
  { id:'TKT-2026-042', tanggal:'04 Mar 2026', nama:'Dewi Kartini',   hp:'0857-6666-7777', email:'dewi@mail.com',   kategori:'Pelayanan Pegawai',    lokasi:'Kantor Dishub',        uraian:'Petugas loket tidak ramah dan proses antrian sangat lama tanpa penjelasan yang memadai.',                                         prioritas:'Rendah', status:'Selesai',  catatan:'Telah dilakukan pembinaan kepada petugas loket.' },
  { id:'TKT-2026-041', tanggal:'04 Mar 2026', nama:'Wahyu Pratama',  hp:'0856-7777-8888', email:'',                kategori:'Rekayasa Lalu Lintas', lokasi:'Simpang Lima',         uraian:'Pengaturan fase sinyal di simpang lima tidak efisien, antrian kendaraan bisa mencapai 500 meter.',                                 prioritas:'Sedang', status:'Selesai',  catatan:'Fase sinyal telah dioptimalkan oleh tim teknis.' },
  { id:'TKT-2026-040', tanggal:'03 Mar 2026', nama:'Nurul Hidayah',  hp:'0815-8888-9999', email:'nurul@mail.com',  kategori:'Perizinan Angkutan',   lokasi:'Kantor Dishub',        uraian:'Dokumen izin yang diterbitkan terdapat kesalahan nama perusahaan sehingga perlu diperbaiki.',                                       prioritas:'Sedang', status:'Selesai',  catatan:'Dokumen sudah diperbaiki dan diserahkan.' },
  { id:'TKT-2026-039', tanggal:'03 Mar 2026', nama:'Rizki Abdillah', hp:'0822-9999-0000', email:'rizki@mail.com',  kategori:'Infrastruktur Jalan',  lokasi:'Jl. Pahlawan',         uraian:'Marka jalan di ruas Jl. Pahlawan sudah sangat pudar dan tidak terlihat saat malam hari.',                                         prioritas:'Rendah', status:'Baru',     catatan:'' },
  { id:'TKT-2026-038', tanggal:'02 Mar 2026', nama:'Fitri Amalia',   hp:'0877-0000-1111', email:'fitri@mail.com',  kategori:'Lainnya',              lokasi:'Jl. Diponegoro',       uraian:'Truk bermuatan berat sering melewati jalan yang tidak boleh dilalui kendaraan besar.',                                             prioritas:'Sedang', status:'Ditolak',  catatan:'Bukan kewenangan bidang ini, diteruskan ke Dinas PU.' },
  { id:'TKT-2026-037', tanggal:'02 Mar 2026', nama:'Agus Salim',     hp:'0853-1111-2222', email:'agus@mail.com',   kategori:'Keselamatan Jalan',    lokasi:'SD Negeri 01',         uraian:'Tidak ada petugas penyeberangan di depan sekolah saat jam masuk dan pulang sekolah.',                                            prioritas:'Tinggi', status:'Baru',     catatan:'' },
  { id:'TKT-2026-036', tanggal:'01 Mar 2026', nama:'Maya Sari',      hp:'0812-2222-3333', email:'maya@mail.com',   kategori:'Pengelolaan Parkir',   lokasi:'Pasar Besar',          uraian:'Tarif parkir di kawasan pasar tidak sesuai dengan peraturan daerah yang berlaku.',                                                 prioritas:'Sedang', status:'Diproses', catatan:'' },
  { id:'TKT-2026-035', tanggal:'28 Feb 2026', nama:'Tono Wibowo',    hp:'0813-3333-4444', email:'',                kategori:'Rekayasa Lalu Lintas', lokasi:'Jl. Veteran',          uraian:'Kendaraan berat masih melintas di jalan yang tidak diizinkan tanpa ada penindakan.',                                               prioritas:'Sedang', status:'Selesai',  catatan:'Koordinasi dengan Polres telah dilakukan.' },
  { id:'TKT-2026-034', tanggal:'28 Feb 2026', nama:'Lina Marlina',   hp:'0819-4444-5555', email:'lina@mail.com',   kategori:'Perizinan Angkutan',   lokasi:'Terminal Tipe A',      uraian:'Angkutan umum tidak beroperasi sesuai trayek yang telah ditetapkan.',                                                             prioritas:'Rendah', status:'Selesai',  catatan:'Operator trayek sudah diberi teguran resmi.' },
];

const DEF_REKAYASA = [
  { id:'RK001', judul:'Penutupan Jl. Merdeka Barat',        tipe:'urgent', deskripsi:'Penutupan sementara untuk pekerjaan perbaikan jembatan. Kendaraan dialihkan via Jl. Diponegoro dan Jl. Imam Bonjol.', mulai:'2026-03-05', selesai:'2026-03-25', jam:'06:00–22:00 WIB' },
  { id:'RK002', judul:'Penyesuaian Sinyal Simpang Pemuda',   tipe:'info',   deskripsi:'Optimalisasi siklus lampu lalu lintas simpang Jl. Pemuda – Jl. Cokroaminoto. Diharapkan dapat mengurangi antrian hingga 40%.', mulai:'2026-03-01', selesai:'', jam:'Permanen' },
  { id:'RK003', judul:'Penambahan Zebra Cross Jl. Sudirman', tipe:'normal', deskripsi:'Pemasangan zebra cross baru di 3 titik sepanjang Jl. Sudirman dalam rangka peningkatan keselamatan pejalan kaki.', mulai:'2026-02-28', selesai:'', jam:'Berlaku permanen' },
];

const DEF_PENGUMUMAN = [
  { id:'PG001', tanggal:'2026-03-07', judul:'Pembukaan Pendaftaran Uji Kompetensi Pengemudi Angkutan Umum 2026',  isi:'Pendaftaran uji kompetensi pengemudi angkutan umum tahun 2026 telah dibuka. Silakan datang ke kantor Dishub dengan membawa persyaratan lengkap.' },
  { id:'PG002', tanggal:'2026-03-03', judul:'Sosialisasi Kebijakan Baru Angkutan Online dan Kemitraan',           isi:'Akan diadakan sosialisasi kebijakan baru terkait angkutan online dan skema kemitraan pada 15 Maret 2026 di Aula Dishub.' },
  { id:'PG003', tanggal:'2026-02-28', judul:'Razia Gabungan Kendaraan Tidak Laik Jalan — Operasi Cipkon',        isi:'Telah dilakukan razia gabungan kendaraan tidak laik jalan pada 28 Februari 2026. Total 47 kendaraan terjaring operasi.' },
  { id:'PG004', tanggal:'2026-02-20', judul:'Hasil Audit Keselamatan Jalan Nasional Triwulan I 2026',            isi:'Hasil audit keselamatan jalan nasional telah diterbitkan. Beberapa titik rawan telah diidentifikasi untuk penanganan segera.' },
  { id:'PG005', tanggal:'2026-02-10', judul:'Perubahan Jam Operasional Trayek Bus Kota Perkotaan',               isi:'Terhitung mulai 15 Februari 2026, jam operasional beberapa trayek bus kota mengalami penyesuaian untuk meningkatkan pelayanan.' },
];

const DEF_FILES = [
  { id:'FL001', nama:'Formulir Permohonan Izin Angkutan Orang', kategori:'Angkutan Orang',  tipe:'PDF',  ukuran:'245 KB', icon:'📄', url:'' },
  { id:'FL002', nama:'Surat Pernyataan Kesanggupan',            kategori:'Angkutan Orang',  tipe:'DOCX', ukuran:'78 KB',  icon:'📋', url:'' },
  { id:'FL003', nama:'Checklist Persyaratan Angkutan Orang',    kategori:'Angkutan Orang',  tipe:'PDF',  ukuran:'120 KB', icon:'✅', url:'' },
  { id:'FL004', nama:'Panduan Perizinan Lengkap',               kategori:'Angkutan Orang',  tipe:'PDF',  ukuran:'1.2 MB', icon:'📘', url:'' },
  { id:'FL005', nama:'Formulir Izin Angkutan Barang',           kategori:'Angkutan Barang', tipe:'PDF',  ukuran:'210 KB', icon:'📄', url:'' },
  { id:'FL006', nama:'Checklist Persyaratan Angkutan Barang',   kategori:'Angkutan Barang', tipe:'PDF',  ukuran:'95 KB',  icon:'✅', url:'' },
  { id:'FL007', nama:'Formulir Permohonan Izin Parkir',         kategori:'Parkir',          tipe:'PDF',  ukuran:'180 KB', icon:'📄', url:'' },
  { id:'FL008', nama:'Template Dokumen Andalalin',              kategori:'Andalalin',       tipe:'DOCX', ukuran:'450 KB', icon:'📄', url:'' },
  { id:'FL009', nama:'Formulir Izin Penggunaan Jalan',          kategori:'Izin Jalan',      tipe:'PDF',  ukuran:'165 KB', icon:'📄', url:'' },
];

const DEF_SETTINGS = {
  nama_instansi:'Dinas Perhubungan', bidang:'Bidang Lalu Lintas Jalan',
  alamat:'Jl. Raya Sudirman No. 123, Kota', telepon:'(021) 555-0100',
  email:'info@dishub.go.id', wa:'6281234567890',
  jam_senin_jumat:'08:00 – 16:00', jam_sabtu:'08:00 – 12:00',
  admin_password:'admin123',
};

const DEF_USERS = [
  { id:'USR001', nama:'Admin Dishub', email:'admin@dishub.go.id', role:'Administrator', aktif:true },
];

const DEFAULTS = {
  pengaduan: DEF_PENGADUAN, rekayasa: DEF_REKAYASA, pengumuman: DEF_PENGUMUMAN,
  files: DEF_FILES, users: DEF_USERS,
};

// ─── Seed lokal ───────────────────────────────────────────────────────────────
if (!USE_REDIS) {
  console.log('\n🚦 DISHUB Portal Server');
  console.log('─'.repeat(40));
  Object.entries({ ...DEFAULTS, settings: DEF_SETTINGS }).forEach(([name, data]) => {
    seedFile(name, data);
  });
}

// ─── API: Array Resources ─────────────────────────────────────────────────────
const ARR_RESOURCES = ['pengaduan', 'rekayasa', 'pengumuman', 'files', 'users'];

ARR_RESOURCES.forEach(res => {
  const def = DEFAULTS[res];

  // GET all
  app.get('/api/' + res, async (_req, res_) => {
    res_.json(await rd(res, def || []));
  });

  // POST — tambah satu item
  app.post('/api/' + res, async (req, res_) => {
    const data = await rd(res, []);
    const body = req.body;
    if (res === 'pengaduan' && !body.id) {
      const year   = new Date().getFullYear();
      const maxNum = data
        .map(d => parseInt((d.id || '').split('-').pop()))
        .filter(n => !isNaN(n))
        .reduce((m, n) => Math.max(m, n), 0);
      body.id = `TKT-${year}-${String(maxNum + 1).padStart(3, '0')}`;
    }
    data.unshift(body);
    await wr(res, data);
    res_.json({ ok: true, id: body.id });
  });

  // PUT — replace seluruh array (bulk)
  app.put('/api/' + res, async (req, res_) => {
    if (!Array.isArray(req.body)) return res_.status(400).json({ error: 'Expected array' });
    await wr(res, req.body);
    res_.json({ ok: true });
  });

  // PUT — update satu item by id
  app.put('/api/' + res + '/:id', async (req, res_) => {
    const data = await rd(res, []);
    const idx  = data.findIndex(d => d.id === req.params.id);
    if (idx >= 0) { data[idx] = { ...data[idx], ...req.body }; await wr(res, data); }
    res_.json({ ok: true });
  });

  // DELETE — hapus satu item by id
  app.delete('/api/' + res + '/:id', async (req, res_) => {
    await wr(res, (await rd(res, [])).filter(d => d.id !== req.params.id));
    res_.json({ ok: true });
  });

  // POST /reset — reset ke data default
  app.post('/api/' + res + '/reset', async (_req, res_) => {
    if (def) { await wr(res, def); res_.json({ ok: true }); }
    else res_.status(404).json({ error: 'No default for: ' + res });
  });

  // POST /clear — hapus semua
  app.post('/api/' + res + '/clear', async (_req, res_) => {
    await wr(res, []);
    res_.json({ ok: true });
  });
});

// ─── API: Login ───────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  const settings = await rd('settings', DEF_SETTINGS);
  if (password && password === settings.admin_password) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, error: 'Password salah' });
  }
});

// ─── API: Settings (object, bukan array) ─────────────────────────────────────
app.get('/api/settings', async (_req, res) => {
  res.json(await rd('settings', DEF_SETTINGS));
});

app.put('/api/settings', async (req, res) => {
  const current = await rd('settings', DEF_SETTINGS);
  await wr('settings', { ...current, ...req.body });
  res.json({ ok: true });
});

app.post('/api/settings/reset', async (_req, res) => {
  await wr('settings', DEF_SETTINGS);
  res.json({ ok: true });
});

// ─── Jalankan Server (lokal) / Export (Vercel) ───────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n✅ Server berjalan → http://localhost:${PORT}`);
    console.log(`   Admin dashboard → http://localhost:${PORT}/dishub-admin.html`);
    console.log(`   Portal publik   → http://localhost:${PORT}/index.html`);
    console.log('\n   Tekan Ctrl+C untuk menghentikan server.\n');
  });
}

module.exports = app;
