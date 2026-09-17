import { useEffect, useState } from 'react';
import api from '../api/axios';
import ClassSectionSelect from './ClassSectionSelect';
import UserSearchSelect from './UserSearchSelect';
import RecordPaymentModal from './RecordPaymentModal';
import FeeReceipt from './FeeReceipt';
import { CATEGORY_OPTIONS, CATEGORY_LABELS, FEE_STATUS_LABELS, formatAmount, formatDate } from '../utils/feeStatus';

const emptySingleForm = () => ({ studentId: '', studentLabel: '', category: 'tuition', title: '', academicPeriod: '', amount: '', discount: '0', dueDate: '', notes: '' });
const emptyBulkForm = () => ({ category: 'tuition', title: '', academicPeriod: '', amount: '', discount: '0', dueDate: '', notes: '' });

export default function FeeManager() {
  const [classSection, setClassSection] = useState({ className: '', section: '' });
  const [tab, setTab] = useState('invoices'); // 'invoices' | 'generate' | 'summary'

  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [summary, setSummary] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [showSingleForm, setShowSingleForm] = useState(false);
  const [singleForm, setSingleForm] = useState(emptySingleForm());
  const [singleSaving, setSingleSaving] = useState(false);
  const [singleMsg, setSingleMsg] = useState('');
  const [resetStudentSignal, setResetStudentSignal] = useState(0);

  const [bulkForm, setBulkForm] = useState(emptyBulkForm());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');

  const [payingInvoice, setPayingInvoice] = useState(null);
  const [receiptId, setReceiptId] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);

  const loadInvoices = () => {
    if (!classSection.className) return;
    setLoadingInvoices(true);
    api
      .get('/fees', { params: { ...classSection, status: statusFilter || undefined } })
      .then((res) => setInvoices(res.data))
      .finally(() => setLoadingInvoices(false));
  };

  const loadSummary = () => {
    if (!classSection.className) return;
    setLoadingSummary(true);
    api
      .get('/fees/summary', { params: classSection })
      .then((res) => setSummary(res.data))
      .finally(() => setLoadingSummary(false));
  };

  useEffect(loadInvoices, [classSection, statusFilter]);
  useEffect(loadSummary, [classSection]);

  const submitSingle = async (e) => {
    e.preventDefault();
    if (!singleForm.studentId) {
      setSingleMsg('Pick a student first');
      return;
    }
    setSingleSaving(true);
    setSingleMsg('');
    try {
      await api.post('/fees', {
        studentId: singleForm.studentId,
        category: singleForm.category,
        title: singleForm.title,
        academicPeriod: singleForm.academicPeriod,
        amount: Number(singleForm.amount),
        discount: Number(singleForm.discount) || 0,
        dueDate: singleForm.dueDate,
        notes: singleForm.notes,
      });
      setSingleMsg('Invoice created.');
      setSingleForm(emptySingleForm());
      setResetStudentSignal((s) => s + 1);
      setShowSingleForm(false);
      loadInvoices();
      loadSummary();
    } catch (err) {
      setSingleMsg(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSingleSaving(false);
    }
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    setBulkSaving(true);
    setBulkMsg('');
    try {
      const res = await api.post('/fees/bulk-generate', {
        ...classSection,
        category: bulkForm.category,
        title: bulkForm.title,
        academicPeriod: bulkForm.academicPeriod,
        amount: Number(bulkForm.amount),
        discount: Number(bulkForm.discount) || 0,
        dueDate: bulkForm.dueDate,
        notes: bulkForm.notes,
      });
      setBulkMsg(res.data.message);
      setBulkForm(emptyBulkForm());
      loadInvoices();
      loadSummary();
    } catch (err) {
      setBulkMsg(err.response?.data?.message || 'Failed to generate invoices');
    } finally {
      setBulkSaving(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/fees/${editingInvoice._id}`, {
        title: editingInvoice.title,
        academicPeriod: editingInvoice.academicPeriod,
        amount: editingInvoice.amount,
        discount: editingInvoice.discount,
        dueDate: editingInvoice.dueDate?.slice(0, 10),
        notes: editingInvoice.notes,
      });
      setEditingInvoice(null);
      loadInvoices();
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save changes');
    }
  };

  const deleteInvoice = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/fees/${id}`);
      loadInvoices();
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  return (
    <div className="fee-manager">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <ClassSectionSelect value={classSection} onChange={setClassSection} />
      </div>

      <div className="fee-tabs">
        <button type="button" className={`btn ${tab === 'invoices' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('invoices')}>Invoices</button>
        <button type="button" className={`btn ${tab === 'generate' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('generate')}>Generate for Class</button>
        <button type="button" className={`btn ${tab === 'summary' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('summary')}>Due Summary</button>
      </div>

      {tab === 'invoices' && (
        <div>
          <div className="fee-toolbar">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 170 }}>
              <option value="">All statuses</option>
              {Object.entries(FEE_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={() => setShowSingleForm((s) => !s)}>
              {showSingleForm ? 'Cancel' : '+ Charge One Student'}
            </button>
          </div>

          {showSingleForm && (
            <form onSubmit={submitSingle} className="modal-wrapper fee-form" style={{ marginBottom: 20 }}>
              <h3 style={{ marginTop: 0 }}>Charge One Student</h3>
              <div className="fee-form-grid">
                <UserSearchSelect
                  role="student"
                  placeholder="Search student by name or ID"
                  resetSignal={resetStudentSignal}
                  onSelect={(u) => setSingleForm((f) => ({ ...f, studentId: u?._id || '' }))}
                  width={260}
                />
                <select value={singleForm.category} onChange={(e) => setSingleForm({ ...singleForm, category: e.target.value })}>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
                <input placeholder="Title (e.g. Admission Fee 2026)" value={singleForm.title} onChange={(e) => setSingleForm({ ...singleForm, title: e.target.value })} required />
                <input placeholder="Period (optional)" value={singleForm.academicPeriod} onChange={(e) => setSingleForm({ ...singleForm, academicPeriod: e.target.value })} />
                <input type="number" min="0" step="0.01" placeholder="Amount" value={singleForm.amount} onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })} required />
                <input type="number" min="0" step="0.01" placeholder="Discount" value={singleForm.discount} onChange={(e) => setSingleForm({ ...singleForm, discount: e.target.value })} />
                <input type="date" value={singleForm.dueDate} onChange={(e) => setSingleForm({ ...singleForm, dueDate: e.target.value })} required />
                <input placeholder="Notes (optional)" value={singleForm.notes} onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={singleSaving} style={{ marginTop: 12 }}>
                {singleSaving ? 'Saving...' : 'Create Invoice'}
              </button>
              {singleMsg && <p style={{ fontSize: 13, marginTop: 8 }}>{singleMsg}</p>}
            </form>
          )}

          {loadingInvoices && <p>Loading...</p>}
          {!loadingInvoices && invoices.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No invoices found.</p>}
          <div style={{ overflowX: 'auto' }}>
            {invoices.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Student</th><th>Fee</th><th>Category</th><th>Due</th><th>Amount</th><th>Paid</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td>{inv.student?.name} {inv.student?.studentId ? `(${inv.student.studentId})` : ''}</td>
                      <td>{inv.title}</td>
                      <td>{CATEGORY_LABELS[inv.category]}</td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td>{formatAmount(inv.netAmount)}</td>
                      <td>{formatAmount(inv.amountPaid)}</td>
                      <td><span className={`badge badge-${inv.status}`}>{FEE_STATUS_LABELS[inv.status]}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {inv.status !== 'paid' && (
                            <button className="btn btn-outline" onClick={() => setPayingInvoice(inv)}>Pay</button>
                          )}
                          <button className="btn btn-outline" onClick={() => setEditingInvoice({ ...inv })}>Edit</button>
                          {inv.amountPaid === 0 && (
                            <button className="btn btn-danger" onClick={() => deleteInvoice(inv._id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'generate' && (
        <form onSubmit={submitBulk} className="modal-wrapper fee-form">
          <h3 style={{ marginTop: 0 }}>Generate Fee for {classSection.className || '—'} {classSection.section}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: -8 }}>
            Creates this charge for every active student in the class. Students who already have a fee with the same title are skipped.
          </p>
          <div className="fee-form-grid">
            <select value={bulkForm.category} onChange={(e) => setBulkForm({ ...bulkForm, category: e.target.value })}>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <input placeholder="Title (e.g. Tuition Fee - September 2026)" value={bulkForm.title} onChange={(e) => setBulkForm({ ...bulkForm, title: e.target.value })} required />
            <input placeholder="Period (optional)" value={bulkForm.academicPeriod} onChange={(e) => setBulkForm({ ...bulkForm, academicPeriod: e.target.value })} />
            <input type="number" min="0" step="0.01" placeholder="Amount per student" value={bulkForm.amount} onChange={(e) => setBulkForm({ ...bulkForm, amount: e.target.value })} required />
            <input type="number" min="0" step="0.01" placeholder="Discount per student" value={bulkForm.discount} onChange={(e) => setBulkForm({ ...bulkForm, discount: e.target.value })} />
            <input type="date" value={bulkForm.dueDate} onChange={(e) => setBulkForm({ ...bulkForm, dueDate: e.target.value })} required />
            <input placeholder="Notes (optional)" value={bulkForm.notes} onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={bulkSaving || !classSection.className} style={{ marginTop: 12 }}>
            {bulkSaving ? 'Generating...' : 'Generate'}
          </button>
          {bulkMsg && <p style={{ fontSize: 13, marginTop: 8 }}>{bulkMsg}</p>}
        </form>
      )}

      {tab === 'summary' && (
        <div>
          {loadingSummary && <p>Loading...</p>}
          {!loadingSummary && summary.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No students found for this class.</p>}
          <div style={{ overflowX: 'auto' }}>
            {summary.length > 0 && (
              <table>
                <thead>
                  <tr><th>Student</th><th>Charged</th><th>Discount</th><th>Paid</th><th>Outstanding</th><th>Overdue</th></tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.student._id}>
                      <td>{row.student.name} {row.student.studentId ? `(${row.student.studentId})` : ''}</td>
                      <td>{formatAmount(row.totalCharged)}</td>
                      <td>{formatAmount(row.totalDiscount)}</td>
                      <td>{formatAmount(row.totalPaid)}</td>
                      <td style={{ fontWeight: 700, color: row.totalOutstanding > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatAmount(row.totalOutstanding)}</td>
                      <td>{row.overdueCount > 0 ? <span className="badge badge-overdue">{row.overdueCount}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {payingInvoice && (
        <RecordPaymentModal
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onPaid={(payment) => {
            setPayingInvoice(null);
            setReceiptId(payment._id);
            loadInvoices();
            loadSummary();
          }}
        />
      )}
      {receiptId && <FeeReceipt paymentId={receiptId} onClose={() => setReceiptId(null)} />}

      {editingInvoice && (
        <div className="modal-backdrop" onClick={() => setEditingInvoice(null)}>
          <div className="modal-card modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Invoice</h3>
            {editingInvoice.amountPaid > 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                A payment has been recorded — amount, discount, and category are locked.
              </p>
            )}
            <form onSubmit={saveEdit}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 10 }}>
                Title
                <input value={editingInvoice.title} onChange={(e) => setEditingInvoice({ ...editingInvoice, title: e.target.value })} required style={{ width: '100%', marginTop: 4 }} />
              </label>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 10 }}>
                Period
                <input value={editingInvoice.academicPeriod || ''} onChange={(e) => setEditingInvoice({ ...editingInvoice, academicPeriod: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
              </label>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 10 }}>
                Amount
                <input type="number" min="0" step="0.01" disabled={editingInvoice.amountPaid > 0} value={editingInvoice.amount} onChange={(e) => setEditingInvoice({ ...editingInvoice, amount: Number(e.target.value) })} required style={{ width: '100%', marginTop: 4 }} />
              </label>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 10 }}>
                Discount
                <input type="number" min="0" step="0.01" disabled={editingInvoice.amountPaid > 0} value={editingInvoice.discount} onChange={(e) => setEditingInvoice({ ...editingInvoice, discount: Number(e.target.value) })} style={{ width: '100%', marginTop: 4 }} />
              </label>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 10 }}>
                Due date
                <input type="date" value={editingInvoice.dueDate?.slice(0, 10) || ''} onChange={(e) => setEditingInvoice({ ...editingInvoice, dueDate: e.target.value })} required style={{ width: '100%', marginTop: 4 }} />
              </label>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 14 }}>
                Notes
                <input value={editingInvoice.notes || ''} onChange={(e) => setEditingInvoice({ ...editingInvoice, notes: e.target.value })} style={{ width: '100%', marginTop: 4 }} />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button type="button" className="btn btn-outline" onClick={() => setEditingInvoice(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .fee-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }
        .fee-toolbar {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 16px;
        }
        .fee-form-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        /* ===== Laptop ===== */
        @media (max-width: 1024px) {
          .fee-form-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* ===== Tablet ===== */
        @media (max-width: 900px) {
          .fee-form-grid { grid-template-columns: repeat(2, 1fr); }
          table { font-size: 13px; }
        }

        /* ===== Mobile ===== */
        @media (max-width: 640px) {
          .fee-tabs .btn { flex: 1 1 auto; }
          .fee-toolbar { width: 100%; }
          .fee-toolbar select { flex: 1 1 auto; }
          .fee-toolbar .btn { width: 100%; }
          .fee-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
