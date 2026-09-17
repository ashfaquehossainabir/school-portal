import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StatCard from './StatCard';
import { formatAmount } from '../utils/feeStatus';

export default function FeeStatusWidget({ studentId }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    api
      .get(`/fees/student/${studentId}`)
      .then((res) => setSummary(res.data.summary))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return null;
  if (!summary) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Fee Status</h3>
        <Link to="/parent/fees" className="btn btn-outline">View full details</Link>
      </div>
      <div className="grid grid-cols-4">
        <StatCard label="Total Charged" value={formatAmount(summary.totalCharged)} />
        <StatCard label="Total Paid" value={formatAmount(summary.totalPaid)} color="var(--success)" />
        <StatCard label="Outstanding" value={formatAmount(summary.totalOutstanding)} color={summary.totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)'} />
        <StatCard label="Overdue Items" value={summary.overdueCount || 0} color={summary.overdueCount ? 'var(--danger)' : 'var(--success)'} />
      </div>
    </div>
  );
}
