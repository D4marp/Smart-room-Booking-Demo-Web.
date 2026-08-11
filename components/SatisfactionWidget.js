'use client';

import { useMemo } from 'react';
import BookingHistoryPanel from './BookingHistoryPanel';
import { filterBookingsByFeedbackPeriod } from '../lib/feedback';

const MONTHS = [
  { value: '', label: 'Semua Bulan' },
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },
  { value: '8', label: 'Agustus' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-gold-400';

export default function SatisfactionWidget({
  stats,
  bookings = [],
  rooms = [],
  yearFilter = '',
  monthFilter = '',
  onYearFilterChange,
  onMonthFilterChange,
}) {
  const satisfied = Number(stats?.feedbackSatisfied || stats?.satisfied || 0);
  const unsatisfied = Number(stats?.feedbackUnsatisfied || stats?.unsatisfied || 0);
  const total = Number(stats?.feedbackTotal || stats?.total || satisfied + unsatisfied);
  const bookingCount = Number(stats?.totalBookings || 0);
  const rate =
    total > 0 ? Number(stats?.feedbackRate ?? stats?.satisfactionRate ?? (satisfied / total) * 100) : 0;

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [{ value: '', label: 'Semua Tahun' }];
    for (let year = currentYear; year >= currentYear - 5; year -= 1) {
      years.push({ value: String(year), label: String(year) });
    }
    return years;
  }, []);

  const filteredFeedbackBookings = useMemo(
    () => filterBookingsByFeedbackPeriod(bookings, { year: yearFilter, month: monthFilter }),
    [bookings, yearFilter, monthFilter],
  );

  const pieStyle = {
    background: `conic-gradient(#10b981 0 ${rate}%, #ef4444 ${rate}% 100%)`,
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Feedback</p>
          <h2 className="text-xl font-semibold text-slate-900">Satisfaction Rate</h2>
          <p className="mt-1 text-sm text-slate-600">
            Jumlah booking: <strong>{bookingCount}</strong> • Respon survey: <strong>{total}</strong>
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Filter Tahun</label>
            <select
              className={fieldClass}
              value={yearFilter}
              onChange={(event) => onYearFilterChange?.(event.target.value)}
            >
              {yearOptions.map((option) => (
                <option key={option.value || 'all-years'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Filter Bulan</label>
            <select
              className={fieldClass}
              value={monthFilter}
              onChange={(event) => onMonthFilterChange?.(event.target.value)}
            >
              {MONTHS.map((option) => (
                <option key={option.value || 'all-months'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[160px_1fr] md:items-center">
        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full bg-slate-50">
          <div className="relative h-28 w-28 rounded-full p-3" style={pieStyle}>
            <div className="absolute inset-[10px] grid place-items-center rounded-full bg-white shadow-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{rate.toFixed(0)}%</div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Puas</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Puas</span>
              <span>{satisfied}</span>
            </div>
            <div className="h-3 rounded-full bg-emerald-100">
              <div
                className="h-3 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${total > 0 ? (satisfied / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Kurang Puas</span>
              <span>{unsatisfied}</span>
            </div>
            <div className="h-3 rounded-full bg-red-100">
              <div
                className="h-3 rounded-full bg-red-500 transition-all"
                style={{ width: `${total > 0 ? (unsatisfied / total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gold-200 bg-gold-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gold-700">Total booking</div>
              <div className="mt-1 text-2xl font-bold text-gold-900">{bookingCount}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Total puas</div>
              <div className="mt-1 text-2xl font-bold text-emerald-900">{satisfied}</div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-700">Total kurang</div>
              <div className="mt-1 text-2xl font-bold text-red-900">{unsatisfied}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-slate-900">Riwayat Booking Survey</h3>
          <p className="text-sm text-slate-600">
            Menampilkan booking dengan feedback sesuai filter bulan dan tahun.
          </p>
        </div>
        <BookingHistoryPanel
          bookings={filteredFeedbackBookings}
          rooms={rooms}
          showHeader={false}
          showFilters={false}
          showExport={false}
          previewLimit={5}
          emptyMessage="Belum ada riwayat survey kepuasan untuk filter ini."
        />
      </div>
    </article>
  );
}
