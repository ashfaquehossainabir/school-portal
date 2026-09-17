import { useEffect, useState } from 'react';
import api from '../api/axios';
import ClassSectionSelect from './ClassSectionSelect';
import OnlineExamGrading from './OnlineExamGrading';

const emptyQuestion = () => ({
  type: 'mcq',
  text: '',
  marks: 1,
  options: ['', ''],
  correctOption: 0,
});

const emptyForm = () => ({
  title: '',
  subject: '',
  instructions: '',
  durationMinutes: 30,
  availableFrom: '',
  availableTo: '',
  questions: [emptyQuestion()],
});

// Backend stores availableFrom/To as ISO strings; <input type="datetime-local">
// needs "YYYY-MM-DDTHH:mm" in local time.
const toDatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const examToForm = (exam) => ({
  title: exam.title,
  subject: exam.subject,
  instructions: exam.instructions || '',
  durationMinutes: exam.durationMinutes,
  availableFrom: toDatetimeLocal(exam.availableFrom),
  availableTo: toDatetimeLocal(exam.availableTo),
  questions: exam.questions.map((q) =>
    q.type === 'mcq'
      ? { type: 'mcq', text: q.text, marks: q.marks, options: [...q.options], correctOption: q.correctOption }
      : { type: 'short', text: q.text, marks: q.marks, options: ['', ''], correctOption: 0 }
  ),
});

export default function OnlineExamBuilder() {
  const [classSection, setClassSection] = useState({ className: '', section: '' });
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [gradingExamId, setGradingExamId] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null); // null = creating a new exam
  const [loadingEdit, setLoadingEdit] = useState(false);

  const loadExams = () => {
    if (!classSection.className) return;
    setLoading(true);
    api
      .get('/online-exams', { params: classSection })
      .then((res) => setExams(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(loadExams, [classSection]);

  const updateQuestion = (i, field, value) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)),
    }));
  };

  const updateOption = (qi, oi, value) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) =>
        idx === qi ? { ...q, options: q.options.map((o, oidx) => (oidx === oi ? value : o)) } : q
      ),
    }));
  };

  const addOption = (qi) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => (idx === qi && q.options.length < 6 ? { ...q, options: [...q.options, ''] } : q)),
    }));
  };

  const removeOption = (qi, oi) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, idx) => {
        if (idx !== qi || q.options.length <= 2) return q;
        const options = q.options.filter((_, oidx) => oidx !== oi);
        const correctOption = q.correctOption >= options.length ? 0 : q.correctOption;
        return { ...q, options, correctOption };
      }),
    }));
  };

  const addQuestion = () => setForm((prev) => ({ ...prev, questions: [...prev.questions, emptyQuestion()] }));
  const removeQuestion = (i) =>
    setForm((prev) => ({ ...prev, questions: prev.questions.filter((_, idx) => idx !== i) }));

  const totalMarks = form.questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

  const startCreate = () => {
    setEditingExamId(null);
    setForm(emptyForm());
    setMsg('');
    setShowForm(true);
  };

  const startEdit = async (exam) => {
    setMsg('');
    setLoadingEdit(true);
    setShowForm(true);
    setEditingExamId(exam._id);
    try {
      // The list response has correctOption stripped for safety — fetch the
      // full exam (admin/teacher get it unstripped) to populate the form.
      const res = await api.get(`/online-exams/${exam._id}`);
      setForm(examToForm(res.data));
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to load exam for editing');
      setShowForm(false);
      setEditingExamId(null);
    } finally {
      setLoadingEdit(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingExamId(null);
    setForm(emptyForm());
    setMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        title: form.title,
        subject: form.subject,
        instructions: form.instructions,
        durationMinutes: Number(form.durationMinutes),
        availableFrom: form.availableFrom || undefined,
        availableTo: form.availableTo || undefined,
        ...classSection,
        questions: form.questions.map((q) =>
          q.type === 'mcq'
            ? { type: 'mcq', text: q.text, marks: Number(q.marks), options: q.options, correctOption: Number(q.correctOption) }
            : { type: 'short', text: q.text, marks: Number(q.marks) }
        ),
      };
      if (editingExamId) {
        await api.put(`/online-exams/${editingExamId}`, payload);
        setMsg('Changes saved.');
      } else {
        await api.post('/online-exams', payload);
        setMsg('Exam created as a draft. Publish it when you\'re ready for students to see it.');
      }
      setForm(emptyForm());
      setEditingExamId(null);
      setShowForm(false);
      loadExams();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to save exam');
    } finally {
      setSaving(false);
    }
  };

  const publish = async (id) => {
    await api.patch(`/online-exams/${id}/publish`);
    loadExams();
  };
  const close = async (id) => {
    if (!window.confirm('Close this exam? Students will no longer be able to start or continue it.')) return;
    await api.patch(`/online-exams/${id}/close`);
    loadExams();
  };
  const remove = async (id) => {
    if (!window.confirm('Delete this exam?')) return;
    try {
      await api.delete(`/online-exams/${id}`);
      loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete exam');
    }
  };

  if (gradingExamId) {
    return <OnlineExamGrading examId={gradingExamId} onClose={() => { setGradingExamId(null); loadExams(); }} />;
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <ClassSectionSelect value={classSection} onChange={setClassSection} />
        <button className="btn btn-primary" onClick={() => (showForm ? cancelForm() : startCreate())}>
          {showForm ? 'Cancel' : '+ New Exam'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="modal-wrapper" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>
            {editingExamId ? 'Edit Online Exam' : 'New Online Exam'} — {classSection.className || '—'} {classSection.section}
          </h3>
          {loadingEdit && <p style={{ color: 'var(--text-secondary)' }}>Loading exam...</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <input placeholder="Exam title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={{ flex: 2, minWidth: 200 }} />
            <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required style={{ flex: 1, minWidth: 140 }} />
            <input type="number" min="1" max="300" placeholder="Duration (min)" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} required style={{ width: 150 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Opens (optional)
              <input type="datetime-local" value={form.availableFrom} onChange={(e) => setForm({ ...form, availableFrom: e.target.value })} style={{ display: 'block', marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Closes (optional)
              <input type="datetime-local" value={form.availableTo} onChange={(e) => setForm({ ...form, availableTo: e.target.value })} style={{ display: 'block', marginTop: 4 }} />
            </label>
          </div>
          <textarea
            placeholder="Instructions for students (optional)"
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            rows={2}
            style={{ width: '100%', marginBottom: 14 }}
          />

          {form.questions.map((q, qi) => (
            <div key={qi} className="card" style={{ marginBottom: 12, padding: 14 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Q{qi + 1}</span>
                <select value={q.type} onChange={(e) => updateQuestion(qi, 'type', e.target.value)} style={{ width: 150 }}>
                  <option value="mcq">Multiple choice</option>
                  <option value="short">Short answer</option>
                </select>
                <input
                  type="number"
                  min="1"
                  value={q.marks}
                  onChange={(e) => updateQuestion(qi, 'marks', e.target.value)}
                  style={{ width: 80 }}
                  title="Marks"
                />
                {form.questions.length > 1 && (
                  <button type="button" className="btn btn-outline" onClick={() => removeQuestion(qi)} style={{ marginLeft: 'auto' }}>
                    Remove question
                  </button>
                )}
              </div>
              <input
                placeholder="Question text"
                value={q.text}
                onChange={(e) => updateQuestion(qi, 'text', e.target.value)}
                required
                style={{ width: '100%', marginBottom: 8 }}
              />
              {q.type === 'mcq' ? (
                <div>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <input
                        type="radio"
                        name={`correct-${qi}`}
                        checked={Number(q.correctOption) === oi}
                        onChange={() => updateQuestion(qi, 'correctOption', oi)}
                        title="Mark as correct answer"
                      />
                      <input
                        placeholder={`Option ${oi + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(qi, oi, e.target.value)}
                        required
                        style={{ flex: 1 }}
                      />
                      {q.options.length > 2 && (
                        <button type="button" className="btn btn-outline" onClick={() => removeOption(qi, oi)}>✕</button>
                      )}
                    </div>
                  ))}
                  {q.options.length < 6 && (
                    <button type="button" className="btn btn-outline" onClick={() => addOption(qi)}>+ Option</button>
                  )}
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>Select the radio button next to the correct option.</p>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  Students will answer in a text box. You'll grade this manually after they submit.
                </p>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-outline" onClick={addQuestion}>+ Add Question</button>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total marks: {totalMarks}</span>
            <button type="submit" className="btn btn-primary" disabled={saving || loadingEdit} style={{ marginLeft: 'auto' }}>
              {saving ? 'Saving...' : editingExamId ? 'Save Changes' : 'Save as Draft'}
            </button>
          </div>
          {msg && <p style={{ fontSize: 13, color: 'var(--success)', marginTop: 8 }}>{msg}</p>}
        </form>
      )}

      <h3>Exams — {classSection.className || '—'} {classSection.section}</h3>
      {loading && <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>}
      {!loading && exams.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No online exams yet for this class.</p>}
      {exams.map((exam) => (
        <div key={exam._id} className="modal-wrapper" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <strong>{exam.title}</strong>
              <span className={`badge badge-${exam.status}`}>{exam.status}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {exam.subject} · {exam.durationMinutes} min · {exam.totalMarks} marks · {exam.questions?.length ?? ''} questions
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {exam.status === 'draft' && (
              <button className="btn btn-outline" onClick={() => startEdit(exam)}>Edit</button>
            )}
            {exam.status === 'draft' && (
              <button className="btn btn-outline" onClick={() => publish(exam._id)}>Publish</button>
            )}
            {exam.status === 'published' && (
              <button className="btn btn-outline" onClick={() => close(exam._id)}>Close</button>
            )}
            <button className="btn btn-outline" onClick={() => setGradingExamId(exam._id)}>Submissions / Grade</button>
            {exam.status === 'draft' && (
              <button className="btn btn-danger" onClick={() => remove(exam._id)}>Delete</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
