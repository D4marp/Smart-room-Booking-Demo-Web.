'use client';

import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';

const ROLE_OPTIONS = ['user', 'booking', 'admin'];

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-gold-400';

export default function UserManagement({
  canManage,
  users,
  loading,
  filters,
  onFiltersChange,
  onCreateUser,
  onChangeRole,
  onDeleteUser,
  actionBusyKey,
  creating,
  currentUserId,
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    city: '',
  });

  const submitCreate = async (event) => {
    event.preventDefault();
    await onCreateUser({
      ...form,
      city: form.city || undefined,
    });
    setForm((prev) => ({ ...prev, name: '', email: '', password: '', city: '' }));
  };

  if (!canManage) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-3">
          <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
          <p className="mt-1 text-sm text-slate-700">Endpoint manajemen user hanya untuk role superadmin.</p>
        </header>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
          Akun admin biasa dapat melihat dashboard booking, tapi tidak dapat mengelola user.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-slate-900">User Management</h2>
        <p className="mt-1 text-sm text-slate-700">Buat akun baru, ganti role, dan hapus akun non-superadmin.</p>
      </header>

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Search size={16} className="text-slate-400" />
          <input
            type="search"
            className="h-full w-full border-0 bg-transparent text-sm text-slate-700 outline-none"
            placeholder="Cari nama atau email"
            value={filters.search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          />
        </label>

        <select
          className={inputClass}
          value={filters.role}
          onChange={(event) => onFiltersChange({ ...filters, role: event.target.value })}
          aria-label="Filter role"
        >
          <option value="">Semua Role</option>
          <option value="user">User</option>
          <option value="booking">Booking</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </div>

      <form className="mb-4 rounded-xl border border-gold-100 bg-gold-50/60 p-4" onSubmit={submitCreate}>
        <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-800">
          <UserPlus size={16} />
          Create User
        </h3>

        <div className="grid gap-2 md:grid-cols-3">
          <input
            type="text"
            className={inputClass}
            placeholder="Nama"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            type="email"
            className={inputClass}
            placeholder="Email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
          <input
            type="password"
            className={inputClass}
            placeholder="Password"
            minLength={6}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
          <select
            className={inputClass}
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <input
            type="text"
            className={inputClass}
            placeholder="City (opsional)"
            value={form.city}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
          />
          <button
            className="h-11 rounded-xl bg-gradient-to-r from-[#d9af49] to-[#a67f22] px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {loading ? (
          <div className="p-4 text-sm text-slate-600">Memuat data user...</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-sm text-slate-600">Tidak ada user sesuai filter.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isSuperadmin = user.role === 'superadmin';

              return (
                <article key={user.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <span className="text-sm text-slate-600">{user.email}</span>
                  </div>

                  <div className="flex w-full items-center gap-2 md:w-auto">
                    <select
                      className={inputClass}
                      value={user.role}
                      onChange={(event) => onChangeRole(user, event.target.value)}
                      disabled={isSelf || isSuperadmin || actionBusyKey === `role:${user.id}`}
                    >
                      <option value="user">user</option>
                      <option value="booking">booking</option>
                      <option value="admin">admin</option>
                      <option value="superadmin">superadmin</option>
                    </select>

                    <button
                      type="button"
                      className="h-11 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onDeleteUser(user)}
                      disabled={isSelf || isSuperadmin || actionBusyKey === `delete:${user.id}`}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
