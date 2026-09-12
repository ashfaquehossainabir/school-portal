import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Login.css';

const ROLES = [
  { key: 'admin', label: 'Admin', icon: '🏫' },
  { key: 'teacher', label: 'Teacher', icon: '🧑‍🏫' },
  { key: 'student', label: 'Student', icon: '🎓' },
  { key: 'parent', label: 'Parent', icon: '👪' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-pattern" aria-hidden="true">
          <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 40} x2="400" y2={i * 40} />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="400" />
            ))}
          </svg>
        </div>
        <div className="login-hero-content">
          <div className="login-brand">
            <span className="brand-mark">E</span>
            <span>EduPortal</span>
          </div>
          <h1 className="login-hero-title">Every class, roster, and report card — in one open notebook.</h1>
          <p className="login-hero-sub">
            EduPortal brings attendance, exams, routines and notices together for the whole school community.
          </p>
          <div className="login-role-list">
            {ROLES.map((r) => (
              <div className="login-role-pill" key={r.key}>
                <span>{r.icon}</span>
                {r.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <button className="theme-toggle login-theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-brand login-brand-mobile">
            <span className="brand-mark">E</span>
            <span>EduPortal</span>
          </div>
          <h2 className="login-card-title">Sign in</h2>
          <p className="login-subtitle">Enter your credentials to reach your dashboard.</p>

          {error && <div className="login-error">{error}</div>}

          <label className="field-label">Email or Student ID</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email or ID"
            required
          />

          <label className="field-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <button className="btn btn-primary login-submit" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
