import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ICONS = {
  orders: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  newOrder: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  departments: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M16 8.5a2.5 2.5 0 100-5M18 14c1.8.4 3 1.8 3 4.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8v5l3 2M21 12a9 9 0 11-3.5-7.13M3 4v5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

const NAV_ITEMS = {
  admin: [
    { to: '/orders', label: 'Orders', icon: ICONS.orders },
    { to: '/orders/new', label: 'New Order', icon: ICONS.newOrder },
    { to: '/departments', label: 'Departments', icon: ICONS.departments },
    { to: '/users', label: 'User Management', icon: ICONS.users },
  ],
  manager: [
    { to: '/orders', label: 'Orders', icon: ICONS.orders },
    { to: '/orders/new', label: 'New Order', icon: ICONS.newOrder },
    { to: '/departments', label: 'Departments', icon: ICONS.departments },
  ],
  team: [
    { to: '/team', label: 'My Department', icon: ICONS.team },
    { to: '/team/history', label: 'Completed Orders', icon: ICONS.history },
  ],
};

export default function Layout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV_ITEMS[role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <svg viewBox="0 0 24 24" className="brand-icon" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
            <circle cx="16" cy="8" r="1.4" fill="currentColor" />
            <circle cx="8" cy="16" r="1.4" fill="currentColor" />
            <circle cx="16" cy="16" r="1.4" fill="currentColor" />
            <path d="M8 8h8M8 16h8M8 8v8M16 8v8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>PCB Tracker</span>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={() => setMenuOpen(false)}
              end={item.to === '/orders' || item.to === '/team'}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <button className="menu-toggle" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            <span />
            <span />
            <span />
          </button>
          <div className="app-header-title">PCB Tracking Management Application</div>
          <div className="app-header-user">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{role}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
