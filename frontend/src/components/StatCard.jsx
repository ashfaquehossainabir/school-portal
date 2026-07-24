export default function StatCard({ label, value, color = 'var(--accent)', icon }) {
  return (
    <div className="card stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{label}</span>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      </div>
      <span style={{ fontSize: 30, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
