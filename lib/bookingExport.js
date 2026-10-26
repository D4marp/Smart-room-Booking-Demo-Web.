// Excel export of the booking schedule ("Kelola Jadwal"). Pure functions: the
// xlsx library is passed in so this module stays usable from the browser and from tests.
import { getRoomFacilitiesForBooking, getSelectedComplaintSet, getFeedbackExportColumns } from './feedback';

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const STATUS_LABEL = {
  pending: 'Menunggu',
  confirmed: 'Terkonfirmasi',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
  completed: 'Selesai',
};

const STATUS_COLOR = {
  pending: 'B45309',
  confirmed: '15803D',
  rejected: 'B91C1C',
  cancelled: 'B91C1C',
  completed: '475569',
};

const BRAND = '693365';

export const SCHEDULE_COLUMNS = [
  { key: 'no', title: 'No', width: 5 },
  { key: 'date', title: 'Tanggal', width: 14 },
  { key: 'day', title: 'Hari', width: 10 },
  { key: 'room', title: 'Ruangan', width: 13 },
  { key: 'start', title: 'Jam Mulai', width: 10 },
  { key: 'end', title: 'Jam Selesai', width: 11 },
  { key: 'course', title: 'Mata Kuliah / Kegiatan', width: 38 },
  { key: 'kelas', title: 'Kelas', width: 9 },
  { key: 'dosen', title: 'Dosen Pengajar', width: 42 },
  { key: 'guests', title: 'Peserta', width: 9 },
  { key: 'status', title: 'Status', width: 15 },
  { key: 'actualIn', title: 'Check-in Aktual', width: 15 },
  { key: 'actualOut', title: 'Check-out Aktual', width: 16 },
  { key: 'duration', title: 'Durasi Aktual (menit)', width: 14 },
  { key: 'rating', title: 'Penilaian', width: 12 },
  { key: 'complaints', title: 'Keluhan', width: 28 },
  { key: 'complaintOther', title: 'Keluhan Lainnya', width: 26 },
  { key: 'createdBy', title: 'Diinput Oleh', width: 20 },
  { key: 'createdAt', title: 'Waktu Input', width: 17 },
];

/** Excel serial number of the WIB calendar date of an epoch-ms midnight value. */
export function wibDateSerial(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor((n + WIB_OFFSET_MS) / DAY_MS) + 25569;
}

export function wibDayName(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '-';
  return DAYS[new Date(n + WIB_OFFSET_MS).getUTCDay()];
}

function wibDateTimeText(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return '-';
  const d = new Date(n + WIB_OFFSET_MS);
  const p = (v) => String(v).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

const TRAILING_PAREN = /\s*\(([^()]*)\)\s*$/;

/** "Perilaku Organisasi (2023B)" -> { course, kelas }; classCode from the API wins. */
export function splitCourseAndClass(booking) {
  const purpose = String(booking?.purpose || '').trim();
  const match = purpose.match(TRAILING_PAREN);
  const course = (match ? purpose.replace(TRAILING_PAREN, '') : purpose).trim();
  const kelas = String(booking?.classCode || (match ? match[1] : '') || '').trim();
  return { course: course || '-', kelas: kelas || '-' };
}

export function formatLecturers(booking) {
  const raw = String(booking?.pihak1 || booking?.paraPihak || '');
  const names = raw.split(';').map((n) => n.trim()).filter(Boolean);
  return names.length ? names.join('\n') : '-';
}

function ratingLabel(booking) {
  if (!booking?.feedback) return '-';
  return booking.feedback.satisfactionLevel === 'satisfied' ? 'Puas' : 'Tidak Puas';
}

/** Sort: date, then start time, then room. */
export function sortForExport(bookings) {
  return [...(Array.isArray(bookings) ? bookings : [])].sort((a, b) => {
    const d = Number(a.bookingDate || 0) - Number(b.bookingDate || 0);
    if (d !== 0) return d;
    const t = String(a.checkInTime || '').localeCompare(String(b.checkInTime || ''));
    if (t !== 0) return t;
    return String(a.roomName || '').localeCompare(String(b.roomName || ''));
  });
}

export function buildScheduleRows(bookings, rooms) {
  const sorted = sortForExport(bookings);
  const facilityColumns = getFeedbackExportColumns(sorted, rooms);

  const rows = sorted.map((booking, index) => {
    const { course, kelas } = splitCourseAndClass(booking);
    const complaints = Array.isArray(booking?.feedback?.complaintItems)
      ? booking.feedback.complaintItems.join(', ')
      : '';
    const facilitySelection = getSelectedComplaintSet(booking);
    const roomFacilities = getRoomFacilitiesForBooking(booking, rooms).map((f) => f.toLowerCase());

    const row = {
      no: index + 1,
      dateSerial: wibDateSerial(booking.bookingDate),
      day: wibDayName(booking.bookingDate),
      room: booking.roomName || '-',
      start: booking.checkInTime || '-',
      end: booking.checkOutTime || '-',
      course,
      kelas,
      dosen: formatLecturers(booking),
      guests: Number(booking.numberOfGuests) || 0,
      status: STATUS_LABEL[booking.status] || booking.status || '-',
      statusKey: booking.status || '',
      actualIn: booking.actualCheckInTime || '-',
      actualOut: booking.actualCheckOutTime || '-',
      duration: booking.actualDurationMinutes != null ? Number(booking.actualDurationMinutes) : null,
      rating: ratingLabel(booking),
      complaints: complaints || '-',
      complaintOther: String(booking?.feedback?.complaintOther || '').trim() || '-',
      createdBy: booking.picInput || booking.userName || '-',
      createdAt: wibDateTimeText(booking.createdAt),
      facilities: {},
    };

    facilityColumns.forEach((facility) => {
      const key = facility.toLowerCase();
      if (!booking?.feedback || !roomFacilities.includes(key)) {
        row.facilities[facility] = '-';
      } else {
        row.facilities[facility] = facilitySelection.has(key) ? 'Keluhan' : '✓';
      }
    });
    return row;
  });

  return { rows, facilityColumns };
}

const thin = (rgb) => ({ style: 'thin', color: { rgb } });
const borderAll = (rgb) => ({ top: thin(rgb), bottom: thin(rgb), left: thin(rgb), right: thin(rgb) });

function headerStyle() {
  return {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { patternType: 'solid', fgColor: { rgb: BRAND } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: borderAll('3F1F3C'),
  };
}

function bodyStyle(zebra, extra = {}) {
  return {
    fill: zebra ? { patternType: 'solid', fgColor: { rgb: 'F7F1F6' } } : undefined,
    alignment: { vertical: 'top', wrapText: true, ...(extra.alignment || {}) },
    border: borderAll('D9D9D9'),
    font: extra.font,
  };
}

const CENTERED = new Set(['no', 'date', 'day', 'start', 'end', 'kelas', 'guests', 'status', 'actualIn', 'actualOut', 'duration', 'rating']);

export function buildScheduleWorkbook(XLSX, bookings, rooms, { title = 'Jadwal Booking Ruangan' } = {}) {
  const { rows, facilityColumns } = buildScheduleRows(bookings, rooms);
  const columns = [
    ...SCHEDULE_COLUMNS,
    ...facilityColumns.map((name) => ({ key: `fac:${name}`, title: name, width: Math.max(name.length + 3, 12) })),
  ];

  const aoa = [columns.map((c) => ({ v: c.title, t: 's', s: headerStyle() }))];
  rows.forEach((row, i) => {
    const zebra = i % 2 === 1;
    aoa.push(
      columns.map((c) => {
        const centered = CENTERED.has(c.key) || c.key.startsWith('fac:');
        const align = centered ? { alignment: { horizontal: 'center' } } : {};
        if (c.key === 'date') {
          return row.dateSerial == null
            ? { v: '-', t: 's', s: bodyStyle(zebra, align) }
            : { v: row.dateSerial, t: 'n', z: 'dd mmm yyyy', s: bodyStyle(zebra, align) };
        }
        if (c.key === 'status') {
          return {
            v: row.status,
            t: 's',
            s: bodyStyle(zebra, { ...align, font: { bold: true, color: { rgb: STATUS_COLOR[row.statusKey] || '000000' } } }),
          };
        }
        if (c.key === 'guests' || c.key === 'no') return { v: row[c.key], t: 'n', s: bodyStyle(zebra, align) };
        if (c.key === 'duration') {
          return row.duration == null
            ? { v: '-', t: 's', s: bodyStyle(zebra, align) }
            : { v: row.duration, t: 'n', s: bodyStyle(zebra, align) };
        }
        const value = c.key.startsWith('fac:') ? row.facilities[c.key.slice(4)] : row[c.key];
        return { v: value ?? '-', t: 's', s: bodyStyle(zebra, align) };
      }),
    );
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = columns.map((c) => ({ wch: c.width }));
  ws['!rows'] = [{ hpt: 34 }];
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rows.length, 1), c: columns.length - 1 } }) };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal');
  XLSX.utils.book_append_sheet(wb, buildSummarySheet(XLSX, rows, title), 'Ringkasan');
  return wb;
}

function countBy(rows, pick) {
  const map = new Map();
  rows.forEach((r) => map.set(pick(r), (map.get(pick(r)) || 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function buildSummarySheet(XLSX, rows, title) {
  const serials = rows.map((r) => r.dateSerial).filter((v) => v != null);
  const toText = (serial) => {
    const d = new Date((serial - 25569) * DAY_MS);
    const p = (v) => String(v).padStart(2, '0');
    return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  };
  const period = serials.length ? `${toText(Math.min(...serials))} s.d. ${toText(Math.max(...serials))}` : '-';

  const head = (text) => ({ v: text, t: 's', s: headerStyle() });
  const cell = (v, center = false) => ({
    v,
    t: typeof v === 'number' ? 'n' : 's',
    s: { border: borderAll('D9D9D9'), alignment: { vertical: 'top', horizontal: center ? 'center' : 'left', wrapText: true } },
  });

  const aoa = [
    [{ v: title, t: 's', s: { font: { bold: true, sz: 14, color: { rgb: BRAND } } } }],
    [{ v: `Periode: ${period}`, t: 's' }],
    [{ v: `Total sesi: ${rows.length}`, t: 's' }],
    [],
    [head('Status'), head('Jumlah')],
    ...countBy(rows, (r) => r.status).map(([k, n]) => [cell(k), cell(n, true)]),
    [],
    [head('Ruangan'), head('Jumlah')],
    ...countBy(rows, (r) => r.room).map(([k, n]) => [cell(k), cell(n, true)]),
    [],
    [head('Kelas'), head('Jumlah sesi')],
    ...countBy(rows.filter((r) => r.kelas !== '-'), (r) => r.kelas).map(([k, n]) => [cell(k), cell(n, true)]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 26 }, { wch: 14 }];
  return ws;
}

export function exportFileName(date = new Date()) {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  const p = (v) => String(v).padStart(2, '0');
  return `jadwal-booking-${wib.getUTCFullYear()}${p(wib.getUTCMonth() + 1)}${p(wib.getUTCDate())}-${p(wib.getUTCHours())}${p(wib.getUTCMinutes())}.xlsx`;
}
