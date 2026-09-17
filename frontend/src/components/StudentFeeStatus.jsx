import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatCard from './StatCard';
import FeeReceipt from './FeeReceipt';
import { CATEGORY_LABELS, FEE_STATUS_LABELS, METHOD_LABELS, formatAmount, formatDate } from '../utils/feeStatus';

export default function StudentFeeStatus({ studentId }) {
  const [data, setData] = useState({ invoices: [], summary: {} });
  const [payments, setPayments] = useState([]);
  const [view, setView] = useState('status'); // 'status' | 'history'
  const [loading, setLoading] = useState(true);
  const [receiptId, setReceiptId] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    Promise.all([
      api.get(`/fees/student/${studentId}`),
      api.get(`/fees/student/${studentId}/payments`),
    ])
      .then(([feesRes, paymentsRes]) => {
        setData(feesRes.data);
        setPayments(paymentsRes.data);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  const { invoices, summary } = data;

  if (loading) return <p>Loading fee details...</p>;

  return (
    <div className="fee-status">
      <div className="grid grid-cols-4" style={{ marginBottom: 20 }}>
        <StatCard label="Total Charged" value={formatAmount(summary.totalCharged)} />
        <StatCard label="Total Paid" value={formatAmount(summary.totalPaid)} color="var(--success)" />
        <StatCard label="Outstanding" value={formatAmount(summary.totalOutstanding)} color={summary.totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)'} />
        <StatCard label="Overdue Items" value={summary.overdueCount || 0} color={summary.overdueCount ? 'var(--danger)' : 'var(--success)'} />
      </div>

      <div className="fee-view-toggle">
        <button type="button" className={`btn ${view === 'status' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('status')}>Fee Status</button>
        <button type="button" className={`btn ${view === 'history' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('history')}>Payment History</button>
      </div>

      {view === 'status' ? (
        invoices.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No fees have been charged yet.</p>
        ) : (
          invoices.map((inv) => (
            <div key={inv._id} className="modal-wrapper fee-row">
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong>{inv.title}</strong>
                  <span className={`badge badge-${inv.status}`}>{FEE_STATUS_LABELS[inv.status]}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                  {CATEGORY_LABELS[inv.category]} · Due {formatDate(inv.dueDate)}
                  {inv.discount > 0 && ` · Discount ${formatAmount(inv.discount)}`}
                </p>
              </div>
              <div className="fee-row-amount">
                <div style={{ fontWeight: 700 }}>{formatAmount(inv.netAmount)}</div>
                {inv.amountPaid > 0 && inv.status !== 'paid' && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Paid {formatAmount(inv.amountPaid)}</div>
                )}
              </div>
            </div>
          ))
        )
      ) : payments.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No payments recorded yet.</p>
      ) : (
        payments.map((p) => (
          <div key={p._id} className="modal-wrapper fee-row">
            <div>
              <strong>{p.invoice?.title || 'Payment'}</strong>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {formatDate(p.paidOn)} · {METHOD_LABELS[p.method]} · {p.receiptNumber}
              </p>
            </div>
            <div className="fee-row-amount" style={{ alignItems: 'flex-end' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{formatAmount(p.amount)}</div>
              <button className="btn btn-outline" onClick={() => setReceiptId(p._id)}>Receipt</button>
            </div>
          </div>
        ))
      )}

      {receiptId && <FeeReceipt paymentId={receiptId} onClose={() => setReceiptId(null)} />}

      <style>{`
        .fee-view-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .fee-row {
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .fee-row-amount {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
        }

        @media (max-width: 640px) {
          .fee-view-toggle .btn { flex: 1 1 auto; }
          .fee-row { flex-direction: column; align-items: flex-start; }
          .fee-row-amount { align-items: flex-start; text-align: left; width: 100%; }
        }
      `}</style>
    </div>
  );
}
