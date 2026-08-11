import {
  Building2,
  CalendarDays,
  Clock,
  LayoutDashboard,
  Users,
  Zap,
} from 'lucide-react';

export const DASHBOARD_MENU_ITEMS = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Ringkasan operasional',
    icon: LayoutDashboard,
    href: '/dashboard?menu=overview',
  },
  {
    key: 'bookings',
    label: 'Booking Calendar',
    description: 'Kelola booking harian',
    icon: CalendarDays,
    href: '/dashboard?menu=bookings',
  },
  {
    key: 'history',
    label: 'Riwayat',
    description: 'Daftar riwayat booking',
    icon: Clock,
    href: '/dashboard/history',
  },
  {
    key: 'rooms',
    label: 'Rooms',
    description: 'Kelola ruangan',
    icon: Building2,
    href: '/dashboard?menu=rooms',
  },
  {
    key: 'facilities',
    label: 'Facilities',
    description: 'Kelola fasilitas ruangan',
    icon: Zap,
    href: '/dashboard?menu=facilities',
  },
  {
    key: 'users',
    label: 'User Management',
    description: 'Atur akun dan role',
    icon: Users,
    href: '/dashboard?menu=users',
  },
];

const VALID_MENU_KEYS = new Set(DASHBOARD_MENU_ITEMS.map((item) => item.key));

export function resolveDashboardMenu(menuParam) {
  if (menuParam && VALID_MENU_KEYS.has(menuParam) && menuParam !== 'history') {
    return menuParam;
  }
  return 'overview';
}

export function getDashboardMenuHref(key) {
  const item = DASHBOARD_MENU_ITEMS.find((entry) => entry.key === key);
  return item?.href || '/dashboard?menu=overview';
}
