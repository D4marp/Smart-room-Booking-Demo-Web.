'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Building2, CheckCircle2, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { getMe, login } from '@/lib/api';
import { clearSession, isAdminRole, saveSession } from '@/lib/storage';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const denied = new URLSearchParams(window.location.search).get('denied');
    if (denied === '1') {
      setError('Akun Anda tidak punya akses dashboard admin.');
    }
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      clearSession();
      const authData = await login(email.trim(), password);
      const token = authData?.token;
      const fallbackUser = authData?.user;

      if (!token) {
        throw new Error('Token tidak diterima dari backend');
      }

      const profile = await getMe(token);
      const currentUser = profile || fallbackUser;

      if (!currentUser || !isAdminRole(currentUser.role)) {
        throw new Error('Hanya role admin/superadmin yang bisa login ke dashboard ini');
      }

      saveSession(token, currentUser);
      router.replace('/dashboard');
    } catch (submitError) {
      setError(submitError.message || 'Login gagal. Silakan cek kredensial.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(0,153,255,0.18),transparent_28%),radial-gradient(circle_at_88%_10%,rgba(255,195,0,0.14),transparent_22%),linear-gradient(180deg,rgba(244,249,255,0.96),rgba(239,247,255,0.9))]" />

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#0b1e33] text-white shadow-2xl shadow-slate-300/40">
        <div className="grid h-full gap-6 p-8 md:p-10">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-6">
            <Image src="/logo.png" alt="UNESA" width={240} height={76} className="h-auto w-auto" priority />
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-200">
              Admin Access
            </div>
          </div>

          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold-200">Smart Room Scheduler</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-white md:text-5xl">
              Portal operasional booking ruang yang formal, cepat, dan siap presentasi.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Login ke Smart Room Scheduler untuk mengelola booking, memantau kalender operasional, dan menjalankan
              kontrol user UNESA dengan tampilan enterprise.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Building2 size={18} className="text-gold-300" />
              <p className="mt-3 text-sm font-semibold">Booking Operasional</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">Tampilan kalender yang jelas untuk approval cepat.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <ShieldCheck size={18} className="text-gold-300" />
              <p className="mt-3 text-sm font-semibold">Akses Terkontrol</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">Role admin dan superadmin dipisahkan dengan aman.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <Sparkles size={18} className="text-gold-300" />
              <p className="mt-3 text-sm font-semibold">Siap Presentasi</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">Branding, spacing, dan hierarchy dibuat lebih enterprise.</p>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap gap-3 border-t border-white/10 pt-6 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <CheckCircle2 size={14} className="text-emerald-300" />
              Audit-ready
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <CheckCircle2 size={14} className="text-emerald-300" />
              UNESA branding
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <CheckCircle2 size={14} className="text-emerald-300" />
              JWT secured
            </span>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-2xl shadow-slate-200/70 backdrop-blur md:p-10">
          <div className="mb-8 grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-gold-600">Smart Room Scheduler</p>
            <h2 className="text-3xl font-bold text-slate-900">Masuk ke dashboard</h2>
            <p className="text-sm leading-6 text-slate-600">
              Gunakan akun admin atau superadmin untuk mengakses booking calendar dan manajemen user UNESA.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 transition focus-within:border-gold-400 focus-within:bg-white">
                <Mail size={17} className="text-slate-400" />
                <input
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-full w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  required
                />
              </div>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 transition focus-within:border-gold-400 focus-within:bg-white">
                <LockKeyhole size={17} className="text-slate-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-full w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  required
                />
              </div>
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#d9af49] to-[#a67f22] px-4 font-semibold text-white shadow-lg shadow-gold-200 transition hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              <span>{loading ? 'Memproses...' : 'Masuk ke Dashboard'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
