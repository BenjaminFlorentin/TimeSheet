type Props = {
  title: string;
  value: string;
  subtitle?: string;
  accent?: 'sky' | 'violet';
};

export default function SummaryCard({ title, value, subtitle, accent = 'sky' }: Props) {
  const gradient =
    accent === 'sky'
      ? 'from-sky-500/20 to-sky-500/5 border-sky-500/30'
      : 'from-violet-500/20 to-violet-500/5 border-violet-500/30';
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${gradient} p-5`}>
      <p className="text-sm text-muted uppercase tracking-wide">{title}</p>
      <p className="text-4xl font-semibold mt-2">{value}</p>
      {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
    </div>
  );
}
