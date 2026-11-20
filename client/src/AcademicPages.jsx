import React, { useEffect, useState } from 'react';
import {
  BookOpen, Bookmark, ClipboardList, MessageCircle,
  Bell, Megaphone, Trophy, Clock, Plus, Trash2,
  CheckCircle2, Circle, Send, LoaderCircle,
  FileText, Search, X, Award, CalendarDays,
  HelpCircle, ChevronRight, RefreshCw
} from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics & Communication Engineering',
  'Management',
  'Computer Applications',
  'Pharmacy',
  'Law',
  'Other'
];

function Panel({ title, subtitle, children, action }) {
  return (
    <section className="panel" style={{ marginBottom: 20 }}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }) {
  return (
    <div className="empty-state">
      <BookOpen size={25} />
      <span>{text}</span>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="academic-field">
    <span>{label}</span>
    {children}
  </label>;
}

function Loading() {
  return (
    <div className="empty-state">
      <LoaderCircle className="spin" size={24} />
      <span>Loading...</span>
    </div>
  );
}

export function AcademicPages({
  page,
  request,
  user,
  isAdmin,
  setNotice
}) {
  switch (page) {
    case 'quizzes':
      return <QuizPage {...{ request, isAdmin, setNotice }} />;

    case 'bookmarks':
      return <BookmarksPage {...{ request, setNotice }} />;

    case 'notes':
      return <NotesPage {...{ request, setNotice }} />;

    case 'planner':
      return <PlannerPage {...{ request, setNotice }} />;

    case 'discussions':
      return <DiscussionPage {...{ request, user, isAdmin, setNotice }} />;

    case 'announcements':
      return <AnnouncementPage {...{ request, isAdmin, setNotice }} />;

    case 'notifications':
      return <NotificationsPage {...{ request, setNotice }} />;

    default:
      return null;
  }
}

function QuizPage({ request, isAdmin, setNotice }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState({});
  const [attempt, setAttempt] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('available');

  const [form, setForm] = useState({
    title: '',
    description: '',
    department: 'Computer Science & Engineering',
    semester: '1',
    subject: '',
    topic: '',
    duration: '20',
    status: 'published',
    questions: [{
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      marks: 1
    }]
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await request('/api/academic/quizzes');
      setQuizzes(data.quizzes || []);
      if (!isAdmin) {
        const h = await request('/api/academic/quizzes/history');
        setHistory(h.attempts || []);
      }
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateQuestion = (index, key, value) => {
    setForm(old => ({
      ...old,
      questions: old.questions.map((q, i) =>
        i === index ? { ...q, [key]: value } : q
      )
    }));
  };

  const updateOption = (qi, oi, value) => {
    setForm(old => ({
      ...old,
      questions: old.questions.map((q, i) =>
        i === qi ? {
          ...q,
          options: q.options.map((o, j) => j === oi ? value : o)
        } : q
      )
    }));
  };

  const createQuiz = async e => {
    e.preventDefault();
    try {
      await request('/api/academic/quizzes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          semester: Number(form.semester),
          duration: Number(form.duration),
          questions: form.questions.map(q => ({
            ...q,
            marks: Number(q.marks),
            correctAnswer: Number(q.correctAnswer)
          }))
        })
      });
      setNotice('Quiz created successfully.');
      setForm({
        title: '',
        description: '',
        department: 'Computer Science & Engineering',
        semester: '1',
        subject: '',
        topic: '',
        duration: '20',
        status: 'published',
        questions: [{
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          explanation: '',
          marks: 1
        }]
      });
      load();
    } catch (e) {
      setNotice(e.message);
    }
  };

  const startQuiz = async quiz => {
    try {
      const data = await request(
        `/api/academic/quizzes/${quiz._id}/start`,
        { method: 'POST' }
      );
      setSelected(quiz);
      setAttempt(data.attempt);
      setAnswers({});
      setResult(null);
    } catch (e) {
      setNotice(e.message);
    }
  };

  const submitQuiz = async () => {
    if (!selected || !attempt) return;

    if (!confirm('Submit this quiz?')) return;

    try {
      const data = await request(
        `/api/academic/quizzes/${selected._id}/submit`,
        {
          method: 'POST',
          body: JSON.stringify({
            attemptId: attempt._id,
            answers: Object.entries(answers).map(([questionId, selectedOption]) => ({
              questionId,
              selectedOption
            }))
          })
        }
      );
      setResult(data.result || data);
      setSelected(null);
      setAttempt(null);
      load();
    } catch (e) {
      setNotice(e.message);
    }
  };

  const deleteQuiz = async id => {
    if (!confirm('Delete this quiz and its attempts?')) return;
    try {
      await request(`/api/academic/quizzes/${id}`, { method: 'DELETE' });
      setNotice('Quiz deleted.');
      load();
    } catch (e) {
      setNotice(e.message);
    }
  };

  if (selected && attempt) {
    return (
      <div>
        <div className="page-title-row">
          <div>
            <span className="eyebrow">QUIZ IN PROGRESS</span>
            <h1>{selected.title}</h1>
            <p>{selected.subject} · {selected.questions?.length || 0} questions</p>
          </div>
          <button className="btn btn-primary" onClick={submitQuiz}>
            Submit quiz
          </button>
        </div>

        {selected.questions?.map((q, i) => (
          <Panel key={q._id || i} title={`Question ${i + 1}`}>
            <h3>{q.question}</h3>
            <div className="academic-options">
              {q.options?.map((option, j) => (
                <label className="academic-option" key={j}>
                  <input
                    type="radio"
                    name={`q-${q._id}`}
                    checked={answers[q._id] === j}
                    onChange={() => setAnswers(old => ({
                      ...old,
                      [q._id]: j
                    }))}
                  />
                  {option}
                </label>
              ))}
            </div>
          </Panel>
        ))}
        <button className="btn btn-primary" onClick={submitQuiz}>
          Submit answers
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">PRACTICE & ASSESSMENT</span>
          <h1>Quiz & Exam</h1>
          <p>Test your understanding with academic quizzes.</p>
        </div>
      </div>

      {result && (
        <Panel title="Your quiz result" subtitle="Latest submitted attempt">
          <h2>{result.score ?? 0} / {result.totalMarks ?? 0}</h2>
          <p>Correct: {result.correct ?? 0} · Wrong: {result.wrong ?? 0}</p>
          <button className="btn btn-outline" onClick={() => setResult(null)}>
            Close result
          </button>
        </Panel>
      )}

      {isAdmin && (
        <Panel title="Create quiz" subtitle="Publish a quiz for students">
          <form onSubmit={createQuiz}>
            <div className="academic-grid">
              <Field label="Quiz title">
                <input required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })} />
              </Field>
              <Field label="Subject">
                <input required value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })} />
              </Field>
              <Field label="Topic">
                <input value={form.topic}
                  onChange={e => setForm({ ...form, topic: e.target.value })} />
              </Field>
              <Field label="Department">
                <select value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Semester">
                <select value={form.semester}
                  onChange={e => setForm({ ...form, semester: e.target.value })}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n =>
                    <option key={n} value={n}>{n}</option>
                  )}
                </select>
              </Field>
              <Field label="Duration (minutes)">
                <input type="number" min="1" max="240" required
                  value={form.duration}
                  onChange={e => setForm({ ...form, duration: e.target.value })} />
              </Field>
            </div>

            <Field label="Description">
              <textarea value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </Field>

            <h3>Questions</h3>

            {form.questions.map((q, i) => (
              <div className="panel" key={i} style={{ margin: '12px 0' }}>
                <Field label={`Question ${i + 1}`}>
                  <textarea required value={q.question}
                    onChange={e => updateQuestion(i, 'question', e.target.value)} />
                </Field>

                {q.options.map((o, j) => (
                  <Field key={j} label={`Option ${j + 1}`}>
                    <input required value={o}
                      onChange={e => updateOption(i, j, e.target.value)} />
                  </Field>
                ))}

                <Field label="Correct option">
                  <select value={q.correctAnswer}
                    onChange={e => updateQuestion(i, 'correctAnswer', e.target.value)}>
                    {q.options.map((_, j) =>
                      <option key={j} value={j}>Option {j + 1}</option>
                    )}
                  </select>
                </Field>

                <Field label="Explanation">
                  <textarea value={q.explanation}
                    onChange={e => updateQuestion(i, 'explanation', e.target.value)} />
                </Field>

                <Field label="Marks">
                  <input type="number" min="1" value={q.marks}
                    onChange={e => updateQuestion(i, 'marks', e.target.value)} />
                </Field>

                {form.questions.length > 1 && (
                  <button type="button" className="btn btn-outline"
                    onClick={() => setForm(old => ({
                      ...old,
                      questions: old.questions.filter((_, j) => i !== j)
                    }))}>
                    <Trash2 size={15} /> Remove question
                  </button>
                )}
              </div>
            ))}

            <div className="modal-actions">
              <button type="button" className="btn btn-outline"
                onClick={() => setForm(old => ({
                  ...old,
                  questions: [...old.questions, {
                    question: '',
                    options: ['', '', '', ''],
                    correctAnswer: 0,
                    explanation: '',
                    marks: 1
                  }]
                }))}>
                <Plus size={16} /> Add question
              </button>
              <button className="btn btn-primary">Publish quiz</button>
            </div>
          </form>
        </Panel>
      )}

      <div className="filters">
        <button className={`btn ${tab === 'available' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setTab('available')}>Available quizzes</button>
        {!isAdmin && (
          <button className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab('history')}>My history</button>
        )}
      </div>

      {loading ? <Loading /> : tab === 'history' ? (
        history.length ? history.map((h, i) => (
          <Panel key={h._id || i} title={h.quiz?.title || 'Quiz attempt'}>
            <p>Score: {h.score ?? 0} / {h.totalMarks ?? 0}</p>
            <span>{h.status || 'Submitted'}</span>
          </Panel>
        )) : <Empty text="No quiz attempts yet." />
      ) : quizzes.length ? quizzes.map(q => (
        <Panel key={q._id} title={q.title}
          subtitle={`${q.subject || 'General'} · Semester ${q.semester || 'All'}`}>
          <p>{q.description}</p>
          <p><Clock size={15} /> {q.duration} minutes · {q.questions?.length || 0} questions</p>
          <div className="modal-actions">
            {!isAdmin && (
              <button className="btn btn-primary" onClick={() => startQuiz(q)}>
                Start quiz <ChevronRight size={16} />
              </button>
            )}
            {isAdmin && (
              <button className="btn btn-outline"
                onClick={() => deleteQuiz(q._id)}>
                <Trash2 size={15} /> Delete
              </button>
            )}
          </div>
        </Panel>
      )) : <Empty text="No quizzes published yet." />}
    </div>
  );
}

function BookmarksPage({ request, setNotice }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await request('/api/academic/bookmarks');
      setItems(d.bookmarks || []);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async id => {
    try {
      await request(`/api/academic/bookmarks/${id}`, { method: 'DELETE' });
      setItems(old => old.filter(x => (x.material?._id || x.material) !== id));
      setNotice('Bookmark removed.');
    } catch (e) {
      setNotice(e.message);
    }
  };

  return (
    <div>
      <div className="page-title-row">
        <div><span className="eyebrow">SAVED RESOURCES</span><h1>Bookmarks</h1>
          <p>Your saved study materials.</p></div>
      </div>
      {loading ? <Loading /> : items.length ? items.map(b => {
        const m = b.material || {};
        return (
          <Panel key={b._id} title={m.title || 'Saved material'}
            subtitle={`${m.subject || ''} · ${m.type || ''}`}>
            <p>{m.description}</p>
            <div className="modal-actions">
              {m.storedName && (
                <a className="btn btn-primary"
                  href={`/uploads/${encodeURIComponent(m.storedName)}`}
                  target="_blank" rel="noreferrer">
                  <FileText size={16} /> Open
                </a>
              )}
              <button className="btn btn-outline"
                onClick={() => remove(m._id)}>
                <Trash2 size={15} /> Remove
              </button>
            </div>
          </Panel>
        );
      }) : <Empty text="You have not bookmarked any materials." />}
    </div>
  );
}

function NotesPage({ request, setNotice }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', content: '', subject: '',
    department: 'Computer Science & Engineering',
    semester: '1', isPinned: false
  });
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const d = await request('/api/academic/notes');
      setNotes(d.notes || []);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async e => {
    e.preventDefault();
    try {
      await request(
        editing ? `/api/academic/notes/${editing}` : '/api/academic/notes',
        { method: editing ? 'PUT' : 'POST', body: JSON.stringify(form) }
      );
      setForm({ title: '', content: '', subject: '', department: 'Computer Science & Engineering', semester: '1', isPinned: false });
      setEditing(null);
      setNotice('Note saved.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  const edit = n => {
    setEditing(n._id);
    setForm({
      title: n.title, content: n.content,
      subject: n.subject || '',
      department: n.department || 'Computer Science & Engineering',
      semester: String(n.semester || 1),
      isPinned: !!n.isPinned
    });
  };

  const remove = async id => {
    if (!confirm('Delete this note?')) return;
    try {
      await request(`/api/academic/notes/${id}`, { method: 'DELETE' });
      setNotice('Note deleted.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  return (
    <div>
      <div className="page-title-row">
        <div><span className="eyebrow">PERSONAL WORKSPACE</span><h1>My Notes</h1>
          <p>Write and organise your academic notes.</p></div>
      </div>
      <Panel title={editing ? 'Edit note' : 'Create a note'}>
        <form onSubmit={save}>
          <div className="academic-grid">
            <Field label="Title">
              <input required value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Subject">
              <input value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })} />
            </Field>
            <Field label="Department">
              <select value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Semester">
              <select value={form.semester}
                onChange={e => setForm({ ...form, semester: e.target.value })}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n}>{n}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Note content">
            <textarea required rows="5" value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })} />
          </Field>
          <label className="academic-check">
            <input type="checkbox" checked={form.isPinned}
              onChange={e => setForm({ ...form, isPinned: e.target.checked })} />
            Pin this note
          </label>
          <div className="modal-actions">
            {editing && <button type="button" className="btn btn-outline"
              onClick={() => { setEditing(null); setForm({ title: '', content: '', subject: '', department: 'Computer Science & Engineering', semester: '1', isPinned: false }); }}>
              Cancel edit
            </button>}
            <button className="btn btn-primary"><Plus size={16} /> Save note</button>
          </div>
        </form>
      </Panel>
      {loading ? <Loading /> : notes.length ? notes.map(n => (
        <Panel key={n._id} title={n.title}
          subtitle={`${n.subject || 'General'} · Semester ${n.semester || 1}`}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{n.content}</p>
          {n.isPinned && <span className="subtle-badge">Pinned</span>}
          <div className="modal-actions">
            <button className="btn btn-outline" onClick={() => edit(n)}><FileText size={15} /> Edit</button>
            <button className="btn btn-outline" onClick={() => remove(n._id)}><Trash2 size={15} /> Delete</button>
          </div>
        </Panel>
      )) : <Empty text="No notes yet. Create your first note above." />}
    </div>
  );
}

function PlannerPage({ request, setNotice }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', description: '', subject: '',
    dueDate: '', priority: 'medium', status: 'pending'
  });

  const load = async () => {
    try {
      const d = await request('/api/academic/planner');
      setTasks(d.tasks || []);
    } catch (e) {
      setNotice(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const add = async e => {
    e.preventDefault();
    try {
      await request('/api/academic/planner', {
        method: 'POST', body: JSON.stringify(form)
      });
      setForm({ title: '', description: '', subject: '', dueDate: '', priority: 'medium', status: 'pending' });
      setNotice('Task added.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  const update = async (task, status) => {
    try {
      await request(`/api/academic/planner/${task._id}`, {
        method: 'PUT', body: JSON.stringify({ status })
      });
      load();
    } catch (e) { setNotice(e.message); }
  };

  const remove = async id => {
    try {
      await request(`/api/academic/planner/${id}`, { method: 'DELETE' });
      setNotice('Task deleted.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  return (
    <div>
      <div className="page-title-row">
        <div><span className="eyebrow">STAY ORGANISED</span><h1>Study Planner</h1>
          <p>Keep track of assignments, revisions and study tasks.</p></div>
      </div>
      <Panel title="Add a task">
        <form onSubmit={add}>
          <div className="academic-grid">
            <Field label="Task title">
              <input required value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Subject">
              <input value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })} />
            </Field>
            <Field label="Due date">
              <input type="date" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <Field label="Priority">
              <select value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} />
          </Field>
          <button className="btn btn-primary"><Plus size={16} /> Add task</button>
        </form>
      </Panel>
      {loading ? <Loading /> : tasks.length ? tasks.map(t => (
        <Panel key={t._id} title={t.title}
          subtitle={`${t.subject || 'General'} · ${t.priority || 'medium'} priority`}>
          <p>{t.description}</p>
          {t.dueDate && <p><CalendarDays size={15} /> {new Date(t.dueDate).toLocaleDateString()}</p>}
          <div className="modal-actions">
            <button className="btn btn-outline"
              onClick={() => update(t, t.status === 'completed' ? 'pending' : 'completed')}>
              {t.status === 'completed' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {t.status === 'completed' ? 'Completed' : 'Mark complete'}
            </button>
            <button className="btn btn-outline" onClick={() => remove(t._id)}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </Panel>
      )) : <Empty text="No tasks yet. Add your first study task." />}
    </div>
  );
}

function DiscussionPage({ request, user, isAdmin, setNotice }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', content: '', department: 'Computer Science & Engineering',
    course: '', semester: '1', subject: ''
  });
  const [replies, setReplies] = useState({});

  const load = async () => {
    try {
      const d = await request('/api/academic/discussions');
      setItems(d.discussions || []);
    } catch (e) { setNotice(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const post = async e => {
    e.preventDefault();
    try {
      await request('/api/academic/discussions', {
        method: 'POST', body: JSON.stringify(form)
      });
      setForm({ title: '', content: '', department: 'Computer Science & Engineering', course: '', semester: '1', subject: '' });
      setNotice('Discussion posted.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  const reply = async id => {
    if (!replies[id]?.trim()) return;
    try {
      await request(`/api/academic/discussions/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ content: replies[id] })
      });
      setReplies(old => ({ ...old, [id]: '' }));
      setNotice('Reply added.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  const report = async id => {
    try {
      await request(`/api/academic/discussions/${id}/report`, { method: 'POST' });
      setNotice('Discussion reported.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  return (
    <div>
      <div className="page-title-row">
        <div><span className="eyebrow">ACADEMIC COMMUNITY</span><h1>Discussions</h1>
          <p>Ask questions and share academic knowledge.</p></div>
      </div>
      <Panel title="Start a discussion">
        <form onSubmit={post}>
          <div className="academic-grid">
            <Field label="Title">
              <input required value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Subject">
              <input value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })} />
            </Field>
            <Field label="Department">
              <select value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Course">
              <input value={form.course}
                onChange={e => setForm({ ...form, course: e.target.value })} />
            </Field>
            <Field label="Semester">
              <select value={form.semester}
                onChange={e => setForm({ ...form, semester: e.target.value })}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n}>{n}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Your question or discussion">
            <textarea required rows="4" value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })} />
          </Field>
          <button className="btn btn-primary"><Send size={16} /> Post discussion</button>
        </form>
      </Panel>

      {loading ? <Loading /> : items.length ? items.map(d => (
        <Panel key={d._id} title={d.title}
          subtitle={`${d.author?.name || 'Student'} · ${d.subject || 'General'}`}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{d.content}</p>
          <div className="discussion-replies">
            {(d.replies || []).map((r, i) => (
              <div key={r._id || i} className="academic-reply">
                <b>{r.author?.name || 'Student'}</b>
                <p>{r.content}</p>
              </div>
            ))}
          </div>
          <Field label="Write a reply">
            <textarea rows="2" value={replies[d._id] || ''}
              onChange={e => setReplies(old => ({ ...old, [d._id]: e.target.value }))} />
          </Field>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={() => reply(d._id)}>
              <Send size={15} /> Reply
            </button>
            {!isAdmin && (
              <button className="btn btn-outline" onClick={() => report(d._id)}>
                Report
              </button>
            )}
          </div>
        </Panel>
      )) : <Empty text="No discussions yet. Start the first one." />}
    </div>
  );
}

function AnnouncementPage({ request, isAdmin, setNotice }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', message: '', targetDepartment: '',
    targetCourse: '', targetSemester: '', category: 'general',
    published: true
  });

  const load = async () => {
    try {
      const url = isAdmin
        ? '/api/academic/admin/announcements'
        : '/api/academic/announcements';
      const d = await request(url);
      setItems(d.announcements || []);
    } catch (e) { setNotice(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const publish = async e => {
    e.preventDefault();
    try {
      await request('/api/academic/admin/announcements', {
        method: 'POST', body: JSON.stringify(form)
      });
      setForm({ title: '', message: '', targetDepartment: '', targetCourse: '', targetSemester: '', category: 'general', published: true });
      setNotice('Announcement published.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  const remove = async id => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await request(`/api/academic/admin/announcements/${id}`, { method: 'DELETE' });
      setNotice('Announcement deleted.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  return (
    <div>
      <div className="page-title-row">
        <div><span className="eyebrow">CAMPUS UPDATES</span><h1>Announcements</h1>
          <p>Important academic notices and updates.</p></div>
      </div>
      {isAdmin && (
        <Panel title="Publish announcement">
          <form onSubmit={publish}>
            <Field label="Title">
              <input required value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Message">
              <textarea required rows="4" value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })} />
            </Field>
            <div className="academic-grid">
              <Field label="Target department (optional)">
                <select value={form.targetDepartment}
                  onChange={e => setForm({ ...form, targetDepartment: e.target.value })}>
                  <option value="">All departments</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Target course (optional)">
                <input value={form.targetCourse}
                  onChange={e => setForm({ ...form, targetCourse: e.target.value })} />
              </Field>
              <Field label="Target semester (optional)">
                <select value={form.targetSemester}
                  onChange={e => setForm({ ...form, targetSemester: e.target.value })}>
                  <option value="">All semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="general">General</option>
                  <option value="academic">Academic</option>
                  <option value="exam">Exam</option>
                  <option value="event">Event</option>
                  <option value="deadline">Deadline</option>
                </select>
              </Field>
            </div>
            <button className="btn btn-primary"><Megaphone size={16} /> Publish</button>
          </form>
        </Panel>
      )}
      {loading ? <Loading /> : items.length ? items.map(a => (
        <Panel key={a._id} title={a.title}
          subtitle={`${a.category || 'General'} · ${new Date(a.createdAt).toLocaleDateString()}`}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{a.message}</p>
          {isAdmin && <button className="btn btn-outline" onClick={() => remove(a._id)}>
            <Trash2 size={15} /> Delete
          </button>}
        </Panel>
      )) : <Empty text="No announcements yet." />}
    </div>
  );
}

function NotificationsPage({ request, setNotice }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const d = await request('/api/academic/notifications');
      setItems(d.notifications || []);
    } catch (e) { setNotice(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const read = async id => {
    try {
      await request(`/api/academic/notifications/${id}/read`, { method: 'PUT' });
      load();
    } catch (e) { setNotice(e.message); }
  };

  const readAll = async () => {
    try {
      await request('/api/academic/notifications/read-all', { method: 'PUT' });
      setNotice('All notifications marked as read.');
      load();
    } catch (e) { setNotice(e.message); }
  };

  return (
    <div>
      <div className="page-title-row">
        <div><span className="eyebrow">YOUR UPDATES</span><h1>Notifications</h1>
          <p>Stay informed about academic updates.</p></div>
        <button className="btn btn-outline" onClick={readAll}>Mark all read</button>
      </div>
      {loading ? <Loading /> : items.length ? items.map(n => (
        <Panel key={n._id} title={n.title}
          subtitle={`${n.category || 'Update'} · ${new Date(n.createdAt).toLocaleString()}`}>
          <p>{n.message}</p>
          {!n.isRead && (
            <button className="btn btn-outline" onClick={() => read(n._id)}>
              <CheckCircle2 size={15} /> Mark as read
            </button>
          )}
          {n.isRead && <span className="subtle-badge">Read</span>}
        </Panel>
      )) : <Empty text="You are all caught up. No notifications." />}
    </div>
  );
}

export default AcademicPages;
