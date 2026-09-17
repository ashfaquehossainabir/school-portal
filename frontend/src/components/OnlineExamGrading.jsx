import { useEffect, useState } from 'react';
import api from '../api/axios';

const STATUS_LABEL = {
  'in-progress': 'In progress',
  submitted: 'Submitted — needs grading',
  graded: 'Graded',
};

export default function OnlineExamGrading({ examId, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubId, setActiveSubId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [grades, setGrades] = useState({}); // { questionId: { marksAwarded, feedback } }
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const loadSubmissions = () => {
    setLoading(true);
    api
      .get(`/online-exams/${examId}/submissions`)
      .then((res) => setSubmissions(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(loadSubmissions, [examId]);

  const openSubmission = async (subId) => {
    setActiveSubId(subId);
    setDetail(null);
    setMsg('');
    const res = await api.get(`/online-exams/${examId}/submissions/${subId}`);
    setDetail(res.data);
    const initialGrades = {};
    res.data.questions
      .filter((q) => q.type === 'short')
      .forEach((q) => {
        initialGrades[q._id] = {
          marksAwarded: q.answer?.marksAwarded ?? '',
          feedback: q.answer?.feedback ?? '',
        };
      });
    setGrades(initialGrades);
  };

  const saveGrades = async () => {
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        grades: Object.entries(grades).map(([question, g]) => ({
          question,
          marksAwarded: Number(g.marksAwarded) || 0,
          feedback: g.feedback,
        })),
      };
      await api.put(`/online-exams/${examId}/submissions/${activeSubId}/grade`, payload);
      setMsg('Saved.');
      loadSubmissions();
      openSubmission(activeSubId);
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  if (activeSubId) {
    return (
      <div>
        <button className="btn btn-outline" onClick={() => setActiveSubId(null)} style={{ marginBottom: 14 }}>
          ← Back to submissions
        </button>
        {!detail && <p>Loading...</p>}
        {detail && (
          <div>
            <h3 style={{ marginTop: 0 }}>
              {detail.submission.student.name} ({detail.submission.student.studentId})
            </h3>
            {detail.questions.map((q) => (
              <div key={q._id} className="modal-wrapper" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{q.text}</strong>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{q.marks} marks</span>
                </div>
                {q.type === 'mcq' ? (
                  <div style={{ marginTop: 8, fontSize: 14 }}>
                    {q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          marginBottom: 4,
                          background: oi === q.correctOption ? 'var(--success-soft)' : oi === q.answer?.selectedOption ? 'var(--danger-soft)' : 'transparent',
                        }}
                      >
                        {opt}
                        {oi === q.correctOption && ' ✓ correct'}
                        {oi === q.answer?.selectedOption && oi !== q.correctOption && ' — student\'s answer'}
                      </div>
                    ))}
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Auto-graded: {q.answer?.marksAwarded ?? 0} / {q.marks}
                    </p>
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ background: 'var(--bg-hover)', padding: 10, borderRadius: 8, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                      {q.answer?.answerText || <em>No answer given</em>}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <label style={{ fontSize: 13 }}>
                        Marks (0–{q.marks}):
                        <input
                          type="number"
                          min="0"
                          max={q.marks}
                          value={grades[q._id]?.marksAwarded ?? ''}
                          onChange={(e) => setGrades((prev) => ({ ...prev, [q._id]: { ...prev[q._id], marksAwarded: e.target.value } }))}
                          style={{ width: 70, marginLeft: 6 }}
                        />
                      </label>
                      <input
                        placeholder="Feedback (optional)"
                        value={grades[q._id]?.feedback ?? ''}
                        onChange={(e) => setGrades((prev) => ({ ...prev, [q._id]: { ...prev[q._id], feedback: e.target.value } }))}
                        style={{ flex: 1, minWidth: 180 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button className="btn btn-primary" onClick={saveGrades} disabled={saving}>
              {saving ? 'Saving...' : 'Save Grades'}
            </button>
            {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{msg}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-outline" onClick={onClose} style={{ marginBottom: 14 }}>← Back to exams</button>
      <h3 style={{ marginTop: 0 }}>Submissions</h3>
      {loading && <p>Loading...</p>}
      {!loading && submissions.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No students have started this exam yet.</p>}
      {submissions.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Student</th><th>Status</th><th>MCQ</th><th>Short answer</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s._id}>
                  <td>{s.student?.name} {s.student?.studentId ? `(${s.student.studentId})` : ''}</td>
                  <td><span className={`badge badge-${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span></td>
                  <td>{s.mcqScore ?? '—'}</td>
                  <td>{s.shortAnswerScore ?? (s.status === 'in-progress' ? '—' : 'Pending')}</td>
                  <td>{s.totalScore ?? '—'}</td>
                  <td>
                    {s.status !== 'in-progress' && (
                      <button className="btn btn-outline" onClick={() => openSubmission(s._id)}>
                        {s.status === 'graded' ? 'Review' : 'Grade'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
