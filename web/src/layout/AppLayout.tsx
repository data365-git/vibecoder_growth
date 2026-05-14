import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken } from '../api/client';

const links = [
  { to: '/daily', label: 'Daily' },
  { to: '/standup', label: 'Stand-up' },
  { to: '/status', label: 'Status (offline)' },
  { to: '/team', label: 'Team' },
  { to: '/weekly', label: 'Weekly review' },
  { to: '/scores', label: 'Monthly scores' },
  { to: '/logs/design', label: 'Growth logs' },
  { to: '/settings', label: 'Settings' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-card p-4 flex flex-col gap-1">
        <div className="font-bold text-lg mb-4 px-2">data365 · Growth</div>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm hover:bg-accent transition ${isActive ? 'bg-accent text-accent-foreground font-medium' : ''}`
            }
          >
            {l.label}
          </NavLink>
        ))}
        <button
          onClick={() => {
            clearToken();
            navigate('/login');
          }}
          className="mt-auto text-xs text-muted-foreground hover:text-foreground px-3 py-2 text-left"
        >
          Logout
        </button>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
