import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatCard from './StatCard';
import { generateInvoicePdf, generateReceiptPdf } from '../utils/generateFeePdf';
import {
  FEE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatMoney,
  formatDate,
} from '../utils/feeTypes';

export default function FeeView({ studentId, student }) {
  const [data, setData] = useState({ invoices: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    api
      .get(`/fees/student/${studentId}`)
      .then((res) => setData(res.data))
      .catch(() => setData({ invoices: [], stats: {} }))
      .finally(() => setLoading(false));
  }, [studentId]);

  const { invoices, stats } = data;

  if (loading) return <p>Loading fee status...</p>;

  return (
    <div className="fv-root">
      <div className="fv-stats-grid">
        <StatCard label="Total Billed" value={formatMoney(stats.totalBilled)} icon="🧾" />
        <StatCard label="Total Paid" value={formatMoney(stats.totalPaid)} color="var(--success)" icon="✅" />
        <StatCard
          label="Balance Due"
          value={formatMoney(stats.totalDue)}
          color={stats.totalDue > 0 ? 'var(--danger)' : 'var(--success)'}
          icon="⏳"
        />
        <StatCard
          label={stats.nextDueDate ? 'Next Due Date' : 'Overdue Invoices'}
          value={stats.nextDueDate ? formatDate(stats.nextDueDate) : stats.overdueCount}
          color={stats.overdueCount > 0 ? 'var(--danger)' : 'var(--accent)'}
          icon="📅"
        />
      </div>

      <h3 className="fv-section-title">Invoices</h3>
      {invoices.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No fee invoices raised yet.</p>}

      <div className="fv-invoice-list">
        {invoices.map((inv) => {
          const isOpen = openId === inv._id;
          const itemsTotal = inv.items.reduce((s, i) => s + i.amount, 0);
          return (
            <div className="modal-wrapper fv-invoice-card" key={inv._id}>
              <div className="fv-invoice-head" onClick={() => setOpenId(isOpen ? null : inv._id)}>
                <div className="fv-invoice-head-main">
                  <span className={`badge badge-fee-${inv.status}`} style={{ background: `${STATUS_COLORS[inv.status]}22`, color: STATUS_COLORS[inv.status] }}>
                    {STATUS_LABELS[inv.status]}
                  </span>
                  <div>
                    <div className="fv-invoice-title">{inv.title}</div>
                    <div className="fv-invoice-sub">
                      {inv.invoiceNo} · Due {formatDate(inv.dueDate)}
                      {inv.term ? ` · ${inv.term}` : ''}
                    </div>
                  </div>
                </div>
                <div className="fv-invoice-head-amounts">
                  <div>
                    <span className="fv-amount-label">Total</span>
                    <span className="fv-amount-value">{formatMoney(inv.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="fv-amount-label">Due</span>
                    <span className="fv-amount-value" style={{ color: inv.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {formatMoney(inv.balance)}
                    </span>
                  </div>
                  <span className="fv-chevron">{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {isOpen && (
                <div className="fv-invoice-body">
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Description</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map((item, i) => (
                          <tr key={i}>
                            <td>{FEE_TYPE_LABELS[item.type] || item.type}</td>
                            <td>{item.label}</td>
                            <td>{formatMoney(item.amount)}</td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>Subtotal</td>
                          <td>{formatMoney(itemsTotal)}</td>
                        </tr>
                        {inv.discount?.amount > 0 && (
                          <tr>
                            <td colSpan={2} style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                              Discount{inv.discount.reason ? ` (${inv.discount.reason})` : ''}
                            </td>
                            <td>- {formatMoney(inv.discount.amount)}</td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700 }}>Total</td>
                          <td style={{ fontWeight: 700 }}>{formatMoney(inv.totalAmount)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {inv.payments?.length > 0 && (
                    <>
                      <h4 style={{ marginBottom: 8 }}>Payment History</h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Method</th>
                              <th>Amount</th>
                              <th>Receipt</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inv.payments.map((p) => (
                              <tr key={p._id}>
                                <td>{formatDate(p.date)}</td>
                                <td>{PAYMENT_METHOD_LABELS[p.method] || p.method}</td>
                                <td>{formatMoney(p.amount)}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-outline fv-mini-btn"
                                    onClick={() => generateReceiptPdf(inv, p, student)}
                                  >
                                    Download
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <div className="fv-invoice-actions">
                    <button type="button" className="btn btn-primary" onClick={() => generateInvoicePdf(inv, student)}>
                      Download Invoice PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .fv-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }
        .fv-section-title {
          margin-bottom: 14px;
        }
        .fv-invoice-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .fv-invoice-card {
          cursor: default;
        }
        .fv-invoice-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          cursor: pointer;
        }
        .fv-invoice-head-main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .fv-invoice-title {
          font-weight: 700;
          font-size: 14.5px;
        }
        .fv-invoice-sub {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .fv-invoice-head-amounts {
          display: flex;
          align-items: center;
          gap: 22px;
        }
        .fv-amount-label {
          display: block;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 700;
        }
        .fv-amount-value {
          display: block;
          font-weight: 700;
          font-size: 14px;
        }
        .fv-chevron {
          color: var(--text-muted);
          font-size: 12px;
        }
        .fv-invoice-body {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }
        .fv-invoice-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 14px;
        }
        .fv-mini-btn {
          padding: 5px 10px;
          font-size: 12px;
        }

        /* ===== Laptop ===== */
        @media (max-width: 1024px) {
          .fv-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* ===== Tablet ===== */
        @media (max-width: 900px) {
          .fv-invoice-head-amounts {
            gap: 16px;
          }
          table {
            font-size: 13px;
          }
        }

        /* ===== Mobile ===== */
        @media (max-width: 640px) {
          .fv-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .fv-invoice-head {
            flex-direction: column;
            align-items: flex-start;
          }
          .fv-invoice-head-amounts {
            width: 100%;
            justify-content: space-between;
          }
          .fv-invoice-actions {
            justify-content: stretch;
          }
          .fv-invoice-actions .btn {
            width: 100%;
          }
        }

        /* ===== Small mobile ===== */
        @media (max-width: 480px) {
          .fv-stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 6px;
          }
        }
      `}</style>
    </div>
  );
}
