import { useEffect, useState } from 'react';
import api from '../api/axios';
import { CATEGORY_LABELS, METHOD_LABELS, formatAmount, formatDateTime } from '../utils/feeStatus';

export default function FeeReceipt({ paymentId, onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/fees/payments/${paymentId}/receipt`)
      .then((res) => setReceipt(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load receipt'));
  }, [paymentId]);

  return (
    <div className="modal-backdrop fr-no-print" onClick={onClose}>
      <div className="modal-card modal-wrapper" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        {!receipt && !error && <p>Loading...</p>}
        {receipt && (
          <div id="fee-receipt-print">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{receipt.school?.name || 'School'}</h3>
              {receipt.school?.address && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{receipt.school.address}</p>}
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                {[receipt.school?.phone, receipt.school?.email].filter(Boolean).join(' · ')}
              </p>
              <h4 style={{ margin: '10px 0 0', letterSpacing: '0.04em' }}>PAYMENT RECEIPT</h4>
            </div>
            <div style={{ borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', padding: '12px 0', margin: '12px 0', fontSize: 14 }}>
              <Row label="Receipt No." value={receipt.receiptNumber} />
              <Row label="Date" value={formatDateTime(receipt.paidOn)} />
              <Row label="Student" value={`${receipt.student?.name}${receipt.student?.studentId ? ` (${receipt.student.studentId})` : ''}`} />
              <Row label="Class" value={`${receipt.student?.className || ''} ${receipt.student?.section || ''}`} />
              <Row label="Fee" value={receipt.invoice?.title} />
              <Row label="Category" value={CATEGORY_LABELS[receipt.invoice?.category] || receipt.invoice?.category} />
              <Row label="Method" value={METHOD_LABELS[receipt.method] || receipt.method} />
              {receipt.notes && <Row label="Notes" value={receipt.notes} />}
              <Row label="Recorded by" value={receipt.recordedBy?.name} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}>
              <span>Amount Paid</span>
              <span>{formatAmount(receipt.amount)}</span>
            </div>
          </div>
        )}
        <div className="fr-no-print" style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn btn-primary" onClick={() => window.print()} disabled={!receipt} style={{ flex: 1 }}>Print</button>
          <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }}>Close</button>
        </div>
      </div>
      <style>{`
        @media print {
          .fr-no-print, .sidebar, .topbar { display: none !important; }
          .modal-backdrop { position: static !important; background: none !important; padding: 0 !important; }
          .modal-card { box-shadow: none !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  );
}
