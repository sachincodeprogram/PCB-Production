import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(userId.trim(), password);
      navigate(user.role === 'team' ? '/team' : '/orders', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-visual-brand">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
            <circle cx="16" cy="8" r="1.4" fill="currentColor" />
            <circle cx="8" cy="16" r="1.4" fill="currentColor" />
            <circle cx="16" cy="16" r="1.4" fill="currentColor" />
            <path d="M8 8h8M8 16h8M8 8v8M16 8v8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>PCB Tracker</span>
        </div>

        <div className="login-visual-body">
          <h2>Track every board, from shearing to final inspection.</h2>
          <p>
            A single dashboard for order booking, stage-wise tracking, and team accountability across your
            production pipeline.
          </p>

          <div className="login-visual-features">
            <div className="login-visual-feature">
              <span className="login-visual-feature-icon">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M4 10l4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>Real-time, stage-by-stage order tracking</span>
            </div>
            <div className="login-visual-feature">
              <span className="login-visual-feature-icon">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M4 10l4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>Received, completed &amp; defect quantity per stage</span>
            </div>
            <div className="login-visual-feature">
              <span className="login-visual-feature-icon">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M4 10l4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>Role-based access for admins, managers &amp; teams</span>
            </div>
          </div>
        </div>

        <div className="login-visual-footer">© {new Date().getFullYear()} PCB Tracking Management Application</div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} className="login-form">
            <label className="field">
              <span className="field-label">User ID</span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span className="field-label">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember Me</span>
            </label>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
