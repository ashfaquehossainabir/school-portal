import { useEffect, useState } from 'react';
import api from '../api/axios';
import OnlineExamResult from './OnlineExamResult';

const STATUS_LABEL = {
  'in-progress': 'In progress',
  submitted: 'Submitted — pending grading',
  graded: 'Graded',
};

export default function ParentOnlineExamView({ studentId }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultExamId, setResultExamId] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get('/online-exams', { params: { studentId } })
      .then((res) => setExams(res.data))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (resultExamId) {
    return (
      <div>
        <button className="btn btn-outline" onClick={() => setResultExamId(null)} style={{ marginBottom: 14 }}>
          ← Back to exams
        </button>
        <OnlineExamResult examId={resultExamId} studentId={studentId} />
      </div>
    );
  }

  if (loading) return <p>Loading...</p>;
  if (exams.length === 0) return <p style={{ color: 'var(--text-secondary)' }}>No online exams for this child yet.</p>;

  return (
    <div>
      {exams.map((exam) => {
        const sub = exam.mySubmission;
        return (
          <div key={exam._id} className="modal-wrapper" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <strong>{exam.title}</strong>
                {sub ? (
                  <span className={`badge badge-${sub.status}`}>{STATUS_LABEL[sub.status]}</span>
                ) : (
                  <span className="badge badge-draft">not started</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                {exam.subject} · {exam.totalMarks} marks
                {sub?.totalScore != null && ` · Score: ${sub.totalScore}/${exam.totalMarks}`}
              </p>
            </div>
            {sub && sub.status !== 'in-progress' && (
              <button className="btn btn-outline" onClick={() => setResultExamId(exam._id)}>View Result</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
