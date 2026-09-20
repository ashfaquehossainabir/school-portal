import { useEffect, useState } from 'react';
import api from '../api/axios';
import ClassSearchSelect from './ClassSearchSelect';
import UserSearchSelect from './UserSearchSelect';
import { generateResultPdf } from '../utils/generateResultPdf';
import { GRADE_OPTIONS, GRADE_COLORS, gradeFromPercentage, percentageOf } from '../utils/resultTypes';

const emptySubject = () => ({ subject: '', marks: '', maxMarks: 100, grade: '' });

export default function ResultManager() {
  const [classSection, setClassSection] = useState({ className: '', section: '' });
  const [students, setStudents] = useState([]);

  // ----- create/edit form -----
  const [editingId, setEditingId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [editingStudent, setEditingStudent] = useState(null); // student being edited, fixed for the edit
  const [examTitle, setExamTitle] = useState('');
  const [term, setTerm] = useState('');
  const [subjects, setSubjects] = useState([emptySubject()]);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [studentResetSignal, setStudentResetSignal] = useState(0);

  // ----- results list -----
  const [filterStudentId, setFilterStudentId] = useState('');
  const [results, setResults] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [openId, setOpenId] = useState(null);

  // Students in the selected class/section, used to scope the student
  // search box and the "filter by student" dropdown on the list below.
  useEffect(() => {
    if (!classSection.className) {
      setStudents([]);
      return;
    }
    api
      .get('/users', { params: { role: 'student', className: classSection.className, section: classSection.section } })
      .then((res) => setStudents(res.data.sort((a, b) => (a.roll || '').localeCompare(b.roll || '', undefined, { numeric: true }))));
    setFilterStudentId('');
    if (!editingId) {
      setSelectedStudentId('');
      setStudentResetSignal((n) => n + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classSection]);

  const loadResults = () => {
    if (!classSection.className) {
      setResults([]);
      return;
    }
    setLoadingList(true);
    const params = { className: classSection.className, section: classSection.section };
    if (filterStudentId) params.studentId = filterStudentId;
    api
      .get('/results', { params })
      .then((res) => setResults(res.data))
      .finally(() => setLoadingList(false));
  };

  useEffect(loadResults, [classSection, filterStudentId]);

  const updateSubject = (i, field, value) => {
    setSubjects((prev) =>
      prev.map((s, idx) => {
        if (idx !== i) return s;
        const updated = { ...s, [field]: value };
        // Auto-suggest a grade the moment marks (or the max) change — still
        // directly editable afterward if a manual override is needed.
        if (field === 'marks' || field === 'maxMarks') {
          updated.grade = gradeFromPercentage(percentageOf(updated));
        }
        return updated;
      })
    );
  };
  const addSubject = () => setSubjects((prev) => [...prev, emptySubject()]);
  const removeSubject = (i) => setSubjects((prev) => prev.filter((_, idx) => idx !== i));

  const resetForm = () => {
    setEditingId(null);
    setEditingStudent(null);
    setSelectedStudentId('');
    setExamTitle('');
    setTerm('');
    setSubjects([emptySubject()]);
    setRemarks('');
    setStudentResetSignal((n) => n + 1);
  };

  const startEdit = (result) => {
    setEditingId(result._id);
    setEditingStudent(result.student);
    setSelectedStudentId(result.student._id);
    setExamTitle(result.examTitle);
    setTerm(result.term || '');
    setSubjects(result.subjects.map((s) => ({ ...s })));
    setRemarks(result.remarks || '');
    setMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    const cleanSubjects = subjects
      .filter((s) => s.subject.trim() && s.marks !== '')
      .map((s) => ({
        subject: s.subject.trim(),
        marks: Number(s.marks),
        maxMarks: Number(s.maxMarks) || 100,
        grade: s.grade || gradeFromPercentage(percentageOf(s)),
      }));

    if (cleanSubjects.length === 0) {
      setMsg('Add at least one subject with a name and marks.');
      return;
    }
    if (!examTitle.trim()) {
      setMsg('Exam title is required.');
      return;
    }
    if (!editingId && !selectedStudentId) {
      setMsg('Select a student.');
      return;
    }

    // Grabbed before resetForm() clears state — used to fill in the PDF
    // right after saving, without another round trip to the server.
    const studentForPdf = editingId ? editingStudent : students.find((s) => s._id === selectedStudentId);

    setSaving(true);
    try {
      let saved;
      if (editingId) {
        const res = await api.put(`/results/${editingId}`, {
          examTitle: examTitle.trim(),
          term: term.trim(),
          subjects: cleanSubjects,
          remarks: remarks.trim(),
        });
        saved = res.data;
        setMsg('Result updated — PDF downloaded.');
      } else {
        const res = await api.post('/results', {
          studentId: selectedStudentId,
          examTitle: examTitle.trim(),
          term: term.trim(),
          subjects: cleanSubjects,
          remarks: remarks.trim(),
        });
        saved = res.data;
        setMsg('Result saved — PDF downloaded.');
      }
      if (saved && studentForPdf) generateResultPdf(saved, studentForPdf);
      resetForm();
      loadResults();
    } catch (err) {
      setMsg(err.response?.data?.message || 'Failed to save result');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.delete(`/results/${id}`);
    if (editingId === id) resetForm();
    loadResults();
  };

  return (
    <div className="rm-root">
      <div className="modal-wrapper" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Result' : 'Add Exam Result'}</h3>
        <form onSubmit={handleSubmit}>
          {editingId ? (
            <div className="rm-editing-banner">
              Editing result for <strong>{editingStudent?.name}</strong>
              {editingStudent?.className ? ` — ${editingStudent.className} ${editingStudent.section || ''}` : ''}
            </div>
          ) : (
            <div className="rm-target-row">
              <ClassSearchSelect value={classSection} onChange={setClassSection} placeholder="Search class or section" width={220} />
              <UserSearchSelect
                role="student"
                placeholder={classSection.className ? 'Search & select student' : 'Select a class first'}
                onSelect={(u) => setSelectedStudentId(u?._id || '')}
                filterFn={(u) => !!classSection.className && u.className === classSection.className && u.section === classSection.section}
                resetSignal={studentResetSignal}
                width={260}
              />
            </div>
          )}

          <div className="rm-target-row">
            <input
              placeholder="Exam title e.g. Half Yearly Examination 2026"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              required
              style={{ flex: 1, minWidth: 220 }}
            />
            <input placeholder="Term (optional) e.g. 2026" value={term} onChange={(e) => setTerm(e.target.value)} style={{ width: 160 }} />
          </div>

          <div className="rm-subjects">
            <div className="rm-subject-header">
              <span>Subject</span>
              <span>Marks</span>
              <span>Full Marks</span>
              <span>Grade</span>
              <span />
            </div>
            {subjects.map((s, i) => (
              <div className="rm-subject-row" key={i}>
                <input placeholder="e.g. Mathematics" value={s.subject} onChange={(e) => updateSubject(i, 'subject', e.target.value)} required />
                <input type="number" min="0" step="0.5" placeholder="Marks" value={s.marks} onChange={(e) => updateSubject(i, 'marks', e.target.value)} required />
                <input type="number" min="1" step="1" placeholder="100" value={s.maxMarks} onChange={(e) => updateSubject(i, 'maxMarks', e.target.value)} />
                <select value={s.grade} onChange={(e) => updateSubject(i, 'grade', e.target.value)}>
                  <option value="">—</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {subjects.length > 1 ? (
                  <button type="button" className="btn btn-outline rm-remove-btn" onClick={() => removeSubject(i)}>✕</button>
                ) : (
                  <span />
                )}
              </div>
            ))}
            <button type="button" className="btn btn-outline" onClick={addSubject}>+ Add Subject</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Remarks (optional)</label>
            <input placeholder="e.g. Excellent performance overall" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>

          <div className="rm-form-footer">
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel Edit</button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update Result' : 'Save Result'}
            </button>
          </div>
          {msg && (
            <p style={{ fontSize: 13, color: msg.includes('saved') || msg.includes('updated') ? 'var(--success)' : 'var(--danger)', marginTop: 8 }}>
              {msg}
            </p>
          )}
        </form>
      </div>

      <div className="modal-wrapper" style={{ marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>Filter Results</h3>
        <div className="rm-filter-row">
          <ClassSearchSelect value={classSection} onChange={setClassSection} placeholder="Search class or section" width={220} />
          <select value={filterStudentId} onChange={(e) => setFilterStudentId(e.target.value)} style={{ width: 220 }}>
            <option value="">All students in this class</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <h3 style={{ marginBottom: 12 }}>Results ({results.length})</h3>
      {!classSection.className ? (
        <p style={{ color: 'var(--text-secondary)' }}>Select a class to view results.</p>
      ) : loadingList ? (
        <p>Loading results...</p>
      ) : results.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>No results recorded yet for this class.</p>
      ) : (
        <div className="rm-result-list">
          {results.map((r) => {
            const isOpen = openId === r._id;
            return (
              <div className="modal-wrapper" key={r._id}>
                <div className="rm-result-head" onClick={() => setOpenId(isOpen ? null : r._id)}>
                  <div className="rm-result-head-main">
                    <span className="badge" style={{ background: `${GRADE_COLORS[r.overallGrade]}22`, color: GRADE_COLORS[r.overallGrade] }}>
                      {r.overallGrade}
                    </span>
                    <div>
                      <div className="rm-result-title">{r.student?.name || 'Unknown student'} — {r.examTitle}</div>
                      <div className="rm-result-sub">
                        {r.className} {r.section}{r.student?.roll ? ` · Roll ${r.student.roll}` : ''}{r.term ? ` · ${r.term}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="rm-result-head-amounts">
                    <div>
                      <span className="rm-stat-label">Total</span>
                      <span className="rm-stat-value">{r.totalMarks} / {r.totalMaxMarks}</span>
                    </div>
                    <div>
                      <span className="rm-stat-label">Percentage</span>
                      <span className="rm-stat-value">{r.percentage}%</span>
                    </div>
                    <span className="rm-chevron">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isOpen && (
                  <div className="rm-result-body">
                    <div style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr><th>Subject</th><th>Marks</th><th>Full Marks</th><th>Grade</th></tr>
                        </thead>
                        <tbody>
                          {r.subjects.map((s, i) => (
                            <tr key={i}>
                              <td>{s.subject}</td>
                              <td>{s.marks}</td>
                              <td>{s.maxMarks}</td>
                              <td>
                                <span style={{ color: GRADE_COLORS[s.grade], fontWeight: 700 }}>{s.grade}</span>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td style={{ fontWeight: 700 }}>Total</td>
                            <td style={{ fontWeight: 700 }}>{r.totalMarks}</td>
                            <td style={{ fontWeight: 700 }}>{r.totalMaxMarks}</td>
                            <td style={{ fontWeight: 700, color: GRADE_COLORS[r.overallGrade] }}>{r.overallGrade}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {r.remarks && <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 10 }}>Remarks: {r.remarks}</p>}
                    <div className="rm-result-actions">
                      <button type="button" className="btn btn-outline" onClick={() => generateResultPdf(r, r.student)}>Download PDF</button>
                      <button type="button" className="btn btn-outline" onClick={() => startEdit(r)}>Edit</button>
                      <button type="button" className="btn btn-danger" onClick={() => handleDelete(r._id)}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .rm-target-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .rm-editing-banner {
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          background: var(--bg-hover);
          font-size: 13.5px;
          margin-bottom: 16px;
        }
        .rm-subjects {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rm-subject-header,
        .rm-subject-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr auto;
          gap: 8px;
          align-items: center;
        }
        .rm-subject-header span {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 700;
        }
        .rm-remove-btn {
          padding: 6px 10px;
        }
        .rm-root label {
          display: block;
          margin-bottom: 5px;
        }
        .rm-form-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 16px;
        }
        .rm-filter-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }
        .rm-result-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .rm-result-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          cursor: pointer;
        }
        .rm-result-head-main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .rm-result-title {
          font-weight: 700;
          font-size: 14.5px;
        }
        .rm-result-sub {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .rm-result-head-amounts {
          display: flex;
          align-items: center;
          gap: 22px;
        }
        .rm-stat-label {
          display: block;
          font-size: 10.5px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          font-weight: 700;
        }
        .rm-stat-value {
          display: block;
          font-weight: 700;
          font-size: 14px;
        }
        .rm-chevron {
          color: var(--text-muted);
          font-size: 12px;
        }
        .rm-result-body {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-color);
        }
        .rm-result-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 14px;
          flex-wrap: wrap;
        }

        /* ===== Laptop ===== */
        @media (max-width: 1024px) {
          .rm-subject-header,
          .rm-subject-row {
            grid-template-columns: 2fr 1fr 1fr 1fr auto;
          }
        }

        /* ===== Tablet ===== */
        @media (max-width: 900px) {
          table {
            font-size: 13px;
          }
        }

        /* ===== Mobile ===== */
        @media (max-width: 640px) {
          .rm-target-row > * {
            width: 100%;
          }
          .rm-subject-header {
            display: none;
          }
          .rm-subject-row {
            grid-template-columns: 1fr 1fr;
            grid-template-areas:
              "subject subject"
              "marks maxmarks"
              "grade remove";
            padding: 10px;
            background: var(--bg-hover);
            border-radius: var(--radius-sm);
          }
          .rm-subject-row input:nth-child(1) { grid-area: subject; }
          .rm-subject-row input:nth-child(2) { grid-area: marks; }
          .rm-subject-row input:nth-child(3) { grid-area: maxmarks; }
          .rm-subject-row select { grid-area: grade; }
          .rm-subject-row button { grid-area: remove; }
          .rm-form-footer {
            flex-direction: column;
          }
          .rm-form-footer .btn {
            width: 100%;
          }
          .rm-filter-row > * {
            width: 100%;
          }
          .rm-result-head {
            flex-direction: column;
            align-items: flex-start;
          }
          .rm-result-head-amounts {
            width: 100%;
            justify-content: space-between;
          }
          .rm-result-actions {
            flex-direction: column;
          }
          .rm-result-actions .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
