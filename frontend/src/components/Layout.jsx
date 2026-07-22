import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Layout.css';

const NAV_ITEMS = {
  admin: [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/classes', label: 'Classes' },
    { to: '/admin/attendance', label: 'Attendance' },
    { to: '/admin/exams', label: 'Exam Schedule' },
    { to: '/admin/routine', label: 'Class Routine' },
    { to: '/admin/notes', label: 'Notes' },
    { to: '/admin/notices', label: 'Notices' },
  ],
  teacher: [
    { to: '/teacher', label: 'Overview', end: true },
    { to: '/teacher/attendance', label: 'Take Attendance' },
    { to: '/teacher/exams', label: 'Exam Schedule' },
    { to: '/teacher/routine', label: 'Class Routine' },
    { to: '/teacher/notes', label: 'Notes' },
    { to: '/teacher/notices', label: 'Notices' },
  ],
  student: [
    { to: '/student', label: 'Overview', end: true },
    { to: '/student/attendance', label: 'Attendance' },
    { to: '/student/exams', label: 'Exam Schedule' },
    { to: '/student/routine', label: 'Class Routine' },
    { to: '/student/notes', label: 'Notes' },
    { to: '/student/notices', label: 'Notices' },
  ],
  parent: [
    { to: '/parent', label: 'Overview', end: true },
    { to: '/parent/attendance', label: 'Attendance' },
    { to: '/parent/exams', label: 'Exam Schedule' },
    { to: '/parent/routine', label: 'Class Routine' },
    { to: '/parent/notes', label: 'Notes' },
    { to: '/parent/notices', label: 'Notices' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const items = NAV_ITEMS[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-dot" />
          EduPortal
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline" style={{ width: '100%' }} onClick={handleLogout}>
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
            Welcome, {user?.name?.split(' ')[0]}
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
