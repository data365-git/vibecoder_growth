import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutGrid,
  CalendarDays,
  Circle,
  Users,
  Settings as SettingsIcon,
  ChevronLeft,
  HelpCircle,
} from 'lucide-react';

// Sidebar is intentionally short: only pages that have live data flowing
// today (discipline-only mode). Weekly review, Monthly scores, and Growth
// logs depend on the 5 manual-pillar wizards which are muted — their
// routes still exist at /weekly /scores /logs for future revival, just
// hidden from nav. Logout lives on the Settings page now, not in the
// sidebar corner — it deserves a real Account section.
const links = [
  { to: '/daily', label: 'Daily', icon: LayoutGrid },
  { to: '/standup', label: 'Stand-up', icon: CalendarDays },
  { to: '/status', label: 'Status', icon: Circle },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
  { to: '/help', label: 'How it works', icon: HelpCircle },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-border/60 bg-card flex flex-col">
        <div className="flex items-center justify-between px-5 pt-6 pb-7">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              d
            </div>
            <div className="text-[15px] font-semibold leading-none tracking-tight">
              data365 <span className="text-muted-foreground">·</span> Growth
            </div>
          </div>
          <button
            className="h-7 w-7 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground hover:bg-muted transition"
            title="Collapse"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        <nav className="flex-1 px-3 pb-5 space-y-1">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-primary-soft text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : ''}`} />
                    <span>{l.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
