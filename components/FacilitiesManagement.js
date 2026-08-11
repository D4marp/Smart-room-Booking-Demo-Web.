'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2, Plus, Edit2, X } from 'lucide-react';
import { listFacilities, createFacility, updateFacility, deleteFacility } from '../lib/api';

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-gold-400';

export default function FacilitiesManagement({ token, onFacilitiesChange }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [formState, setFormState] = useState({ name: '' });
  const [saving, setSaving] = useState(false);

  const fetchFacilities = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await listFacilities();
      setFacilities(Array.isArray(data) ? data : []);
      onFacilitiesChange?.(data);
    } catch (err) {
      setError(err.message || 'Gagal memuat fasilitas');
    } finally {
      setLoading(false);
    }
  }, [onFacilitiesChange]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const handleOpenCreate = () => {
    setEditingFacility(null);
    setFormState({ name: '' });
    setShowForm(true);
  };

  const handleOpenEdit = (facility) => {
    setEditingFacility(facility);
    setFormState({ name: facility.name });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingFacility(null);
    setFormState({ name: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      setError('Nama fasilitas tidak boleh kosong');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editingFacility) {
        await updateFacility(token, editingFacility.id, formState.name);
      } else {
        await createFacility(token, formState.name);
      }
      await fetchFacilities();
      handleCancel();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan fasilitas');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (facility) => {
    if (!window.confirm(`Hapus fasilitas "${facility.name}"? Ini tidak bisa dibatalkan.`)) {
      return;
    }

    try {
      setError('');
      await deleteFacility(token, facility.id);
      await fetchFacilities();
    } catch (err) {
      setError(err.message || 'Gagal menghapus fasilitas');
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Kelola Fasilitas</h2>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600 transition"
        >
          <Plus size={16} />
          Tambah Fasilitas
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Memuat fasilitas...</div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Belum ada fasilitas</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <div
              key={facility.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-slate-100 transition"
            >
              <span className="font-medium text-slate-900">{facility.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenEdit(facility)}
                  className="rounded p-2 text-slate-600 hover:bg-slate-200 transition"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(facility)}
                  className="rounded p-2 text-red-600 hover:bg-red-100 transition"
                  title="Hapus"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingFacility ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nama Fasilitas
                </label>
                <input
                  type="text"
                  className={fieldClass}
                  value={formState.name}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Masukkan nama fasilitas"
                  disabled={saving}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                  disabled={saving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-gold-500 px-4 py-2 font-semibold text-white hover:bg-gold-600 transition disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
