import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import OnlineExamResult from './OnlineExamResult';

const STATUS_LABEL = {
  'in-progress': 'In progress',
  submitted: 'Submitted — pending grading',
  graded: 'Graded',
};

function formatRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TakeOnlineExam() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(null); // { exam, submissionId, deadline }
  const [answers, setAnswers] = useState({}); // { questionId: { selectedOption } | { answerText } }
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [resultExamId, setResultExamId] = useState(null);
  const submittedRef = useRef(false);

  const loadExams = () => {
    setLoading(true);
    api
      .get('/online-exams')
      .then((res) => setExams(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(loadExams, []);

  useEffect(() => {
    if (!attempt) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [attempt]);

  const remaining = attempt ? new Date(attempt.deadline).getTime() - now : null;

  useEffect(() => {
    if (attempt && remaining <= 0 && !submittedRef.current) {
      submittedRef.current = true;
      doSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const start = async (examId) => {
    const res = await api.post(`/online-exams/${examId}/start`);
    submittedRef.current = false;
    setAttempt(res.data);
    setAnswers({});
  };

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const doSubmit = async (auto = false) => {
    if (!attempt) return;
    setSubmitting(true);
    try {
      const payload = {
        answers: attempt.exam.questions.map((q) => ({
          question: q._id,
          ...(answers[q._id] || {}),
        })),
      };
      await api.post(`/online-exams/${attempt.exam._id}/submit`, payload);
      setAttempt(null);
      loadExams();
      if (!auto) alert('Exam submitted.');
      else alert('Time was up — your exam was submitted automatically.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit exam');
    } finally {
      setSubmitting(false);
    }
  };

  if (resultExamId) {
    return (
      <div>
        <button className="btn btn-outline" onClick={() => setResultExamId(null)} style={{ marginBottom: 14 }}>
          ← Back to exams
        </button>
        <OnlineExamResult examId={resultExamId} studentId={user._id} />
      </div>
    );
  }

  if (attempt) {
    return (
      <div>
        <div className="modal-wrapper" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>{attempt.exam.title}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{attempt.exam.subject} · {attempt.exam.totalMarks} marks</p>
          </div>
          <span className="badge badge-in-progress" style={{ fontSize: 15 }}>⏱ {formatRemaining(remaining)}</span>
        </div>
        {attempt.exam.instructions && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>{attempt.exam.instructions}</p>
        )}
        {attempt.exam.questions.map((q, i) => (
          <div key={q._id} className="modal-wrapper" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong>Q{i + 1}. {q.text}</strong>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{q.marks} marks</span>
            </div>
            {q.type === 'mcq' ? (
              <div style={{ marginTop: 10 }}>
                {q.options.map((opt, oi) => (
                  <label key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={q._id}
                      checked={answers[q._id]?.selectedOption === oi}
                      onChange={() => setAnswer(q._id, { selectedOption: oi })}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                rows={3}
                placeholder="Your answer"
                value={answers[q._id]?.answerText || ''}
                onChange={(e) => setAnswer(q._id, { answerText: e.target.value })}
                style={{ width: '100%', marginTop: 8 }}
              />
            )}
          </div>
        ))}
        <button className="btn btn-primary" disabled={submitting} onClick={() => { if (window.confirm('Submit this exam? You cannot change your answers afterward.')) doSubmit(false); }}>
          {submitting ? 'Submitting...' : 'Submit Exam'}
        </button>
      </div>
    );
  }

  return (
    <div>
      {loading && <p>Loading...</p>}
      {!loading && exams.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No online exams available right now.</p>}
      {exams.map((exam) => {
        const sub = exam.mySubmission;
        return (
          <div key={exam._id} className="modal-wrapper" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <strong>{exam.title}</strong>
                {sub && <span className={`badge badge-${sub.status}`}>{STATUS_LABEL[sub.status]}</span>}
                {!sub && exam.status === 'closed' && <span className="badge badge-closed">closed</span>}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {exam.subject} · {exam.durationMinutes} min · {exam.totalMarks} marks
                {sub?.totalScore != null && ` · Score: ${sub.totalScore}/${exam.totalMarks}`}
              </p>
            </div>
            <div>
              {!sub && exam.status === 'published' && (
                <button className="btn btn-primary" onClick={() => start(exam._id)}>Start Exam</button>
              )}
              {sub?.status === 'in-progress' && (
                <button className="btn btn-primary" onClick={() => start(exam._id)}>Continue Exam</button>
              )}
              {(sub?.status === 'submitted' || sub?.status === 'graded') && (
                <button className="btn btn-outline" onClick={() => setResultExamId(exam._id)}>View Result</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
