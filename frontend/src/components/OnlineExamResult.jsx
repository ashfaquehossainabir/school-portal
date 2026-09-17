import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function OnlineExamResult({ examId, studentId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get(`/online-exams/${examId}/result/${studentId}`)
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load result'))
      .finally(() => setLoading(false));
  }, [examId, studentId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>;
  if (!result) return null;

  return (
    <div>
      <div className="modal-wrapper" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>{result.examTitle}</h3>
        {result.status === 'graded' ? (
          <p style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            {result.totalScore} / {result.totalMarks}
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            MCQ score so far: {result.mcqScore} — short-answer questions are still being graded.
          </p>
        )}
      </div>

      {result.questions.map((q, i) => (
        <div key={q.questionId} className="modal-wrapper" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <strong>Q{i + 1}. {q.text}</strong>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {q.marksAwarded != null ? `${q.marksAwarded} / ${q.marks}` : `${q.marks} marks`}
            </span>
          </div>
          {q.type === 'mcq' ? (
            <div style={{ marginTop: 8 }}>
              {q.options.map((opt, oi) => (
                <div
                  key={oi}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    marginBottom: 4,
                    fontSize: 14,
                    background: oi === q.correctOption ? 'var(--success-soft)' : oi === q.selectedOption ? 'var(--danger-soft)' : 'transparent',
                  }}
                >
                  {opt}
                  {oi === q.correctOption && ' ✓ correct answer'}
                  {oi === q.selectedOption && oi !== q.correctOption && ' — your answer'}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <p style={{ background: 'var(--bg-hover)', padding: 10, borderRadius: 8, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {q.answerText || <em>No answer given</em>}
              </p>
              {q.pending ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending grading.</p>
              ) : (
                q.feedback && <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Feedback: {q.feedback}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
