import { useState } from 'react';
import api from '../api/axios';
import { METHOD_OPTIONS, METHOD_LABELS, formatAmount } from '../utils/feeStatus';

export default function RecordPaymentModal({ invoice, onClose, onPaid }) {
  const remaining = invoice.netAmount - invoice.amountPaid;
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [method, setMethod] = useState('cash');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const res = await api.post(`/fees/${invoice._id}/pay`, {
        amount: Number(amount),
        method,
        paidOn,
        notes,
      });
      onPaid?.(res.data.payment, res.data.invoice);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-wrapper" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Record Payment</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: -6 }}>
          {invoice.title} — remaining balance: {formatAmount(remaining)}
        </p>
        <form onSubmit={submit}>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 10 }}>
            Amount
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 10 }}>
            Method
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
              {METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>{METHOD_LABELS[m]}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 10 }}>
            Date
            <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required style={{ width: '100%', marginTop: 4 }} />
          </label>
          <label style={{ display: 'block', fontSize: 13, marginBottom: 14 }}>
            Notes (optional)
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', marginTop: 4 }} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Record Payment'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          </div>
          {msg && <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 10 }}>{msg}</p>}
        </form>
      </div>
    </div>
  );
}
