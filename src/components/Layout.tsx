import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        <NavLink to="/">Today</NavLink>
        <NavLink to="/practice">Practice</NavLink>
        <NavLink to="/knowledge">Knowledge</NavLink>
        <NavLink to="/question-bank">Library</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
    </div>
  );
}
