'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-600">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-200 border-t-gold-500" />
      <p className="text-sm">Preparing admin workspace...</p>
    </main>
  );
}
