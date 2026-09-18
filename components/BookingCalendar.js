'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getRoomFacilitiesForBooking, getSelectedComplaintSet } from '../lib/feedback';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

function toDateKey(value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateKeyToDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function prettyDateFromKey(dateKey) {
  if (!dateKey) return '-';
  return dateKeyToDate(dateKey).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function isWeekendDateKey(dateKey) {
  const day = dateKeyToDate(dateKey).getDay();
  return day === 0 || day === 6;
}

function startOfWeek(date) {
  const copy = new Date(date);
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function buildRows(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDate = new Date(year, month, 1);

  const startOffset = (firstDate.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    const day = prevMonthDays - startOffset + i + 1;
    cells.push({ type: 'pad', id: `prev-${i}`, day });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const key = toDateKey(date.getTime());
    cells.push({ type: 'day', id: key, day, key });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ type: 'pad', id: `next-${cells.length}`, day: cells.length % 7 });
  }

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return rows;
}

function buildWeekCells(weekStartDate) {
  const start = startOfWeek(weekStartDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = toDateKey(date.getTime());
    return { type: 'day', id: key, day: date.getDate(), key };
  });
}

function statusClass(status) {
  if (status === 'pending') return 'bg-amber-100 text-amber-800';
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-700';
  if (status === 'completed') return 'bg-gold-100 text-gold-700';
  return 'bg-slate-100 text-slate-700';
}

function bookingCellTone(items) {
  if (!items.length) return 'bg-white hover:bg-slate-50';
  const hasPending = items.some((item) => item.status === 'pending');
  const hasConfirmed = items.some((item) => item.status === 'confirmed');
  if (hasPending) return 'bg-amber-50 hover:bg-amber-100';
  if (hasConfirmed) return 'bg-gold-50 hover:bg-gold-100';
  return 'bg-indigo-50 hover:bg-indigo-100';
}

function formatPihakLine(booking) {
  const pihak1 = (booking.pihak1 || booking.paraPihak || '').trim();
  const pihak2 = (booking.pihak2 || booking.divisi || '').trim();

  if (!pihak1 && !pihak2) return null;
  if (!pihak1) return `Pihak 2: ${pihak2}`;
  if (!pihak2) return `Dosen Pengajar: ${pihak1}`;
  return `Dosen Pengajar: ${pihak1} · Pihak 2: ${pihak2}`;
}

function getBookingDateTime(booking, timeValue) {
  const date = new Date(Number(booking?.bookingDate));
  if (Number.isNaN(date.getTime()) || !timeValue) return null;

  const [hour, minute] = String(timeValue).split(':').map((part) => Number(part));
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;

  const dateTime = new Date(date);
  dateTime.setHours(hour, minute, 0, 0);
  return dateTime;
}

function canCompleteBooking(booking, now = new Date()) {
  const scheduledEnd = getBookingDateTime(booking, booking?.checkOutTime);
  if (!scheduledEnd) return false;
  return now.getTime() >= scheduledEnd.getTime();
}

function formatCompleteAvailableAt(booking) {
  const scheduledEnd = getBookingDateTime(booking, booking?.checkOutTime);
  if (!scheduledEnd) return 'jadwal selesai';

  return scheduledEnd.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function splitTimeValue(value) {
  const [hour = '08', minute = '00'] = String(value || '08:00').split(':');
  return {
    hour: HOURS.includes(hour) ? hour : '08',
    minute: MINUTES.includes(minute) ? minute : '00',
  };
}

function joinTimeValue(hour, minute) {
  return `${hour}:${minute}`;
}

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-gold-400';

function FieldLabel({ htmlFor, required, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-700">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
}

const timeFieldClass =
  'h-14 w-full rounded-xl border border-slate-200 bg-white px-3 text-2xl font-bold text-slate-900 outline-none transition focus:border-gold-400';

function TimeSelect24({ id, label, required, value, onChange }) {
  const { hour, minute } = splitTimeValue(value);

  return (
    <div>
      <label htmlFor={`${id}-hour`} className="mb-1 block text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <select
          id={`${id}-hour`}
          className={timeFieldClass}
          value={hour}
          onChange={(event) => onChange(joinTimeValue(event.target.value, minute))}
          required={required}
        >
          {HOURS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          id={`${id}-minute`}
          className={timeFieldClass}
          value={minute}
          onChange={(event) => onChange(joinTimeValue(hour, event.target.value))}
          required={required}
        >
          {MINUTES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function CalendarDayCell({ cell, items, isActive, onSelect }) {
  const weekend = isWeekendDateKey(cell.key);
  const roomNames = Array.from(new Set(items.map((it) => it.roomName || 'Unnamed')));
  const moreCount = roomNames.length - 1;
  const pendingCount = items.filter((item) => item.status === 'pending').length;

  return (
    <button
      key={cell.id}
      type="button"
      className={[
        'flex min-h-[100px] flex-col justify-between border border-slate-100 p-2 text-left transition md:min-h-[84px] lg:min-h-[110px] lg:p-3',
        bookingCellTone(items),
        isActive ? 'ring-1 ring-gold-300' : '',
      ].join(' ')}
      onClick={() => onSelect(cell.key)}
    >
      <span
        className={[
          'block text-sm font-semibold md:text-xs lg:text-sm',
          weekend ? 'text-red-600' : 'text-slate-800',
        ].join(' ')}
      >
        {cell.day}
      </span>
      <div className="mt-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {items.length === 0 ? (
          <small className="text-[10px] text-slate-400 md:text-xs">—</small>
        ) : (
          <>
            <small
              className="line-clamp-2 block text-[10px] leading-tight text-slate-600 md:text-xs"
              title={roomNames.join(', ')}
            >
              {roomNames[0]}
            </small>
            {moreCount > 0 && (
              <small className="text-[10px] font-medium text-slate-500 md:text-xs">+{moreCount} more</small>
            )}
          </>
        )}
      </div>
      {pendingCount > 0 && (
        <em className="mt-1 block text-[9px] font-medium not-italic text-amber-700 md:text-xs">
          {pendingCount} pending
        </em>
      )}
    </button>
  );
}

export default function BookingCalendar({
  bookings,
  rooms,
  statusFilter,
  onStatusFilterChange,
  loading,
  actionLoadingKey,
  creatingBooking,
  onBookingAction,
  onCreateBooking,
}) {
  const [viewMode, setViewMode] = useState('month');
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [viewWeekStart, setViewWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(Date.now()));
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [formState, setFormState] = useState({
    roomId: '',
    picInput: '',
    bookedForName: '',
    bookedForCompany: '',
    pihak1: '',
    pihak2: '',
    checkInTime: '08:00',
    checkOutTime: '09:00',
    numberOfGuests: 1,
    purpose: '',
  });

  useEffect(() => {
    if (!rooms?.length) return;
    setFormState((prev) => {
      if (prev.roomId) return prev;
      return { ...prev, roomId: rooms[0].id };
    });
  }, [rooms]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 15_000);

    return () => window.clearInterval(timer);
  }, []);

  const groupedBookings = useMemo(() => {
    const map = {};
    bookings.forEach((booking) => {
      const key = toDateKey(booking.bookingDate);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(booking);
    });

    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => String(a.checkInTime).localeCompare(String(b.checkInTime)));
    });

    return map;
  }, [bookings]);

  const rows = useMemo(() => buildRows(viewMonth), [viewMonth]);
  const weekCells = useMemo(() => buildWeekCells(viewWeekStart), [viewWeekStart]);

  const selectedBookings = useMemo(() => groupedBookings[selectedDateKey] || [], [groupedBookings, selectedDateKey]);

  const periodTitle = useMemo(() => {
    if (viewMode === 'week') {
      const end = new Date(viewWeekStart);
      end.setDate(end.getDate() + 6);
      const startLabel = viewWeekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const endLabel = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startLabel} - ${endLabel}`;
    }

    return viewMonth.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewMode, viewMonth, viewWeekStart]);

  const canSubmitBooking = Boolean(
    formState.roomId &&
      formState.picInput.trim() &&
      selectedDateKey &&
      formState.checkInTime &&
      formState.checkOutTime &&
      Number(formState.numberOfGuests) > 0,
  );

  const goToToday = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setViewWeekStart(startOfWeek(now));
    setSelectedDateKey(toDateKey(now.getTime()));
  };

  const shiftPeriod = (direction) => {
    if (viewMode === 'week') {
      setViewWeekStart((current) => {
        const next = new Date(current);
        next.setDate(next.getDate() + direction * 7);
        return startOfWeek(next);
      });
      return;
    }

    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmitBooking) return;

    if (formState.checkOutTime <= formState.checkInTime) {
      window.alert('Jam selesai harus lebih besar dari jam mulai.');
      return;
    }

    const bookingDate = new Date(`${selectedDateKey}T00:00:00`).getTime();
    const purpose = formState.purpose.trim();
    const pihak1 = formState.pihak1.trim() || null;
    const pihak2 = formState.pihak2.trim() || null;

    await onCreateBooking({
      roomId: formState.roomId,
      bookingDate,
      picInput: formState.picInput.trim(),
      bookedForName: formState.bookedForName.trim() || null,
      bookedForCompany: formState.bookedForCompany.trim() || null,
      pihak1,
      pihak2,
      paraPihak: pihak1,
      divisi: pihak2,
      checkInTime: formState.checkInTime,
      checkOutTime: formState.checkOutTime,
      numberOfGuests: Number(formState.numberOfGuests),
      purpose: purpose || null,
    });
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Booking Calendar</h2>
          <p className="mt-1 text-sm text-slate-700">
            Monitor booking per tanggal dan lakukan approval langsung dari panel ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className={fieldClass}
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            aria-label="Filter booking status"
          >
            <option value="">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>

          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {['month', 'week'].map((mode) => (
              <button
                key={mode}
                type="button"
                className={[
                  'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition',
                  viewMode === mode ? 'bg-gold-600 text-white' : 'text-slate-600 hover:bg-slate-50',
                ].join(' ')}
                onClick={() => setViewMode(mode)}
              >
                {mode === 'month' ? 'Monthly' : 'Weekly'}
              </button>
            ))}
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-lg text-gold-600 transition hover:bg-gold-50"
              onClick={() => shiftPeriod(-1)}
              aria-label="Periode sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <strong className="inline-flex h-8 min-w-[180px] items-center justify-center px-3 text-sm text-slate-800">
              {periodTitle}
            </strong>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-lg text-gold-600 transition hover:bg-gold-50"
              onClick={() => shiftPeriod(1)}
              aria-label="Periode berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-8 min-w-[88px] items-center justify-center rounded-xl border border-gold-200 bg-gold-50 px-3 text-xs font-semibold text-gold-700 transition hover:bg-gold-100"
            onClick={goToToday}
          >
            Today
          </button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <div className="grid grid-cols-7 bg-slate-50 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-500 md:text-[11px]">
            {WEEKDAYS.map((day, index) => (
              <div
                key={day}
                className={[
                  'border-b border-slate-200 px-1 py-2',
                  index >= 5 ? 'text-red-600' : '',
                ].join(' ')}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day.slice(0, 1)}</span>
              </div>
            ))}
          </div>

          {viewMode === 'month' ? (
            rows.map((week, index) => (
              <div key={`week-${index}`} className="grid grid-cols-7">
                {week.map((cell) => {
                  if (cell.type === 'pad') {
                    return (
                      <button
                        key={cell.id}
                        type="button"
                        className="min-h-[84px] border border-slate-100 bg-slate-50 p-2 text-left text-sm text-slate-300"
                        disabled
                      >
                        <span>{cell.day}</span>
                      </button>
                    );
                  }

                  const items = groupedBookings[cell.key] || [];
                  return (
                    <CalendarDayCell
                      key={cell.id}
                      cell={cell}
                      items={items}
                      isActive={cell.key === selectedDateKey}
                      onSelect={setSelectedDateKey}
                    />
                  );
                })}
              </div>
            ))
          ) : (
            <div className="grid grid-cols-7">
              {weekCells.map((cell) => {
                const items = groupedBookings[cell.key] || [];
                return (
                  <CalendarDayCell
                    key={cell.id}
                    cell={cell}
                    items={items}
                    isActive={cell.key === selectedDateKey}
                    onSelect={setSelectedDateKey}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Booking Tanggal Ini</h3>
                <p className="text-sm text-slate-600">{prettyDateFromKey(selectedDateKey)}</p>
              </div>
              {loading && <span className="text-xs text-slate-500">Sync...</span>}
            </div>

            <form className="grid gap-3" onSubmit={handleCreateSubmit}>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-800">Buat booking baru</label>

                <div>
                  <FieldLabel htmlFor="pic-input" required>
                    Nama Penginput Data
                  </FieldLabel>
                  <input
                    id="pic-input"
                    className={fieldClass}
                    type="text"
                    value={formState.picInput}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, picInput: event.target.value }))
                    }
                    placeholder="Nama resepsionis / admin yang input"
                    required
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="room-select" required>
                    Ruangan
                  </FieldLabel>
                  <select
                    id="room-select"
                    className={fieldClass}
                    value={formState.roomId}
                    onChange={(event) => setFormState((prev) => ({ ...prev, roomId: event.target.value }))}
                    required
                  >
                    <option value="">Pilih Ruangan</option>
                    {(rooms || []).map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} - Kap. {room.maxGuests}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FieldLabel htmlFor="booked-for-name">Atas Nama</FieldLabel>
                    <input
                      id="booked-for-name"
                      className={fieldClass}
                      type="text"
                      value={formState.bookedForName}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, bookedForName: event.target.value }))
                      }
                      placeholder="Nama (opsional)"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="booked-for-company">Instansi / Perusahaan / Divisi</FieldLabel>
                    <input
                      id="booked-for-company"
                      className={fieldClass}
                      type="text"
                      value={formState.bookedForCompany}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, bookedForCompany: event.target.value }))
                      }
                      placeholder="Instansi (opsional)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FieldLabel htmlFor="pihak-1">Dosen Pengajar</FieldLabel>
                    <input
                      id="pihak-1"
                      className={fieldClass}
                      type="text"
                      value={formState.pihak1}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, pihak1: event.target.value }))
                      }
                      placeholder="Nama dosen pengajar (opsional)"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="pihak-2">Pihak 2</FieldLabel>
                    <input
                      id="pihak-2"
                      className={fieldClass}
                      type="text"
                      value={formState.pihak2}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, pihak2: event.target.value }))
                      }
                      placeholder="Pihak 2 (opsional)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <TimeSelect24
                    id="check-in-time"
                    label="Jam Masuk"
                    required
                    value={formState.checkInTime}
                    onChange={(nextValue) =>
                      setFormState((prev) => ({ ...prev, checkInTime: nextValue }))
                    }
                  />
                  <TimeSelect24
                    id="check-out-time"
                    label="Jam Keluar"
                    required
                    value={formState.checkOutTime}
                    onChange={(nextValue) =>
                      setFormState((prev) => ({ ...prev, checkOutTime: nextValue }))
                    }
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="num-guests" required>
                    Jumlah Peserta
                  </FieldLabel>
                  <input
                    id="num-guests"
                    className={fieldClass}
                    type="number"
                    min="1"
                    value={formState.numberOfGuests}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, numberOfGuests: event.target.value }))
                    }
                    placeholder="Jumlah peserta"
                    required
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="purpose">Mata Kuliah/Kegiatan</FieldLabel>
                  <input
                    id="purpose"
                    className={fieldClass}
                    type="text"
                    value={formState.purpose}
                    onChange={(event) => setFormState((prev) => ({ ...prev, purpose: event.target.value }))}
                    placeholder="Contoh: Kalkulus I, Rapat Prodi, Seminar (opsional)"
                  />
                </div>
              </div>

              <p className="text-xs font-medium text-red-600">* Wajib Diisi</p>

              <button
                type="submit"
                className="h-10 w-full rounded-xl bg-gradient-to-r from-[#d9af49] to-[#a67f22] text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canSubmitBooking || creatingBooking}
              >
                {creatingBooking ? 'Mengirim...' : 'Booking Tanggal Ini'}
              </button>
            </form>
          </section>

          <section className="max-h-[620px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {selectedBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-700">
                Tidak ada booking di tanggal ini.
              </div>
            ) : (
              <div className="grid gap-3">
                {selectedBookings.map((booking) => (
                  <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{booking.roomName || 'Room tanpa nama'}</p>
                        <p className="text-xl font-bold text-slate-900">
                          {booking.checkInTime} - {booking.checkOutTime}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(booking.status)}`}
                      >
                        {booking.status}
                      </span>
                    </header>

                    <div className="space-y-2 text-sm text-slate-700">
                      {booking.picInput ? <p>PIC Input: {booking.picInput}</p> : null}
                      <p>
                        {booking.userName || 'Unknown User'} ({booking.userEmail || '-'})
                      </p>
                      {booking.bookedForName ? (
                        <p>
                          For: {booking.bookedForName}
                          {booking.bookedForCompany ? ` · ${booking.bookedForCompany}` : ''}
                        </p>
                      ) : null}
                      {formatPihakLine(booking) ? (
                        <p className="font-semibold text-slate-800">{formatPihakLine(booking)}</p>
                      ) : null}
                      <p>Guests: {booking.numberOfGuests}</p>
                      {booking.actualCheckInTime || booking.actualCheckOutTime || booking.actualDurationMinutes != null ? (
                        <p className="text-xs text-slate-500">
                          Aktual: {booking.actualCheckInTime || '-'} - {booking.actualCheckOutTime || '-'}
                          {booking.actualDurationMinutes != null ? ` • ${booking.actualDurationMinutes} menit` : ''}
                        </p>
                      ) : null}
                      {booking.purpose ? (
                        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{booking.purpose}</p>
                      ) : null}
                    </div>

                    {booking.feedback ? (
                      <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {booking.feedback.satisfactionLevel === 'satisfied' ? '😊' : '😞'}
                          </span>
                          <span className="text-xs font-semibold text-amber-900">
                            {booking.feedback.satisfactionLevel === 'satisfied' ? 'Puas' : 'Kurang Puas'}
                          </span>
                        </div>
                        <p className="text-xs text-amber-900">{booking.feedback.reason}</p>

                        {(() => {
                          const facilities = getRoomFacilitiesForBooking(booking, rooms);
                          const selectedSet = getSelectedComplaintSet(booking);

                          if (facilities.length === 0) return null;

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
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-slate-300 bg-white text-slate-400',
                                        ].join(' ')}
                                      >
                                        {selected ? 'v' : 'x'}
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
                          <p className="text-xs text-amber-900">Lainnya: {booking.feedback.complaintOther}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Admin Actions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                              onClick={() => onBookingAction('approve', booking)}
                              disabled={actionLoadingKey === `approve:${booking.id}`}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                              onClick={() => onBookingAction('reject', booking)}
                              disabled={actionLoadingKey === `reject:${booking.id}`}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {booking.status === 'confirmed' &&
                          (() => {
                            const completeAllowed = canCompleteBooking(booking, currentTime);
                            const completeLoading = actionLoadingKey === `complete:${booking.id}`;
                            const disabledReason = `Complete aktif setelah ${formatCompleteAvailableAt(booking)}`;

                            return (
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  onClick={() => onBookingAction('complete', booking)}
                                  disabled={completeLoading || !completeAllowed}
                                  title={completeAllowed ? undefined : disabledReason}
                                >
                                  Complete
                                </button>
                                {!completeAllowed ? (
                                  <span className="text-[11px] font-medium text-slate-500">{disabledReason}</span>
                                ) : null}
                              </div>
                            );
                          })()}

                        {booking.status === 'completed' && (
                          <button
                            type="button"
                            className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500"
                            disabled
                          >
                            Completed (No action)
                          </button>
                        )}

                        {booking.status === 'rejected' && (
                          <button
                            type="button"
                            className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500"
                            disabled
                          >
                            Rejected (No action)
                          </button>
                        )}

                        {booking.status === 'cancelled' && (
                          <button
                            type="button"
                            className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-500"
                            disabled
                          >
                            Cancelled (No action)
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
