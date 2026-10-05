'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { importSchedule, listClasses } from '../lib/api';

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-gold-400';

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function cell(row, ...keys) {
  for (const key of keys) {
    const found = Object.keys(row).find((k) => k.trim().toLowerCase() === key);
    if (found && row[found] !== undefined && row[found] !== null) {
      return String(row[found]).trim();
    }
  }
  return '';
}

export default function ScheduleImport({ token, rooms = [] }) {
  const today = useMemo(() => new Date(), []);
  const [roomId, setRoomId] = useState('');
  const [startDate, setStartDate] = useState(toIsoDate(today));
  const [endDate, setEndDate] = useState(
    toIsoDate(new Date(today.getTime() + 75 * 24 * 3600 * 1000)),
  );
  const [replace, setReplace] = useState(true);
  const [items, setItems] = useState([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [classes, setClasses] = useState([]);

  const refreshClasses = async () => {
    try {
      const data = await listClasses(token);
      setClasses(Array.isArray(data) ? data : []);
    } catch {
      setClasses([]);
    }
  };

  useEffect(() => {
    refreshClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!roomId && rooms.length) setRoomId(rooms[0].id);
  }, [rooms, roomId]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setResult(null);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const parsed = rows
        .map((row) => ({
          day: cell(row, 'hari'),
          time: cell(row, 'jam'),
          course: cell(row, 'matakuliah', 'mata kuliah'),
          sks: Number(cell(row, 'sks')) || 0,
          studyProgram: cell(row, 'program studi'),
          class: cell(row, 'kelas'),
          participants: Number(cell(row, 'peserta')) || 0,
          lecturers: cell(row, 'dosen'),
        }))
        .filter((r) => r.day && r.time && r.course);
      if (!parsed.length) {
        throw new Error('Tidak ada baris jadwal. Kolom wajib: Hari, Jam, Matakuliah, Kelas, Dosen.');
      }
      setItems(parsed);
      setFileName(file.name);
    } catch (err) {
      setItems([]);
      setFileName('');
      setError(err.message || 'Gagal membaca file Excel');
    }
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const data = await importSchedule(token, {
        roomId,
        startDate,
        endDate,
        replace,
        items,
      });
      setResult(data);
      refreshClasses();
    } catch (err) {
      setError(err.message || 'Gagal mengimpor jadwal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Import Jadwal Kuliah</h2>
        <p className="text-sm text-slate-500">
          Upload jadwal ruangan (Excel). Setiap baris diulang tiap minggu pada rentang tanggal,
          lalu langsung tampil di tab ruangan beserta kelas dan dosennya.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-3">
        <label className="space-y-1 text-sm text-slate-600">
          Ruangan
          <select className={fieldClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-600">
          Mulai tanggal
          <input type="date" className={fieldClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm text-slate-600">
          Sampai tanggal
          <input type="date" className={fieldClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 md:col-span-3">
          <FileSpreadsheet className="h-5 w-5 text-gold-500" />
          <span className="flex-1">{fileName || 'Pilih file .xlsx (Hari, Jam, Matakuliah, SKS, Program Studi, Kelas, Peserta, Dosen)'}</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold">Pilih file</span>
        </label>

        <label className="flex items-start gap-2 text-sm text-slate-600 md:col-span-3">
          <input type="checkbox" className="mt-1" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
          <span>
            Ganti jadwal lama di ruangan ini: booking manual/percobaan mulai tanggal awal dan jadwal
            kuliah hasil import sebelumnya dihapus permanen sebelum jadwal baru dimasukkan.
          </span>
        </label>
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {['Hari', 'Jam', 'Matakuliah', 'Kelas', 'Peserta', 'Dosen'].map((h) => (
                  <th key={h} className="px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={i} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">{row.day}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{row.time}</td>
                  <td className="px-3 py-2">{row.course}</td>
                  <td className="px-3 py-2 font-semibold">{row.class}</td>
                  <td className="px-3 py-2">{row.participants}</td>
                  <td className="px-3 py-2">{row.lecturers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {result && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Berhasil: {result.bookingsCreated} jadwal dibuat untuk {result.classes} kelas
          {result.bookingsDeleted ? `, ${result.bookingsDeleted} jadwal lama dihapus` : ''}.
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={busy || !items.length || !roomId}
        className="inline-flex items-center gap-2 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Upload className="h-4 w-4" />
        {busy ? 'Mengimpor...' : `Import ${items.length || ''} baris jadwal`}
      </button>

      {classes.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Daftar Kelas ({classes.length})</h3>
          <div className="flex flex-wrap gap-2">
            {classes.map((cl) => (
              <span key={cl.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                <b>{cl.code}</b> · {cl.studyProgram || '-'} · {cl.studentCount} peserta · {cl.bookingCount} jadwal
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
