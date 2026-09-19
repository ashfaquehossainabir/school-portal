import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import StatCard from './StatCard';
import { formatMoney, formatDate } from '../utils/feeTypes';

// A compact "fees at a glance" block for dashboards — full detail, invoice
// downloads and payment history live on the dedicated Fees page.
export default function FeeSummaryWidget({ studentId, linkTo }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    api
      .get(`/fees/student/${studentId}`)
      .then((res) => setStats(res.data.stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <p>Loading fee status...</p>;
  if (!stats) return null;

  return (
    <div className="fsw-root">
      <div className="fsw-head">
        <h3 style={{ margin: 0 }}>Fee Status</h3>
        {linkTo && (
          <button type="button" className="btn btn-outline fsw-view-btn" onClick={() => navigate(linkTo)}>
            View details
          </button>
        )}
      </div>
      <div className="grid grid-cols-4 fsw-grid">
        <StatCard label="Total Billed" value={formatMoney(stats.totalBilled)} icon="🧾" />
        <StatCard label="Total Paid" value={formatMoney(stats.totalPaid)} color="var(--success)" icon="✅" />
        <StatCard
          label="Balance Due"
          value={formatMoney(stats.totalDue)}
          color={stats.totalDue > 0 ? 'var(--danger)' : 'var(--success)'}
          icon="⏳"
        />
        <StatCard
          label={stats.nextDueDate ? 'Next Due Date' : 'Overdue'}
          value={stats.nextDueDate ? formatDate(stats.nextDueDate) : stats.overdueCount}
          color={stats.overdueCount > 0 ? 'var(--danger)' : 'var(--accent)'}
          icon="📅"
        />
      </div>
      <style>{`
        .fsw-root {
          margin-top: 20px;
        }
        .fsw-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .fsw-grid {
          margin-bottom: 0;
        }
        @media (max-width: 640px) {
          .fsw-view-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
