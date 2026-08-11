import clsx from 'clsx';

export default function StatCard({ label, value, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'border-slate-200 bg-white text-slate-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    positive: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    accent: 'border-gold-200 bg-gold-50 text-gold-900',
  }[tone] || 'border-slate-200 bg-white text-slate-900';

  return (
    <article className={clsx('rounded-2xl border p-5 shadow-sm', toneClass)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <h3 className="mt-2 text-3xl font-bold">{value}</h3>
    </article>
  );
}
