'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Trash2 } from 'lucide-react';
import { deleteFlyer, listManagedFlyers, updateFlyer, uploadFlyer } from '../lib/api';

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-gold-400';

function formatDate(ms) {
  if (!ms) return null;
  return new Date(ms).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function scheduleLabel(flyer) {
  const start = formatDate(flyer.startAt);
  const end = formatDate(flyer.endAt);
  if (!start && !end) return 'Tayang terus-menerus';
  if (start && end) return `${start} – ${end}`;
  if (start) return `Mulai ${start}`;
  return `Sampai ${end}`;
}

export default function FlyerManagement({ token, rooms = [] }) {
  const [flyers, setFlyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [form, setForm] = useState({ title: '', roomId: '', durationSeconds: 8, startDate: '', endDate: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await listManagedFlyers(token);
      setFlyers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Gagal memuat flyer');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const roomName = (roomId) => {
    if (!roomId) return 'Semua ruangan';
    return rooms.find((room) => room.id === roomId)?.name || 'Ruangan tidak dikenal';
  };

  const handleFileChange = (event) => {
    const picked = event.target.files?.[0] || null;
    setFile(picked);
    setPreview(picked ? URL.createObjectURL(picked) : '');
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Pilih file flyer terlebih dahulu.');
      return;
    }
    setUploading(true);
    setError('');
    setInfo('');
    try {
      await uploadFlyer(token, {
        file,
        title: form.title.trim(),
        roomId: form.roomId,
        durationSeconds: Number(form.durationSeconds) || 8,
        sortOrder: flyers.length,
        startAt: form.startDate ? new Date(`${form.startDate}T00:00:00`).getTime() : null,
        endAt: form.endDate ? new Date(`${form.endDate}T23:59:59`).getTime() : null,
      });
      setInfo('Flyer berhasil diupload. Kiosk akan menampilkannya dalam ±1 menit.');
      setFile(null);
      setPreview('');
      setForm((prev) => ({ ...prev, title: '', startDate: '', endDate: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err) {
      setError(err.message || 'Upload gagal');
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (flyer) => {
    setBusyId(flyer.id);
    setError('');
    try {
      await updateFlyer(token, flyer.id, { isActive: !flyer.isActive });
      await load();
    } catch (err) {
      setError(err.message || 'Gagal mengubah status flyer');
    } finally {
      setBusyId('');
    }
  };

  const handleDelete = async (flyer) => {
    if (!window.confirm(`Hapus flyer "${flyer.title || 'tanpa judul'}"?`)) return;
    setBusyId(flyer.id);
    setError('');
    try {
      await deleteFlyer(token, flyer.id);
      await load();
    } catch (err) {
      setError(err.message || 'Gagal menghapus flyer');
    } finally {
      setBusyId('');
    }
  };

  const move = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= flyers.length) return;
    const reordered = [...flyers];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setBusyId(reordered[index].id);
    setError('');
    try {
      await Promise.all(
        reordered.map((flyer, position) =>
          flyer.sortOrder === position ? null : updateFlyer(token, flyer.id, { sortOrder: position }),
        ),
      );
      await load();
    } catch (err) {
      setError(err.message || 'Gagal mengubah urutan');
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Flyer &amp; Iklan Kiosk</h2>
        <p className="mt-1 text-sm text-slate-700">
          Upload flyer/poster yang tampil bergantian (carousel) di layar kiosk ruangan. Pilih ruangan tertentu atau
          semua ruangan, atur durasi tayang dan jadwal tampil.
        </p>
      </header>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {info ? (
        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {info}
        </div>
      ) : null}

      <form onSubmit={handleUpload} className="mb-6 grid gap-3 rounded-xl border border-gold-100 bg-gold-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Upload flyer baru</h3>

        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
          <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-gold-300 bg-white text-xs font-semibold text-gold-600 hover:bg-gold-100">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="pratinjau flyer" className="h-full w-full object-cover" />
            ) : (
              <>
                <ImagePlus size={22} />
                Pilih gambar (JPG/PNG/WEBP, maks 8MB)
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Judul (opsional)</label>
              <input
                className={fieldClass}
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="mis. Seminar Nasional Psikologi 2026"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tampil di</label>
              <select
                className={fieldClass}
                value={form.roomId}
                onChange={(e) => setForm((prev) => ({ ...prev, roomId: e.target.value }))}
              >
                <option value="">Semua ruangan</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Durasi tampil (detik)</label>
              <input
                type="number"
                min="3"
                max="120"
                className={fieldClass}
                value={form.durationSeconds}
                onChange={(e) => setForm((prev) => ({ ...prev, durationSeconds: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Mulai tayang (opsional)</label>
              <input
                type="date"
                className={fieldClass}
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Selesai tayang (opsional)</label>
              <input
                type="date"
                className={fieldClass}
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d9af49] to-[#a67f22] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ImagePlus size={16} />
          {uploading ? 'Mengupload...' : 'Upload Flyer'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-600">Memuat flyer...</p>
      ) : flyers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
          Belum ada flyer. Upload flyer pertama di atas untuk ditampilkan di kiosk.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flyers.map((flyer, index) => (
            <article
              key={flyer.id}
              className={[
                'overflow-hidden rounded-xl border bg-slate-50',
                flyer.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flyer.imageUrl} alt={flyer.title || 'flyer'} className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{flyer.title || 'Tanpa judul'}</p>
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      flyer.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600',
                    ].join(' ')}
                  >
                    {flyer.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {roomName(flyer.roomId)} • {flyer.durationSeconds} detik
                </p>
                <p className="text-xs text-slate-500">{scheduleLabel(flyer)}</p>

                <div className="flex items-center gap-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || busyId === flyer.id}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                    title="Naikkan urutan"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === flyers.length - 1 || busyId === flyer.id}
                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                    title="Turunkan urutan"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(flyer)}
                    disabled={busyId === flyer.id}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-200 bg-gold-50 px-2 py-1.5 text-xs font-semibold text-gold-700 transition hover:bg-gold-100 disabled:opacity-60"
                  >
                    {flyer.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                    {flyer.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(flyer)}
                    disabled={busyId === flyer.id}
                    className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                    title="Hapus flyer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
