'use client';

import { useMemo, useState } from 'react';
import { Download, ExternalLink, Pencil, X, Check } from 'lucide-react';
import {
  buildFeedbackExportRows,
  EXPORT_COLUMN_ORDER,
  getRoomFacilitiesForBooking,
  getSelectedComplaintSet,
} from '../lib/feedback';
import { updateBooking } from '../lib/api';

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-gold-400';

function FieldLabel({ children }) {
  return <label className="mb-1 block text-xs font-semibold text-slate-700">{children}</label>;
}

function formatBookingDate(value) {
  const numericValue = Number(value || 0);
  if (!numericValue) return '-';

  const date = new Date(numericValue);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function columnAddress(columnIndex, rowIndex) {
  let column = '';
  let temp = columnIndex + 1;

  while (temp > 0) {
    const mod = (temp - 1) % 26;
    column = String.fromCharCode(65 + mod) + column;
    temp = Math.floor((temp - mod) / 26);
  }

  return `${column}${rowIndex}`;
}

function applyWorksheetStyles(worksheet, headers, rowCount) {
  headers.forEach((_, columnIndex) => {
    const cellAddress = columnAddress(columnIndex, 1);
    if (!worksheet[cellAddress]) return;
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '0077CC' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
    };
  });

  for (let rowIndex = 2; rowIndex <= rowCount + 1; rowIndex += 1) {
    headers.forEach((_, columnIndex) => {
      const cellAddress = columnAddress(columnIndex, rowIndex);
      if (!worksheet[cellAddress]) return;
      worksheet[cellAddress].s = {
        border: {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
      };
    });
  }
}

export default function BookingHistoryPanel({
  bookings,
  rooms = [],
  title = 'Kelola Jadwal',
  subtitle = 'Filter jadwal booking berdasarkan status dan rentang tanggal, edit dosen/mata kuliah, atau export ke Excel.',
  showHeader = true,
  showFilters = true,
  showExport = true,
  previewLimit = null,
  emptyMessage = 'Belum ada jadwal booking.',
  onOpenPage,
  filterTitle = 'Filter Jadwal',
  token = null,
  onBookingUpdated,
}) {
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [feedback, setFeedback] = useState('');
  const [exporting, setExporting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ pihak1: '', purpose: '', checkInTime: '', checkOutTime: '' });
  const [saving, setSaving] = useState(false);

  const startEdit = (booking) => {
    setEditingId(booking.id);
    setEditForm({
      pihak1: booking.pihak1 || '',
      purpose: booking.purpose || '',
      checkInTime: booking.checkInTime || '',
      checkOutTime: booking.checkOutTime || '',
    });
    setFeedback('');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (bookingId) => {
    if (!token) {
      setFeedback('Sesi tidak valid, silakan muat ulang halaman.');
      return;
    }
    setSaving(true);
    try {
      await updateBooking(token, bookingId, {
        pihak1: editForm.pihak1,
        purpose: editForm.purpose,
        checkInTime: editForm.checkInTime,
        checkOutTime: editForm.checkOutTime,
      });
      setFeedback('Jadwal berhasil diperbarui.');
      setEditingId(null);
      if (onBookingUpdated) onBookingUpdated();
    } catch (error) {
      setFeedback(error.message || 'Gagal memperbarui jadwal');
    } finally {
      setSaving(false);
    }
  };

  const filteredBookings = useMemo(() => {
    const source = Array.isArray(bookings) ? bookings : [];
    let filtered = [...source];

    if (statusFilter) {
      filtered = filtered.filter((booking) => booking.status === statusFilter);
    }

    if (dateFrom) {
      const fromTime = new Date(`${dateFrom}T00:00:00`).getTime();
      filtered = filtered.filter((booking) => Number(booking.bookingDate || 0) >= fromTime);
    }

    if (dateTo) {
      const toTime = new Date(`${dateTo}T23:59:59`).getTime();
      filtered = filtered.filter((booking) => Number(booking.bookingDate || 0) <= toTime);
    }

    return filtered.sort((left, right) => Number(right.bookingDate || 0) - Number(left.bookingDate || 0));
  }, [bookings, statusFilter, dateFrom, dateTo]);

  const visibleBookings = useMemo(() => {
    if (typeof previewLimit === 'number') {
      return filteredBookings.slice(0, previewLimit);
    }

    return filteredBookings;
  }, [filteredBookings, previewLimit]);

  const exportModel = useMemo(
    () => buildFeedbackExportRows(filteredBookings, rooms),
    [filteredBookings, rooms],
  );

  const handleExport = async () => {
    try {
      setExporting(true);
      setFeedback('');

      const XLSX = await import('xlsx-js-style');
      const headers = [...EXPORT_COLUMN_ORDER, ...exportModel.facilityColumns];
      const exportData = exportModel.rows.map((row) => {
        const ordered = {};
        headers.forEach((key) => {
          ordered[key] = row[key] ?? '-';
        });
        return ordered;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });
      applyWorksheetStyles(worksheet, headers, exportData.length);
      worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(String(header).length + 2, 14) }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Booking History');

      const timestamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `booking-history-${timestamp}.xlsx`);
      setFeedback('Data berhasil diexport ke Excel.');
    } catch (error) {
      setFeedback(error.message || 'Gagal export data ke Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {showHeader ? (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-700">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredBookings.length} item
            </span>
            {onOpenPage ? (
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-gold-200 bg-gold-50 px-3 text-sm font-semibold text-gold-700 transition hover:bg-gold-100"
                onClick={onOpenPage}
              >
                <ExternalLink size={16} />
                Buka Halaman
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {showFilters ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">{filterTitle}</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel>Status</FieldLabel>
              <select
                className={fieldClass}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <FieldLabel>Tanggal Awal Pencarian</FieldLabel>
              <input
                type="date"
                className={fieldClass}
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>

            <div>
              <FieldLabel>Tanggal Akhir Pencarian</FieldLabel>
              <input
                type="date"
                className={fieldClass}
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showExport || previewLimit ? (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-700">
            {showFilters
              ? 'Filter riwayat booking lalu export hasilnya ke Excel.'
              : 'Preview riwayat booking terbaru yang tampil di dashboard.'}
          </p>

          {showExport ? (
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleExport}
              disabled={exporting || filteredBookings.length === 0}
            >
              <Download size={16} />
              {exporting ? 'Mengekspor...' : 'Export Excel'}
            </button>
          ) : null}
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-700">{feedback}</div>
      ) : null}

      {visibleBookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          {emptyMessage}
        </div>
      ) : (
        <div className={previewLimit ? 'max-h-[420px] space-y-3 overflow-auto pr-1' : 'max-h-[65vh] space-y-3 overflow-auto pr-1'}>
          {visibleBookings.map((booking) => (
            <article key={booking.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{booking.roomName || 'Room tanpa nama'}</p>
                  <p className="text-xs text-slate-600">
                    {formatBookingDate(booking.bookingDate)} • {booking.checkInTime} - {booking.checkOutTime}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {booking.status}
                  </span>
                  {token && editingId !== booking.id ? (
                    <button
                      type="button"
                      className="rounded-lg border border-gold-200 bg-gold-50 p-1.5 text-gold-700 transition hover:bg-gold-100"
                      onClick={() => startEdit(booking)}
                      title="Edit dosen / mata kuliah / jam"
                    >
                      <Pencil size={12} />
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-700">
                {booking.picInput ? `${booking.picInput} • ` : ''}
                {booking.userName || 'Unknown User'} • Guests: {booking.numberOfGuests}
              </p>
              {booking.actualDurationMinutes != null || booking.actualCheckInTime || booking.actualCheckOutTime ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  Aktual: {booking.actualCheckInTime || '-'} - {booking.actualCheckOutTime || '-'}
                  {booking.actualDurationMinutes != null ? ` • ${booking.actualDurationMinutes} menit` : ''}
                </p>
              ) : null}

              {editingId === booking.id ? (
                <div className="mt-3 space-y-2 rounded-lg border border-gold-200 bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Nama Dosen</FieldLabel>
                      <input
                        className={fieldClass}
                        value={editForm.pihak1}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, pihak1: e.target.value }))}
                        placeholder="Nama dosen pengajar"
                      />
                    </div>
                    <div>
                      <FieldLabel>Mata Kuliah</FieldLabel>
                      <input
                        className={fieldClass}
                        value={editForm.purpose}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, purpose: e.target.value }))}
                        placeholder="Mata kuliah / kegiatan"
                      />
                    </div>
                    <div>
                      <FieldLabel>Jam Mulai</FieldLabel>
                      <input
                        type="time"
                        className={fieldClass}
                        value={editForm.checkInTime}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, checkInTime: e.target.value }))}
                      />
                    </div>
                    <div>
                      <FieldLabel>Jam Selesai</FieldLabel>
                      <input
                        type="time"
                        className={fieldClass}
                        value={editForm.checkOutTime}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, checkOutTime: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      <X size={12} />
                      Batal
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-[#d9af49] to-[#a67f22] px-3 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      onClick={() => saveEdit(booking.id)}
                      disabled={saving}
                    >
                      <Check size={12} />
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {booking.pihak1 ? (
                    <p className="mt-2 text-xs font-semibold text-slate-800">Dosen: {booking.pihak1}</p>
                  ) : null}
                  {booking.purpose ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">{booking.purpose}</p> : null}
                </>
              )}

              {booking.feedback ? (
                <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{booking.feedback.satisfactionLevel === 'satisfied' ? '😊' : '😞'}</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {booking.feedback.satisfactionLevel === 'satisfied' ? 'Puas' : 'Tidak Puas'}
                    </span>
                  </div>
                  {booking.feedback.satisfactionLevel !== 'satisfied' ? (
                    <>
                      <p className="line-clamp-2 text-xs text-slate-600">{booking.feedback.reason}</p>
                      {(() => {
                        const facilities = getRoomFacilitiesForBooking(booking, rooms);
                        const selectedSet = getSelectedComplaintSet(booking);

                        if (facilities.length === 0) {
                          return null;
                        }

                        return (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Fasilitas Ruangan
                            </p>
                            <div className="grid gap-1 sm:grid-cols-2">
                              {facilities.map((facility) => {
                                const selected = selectedSet.has(facility.toLowerCase());
                                return (
                                  <div key={facility} className="flex items-center gap-2 text-xs text-slate-700">
                                    <span
                                      className={[
                                        'inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold',
                                        selected
                                          ? 'border-red-200 bg-red-50 text-red-700'
                                          : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                                      ].join(' ')}
                                    >
                                      {selected ? '!' : '✓'}
                                    </span>
                                    <span className="truncate">{facility}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      {booking.feedback.complaintOther ? (
                        <p className="text-xs text-slate-600">Keluhan Lainnya: {booking.feedback.complaintOther}</p>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
