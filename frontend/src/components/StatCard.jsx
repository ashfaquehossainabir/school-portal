export default function StatCard({ label, value, color = 'var(--accent)', icon, onClick }) {
  return (
    <div
      className="card stat-card"
      style={{ display: 'flex', flexDirection: 'column', gap: 6, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{label}</span>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      </div>
      <span style={{ fontSize: 30, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
