'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  LogOut,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import BookingHistoryPanel from '@/components/BookingHistoryPanel';
import BookingCalendar from '@/components/BookingCalendar';
import RoomManagement from '@/components/RoomManagement';
import FacilitiesManagement from '@/components/FacilitiesManagement';
import SatisfactionWidget from '@/components/SatisfactionWidget';
import StatCard from '@/components/StatCard';
import UserManagement from '@/components/UserManagement';
import {
  approveBooking,
  changeUserRole,
  completeBooking,
  createBooking,
  createRoom,
  createUser,
  deleteRoom,
  deleteUser,
  getAdminBookings,
  getFeedbackStats,
  getMe,
  getStats,
  listRooms,
  listUsers,
  rejectBooking,
  updateRoom,
} from '@/lib/api';
import {
  clearSession,
  getStoredUser,
  getToken,
  isAdminRole,
  saveSession,
} from '@/lib/storage';
import { DASHBOARD_MENU_ITEMS, resolveDashboardMenu } from '@/lib/dashboard-nav';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-600">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-200 border-t-gold-500" />
          <p className="text-sm">Memuat dashboard...</p>
        </main>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bootLoading, setBootLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [token, setToken] = useState('');
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [stats, setStats] = useState({});
  const [feedbackStats, setFeedbackStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [overviewYearFilter, setOverviewYearFilter] = useState(String(new Date().getFullYear()));
  const [overviewMonthFilter, setOverviewMonthFilter] = useState('');
  const [actionLoadingKey, setActionLoadingKey] = useState('');
  const [creatingBooking, setCreatingBooking] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [userActionKey, setUserActionKey] = useState('');
  const [userFilters, setUserFilters] = useState({ search: '', role: '' });

  const [roomsLoading, setRoomsLoading] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [roomActionKey, setRoomActionKey] = useState('');

  const [activeMenu, setActiveMenu] = useState(() => resolveDashboardMenu(searchParams.get('menu')));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const loadStatsAndBookings = useCallback(
    async (activeToken, feedbackFilters = {}) => {
      setDashboardLoading(true);
      setError('');

      try {
        const [statsData, bookingData, feedbackData] = await Promise.all([
          getStats(activeToken),
          getAdminBookings(activeToken, {
            status: statusFilter || undefined,
          }),
          getFeedbackStats(activeToken, feedbackFilters),
        ]);

        setStats(statsData || {});
        setFeedbackStats(feedbackData || {});
        setBookings(Array.isArray(bookingData) ? bookingData : []);
      } catch (loadError) {
        setError(loadError.message || 'Gagal memuat dashboard');
      } finally {
        setDashboardLoading(false);
      }
    },
    [statusFilter],
  );

  const loadUsers = useCallback(async () => {
    if (!token || currentUser?.role !== 'superadmin') return;

    setUsersLoading(true);
    setError('');

    try {
      const list = await listUsers(token, {
        search: userFilters.search || undefined,
        role: userFilters.role || undefined,
      });
      setUsers(Array.isArray(list) ? list : []);
    } catch (usersError) {
      setError(usersError.message || 'Gagal memuat user');
    } finally {
      setUsersLoading(false);
    }
  }, [token, currentUser?.role, userFilters]);

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setError('');
    try {
      const roomList = await listRooms();
      setRooms(Array.isArray(roomList) ? roomList : []);
    } catch (roomsError) {
      setError(roomsError.message || 'Gagal memuat ruangan');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveMenu(resolveDashboardMenu(searchParams.get('menu')));
  }, [searchParams]);

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      const activeToken = getToken();
      if (!activeToken) {
        router.replace('/login');
        return;
      }

      try {
        const profile = await getMe(activeToken);
        if (ignore) return;

        if (!profile || !isAdminRole(profile.role)) {
          clearSession();
          router.replace('/login?denied=1');
          return;
        }

        saveSession(activeToken, profile);
        setToken(activeToken);
        setCurrentUser(profile);
        await loadStatsAndBookings(activeToken, {
          year: overviewYearFilter || undefined,
          month: overviewMonthFilter || undefined,
        });
        await loadRooms();
      } catch (bootstrapError) {
        if (ignore) return;
        setError(bootstrapError.message || 'Gagal memverifikasi sesi admin');
        router.replace('/login');
      } finally {
        if (!ignore) setBootLoading(false);
      }
    }

    bootstrap();

    return () => {
      ignore = true;
    };
  }, [loadRooms, loadStatsAndBookings, overviewMonthFilter, overviewYearFilter, router]);

  useEffect(() => {
    if (!token) return;
    loadStatsAndBookings(token, {
      year: overviewYearFilter || undefined,
      month: overviewMonthFilter || undefined,
    });
  }, [token, overviewYearFilter, overviewMonthFilter, loadStatsAndBookings]);

  useEffect(() => {
    if (!token || currentUser?.role !== 'superadmin') return;

    const timer = setTimeout(() => {
      loadUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [token, currentUser?.role, userFilters, loadUsers]);

  const handleCreateRoom = async (payload) => {
    if (!token) return;

    setCreatingRoom(true);
    setError('');
    setInfo('');

    try {
      await createRoom(token, payload);
      setInfo('Ruangan baru berhasil dibuat.');
      await loadRooms();
    } catch (createError) {
      setError(createError.message || 'Gagal membuat ruangan');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleUpdateRoom = async (roomId, payload) => {
    if (!token) return;

    setRoomActionKey(`update:${roomId}`);
    setError('');
    setInfo('');

    try {
      await updateRoom(token, roomId, payload);
      setInfo('Ruangan berhasil diperbarui.');
      await loadRooms();
    } catch (updateError) {
      setError(updateError.message || 'Gagal memperbarui ruangan');
    } finally {
      setRoomActionKey('');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!token) return;

    setRoomActionKey(`delete:${roomId}`);
    setError('');
    setInfo('');

    try {
      await deleteRoom(token, roomId);
      setInfo('Ruangan berhasil dihapus.');
      await loadRooms();
    } catch (deleteError) {
      setError(deleteError.message || 'Gagal menghapus ruangan');
    } finally {
      setRoomActionKey('');
    }
  };

  const statsView = useMemo(() => {
    const bookingStats = stats.bookings || {};
    const roomStats = stats.rooms || {};
    const feedbackRate = Number(feedbackStats.satisfactionRate || 0);

    return {
      totalBookings: bookingStats.total ?? 0,
      pending: bookingStats.pending ?? 0,
      confirmed: bookingStats.confirmed ?? 0,
      rooms: roomStats.total ?? 0,
      feedbackRate,
      feedbackSatisfied: feedbackStats.satisfied ?? 0,
      feedbackUnsatisfied: feedbackStats.unsatisfied ?? 0,
      feedbackTotal: feedbackStats.total ?? 0,
    };
  }, [stats, feedbackStats]);

  const refreshDashboard = async () => {
    if (!token) return;
    setInfo('Data dashboard diperbarui.');
    await loadStatsAndBookings(token, {
      year: overviewYearFilter || undefined,
      month: overviewMonthFilter || undefined,
    });
    await loadRooms();
  };

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const handleBookingAction = async (action, booking) => {
    if (!token) return;

    const key = `${action}:${booking.id}`;
    setActionLoadingKey(key);
    setError('');
    setInfo('');

    try {
      if (action === 'approve') {
        await approveBooking(token, booking.id, { note: 'approved from admin web' });
        setInfo('Booking berhasil di-approve.');
      }

      if (action === 'reject') {
        const reason = window.prompt('Masukkan alasan reject (minimal 5 karakter):', '');
        if (!reason) {
          return;
        }
        await rejectBooking(token, booking.id, reason);
        setInfo('Booking berhasil di-reject.');
      }

      if (action === 'complete') {
        await completeBooking(token, booking.id);
        setInfo('Booking ditandai completed.');
      }

      await loadStatsAndBookings(token, {
      year: overviewYearFilter || undefined,
      month: overviewMonthFilter || undefined,
    });
    } catch (bookingError) {
      setError(bookingError.message || 'Aksi booking gagal dijalankan');
    } finally {
      setActionLoadingKey('');
    }
  };

  const handleCreateBooking = async (payload) => {
    if (!token) return;

    setCreatingBooking(true);
    setError('');
    setInfo('');

    try {
      await createBooking(token, payload);
      setInfo('Booking berhasil diajukan dan menunggu approval admin.');
      await loadStatsAndBookings(token, {
      year: overviewYearFilter || undefined,
      month: overviewMonthFilter || undefined,
    });
    } catch (createError) {
      setError(createError.message || 'Gagal membuat booking');
    } finally {
      setCreatingBooking(false);
    }
  };

  const handleCreateUser = async (payload) => {
    if (!token) return;

    setCreatingUser(true);
    setError('');
    setInfo('');

    try {
      await createUser(token, payload);
      setInfo('User baru berhasil dibuat.');
      await loadUsers();
    } catch (createError) {
      setError(createError.message || 'Gagal membuat user baru');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleChangeRole = async (user, nextRole) => {
    if (!token || user.role === nextRole) return;

    setUserActionKey(`role:${user.id}`);
    setError('');
    setInfo('');

    try {
      await changeUserRole(token, user.id, nextRole);
      setInfo(`Role ${user.email} berubah ke ${nextRole}.`);
      await loadUsers();
    } catch (changeError) {
      setError(changeError.message || 'Gagal mengubah role user');
    } finally {
      setUserActionKey('');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!token) return;

    const confirmed = window.confirm(`Hapus user ${user.email}?`);
    if (!confirmed) return;

    setUserActionKey(`delete:${user.id}`);
    setError('');
    setInfo('');

    try {
      await deleteUser(token, user.id);
      setInfo(`User ${user.email} berhasil dihapus.`);
      await loadUsers();
    } catch (deleteError) {
      setError(deleteError.message || 'Gagal menghapus user');
    } finally {
      setUserActionKey('');
    }
  };

  if (bootLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-600">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-200 border-t-gold-500" />
        <p className="text-sm">Memverifikasi sesi admin...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-slate-200 bg-[#0b1e33] p-5 text-white shadow-2xl lg:flex lg:flex-col">
        <div className="mb-8 border-b border-white/10 pb-5">
          <Image src="/logo.png" alt="UNESA" width={220} height={70} className="h-auto w-auto" priority />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-300">Smart Room Scheduler</p>
        </div>

        <nav className="grid gap-2">
          {DASHBOARD_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeMenu === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === 'history') {
                    router.push(item.href);
                    return;
                  }
                  setActiveMenu(item.key);
                  router.replace(item.href, { scroll: false });
                }}
                className={[
                  'group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-left transition',
                  active
                    ? 'bg-white/12 text-white shadow-lg shadow-black/20 ring-1 ring-white/10'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white',
                ].join(' ')}
              >
                <span
                  className={[
                    'absolute left-0 top-0 h-full w-1 rounded-r-full transition',
                    active ? 'bg-[#d9af49]' : 'bg-transparent group-hover:bg-gold-400/60',
                  ].join(' ')}
                />
                <span className={[
                  'grid h-10 w-10 shrink-0 place-items-center rounded-xl transition',
                  active ? 'bg-gradient-to-br from-[#d9af49] to-[#a67f22] text-white' : 'bg-white/10 text-gold-200',
                ].join(' ')}>
                  <Icon size={18} />
                </span>
                <span className="grid gap-0.5">
                  <span className="text-sm font-semibold leading-none">{item.label}</span>
                  <span className={active ? 'text-xs text-slate-200' : 'text-xs text-slate-400'}>{item.description}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="px-4 py-4 lg:ml-72 lg:px-6">
        <header className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <Image src="/logo.png" alt="UNESA" width={170} height={54} className="h-auto w-auto max-w-[65vw]" priority />
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
              Admin Access
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
            {DASHBOARD_MENU_ITEMS.map((item) => {
              const active = activeMenu === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.key === 'history') {
                      router.push(item.href);
                      return;
                    }
                    setActiveMenu(item.key);
                    router.replace(item.href, { scroll: false });
                  }}
                  className={[
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    active ? 'bg-gold-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600">Smart Room Scheduler</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Booking & User Management</h1>
              <p className="mt-1 text-sm text-slate-800">
                Login sebagai <strong>{currentUser?.role}</strong> • {currentUser?.email}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:border-gold-200 hover:bg-gold-50"
                onClick={refreshDashboard}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {info ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <ShieldCheck size={16} />
            <span>{info}</span>
          </div>
        ) : null}

        {activeMenu === 'overview' && (
          <section className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Bookings" value={statsView.totalBookings} tone="neutral" />
              <StatCard label="Pending Approval" value={statsView.pending} tone="warning" />
              <StatCard label="Confirmed" value={statsView.confirmed} tone="positive" />
              <StatCard label="Total Rooms" value={statsView.rooms} tone="accent" />
            </div>

            <SatisfactionWidget
              stats={statsView}
              bookings={bookings}
              rooms={rooms}
              yearFilter={overviewYearFilter}
              monthFilter={overviewMonthFilter}
              onYearFilterChange={setOverviewYearFilter}
              onMonthFilterChange={setOverviewMonthFilter}
            />

            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Ringkasan Operasional</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-800">
                  Dashboard ini memberi pandangan cepat atas aktivitas booking ruang rapat.
                  Periksa booking berstatus pending, konfirmasi booking yang siap digunakan,
                  dan batalkan booking yang tidak diperlukan agar ruang tetap tersedia untuk tim.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-gold-500" />
                    Pantau jumlah booking, approval, dan ruang yang siap dipakai setiap hari.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-gold-500" />
                    Gunakan Booking Calendar untuk memilih tanggal dan mengelola booking secara operasional.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-gold-500" />
                    Pastikan booking confirmed ditandai complete setelah acara selesai.
                  </li>
                </ul>
                <div className="mt-4 inline-flex rounded-lg bg-gold-50 px-3 py-2 text-xs font-semibold text-gold-700">
                  {dashboardLoading ? 'Menyinkronkan data...' : `Data terakhir tersinkron: ${new Date().toLocaleTimeString('id-ID')}`}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xl font-semibold text-slate-900">Riwayat Booking Terbaru</h2>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {Math.min(bookings.length, 5)} preview
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <BookingHistoryPanel
                    bookings={bookings}
                    rooms={rooms}
                    showHeader={false}
                    showFilters={false}
                    showExport={false}
                    previewLimit={5}
                    emptyMessage="Belum ada riwayat booking untuk ditampilkan."
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {activeMenu === 'bookings' && (
          <BookingCalendar
            bookings={bookings}
            rooms={rooms}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            loading={dashboardLoading}
            actionLoadingKey={actionLoadingKey}
            creatingBooking={creatingBooking}
            onBookingAction={handleBookingAction}
            onCreateBooking={handleCreateBooking}
          />
        )}

        {activeMenu === 'rooms' && (
          <RoomManagement
            rooms={rooms}
            loading={roomsLoading}
            token={token}
            onCreateRoom={handleCreateRoom}
            onUpdateRoom={handleUpdateRoom}
            onDeleteRoom={handleDeleteRoom}
            creatingRoom={creatingRoom}
            actionBusyKey={roomActionKey}
          />
        )}

        {activeMenu === 'facilities' && (
          <FacilitiesManagement
            token={token}
            onFacilitiesChange={(facilities) => {
              // Update reference jika diperlukan
            }}
          />
        )}

        {activeMenu === 'users' && (
          <UserManagement
            canManage={currentUser?.role === 'superadmin'}
            users={users}
            loading={usersLoading}
            filters={userFilters}
            onFiltersChange={setUserFilters}
            onCreateUser={handleCreateUser}
            onChangeRole={handleChangeRole}
            onDeleteUser={handleDeleteUser}
            actionBusyKey={userActionKey}
            creating={creatingUser}
            currentUserId={currentUser?.id}
          />
        )}
      </main>
    </div>
  );
}
