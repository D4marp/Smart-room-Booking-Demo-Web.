'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Plus, ImagePlus, X } from 'lucide-react';
import { uploadRoomImage, deleteRoomImage, listFacilities } from '../lib/api';

const fieldClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-gold-400';

export default function RoomManagement({
  rooms,
  loading,
  token,
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  creatingRoom,
  actionBusyKey,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formState, setFormState] = useState({
    name: '',
    location: '',
    floor: '',
    maxGuests: 1,
    amenities: [],
  });
  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [facilitiesError, setFacilitiesError] = useState('');
  const [pendingImages, setPendingImages] = useState([]);
  const [roomImages, setRoomImages] = useState([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    setFacilitiesLoading(true);
    setFacilitiesError('');
    listFacilities()
      .then((data) => {
        if (!active) return;
        setFacilities(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        setFacilitiesError(err.message || 'Gagal memuat fasilitas');
      })
      .finally(() => {
        if (!active) return;
        setFacilitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggleAmenity = (value) => {
    setFormState((prev) => {
      const hasValue = prev.amenities.includes(value);
      return {
        ...prev,
        amenities: hasValue
          ? prev.amenities.filter((item) => item !== value)
          : [...prev.amenities, value],
      };
    });
  };

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormState({
      name: '',
      location: '',
      floor: '',
      maxGuests: 1,
      amenities: [],
    });
    setRoomImages([]);
    setImageError('');
    setPendingImages([]);
    setShowForm(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setFormState({
      name: room.name || '',
      location: room.location || '',
      floor: room.floor || '',
      maxGuests: room.maxGuests || 1,
      amenities: Array.isArray(room.amenities) ? room.amenities : [],
    });
    setRoomImages(room.imageUrls || []);
    setImageError('');
    setPendingImages([]);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRoom(null);
    setRoomImages([]);
    setImageError('');
    setPendingImages([]);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageUploading(true);
    setImageError('');
    try {
      if (editingRoom) {
        // Jika edit: upload langsung ke server
        const data = await uploadRoomImage(token, editingRoom.id, file);
        setRoomImages((prev) => [...prev, data.imageUrl]);
      } else {
        // Jika create: simpan file ke pending untuk diupload nanti
        const reader = new FileReader();
        reader.onload = (event) => {
          setRoomImages((prev) => [...prev, event.target.result]);
        };
        reader.readAsDataURL(file);
        setPendingImages((prev) => [...prev, file]);
      }
    } catch (err) {
      setImageError(err.message || 'Upload gagal');
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (imageUrl) => {
    if (!window.confirm('Hapus gambar ini?')) return;
    setImageError('');
    
    if (editingRoom) {
      // Jika edit: hapus dari server
      try {
        await deleteRoomImage(token, editingRoom.id, imageUrl);
        setRoomImages((prev) => prev.filter((u) => u !== imageUrl));
      } catch (err) {
        setImageError(err.message || 'Gagal menghapus gambar');
      }
    } else {
      // Jika create: hapus dari state lokal dan pending
      const imageIndex = roomImages.indexOf(imageUrl);
      if (imageIndex !== -1) {
        setRoomImages((prev) => prev.filter((u) => u !== imageUrl));
        setPendingImages((prev) => {
          const newPending = [...prev];
          newPending.splice(imageIndex, 1);
          return newPending;
        });
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      window.alert('Nama ruangan tidak boleh kosong');
      return;
    }
    if (!formState.location.trim()) {
      window.alert('Lokasi tidak boleh kosong');
      return;
    }
    if (!formState.floor.trim()) {
      window.alert('Lantai tidak boleh kosong');
      return;
    }

    const payload = {
      name: formState.name.trim(),
      location: formState.location.trim(),
      floor: formState.floor.trim(),
      maxGuests: Number(formState.maxGuests) || 1,
      amenities: formState.amenities,
    };

    try {
      if (editingRoom) {
        await onUpdateRoom(editingRoom.id, payload);
      } else {
        // Create room terlebih dahulu
        const newRoom = await onCreateRoom(payload);
        
        // Kemudian upload pending images jika ada
        if (pendingImages.length > 0 && newRoom && newRoom.id) {
          for (const file of pendingImages) {
            try {
              await uploadRoomImage(token, newRoom.id, file);
            } catch (err) {
              console.error('Gagal upload gambar:', err);
            }
          }
        }
      }
      handleCancel();
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Manajemen Ruangan</h2>
          <p className="mt-1 text-sm text-slate-700">Kelola daftar ruangan yang tersedia untuk booking.</p>
        </div>

        {!showForm && (
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-[#d9af49] to-[#a67f22] px-4 text-sm font-semibold text-white transition hover:opacity-90"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            Tambah Ruangan
          </button>
        )}
      </header>

      {showForm && (
        <form className="mb-6 rounded-xl border border-gold-100 bg-gold-50 p-4" onSubmit={handleSubmit}>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            {editingRoom ? `Edit: ${editingRoom.name}` : 'Tambah Ruangan Baru'}
          </h3>

          <div className="grid gap-3">
            <div className="grid grid-cols-[130px_1fr] items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Nama Ruangan *</label>
              <input
                className={fieldClass}
                type="text"
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nama ruangan"
                required
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Lokasi *</label>
              <input
                className={fieldClass}
                type="text"
                value={formState.location}
                onChange={(e) => setFormState((prev) => ({ ...prev, location: e.target.value }))}
                placeholder="Lokasi ruangan"
                required
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Lantai *</label>
              <input
                className={fieldClass}
                type="text"
                value={formState.floor}
                onChange={(e) => setFormState((prev) => ({ ...prev, floor: e.target.value }))}
                placeholder="Lantai ruangan"
                required
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Kapasitas</label>
              <input
                className={fieldClass}
                type="number"
                min="1"
                value={formState.maxGuests}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, maxGuests: parseInt(e.target.value, 10) || 1 }))
                }
                placeholder="Kapasitas maksimum"
              />
            </div>

            <div className="grid grid-cols-[130px_1fr] gap-3">
              <label className="pt-2 text-xs font-semibold text-slate-700">Fasilitas Ruangan</label>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
              {facilitiesLoading ? (
                <p className="text-xs text-slate-500">Memuat fasilitas...</p>
              ) : facilitiesError ? (
                <p className="text-xs text-red-500">{facilitiesError}</p>
              ) : facilities.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada fasilitas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {facilities.map((facility) => (
                    <label
                      key={facility.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-gold-600"
                        checked={formState.amenities.includes(facility.name)}
                        onChange={() => toggleAmenity(facility.name)}
                      />
                      {facility.name}
                    </label>
                  ))}
                </div>
              )}
              </div>
            </div>

            <div className="grid grid-cols-[130px_1fr] gap-3">
              <label className="pt-2 text-xs font-semibold text-slate-700">Gambar Ruangan</label>
              <div className="rounded-xl border border-slate-200 bg-white p-3">

              {roomImages.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {roomImages.map((url) => (
                    <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                      <img src={url} alt="room" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(url)}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-2 text-xs text-slate-500">Belum ada gambar.</p>
              )}

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-gold-300 bg-gold-50 px-3 py-1.5 text-xs font-semibold text-gold-600 hover:bg-gold-100">
                <ImagePlus size={13} />
                {imageUploading ? 'Mengupload...' : 'Tambah Gambar'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={imageUploading}
                />
              </label>

              {imageError && (
                <p className="mt-1.5 text-xs text-red-500">{imageError}</p>
              )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-[#d9af49] to-[#a67f22] px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                disabled={creatingRoom}
              >
                {creatingRoom ? 'Mengirim...' : editingRoom ? 'Update' : 'Tambah'}
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={handleCancel}
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-slate-600">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
          <span className="text-sm">Memuat ruangan...</span>
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
          Belum ada ruangan yang terdaftar. Klik &quot;Tambah Ruangan&quot; untuk membuat yang baru.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <article
              key={room.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-gold-300 hover:bg-gold-50"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{room.name}</p>
                  <p className="text-xs text-slate-600">Lantai: {room.floor}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                  onClick={() => {
                    if (window.confirm(`Hapus ruangan "${room.name}"?`)) {
                      onDeleteRoom(room.id);
                    }
                  }}
                  disabled={actionBusyKey === `delete:${room.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {room.imageUrls && room.imageUrls.length > 0 && (
                <div className="mb-2 overflow-hidden rounded-lg">
                  <img
                    src={room.imageUrls[0]}
                    alt={room.name}
                    className="h-28 w-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-1 text-xs text-slate-700">
                {room.location && <p>📍 {room.location}</p>}
                <p>👥 Kapasitas: {room.maxGuests} orang</p>
                {room.amenities && room.amenities.length > 0 && (
                  <p className="text-slate-600">🔧 {room.amenities.join(', ')}</p>
                )}
                {room.imageUrls && room.imageUrls.length > 1 && (
                  <p className="text-slate-500">🖼 {room.imageUrls.length} foto</p>
                )}
              </div>

              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-gold-600 transition hover:bg-gold-50"
                onClick={() => handleOpenEdit(room)}
              >
                Edit
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
