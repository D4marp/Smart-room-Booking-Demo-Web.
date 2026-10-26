// Excel template for "Import Jadwal Kuliah". The xlsx library is passed in so the
// module can be used from the browser and from tests.

export const TEMPLATE_HEADERS = ['Hari', 'Jam', 'Matakuliah', 'SKS', 'Program Studi', 'Kelas', 'Peserta', 'Dosen'];

const BRAND = '693365';
const thin = { style: 'thin', color: { rgb: 'D9D9D9' } };
const border = { top: thin, bottom: thin, left: thin, right: thin };

const EXAMPLES = [
  ['Senin', '07.00 - 10.20', 'Perilaku Organisasi', 4, 'S1 Psikologi', '2023B', 38, 'Lely Nur Azizah, S.Psi., M.Si.; Dr. Olievia Prabandini Mulyana, S.Psi., MPsi Psikolog'],
  ['Selasa', '10.20 - 12.00', 'Teknik Penulisan Karya Ilmiah', 2, 'S1 Psikologi', '2026O', 41, 'Ira Darmawanti, S.Psi., MPsi., Psikolog'],
  ['Kamis', '09.30 - 12.00', 'Metodologi Penelitian Kuantitatif', 3, 'S1 Psikologi', '2025A', 42, 'Rizky Putra Santosa, M.Si.; Vania Ardelia, S.Psi., M.Sc.'],
];

const RULES = [
  ['Kolom', 'Wajib?', 'Isi', 'Contoh'],
  ['Hari', 'Ya', 'Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, atau Minggu', 'Senin'],
  ['Jam', 'Ya', 'Jam mulai - jam selesai. Boleh titik atau titik dua: 07.00 - 10.20 atau 07:00 - 10:20', '07.00 - 10.20'],
  ['Matakuliah', 'Ya', 'Nama mata kuliah / kegiatan', 'Perilaku Organisasi'],
  ['SKS', 'Disarankan', 'Angka. Dipakai menghitung jam selesai bila jam selesai kosong atau sama dengan jam mulai (1 SKS = 50 menit)', '4'],
  ['Program Studi', 'Disarankan', 'Nama program studi', 'S1 Psikologi'],
  ['Kelas', 'Ya', 'Kode kelas / angkatan, tampil di tablet ruangan', '2023B'],
  ['Peserta', 'Disarankan', 'Jumlah peserta (angka)', '38'],
  ['Dosen', 'Ya', 'Nama dosen. Lebih dari satu dosen dipisah titik koma ( ; )', 'Nama A, M.Si.; Nama B, M.Psi.'],
];

const NOTES = [
  'CARA PAKAI',
  '1. Isi sheet "Jadwal" (satu baris = satu sesi mingguan). Jangan ubah nama sheet dan judul kolom.',
  '2. Jadwal diulang tiap minggu pada hari yang sama, mulai sampai tanggal yang dipilih di halaman Import Jadwal.',
  '3. Sheet "Contoh" dan "Petunjuk" hanya bacaan dan tidak ikut diimpor.',
  '4. Satu ruangan per file. Pilih ruangan di halaman Import Jadwal sebelum mengunggah.',
  '5. Dua sesi di ruangan yang sama tidak boleh tumpang tindih pada hari yang sama.',
  '6. Centang "Ganti jadwal lama" hanya bila jadwal lama di ruangan itu memang akan dihapus permanen.',
];

function headerCell(text) {
  return {
    v: text,
    t: 's',
    s: {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border,
    },
  };
}

function bodyCell(value, { center = false, italic = false } = {}) {
  return {
    v: value,
    t: typeof value === 'number' ? 'n' : 's',
    s: {
      border,
      alignment: { vertical: 'top', wrapText: true, horizontal: center ? 'center' : 'left' },
      font: italic ? { italic: true, color: { rgb: '666666' } } : undefined,
    },
  };
}

export function buildScheduleTemplate(XLSX) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: empty, ready to fill (header only). This is the sheet that gets imported.
  const jadwal = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS.map(headerCell)]);
  jadwal['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 38 }, { wch: 6 }, { wch: 16 }, { wch: 9 }, { wch: 9 }, { wch: 60 }];
  jadwal['!rows'] = [{ hpt: 24 }];
  XLSX.utils.book_append_sheet(wb, jadwal, 'Jadwal');

  // Sheet 2: filled examples (not imported).
  const contoh = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS.map(headerCell),
    ...EXAMPLES.map((row) => row.map((v, i) => bodyCell(v, { center: [0, 3, 5, 6].includes(i), italic: true }))),
  ]);
  contoh['!cols'] = jadwal['!cols'];
  XLSX.utils.book_append_sheet(wb, contoh, 'Contoh');

  // Sheet 3: rules (not imported).
  const petunjuk = XLSX.utils.aoa_to_sheet([
    ...NOTES.map((line, i) => [{ v: line, t: 's', s: i === 0 ? { font: { bold: true, sz: 13, color: { rgb: BRAND } } } : {} }]),
    [],
    RULES[0].map(headerCell),
    ...RULES.slice(1).map((row) => row.map((v) => bodyCell(v))),
  ]);
  petunjuk['!cols'] = [{ wch: 16 }, { wch: 13 }, { wch: 80 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, petunjuk, 'Petunjuk');

  return wb;
}

export const TEMPLATE_FILE_NAME = 'template-jadwal-kuliah.xlsx';

/** Sheets that are documentation only and must never be imported. */
export const NON_DATA_SHEET = /contoh|petunjuk|ringkasan|readme/i;
