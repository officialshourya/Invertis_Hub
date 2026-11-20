
import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, LayoutDashboard, FileText, ClipboardList,
  FlaskConical, HelpCircle, Users, LogOut,
  Search, Plus, UploadCloud, Trash2, Pencil, Download,
  ExternalLink, Menu, X, GraduationCap, Bell,
  ShieldCheck, Sparkles, ChevronRight, FolderOpen,
  LoaderCircle, UserRound, Bookmark, NotebookPen,
  CalendarDays, MessageCircle, Megaphone, Trophy
} from 'lucide-react';

import ProfilePage from './ProfilePage.jsx';
import { AcademicPages } from './AcademicPages.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TYPES = [
  'Notes', 'PYQ', 'Assignment', 'Practical',
  'Question Bank', 'Syllabus', 'Other'
];

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, section: 'MAIN' },
  { id: 'profile', label: 'My Profile', icon: UserRound, section: 'MAIN' },

  { id: 'materials', label: 'Study Materials', icon: BookOpen, section: 'ACADEMICS' },
  { id: 'pyq', label: 'PYQ Papers', icon: FileText, section: 'ACADEMICS' },
  { id: 'assignments', label: 'Assignments', icon: ClipboardList, section: 'ACADEMICS' },
  { id: 'practicals', label: 'Practical Hub', icon: FlaskSinIcon, section: 'ACADEMICS' },
  { id: 'questions', label: 'Question Bank', icon: HelpCircle, section: 'ACADEMICS' },
  { id: 'quizzes', label: 'Quiz Arena', icon: Trophy, section: 'ACADEMICS' },

  { id: 'bookmarks', label: 'My Bookmarks', icon: Bookmark, section: 'MY SPACE' },
  { id: 'notes', label: 'Personal Notes', icon: NotebookPen, section: 'MY SPACE' },
  { id: 'planner', label: 'Study Planner', icon: CalendarDays, section: 'MY SPACE' },

  { id: 'discussions', label: 'Discussions', icon: MessageCircle, section: 'COMMUNITY' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, section: 'COMMUNITY' },
  { id: 'notifications', label: 'Notifications', icon: Bell, section: 'COMMUNITY' },

  { id: 'users', label: 'Users', icon: Users, section: 'ADMIN', admin: true }
];

// Alias keeps the icon reference clear.
const FlaskSinIcon = FlaskConical;

function App() {
  const [token, setToken] = useState(localStorage.getItem('ih_token') || '');
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('ih_user') || 'null')
  );

  const [view, setView] = useState('home');
  const [active, setActive] = useState('overview');
  const [mobileNav, setMobileNav] = useState(false);

  const [materials, setMaterials] = useState([]);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('');

  const [showUpload, setShowUpload] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'Notes',
    department: 'Computer Science & Engineering',
    semester: '1',
    subject: '',
    unit: '',
    year: ''
  });

  const [file, setFile] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [auth, setAuth] = useState({
    name: '',
    email: '',
    password: ''
  });

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const isAdmin = user?.role === 'admin';

  const visibleItems = useMemo(() => {
    return materials.filter(m => {
      const matchTab =
        active === 'pyq' ? m.type === 'PYQ' :
        active === 'assignments' ? m.type === 'Assignment' :
        active === 'practicals' ? m.type === 'Practical' :
        active === 'questions' ? m.type === 'Question Bank' :
        true;

      return matchTab;
    });
  }, [materials, active]);

  const request = async (url, options = {}) => {
    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
        ...(token ? headers : {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong.');
    }

    return data;
  };

  const loadMaterials = async () => {
    try {
      const params = new URLSearchParams();

      if (query) params.set('search', query);
      if (typeFilter !== 'All') params.set('type', typeFilter);
      if (semesterFilter) params.set('semester', semesterFilter);

      const data = await request(
        `/api/materials?${params.toString()}`
      );

      setMaterials(data.materials || []);
    } catch (e) {
      setNotice(e.message);
    }
  };

  const loadAdminData = async () => {
    if (!isAdmin) return;

    try {
      const [s, u] = await Promise.all([
        request('/api/admin/stats'),
        request('/api/admin/users')
      ]);

      setStats(s);
      setUsers(u.users || []);
    } catch (e) {
      setNotice(e.message);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, [query, typeFilter, semesterFilter]);

  useEffect(() => {
    if (token && user) {
      setView('app');
      loadAdminData();
    }
  }, [token, user]);

  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(''), 4500);
      return () => clearTimeout(t);
    }
  }, [notice]);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await request(
        authMode === 'login'
          ? '/api/auth/login'
          : '/api/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(auth)
        }
      );

      if (authMode === 'register') {
        setNotice(data.message || 'Registration successful. Please sign in.');
        setAuthMode('login');
        setAuth({ name: '', email: auth.email, password: '' });
      } else {
        localStorage.setItem('ih_token', data.token);
        localStorage.setItem('ih_user', JSON.stringify(data.user));

        setToken(data.token);
        setUser(data.user);
        setView('app');
        setActive('overview');
        setNotice(`Welcome, ${data.user.name}`);
      }
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = (updatedUser) => {
    const updated = {
      ...user,
      ...updatedUser
    };

    setUser(updated);
    localStorage.setItem('ih_user', JSON.stringify(updated));
  };

  const logout = () => {
    localStorage.removeItem('ih_token');
    localStorage.removeItem('ih_user');

    setToken('');
    setUser(null);
    setView('home');
    setActive('overview');
    setMobileNav(false);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      type: 'Notes',
      department: 'Computer Science & Engineering',
      semester: '1',
      subject: '',
      unit: '',
      year: ''
    });

    setFile(null);
    setEditing(null);
  };

  const openEdit = (item) => {
    setEditing(item);

    setForm({
      title: item.title,
      description: item.description || '',
      type: item.type,
      department: item.department || '',
      semester: String(item.semester),
      subject: item.subject,
      unit: item.unit || '',
      year: item.year || ''
    });

    setFile(null);
    setShowUpload(true);
  };

  const saveMaterial = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editing) {
        await request(`/api/admin/materials/${editing._id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });

        setNotice('Material details updated.');
      } else {
        if (!file) {
          throw new Error('Please select a file to upload.');
        }

        const body = new FormData();

        Object.entries(form).forEach(([k, v]) => {
          body.append(k, v);
        });

        body.append('file', file);

        await request('/api/admin/materials', {
          method: 'POST',
          body
        });

        setNotice('Material uploaded successfully.');
      }

      setShowUpload(false);
      resetForm();

      await loadMaterials();
      await loadAdminData();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteMaterial = async (item) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await request(`/api/admin/materials/${item._id}`, {
        method: 'DELETE'
      });

      setNotice('Material deleted.');

      await loadMaterials();
      await loadAdminData();
    } catch (e) {
      setNotice(e.message);
    }
  };

  const startApp = () => {
    if (token && user) {
      setView('app');
    } else {
      setView('auth');
    }
  };

  const assetUrl = (name) =>
    `${API}/uploads/${encodeURIComponent(name || '')}`;

  const navigate = (page) => {
    setActive(page);
    setMobileNav(false);
  };

  const visibleNavItems = navItems.filter(
    item => !item.admin || isAdmin
  );

  const navSections = [...new Set(
    visibleNavItems.map(item => item.section)
  )];

  if (view === 'home') {
    return (
      <Landing
        onStart={startApp}
        onLogin={() => {
          setAuthMode('login');
          setView('auth');
        }}
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthScreen
        auth={auth}
        setAuth={setAuth}
        authMode={authMode}
        setAuthMode={setAuthMode}
        onSubmit={login}
        loading={loading}
        notice={notice}
        onHome={() => setView('home')}
      />
    );
  }

  return (
    <div className="app-shell">

      {mobileNav && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileNav(false)}
        />
      )}

      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>

        <div className="side-brand">
          <img src="/invertis-hub-logo.jpg" alt="Invertis Hub" />

          <div>
            <b>INVERTIS HUB</b>
            <span>Academic Portal</span>
          </div>

          <button
            className="icon-btn mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="hub-navigation">
          {navSections.map(section => (
            <div className="nav-section" key={section}>
              <div className="side-label">{section}</div>

              {visibleNavItems
                .filter(item => item.section === section)
                .map(item => (
                  <button
                    key={item.id}
                    className={`nav-link ${active === item.id ? 'active' : ''}`}
                    onClick={() => navigate(item.id)}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>

                    {active === item.id && (
                      <ChevronRight size={15} className="nav-arrow" />
                    )}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <Sparkles size={18} />
            <b>Keep learning</b>
            <p>
              Find notes, practise quizzes and organise your academic work.
            </p>
          </div>

          <button className="nav-link" onClick={logout}>
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="main-area">

        <header className="topbar">

          <button
            className="icon-btn mobile-menu"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>

          <div className="crumb">
            Workspace <span>/</span>
            <b>
              {navItems.find(n => n.id === active)?.label || 'Overview'}
            </b>
          </div>

          <div className="top-actions">
            <span className="role-pill">
              <ShieldCheck size={14} />
              {isAdmin ? 'Administrator' : 'Student'}
            </span>

            <button
              className="icon-btn notification-shortcut"
              onClick={() => navigate('notifications')}
              title="Notifications"
            >
              <Bell size={18} />
            </button>

            <div className="avatar">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>

            <div className="user-meta">
              <b>{user?.name}</b>
              <span>{user?.email}</span>
            </div>
          </div>

        </header>

        <div className="page-content">

          {notice && (
            <div className="toast" role="status">
              {notice}
              <button onClick={() => setNotice('')} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}

          {active === 'overview' && (
            <Overview
              isAdmin={isAdmin}
              user={user}
              stats={stats}
              materials={materials}
              onNavigate={navigate}
              onUpload={() => {
                resetForm();
                setShowUpload(true);
              }}
            />
          )}

          {active === 'profile' && (
            <ProfilePage
              request={request}
              user={user}
              onUserUpdate={handleUserUpdate}
              setNotice={setNotice}
            />
          )}

          {[
            'materials',
            'pyq',
            'assignments',
            'practicals',
            'questions'
          ].includes(active) && (
            <MaterialsPage
              title={navItems.find(n => n.id === active)?.label}
              items={visibleItems}
              isAdmin={isAdmin}
              query={query}
              setQuery={setQuery}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              semesterFilter={semesterFilter}
              setSemesterFilter={setSemesterFilter}
              onUpload={() => {
                resetForm();
                setShowUpload(true);
              }}
              onEdit={openEdit}
              onDelete={deleteMaterial}
              assetUrl={assetUrl}
            />
          )}

          {[
            'quizzes',
            'bookmarks',
            'notes',
            'planner',
            'discussions',
            'announcements',
            'notifications'
          ].includes(active) && (
            <AcademicPages
              page={active}
              request={request}
              user={user}
              isAdmin={isAdmin}
              setNotice={setNotice}
            />
          )}

          {active === 'users' && isAdmin && (
            <UsersPage users={users} />
          )}

        </div>
      </main>

      {showUpload && (
        <UploadModal
          form={form}
          setForm={setForm}
          file={file}
          setFile={setFile}
          editing={editing}
          onClose={() => {
            setShowUpload(false);
            resetForm();
          }}
          onSubmit={saveMaterial}
          loading={loading}
        />
      )}
    </div>
  );
}

function Landing({ onStart, onLogin }) {
  return (
    <div className="landing">
      <header className="landing-nav">
        <img src="/invertis-hub-logo.jpg" alt="Invertis Hub logo" />

        <div className="landing-nav-actions">
          <a href="#features">Features</a>
          <button className="btn btn-outline" onClick={onLogin}>
            Log in
          </button>
          <button className="btn btn-primary" onClick={onStart}>
            Open Hub <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            YOUR CAMPUS, ONE ACADEMIC HUB
          </div>

          <h1>
            Learn better.<br />
            <em>Grow together.</em>
          </h1>

          <p>
            One organised space for study materials, previous year papers,
            assignments, quizzes and academic resources.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary btn-large" onClick={onStart}>
              Explore Invertis Hub <ChevronRight size={18} />
            </button>

            <a className="text-link" href="#features">
              Discover features <ExternalLink size={14} />
            </a>
          </div>

          <div className="hero-trust">
            <span><ShieldCheck size={15} /> Student-focused</span>
            <span><BookOpen size={15} /> Academic resources</span>
          </div>
        </div>

        <div className="hero-art">
          <div className="art-glow" />

          <div className="art-card art-card-main">
            <div className="art-top">
              <span>YOUR LEARNING SPACE</span>
              <span className="live-dot" />
            </div>

            <div className="art-book">
              <BookOpen size={64} strokeWidth={1.3} />
            </div>

            <h3>
              Everything you need<br />
              to keep learning.
            </h3>

            <div className="art-lines">
              <i /><i /><i />
            </div>

            <div className="art-tags">
              <span>NOTES</span>
              <span>PYQs</span>
              <span>QUIZZES</span>
            </div>
          </div>

          <div className="float-chip chip-one">
            <FileText size={18} />
            <span>
              <b>Study resources</b>
              <small>Organised by subject</small>
            </span>
          </div>

          <div className="float-chip chip-two">
            <GraduationCap size={20} />
            <span>
              <b>Learn at your pace</b>
              <small>Your academic space</small>
            </span>
          </div>
        </div>
      </section>

      <section id="features" className="feature-section">
        <div className="section-heading">
          <span className="eyebrow">THE HUB EXPERIENCE</span>
          <h2>Everything academic, <em>in one place.</em></h2>
          <p>Explore the resources that support your learning journey.</p>
        </div>

        <div className="feature-grid">
          <Feature
            icon={BookOpen}
            title="Study Materials"
            text="Find subject-wise notes, unit resources and reference PDFs."
          />
          <Feature
            icon={FileText}
            title="PYQ Library"
            text="Browse previous year papers by semester and subject."
          />
          <Feature
            icon={ClipboardList}
            title="Assignments"
            text="Access assignment briefs, instructions and resources."
          />
          <Feature
            icon={FlaskConical}
            title="Practical Hub"
            text="Keep lab manuals, experiment resources and viva prep together."
          />
          <Feature
            icon={HelpCircle}
            title="Question Bank"
            text="Practise from organised question collections."
          />
          <Feature
            icon={Trophy}
            title="Quiz Arena"
            text="Attempt quizzes and track your practice results."
          />
          <Feature
            icon={NotebookPen}
            title="Personal Notes"
            text="Keep your own study notes organised."
          />
          <Feature
            icon={CalendarDays}
            title="Study Planner"
            text="Organise academic tasks and due dates."
          />
          <Feature
            icon={MessageCircle}
            title="Discussions"
            text="Share academic questions and take part in discussions."
          />
        </div>
      </section>

      <footer className="landing-footer">
        <img src="/invertis-hub-logo.jpg" alt="Invertis Hub" />
        <span>
          © {new Date().getFullYear()} Invertis Hub · Academic Learning Portal
        </span>
        <small>Designed & Developed by SHOMIQ TECHNOLOGIES</small>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        <Icon size={21} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function AuthScreen({
  auth,
  setAuth,
  authMode,
  setAuthMode,
  onSubmit,
  loading,
  notice,
  onHome
}) {
  return (
    <div className="auth-page">
      <button className="back-home" onClick={onHome}>
        ← Back to home
      </button>

      <div className="auth-card">
        <img
          className="auth-logo"
          src="/invertis-hub-logo.jpg"
          alt="Invertis Hub"
        />

        <div className="auth-heading">
          <span className="eyebrow">WELCOME TO YOUR ACADEMIC SPACE</span>

          <h1>
            {authMode === 'login'
              ? 'Sign in to Invertis Hub'
              : 'Create student account'}
          </h1>

          <p>
            {authMode === 'login'
              ? 'Access your learning resources and dashboard.'
              : 'Register for student access to the academic portal.'}
          </p>
        </div>

        {notice && <div className="inline-notice">{notice}</div>}

        <form onSubmit={onSubmit} className="auth-form">
          {authMode === 'register' && (
            <label>
              Full name
              <input
                required
                value={auth.name}
                onChange={e => setAuth({ ...auth, name: e.target.value })}
                placeholder="Your name"
              />
            </label>
          )}

          <label>
            Email address
            <input
              required
              type="email"
              value={auth.email}
              onChange={e => setAuth({ ...auth, email: e.target.value })}
              placeholder="name@example.com"
            />
          </label>

          <label>
            Password
            <input
              required
              minLength={8}
              type="password"
              value={auth.password}
              onChange={e => setAuth({ ...auth, password: e.target.value })}
              placeholder="At least 8 characters"
            />
          </label>

          <button className="btn btn-primary btn-full" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={17} /> : null}
            {authMode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {authMode === 'login'
            ? 'New student?'
            : 'Already have an account?'}

          {' '}

          <button
            onClick={() =>
              setAuthMode(authMode === 'login' ? 'register' : 'login')
            }
          >
            {authMode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </div>

        <p className="auth-footnote">
          Admin accounts are created securely by the system owner.
          There is no public admin registration.
        </p>
      </div>
    </div>
  );
}

function Overview({
  isAdmin,
  user,
  stats,
  materials,
  onNavigate,
  onUpload
}) {
  const cards = isAdmin
    ? [
        ['Students', stats.students || 0, Users],
        ['Study materials', stats.materials || 0, BookOpen],
        ['PYQ papers', stats.pyqs || 0, FileText],
        ['Assignments', stats.assignments || 0, ClipboardList]
      ]
    : [
        ['Study materials', materials.length, BookOpen],
        ['PYQ papers', materials.filter(m => m.type === 'PYQ').length, FileText],
        ['Assignments', materials.filter(m => m.type === 'Assignment').length, ClipboardList],
        ['Practicals', materials.filter(m => m.type === 'Practical').length, FlaskConical]
      ];

  return (
    <>
      <div className="welcome-row">
        <div>
          <span className="eyebrow">YOUR ACADEMIC WORKSPACE</span>
          <h1>
            Hello, {user?.name?.split(' ')[0] || 'there'} <span className="wave">✦</span>
          </h1>
          <p>
            {isAdmin
              ? 'Manage resources and keep your academic hub up to date.'
              : 'Pick up where you left off and explore your study resources.'}
          </p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={onUpload}>
            <Plus size={17} /> Upload material
          </button>
        )}
      </div>

      <div className="stats-grid">
        {cards.map(([label, value, Icon]) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon"><Icon size={19} /></div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{isAdmin ? 'Current total' : 'Available in the hub'}</small>
          </div>
        ))}
      </div>

      <div className="content-split">
        <section className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">EXPLORE</span>
              <h2>Academic resources</h2>
            </div>
            <span className="subtle-badge">Study space</span>
          </div>

          <div className="quick-grid">
            <Quick icon={BookOpen} title="Study Materials" text="Notes & unit resources" onClick={() => onNavigate('materials')} />
            <Quick icon={FileText} title="PYQ Papers" text="Previous year papers" onClick={() => onNavigate('pyq')} />
            <Quick icon={ClipboardList} title="Assignments" text="Tasks & resources" onClick={() => onNavigate('assignments')} />
            <Quick icon={FlaskConical} title="Practical Hub" text="Lab manuals & viva" onClick={() => onNavigate('practicals')} />
            <Quick icon={HelpCircle} title="Question Bank" text="Important questions" onClick={() => onNavigate('questions')} />
            <Quick icon={Trophy} title="Quiz Arena" text="Practice quizzes" onClick={() => onNavigate('quizzes')} />
            <Quick icon={NotebookPen} title="Personal Notes" text="Your saved notes" onClick={() => onNavigate('notes')} />
            <Quick icon={CalendarDays} title="Study Planner" text="Organise your tasks" onClick={() => onNavigate('planner')} />
            <Quick icon={MessageCircle} title="Discussions" text="Academic community" onClick={() => onNavigate('discussions')} />
            <Quick icon={Bookmark} title="Bookmarks" text="Saved resources" onClick={() => onNavigate('bookmarks')} />
          </div>
        </section>

        <section className="panel recent-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LATEST UPLOADS</span>
              <h2>Recently added</h2>
            </div>

            <button
              className="subtle-link"
              onClick={() => onNavigate('materials')}
            >
              View all <ChevronRight size={14} />
            </button>
          </div>

          {materials.slice(0, 5).length ? (
            materials.slice(0, 5).map(m => (
              <div className="recent-item" key={m._id}>
                <div className="file-icon"><FileText size={17} /></div>
                <div className="recent-info">
                  <b>{m.title}</b>
                  <span>{m.subject} · Semester {m.semester}</span>
                </div>
                <span className="type-mini">{m.type}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <FolderOpen size={26} />
              <b>No materials uploaded yet</b>
              <span>New resources will appear here.</span>
            </div>
          )}
        </section>
      </div>

      <div className="notice-strip">
        <div className="notice-symbol"><Sparkles size={19} /></div>
        <div>
          <b>A focused space for learning</b>
          <p>
            Study materials are organised by category, semester and subject
            to make them easier to find.
          </p>
        </div>
      </div>
    </>
  );
}

function Quick({ icon: Icon, title, text, onClick }) {
  return (
    <button className="quick-item" onClick={onClick}>
      <span className="quick-icon"><Icon size={19} /></span>
      <span>
        <b>{title}</b>
        <small>{text}</small>
      </span>
      <ChevronRight size={16} />
    </button>
  );
}

function MaterialsPage({
  title,
  items,
  isAdmin,
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  semesterFilter,
  setSemesterFilter,
  onUpload,
  onEdit,
  onDelete,
  assetUrl
}) {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">RESOURCE LIBRARY</span>
          <h1>{title}</h1>
          <p>Browse academic resources shared on Invertis Hub.</p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={onUpload}>
            <Plus size={17} /> Upload material
          </button>
        )}
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={17} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search title or subject..."
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="All">All types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        <select
          value={semesterFilter}
          onChange={e => setSemesterFilter(e.target.value)}
        >
          <option value="">All semesters</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <option key={n} value={n}>Semester {n}</option>
          ))}
        </select>
      </div>

      <div className="results-line">
        {items.length} resource{items.length === 1 ? '' : 's'} found
      </div>

      {items.length ? (
        <div className="materials-grid">
          {items.map(m => (
            <article className="material-card" key={m._id}>
              <div className="material-card-top">
                <div className="material-file"><FileText size={21} /></div>
                <span className="material-type">{m.type}</span>
              </div>

              <h3>{m.title}</h3>

              <p>
                {m.description ||
                  'Academic resource uploaded for student learning.'}
              </p>

              <div className="material-meta">
                <span>{m.subject}</span>
                <span>Sem {m.semester}</span>
                {m.unit && (
                  <span>
                    {m.unit.startsWith('Unit') ? m.unit : `Unit ${m.unit}`}
                  </span>
                )}
              </div>

              <div className="material-card-bottom">
                <small>{m.originalName || 'Study resource'}</small>

                <div className="material-actions">
                  <a
                    className="icon-btn"
                    href={assetUrl(m.storedName)}
                    target="_blank"
                    rel="noreferrer"
                    title="Open or download"
                  >
                    <Download size={17} />
                  </a>

                  {isAdmin && (
                    <>
                      <button
                        className="icon-btn"
                        onClick={() => onEdit(m)}
                        title="Edit details"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        className="icon-btn danger"
                        onClick={() => onDelete(m)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-large">
          <FolderOpen size={35} />
          <h3>No resources found</h3>
          <p>
            {isAdmin
              ? 'Upload your first resource using the button above.'
              : 'There are no resources in this category yet.'}
          </p>
        </div>
      )}
    </>
  );
}

function UploadModal({
  form,
  setForm,
  file,
  setFile,
  editing,
  onClose,
  onSubmit,
  loading
}) {
  const change = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="upload-modal">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">CONTENT MANAGEMENT</span>
            <h2>{editing ? 'Edit material details' : 'Upload study material'}</h2>
            <p>Add a resource to the student library.</p>
          </div>

          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="wide">
              Material title *
              <input
                name="title"
                required
                value={form.title}
                onChange={change}
                placeholder="e.g. Java Unit 1 Notes"
              />
            </label>

            <label>
              Material type *
              <select name="type" value={form.type} onChange={change}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>

            <label>
              Department
              <select
                name="department"
                value={form.department}
                onChange={change}
              >
                <option>Computer Science & Engineering</option>
                <option>Electrical Engineering</option>
                <option>Mechanical Engineering</option>
                <option>Civil Engineering</option>
                <option>Management</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Semester *
              <select
                name="semester"
                value={form.semester}
                onChange={change}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>Semester {n}</option>
                ))}
              </select>
            </label>

            <label>
              Subject *
              <input
                name="subject"
                required
                value={form.subject}
                onChange={change}
                placeholder="e.g. Programming in Java"
              />
            </label>

            <label>
              Unit / Topic
              <input
                name="unit"
                value={form.unit}
                onChange={change}
                placeholder="e.g. Unit 1"
              />
            </label>

            <label>
              Year / Session
              <input
                name="year"
                value={form.year}
                onChange={change}
                placeholder="e.g. 2025-26"
              />
            </label>

            <label className="wide">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={change}
                rows="3"
                placeholder="Short description of this resource..."
              />
            </label>
          </div>

          {!editing && (
            <label className="file-drop">
              <UploadCloud size={25} />
              <b>{file ? file.name : 'Choose a file to upload'}</b>
              <span>
                PDF, DOC, DOCX, PPT, PPTX, JPG or PNG · Maximum 15 MB
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
              />
            </label>
          )}

          {editing && (
            <p className="edit-note">
              This edits the listing details. To replace the document,
              delete the listing and upload the new file.
            </p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
            >
              Cancel
            </button>

            <button className="btn btn-primary" disabled={loading}>
              {loading
                ? <LoaderCircle size={17} className="spin" />
                : <UploadCloud size={17} />}

              {editing ? 'Save changes' : 'Publish material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersPage({ users }) {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">ACCESS MANAGEMENT</span>
          <h1>Users</h1>
          <p>Accounts registered on Invertis Hub.</p>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>

            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td><b>{u.name}</b></td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`role-tag ${u.role}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!users.length && (
          <div className="empty-state">No users found.</div>
        )}
      </div>
    </>
  );
}

export default App;
