export default function StatCard({ label, value, color = 'var(--accent)', icon, onClick }) {
  return (
    <div
      className="card stat-card"
      style={{ display: 'flex', flexDirection: 'column', gap: 14, cursor: onClick ? 'pointer' : 'default', borderTop: `3px solid ${color}` }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>{label}</span>
        {icon && (
          <span
            style={{
              fontSize: 16,
              width: 32,
              height: 32,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-hover)',
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
