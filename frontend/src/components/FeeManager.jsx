import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import StatCard from './StatCard';
import ClassSectionSelect from './ClassSectionSelect';
import UserSearchSelect from './UserSearchSelect';
import { generateInvoicePdf, generateReceiptPdf } from '../utils/generateFeePdf';
import {
  FEE_TYPE_OPTIONS,
  FEE_TYPE_LABELS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_LABELS,
  STATUS_OPTIONS,
  STATUS_LABELS,
  STATUS_COLORS,
  formatMoney,
  formatMoneyCompact,
  formatCompactNumber,
  formatDate,
} from '../utils/feeTypes';

const emptyItem = () => ({ type: 'tuition', label: '', amount: '' });

export default function FeeManager() {
  // ----- create-invoice form -----
  const [targetMode, setTargetMode] = useState('student'); // 'student' | 'class'
  const [targetStudent, setTargetStudent] = useState(null);
  const [targetClassSection, setTargetClassSection] = useState({ className: '', section: '' });
  const [title, setTitle] = useState('');
  const [term, setTerm] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [resetSignal, setResetSignal] = useState(0);

  // ----- list + filters -----
  const [filterClassSection, setFilterClassSection] = useState({ className: '', section: '' });
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStudent, setFilterStudent] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [openId, setOpenId] = useState(null);

  // ----- record-payment inline form -----
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payDate, setPayDate] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payNote, setPayNote] = useState('');
  const [payingBusy, setPayingBusy] = useState(false);

  const filterParams = useMemo(() => {
    const params = {};
    if (filterClassSection.className) params.className = filterClassSection.className;
    if (filterClassSection.section) params.section = filterClassSection.section;
    if (filterStatus) params.status = filterStatus;
    if (filterStudent) params.studentId = filterStudent._id;
    return params;
  }, [filterClassSection, filterStatus, filterStudent]);

  const loadInvoices = () => {
    setLoadingList(true);
    api
      .get('/fees', { params: filterParams })
      .then((res) => setInvoices(res.data))
      .finally(() => setLoadingList(false));
  };

  const loadSummary = () => {
    const { studentId: _drop, ...summaryParams } = filterParams;
    api.get('/fees/summary', { params: summaryParams }).then((res) => setSummary(res.data));
  };

  useEffect(loadInvoices, [filterParams]);
  useEffect(loadSummary, [filterParams]);

  const updateItem = (i, field, value) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const itemsTotal = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
  const computedTotal = Math.max(itemsTotal - (Number(discountAmount) || 0), 0);

  const resetForm = () => {
    setTitle('');
    setTerm('');
    setItems([emptyItem()]);
    setDiscountAmount('');
    setDiscountReason('');
    setDueDate('');
    setNotes('');
    setTargetStudent(null);
    setResetSignal((n) => n + 1);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg('');

    const cleanItems = items
      .map((it) => ({ ...it, amount: Number(it.amount) }))
      .filter((it) => it.label.trim() && it.amount > 0);
    if (cleanItems.length === 0) {
      setMsg('Add at least one fee item with a label and amount.');
      return;
    }
    if (!title.trim() || !dueDate) {
      setMsg('Title and due date are required.');
      return;
    }
    if (targetMode === 'student' && !targetStudent) {
      setMsg('Select a student.');
      return;
    }
    if (targetMode === 'class' && !targetClassSection.className) {
      setMsg('Select a class and section.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        term: term.trim(),
        items: cleanItems,
        discount: { amount: Number(discountAmount) || 0, reason: discountReason.trim() },
        dueDate,
        notes: notes.trim(),
        ...(targetMode === 'student' ? { studentId: targetStudent._id } : targetClassSection),
      };
      const res = await api.post('/fees', payload);
      setMsg(res.data.message);
      resetForm();
      loadInvoices();
      loadSummary();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/fees/${id}`);
    loadInvoices();
    loadSummary();
  };

  const startPayment = (inv) => {
    setPayingId(inv._id);
    setPayAmount(inv.balance > 0 ? String(inv.balance) : '');
    setPayMethod('cash');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayReference('');
    setPayNote('');
  };

  const submitPayment = async (inv) => {
    setPayingBusy(true);
    try {
      const res = await api.post(`/fees/${inv._id}/payments`, {
        amount: Number(payAmount),
        method: payMethod,
        date: payDate,
        reference: payReference,
        note: payNote,
      });
      setPayingId(null);
      loadInvoices();
      loadSummary();
      // Offer the receipt immediately — this is the moment it's needed.
      const payment = res.data.invoice.payments[res.data.invoice.payments.length - 1];
      generateReceiptPdf(res.data.invoice, payment, res.data.invoice.student || inv.student);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setPayingBusy(false);
    }
  };

  return (
    <div className="fm-root">
      <div className="modal-wrapper" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Create Fee Invoice</h3>
        <form onSubmit={handleCreate}>
          <div className="fm-target-toggle">
            <button
              type="button"
              className={`btn ${targetMode === 'student' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTargetMode('student')}
            >
              Single Student
            </button>
            <button
              type="button"
              className={`btn ${targetMode === 'class' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTargetMode('class')}
            >
              Whole Class / Section
            </button>
          </div>

          <div className="fm-target-row">
            {targetMode === 'student' ? (
              <UserSearchSelect
                role="student"
                placeholder="Search & select student"
                onSelect={setTargetStudent}
                resetSignal={resetSignal}
                width={280}
              />
            ) : (
              <ClassSectionSelect value={targetClassSection} onChange={setTargetClassSection} />
            )}
            <input placeholder="Invoice title e.g. Tuition Fee - September 2026" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ flex: 1, minWidth: 220 }} />
            <input placeholder="Term (optional) e.g. September 2026" value={term} onChange={(e) => setTerm(e.target.value)} style={{ width: 200 }} />
          </div>

          <div className="fm-items">
            {items.map((it, i) => (
              <div className="fm-item-row" key={i}>
                <select value={it.type} onChange={(e) => updateItem(i, 'type', e.target.value)} style={{ width: 150 }}>
                  {FEE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{FEE_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <input placeholder="Description" value={it.label} onChange={(e) => updateItem(i, 'label', e.target.value)} style={{ flex: 1, minWidth: 140 }} />
                <input type="number" min="0" step="0.01" placeholder="Amount" value={it.amount} onChange={(e) => updateItem(i, 'amount', e.target.value)} style={{ width: 120 }} />
                {items.length > 1 && (
                  <button type="button" className="btn btn-outline" onClick={() => removeItem(i)}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={addItem}>+ Add Fee Item</button>
          </div>

          <div className="fm-meta-row">
            <div>
              <label>Discount Amount</label>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
            </div>
            <div>
              <label>Discount / Scholarship Reason</label>
              <input placeholder="e.g. Merit scholarship" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
            </div>
            <div>
              <label>Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label>Notes (optional)</label>
            <input placeholder="Anything the parent should know about this invoice" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="fm-form-footer">
            <span className="fm-computed-total">Total to bill: <strong>{formatMoney(computedTotal)}</strong></span>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
          {msg && <p style={{ fontSize: 13, color: msg.includes('created') ? 'var(--success)' : 'var(--danger)', marginTop: 8 }}>{msg}</p>}
        </form>
      </div>

      {summary && (
        <div className="grid grid-cols-4" style={{ marginBottom: 20 }}>
          <StatCard label="Total Billed" value={formatMoneyCompact(summary.totalBilled)} title={formatMoney(summary.totalBilled)} icon="🧾" />
          <StatCard label="Total Collected" value={formatMoneyCompact(summary.totalCollected)} title={formatMoney(summary.totalCollected)} color="var(--success)" icon="✅" />
          <StatCard label="Total Due" value={formatMoneyCompact(summary.totalDue)} title={formatMoney(summary.totalDue)} color="var(--warning)" icon="⏳" />
          <StatCard label="Overdue Invoices" value={formatCompactNumber(summary.overdueCount)} color="var(--danger)" icon="⚠️" />
        </div>
      )}

      <div className="modal-wrapper" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Filter Invoices</h3>
        <div className="fm-filter-row">
          <ClassSectionSelect value={filterClassSection} onChange={setFilterClassSection} />
          <UserSearchSelect
            role="student"
            placeholder="Filter by student"
            onSelect={setFilterStudent}
            width={220}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: 160 }}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setFilterClassSection({ className: '', section: '' });
              setFilterStatus('');
              setFilterStudent(null);
            }}
          >
            Clear
          </button>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Invoices ({invoices.length})</h3>
      {loadingList ? (
        <p>Loading invoices...</p>
      ) : invoices.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No invoices match the current filters.</p>
      ) : (
        <div className="fm-invoice-list">
          {invoices.map((inv) => {
            const isOpen = openId === inv._id;
            const isPaying = payingId === inv._id;
            return (
              <div className="modal-wrapper" key={inv._id}>
                <div className="fm-invoice-head" onClick={() => setOpenId(isOpen ? null : inv._id)}>
                  <div className="fm-invoice-head-main">
                    <span className="badge" style={{ background: `${STATUS_COLORS[inv.status]}22`, color: STATUS_COLORS[inv.status] }}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                    <div>
                      <div className="fm-invoice-title">{inv.student?.name || 'Unknown student'} — {inv.title}</div>
                      <div className="fm-invoice-sub">
                        {inv.invoiceNo} · {inv.className} {inv.section} · Due {formatDate(inv.dueDate)}
                      </div>
                    </div>
                  </div>
                  <div className="fm-invoice-head-amounts">
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
                  <div className="fm-invoice-body">
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr><th>Type</th><th>Description</th><th>Amount</th></tr>
                        </thead>
                        <tbody>
                          {inv.items.map((item, i) => (
                            <tr key={i}>
                              <td>{FEE_TYPE_LABELS[item.type] || item.type}</td>
                              <td>{item.label}</td>
                              <td>{formatMoney(item.amount)}</td>
                            </tr>
                          ))}
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
                              <tr><th>Date</th><th>Method</th><th>Amount</th><th>Receipt</th></tr>
                            </thead>
                            <tbody>
                              {inv.payments.map((p) => (
                                <tr key={p._id}>
                                  <td>{formatDate(p.date)}</td>
                                  <td>{PAYMENT_METHOD_LABELS[p.method] || p.method}</td>
                                  <td>{formatMoney(p.amount)}</td>
                                  <td>
                                    <button type="button" className="btn btn-outline fv-mini-btn" onClick={() => generateReceiptPdf(inv, p, inv.student)}>
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

                    {isPaying ? (
                      <div className="fm-pay-form">
                        <h4 style={{ marginTop: 0, marginBottom: 10 }}>Record Payment</h4>
                        <div className="fm-pay-row">
                          <input type="number" min="0.01" step="0.01" placeholder="Amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} style={{ width: 130 }} />
                          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={{ width: 160 }}>
                            {PAYMENT_METHOD_OPTIONS.map((m) => (
                              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                            ))}
                          </select>
                          <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} style={{ width: 150 }} />
                          <input placeholder="Reference (optional)" value={payReference} onChange={(e) => setPayReference(e.target.value)} style={{ width: 170 }} />
                        </div>
                        <input placeholder="Note (optional)" value={payNote} onChange={(e) => setPayNote(e.target.value)} style={{ marginTop: 8 }} />
                        <div className="fm-pay-actions">
                          <button type="button" className="btn btn-primary" disabled={payingBusy} onClick={() => submitPayment(inv)}>
                            {payingBusy ? 'Saving...' : 'Save Payment & Get Receipt'}
                          </button>
                          <button type="button" className="btn btn-outline" onClick={() => setPayingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="fm-invoice-actions">
                        {inv.balance > 0 && (
                          <button type="button" className="btn btn-primary" onClick={() => startPayment(inv)}>
                            Record Payment
                          </button>
                        )}
                        <button type="button" className="btn btn-outline" onClick={() => generateInvoicePdf(inv, inv.student)}>
                          Download Invoice
                        </button>
                        <button type="button" className="btn btn-danger" onClick={() => handleDelete(inv._id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .fm-target-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }
        .fm-target-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }
        .fm-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 14px;
        }
        .fm-item-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }
        .fm-meta-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }
        .fm-meta-row label,
        .fm-root label {
          display: block;
          margin-bottom: 5px;
        }
        .fm-form-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 16px;
        }
        .fm-computed-total {
          font-size: 14px;
          color: var(--text-secondary);
        }
        .fm-filter-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }
        .fm-invoice-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .fm-invoice-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          cursor: pointer;
        }
        .fm-invoice-head-main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .fm-invoice-title {
          font-weight: 700;
          font-size: 14.5px;
        }
        .fm-invoice-sub {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .fm-invoice-head-amounts {
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
        .fm-invoice-body {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }
        .fm-invoice-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 14px;
          flex-wrap: wrap;
        }
        .fm-pay-form {
          margin-top: 16px;
          padding: 14px;
          border-radius: var(--radius-sm);
          background: var(--bg-hover);
        }
        .fm-pay-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .fm-pay-actions {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }
        .fv-mini-btn {
          padding: 5px 10px;
          font-size: 12px;
        }

        /* ===== Laptop ===== */
        @media (max-width: 1024px) {
          .fm-meta-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* ===== Tablet ===== */
        @media (max-width: 900px) {
          .fm-meta-row {
            grid-template-columns: 1fr 1fr;
          }
          table {
            font-size: 13px;
          }
        }

        /* ===== Mobile ===== */
        @media (max-width: 640px) {
          .fm-target-toggle .btn,
          .fm-target-row > * {
            width: 100%;
          }
          .fm-meta-row {
            grid-template-columns: 1fr;
          }
          .fm-invoice-head {
            flex-direction: column;
            align-items: flex-start;
          }
          .fm-invoice-head-amounts {
            width: 100%;
            justify-content: space-between;
          }
          .fm-invoice-actions {
            flex-direction: column;
          }
          .fm-invoice-actions .btn {
            width: 100%;
          }
          .fm-pay-row > * {
            width: 100%;
          }
          .fm-form-footer {
            flex-direction: column;
            align-items: stretch;
          }
          .fm-form-footer .btn {
            width: 100%;
          }
          .fm-filter-row > * {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
