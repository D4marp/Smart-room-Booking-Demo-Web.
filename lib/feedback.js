function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeList(items) {
  const output = [];
  const seen = new Set();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const normalized = normalizeText(item);
    if (!normalized) return;

    const key = normalized.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    output.push(normalized);
  });

  return output;
}

function findRoomByBooking(booking, rooms) {
  if (!booking?.roomId || !Array.isArray(rooms)) return null;
  return rooms.find((room) => room?.id === booking.roomId) || null;
}

export function getRoomFacilitiesForBooking(booking, rooms) {
  const room = findRoomByBooking(booking, rooms);
  return normalizeList(room?.amenities);
}

export function getSelectedComplaintSet(booking) {
  const complaintItems = booking?.feedback?.complaintItems;
  return new Set(normalizeList(complaintItems).map((item) => item.toLowerCase()));
}

export function getFeedbackLabel(booking) {
  if (!booking?.feedback) return '-';
  return booking.feedback.satisfactionLevel === 'satisfied' ? 'Puas' : 'Tidak Puas';
}

function getManualComplaint(booking) {
  return normalizeText(booking?.feedback?.complaintOther) || '-';
}

function formatInputDate(value) {
  const numericValue = Number(value || 0);
  if (!numericValue) return '-';
  const date = new Date(numericValue);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID');
}

function formatInputTime(value) {
  const numericValue = Number(value || 0);
  if (!numericValue) return '-';
  const date = new Date(numericValue);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function getFeedbackExportColumns(bookings, rooms) {
  const facilityColumns = [];
  const seen = new Set();

  (Array.isArray(bookings) ? bookings : []).forEach((booking) => {
    getRoomFacilitiesForBooking(booking, rooms).forEach((facility) => {
      const key = facility.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      facilityColumns.push(facility);
    });
  });

  if (facilityColumns.length === 0) {
    (Array.isArray(rooms) ? rooms : []).forEach((room) => {
      normalizeList(room?.amenities).forEach((facility) => {
        const key = facility.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        facilityColumns.push(facility);
      });
    });
  }

  return facilityColumns;
}

export function buildFeedbackExportRows(bookings, rooms) {
  const facilityColumns = getFeedbackExportColumns(bookings, rooms);

  const rows = (Array.isArray(bookings) ? bookings : []).map((booking) => {
    const selectedSet = getSelectedComplaintSet(booking);
    const rowFacilities = getRoomFacilitiesForBooking(booking, rooms);

    const row = {
      'PIC Input': booking.picInput || '-',
      'Tanggal Input': formatInputDate(booking.createdAt),
      'Waktu Input': formatInputTime(booking.createdAt),
      'Nama Ruangan': booking.roomName || '-',
      'Tanggal Booking': booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString('id-ID') : '-',
      'Jam Check-in': booking.checkInTime || '-',
      'Jam Check-out': booking.checkOutTime || '-',
      'Atas Nama': booking.bookedForName || '-',
      'Pihak 1': booking.pihak1 || booking.paraPihak || '-',
      'Instansi / Perusahaan': booking.bookedForCompany || '-',
      'Pihak 2': booking.pihak2 || booking.divisi || '-',
      Pengguna: booking.userName || '-',
      Email: booking.userEmail || '-',
      Status: booking.status || '-',
      'Puas / Tidak Puas': getFeedbackLabel(booking),
      'Jumlah Tamu': booking.numberOfGuests || '-',
      Tujuan: booking.purpose || '-',
      'Keluhan Terpilih':
        Array.isArray(booking?.feedback?.complaintItems) && booking.feedback.complaintItems.length > 0
          ? booking.feedback.complaintItems.join(', ')
          : '-',
      'Keluhan Lainnya': getManualComplaint(booking),
    };

    rowFacilities.forEach((facility) => {
      if (!booking?.feedback) {
        row[facility] = '-';
        return;
      }

      row[facility] = selectedSet.has(facility.toLowerCase()) ? 'Keluhan' : '✓';
    });

    facilityColumns.forEach((facility) => {
      if (row[facility] !== undefined) return;
      row[facility] = '-';
    });

    return row;
  });

  return { rows, facilityColumns };
}

export function filterBookingsByFeedbackPeriod(bookings, { year = '', month = '' } = {}) {
  const source = Array.isArray(bookings) ? bookings : [];

  return source.filter((booking) => {
    if (!booking?.feedback) return false;

    const createdAt = Number(booking.feedback.createdAt || booking.createdAt || 0);
    if (!createdAt) return false;

    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return false;

    if (year && date.getFullYear() !== Number(year)) return false;
    if (month && date.getMonth() + 1 !== Number(month)) return false;

    return true;
  });
}

export const EXPORT_COLUMN_ORDER = [
  'PIC Input',
  'Tanggal Input',
  'Waktu Input',
  'Nama Ruangan',
  'Tanggal Booking',
  'Jam Check-in',
  'Jam Check-out',
  'Atas Nama',
  'Pihak 1',
  'Instansi / Perusahaan',
  'Pihak 2',
  'Pengguna',
  'Email',
  'Status',
  'Puas / Tidak Puas',
  'Jumlah Tamu',
  'Tujuan',
  'Keluhan Terpilih',
  'Keluhan Lainnya',
];
