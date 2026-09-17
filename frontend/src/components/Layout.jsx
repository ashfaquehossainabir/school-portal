import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NavIcon from './NavIcon';
import './Layout.css';

const NAV_GROUPS = {
  admin: [
    { items: [{ to: '/admin', label: 'Overview', icon: 'overview', end: true }] },
    {
      label: 'People',
      items: [
        { to: '/admin/directory', label: 'Directory', icon: 'directory' },
        { to: '/admin/users', label: 'Users', icon: 'users' },
      ],
    },
    {
      label: 'Academics',
      items: [
        { to: '/admin/classes', label: 'Classes', icon: 'classes' },
        { to: '/admin/attendance', label: 'Attendance', icon: 'attendance' },
        { to: '/admin/exams', label: 'Exam schedule', icon: 'exams' },
        { to: '/admin/online-exams', label: 'Online exams', icon: 'onlineExam' },
        { to: '/admin/fees', label: 'Fee Management', icon: 'fees' },
        { to: '/admin/routine', label: 'Class routine', icon: 'routine' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { to: '/admin/notes', label: 'Notes', icon: 'notes' },
        { to: '/admin/notices', label: 'Notices', icon: 'notices' },
      ],
    },
  ],
  teacher: [
    { items: [{ to: '/teacher', label: 'Overview', icon: 'overview', end: true }] },
    {
      label: 'Classroom',
      items: [
        { to: '/teacher/attendance', label: 'Take attendance', icon: 'attendance' },
        { to: '/teacher/exams', label: 'Exam schedule', icon: 'exams' },
        { to: '/teacher/online-exams', label: 'Online exams', icon: 'onlineExam' },
        { to: '/teacher/routine', label: 'Class routine', icon: 'routine' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { to: '/teacher/notes', label: 'Notes', icon: 'notes' },
        { to: '/teacher/notices', label: 'Notices', icon: 'notices' },
      ],
    },
  ],
  student: [
    { items: [{ to: '/student', label: 'Overview', icon: 'overview', end: true }] },
    {
      label: 'Academics',
      items: [
        { to: '/student/attendance', label: 'Attendance', icon: 'attendance' },
        { to: '/student/exams', label: 'Exam schedule', icon: 'exams' },
        { to: '/student/online-exams', label: 'Online exams', icon: 'onlineExam' },
        { to: '/student/routine', label: 'Class routine', icon: 'routine' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { to: '/student/notes', label: 'Notes', icon: 'notes' },
        { to: '/student/notices', label: 'Notices', icon: 'notices' },
      ],
    },
  ],
  parent: [
    { items: [{ to: '/parent', label: 'Overview', icon: 'overview', end: true }] },
    {
      label: 'Academics',
      items: [
        { to: '/parent/attendance', label: 'Attendance', icon: 'attendance' },
        { to: '/parent/exams', label: 'Exam schedule', icon: 'exams' },
        { to: '/parent/online-exams', label: 'Online exams', icon: 'onlineExam' },
        { to: '/parent/fees', label: 'Fee Status', icon: 'fees' },
        { to: '/parent/routine', label: 'Class routine', icon: 'routine' },
      ],
    },
    {
      label: 'Communication',
      items: [
        { to: '/parent/notes', label: 'Notes', icon: 'notes' },
        { to: '/parent/notices', label: 'Notices', icon: 'notices' },
      ],
    },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();

  const groups = NAV_GROUPS[user?.role] || [];

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">E</span>
          <span>EduPortal</span>
        </div>
        <nav className="sidebar-nav">
          {groups.map((group, gi) => (
            <div className="sidebar-group" key={group.label || `g${gi}`}>
              {group.label && <div className="sidebar-group-label">{group.label}</div>}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <NavIcon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline sidebar-logout" onClick={() => setShowLogoutConfirm(true)}>
            <NavIcon name="logout" size={16} />
            Log out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="main-area">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
          <div className="topbar-title">
            <span className="topbar-greeting">Welcome, {user?.name?.split(' ')[0]}</span>
            <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
          </div>
          <div className="topbar-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="avatar" style={{ background: user?.avatarColor }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className="content">
          <div className="page">
            <Outlet />
          </div>
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="modal-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-card modal-wrapper" style={{ maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Log out?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              You'll need to sign in again to access your dashboard.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-danger" onClick={confirmLogout} style={{ flex: 1 }}>
                Log out
              </button>
              <button className="btn btn-outline" onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
