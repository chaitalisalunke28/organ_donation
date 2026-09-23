import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Activity,
  Building2,
  Users,
  Heart,
  ClipboardList,
  CheckCircle,
  XCircle,
  LogOut,
  Menu,
  X,
  UserPlus,
  Shuffle,
  Bell,
  LayoutDashboard,
  Package,
  History,
  BarChart3,
  Layers,
  Database,
  ChevronDown,
  ChevronRight,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const ICON = 17;

const ADMIN_NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={ICON} /> }],
  },
  {
    title: 'Network',
    items: [
      { label: 'Hospitals', path: '/admin/hospitals', icon: <Building2 size={ICON} /> },
      { label: 'Register Hospital', path: '/admin/hospitals/add', icon: <PlusCircle size={ICON} /> },
    ],
  },
];

const HOSPITAL_NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', path: '/hospital/dashboard', icon: <LayoutDashboard size={ICON} /> }],
  },
  {
    title: 'Patients',
    items: [
      { label: 'Donors', path: '/hospital/donors', icon: <Heart size={ICON} /> },
      { label: 'Receivers', path: '/hospital/receivers', icon: <Users size={ICON} /> },
      { label: 'Verified Pool', path: '/hospital/verified-pool', icon: <CheckCircle size={ICON} /> },
    ],
  },
  {
    title: 'Register',
    items: [
      { label: 'Add Donor', path: '/hospital/add-donor', icon: <UserPlus size={ICON} /> },
      { label: 'Add Receiver', path: '/hospital/add-receiver', icon: <UserPlus size={ICON} /> },
    ],
  },
  {
    title: 'Allocations',
    items: [
      { label: 'Allocation Requests', path: '/hospital/allocation-requests', icon: <ClipboardList size={ICON} /> },
      { label: 'Allocation History', path: '/hospital/allocation-history', icon: <History size={ICON} /> },
    ],
  },
];

const COORDINATOR_NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', path: '/coordinator/dashboard', icon: <LayoutDashboard size={ICON} /> }],
  },
  {
    title: 'Registry',
    items: [
      { label: 'Eligible Donors', path: '/coordinator/donors', icon: <Heart size={ICON} /> },
      { label: 'Eligible Receivers', path: '/coordinator/receivers', icon: <Users size={ICON} /> },
      { label: 'Available Organs', path: '/coordinator/organs', icon: <Package size={ICON} /> },
    ],
  },
  {
    title: 'Matching',
    items: [
      { label: 'Organ Matching', path: '/coordinator/matching', icon: <Shuffle size={ICON} /> },
      { label: 'Multi-Organ Batch', path: '/coordinator/multi-organ', icon: <Layers size={ICON} /> },
    ],
  },
  {
    title: 'Allocations',
    items: [
      { label: 'Active Offers', path: '/coordinator/offers', icon: <Bell size={ICON} /> },
      { label: 'Active Allocations', path: '/coordinator/allocations', icon: <Activity size={ICON} /> },
      { label: 'Completed', path: '/coordinator/completed', icon: <CheckCircle size={ICON} /> },
      { label: 'Unallocated Organs', path: '/coordinator/unallocated', icon: <Package size={ICON} /> },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Rejection History', path: '/coordinator/rejections', icon: <XCircle size={ICON} /> },
      { label: 'Rejection Analytics', path: '/coordinator/analytics/rejections', icon: <BarChart3 size={ICON} /> },
      { label: 'Research Data Lake', path: '/coordinator/research-dataset', icon: <Database size={ICON} /> },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  HOSPITAL: 'Hospital Staff',
  COORDINATOR: 'Transplant Coordinator',
};

// Titles for routes that are not in the sidebar
const EXTRA_TITLES: [RegExp, string][] = [
  [/^\/hospital\/patients\/\d+/, 'Patient Record'],
  [/^\/coordinator\/allocations\/\d+/, 'Allocation Detail'],
  [/^\/admin\/hospitals\/\d+/, 'Hospital Detail'],
];

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const role = user?.role ?? 'ADMIN';
  const groups = role === 'ADMIN' ? ADMIN_NAV : role === 'HOSPITAL' ? HOSPITAL_NAV : COORDINATOR_NAV;
  const allItems = groups.flatMap((g) => g.items.map((item) => ({ ...item, group: g.title })));

  // Longest matching path wins, so /admin/hospitals/add doesn't also light up /admin/hospitals
  const activeItem = allItems
    .filter((item) => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0];
  const extraTitle = EXTRA_TITLES.find(([re]) => re.test(location.pathname))?.[1];
  const pageTitle = extraTitle ?? activeItem?.label ?? 'Dashboard';
  const pageGroup = extraTitle ? null : activeItem?.group;

  useEffect(() => {
    setSidebarOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name ?? 'User')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700">
          <Heart size={16} className="fill-white text-white" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-bold tracking-tight text-gray-900">OrganConnect</p>
          <p className="text-2xs text-gray-500">Transplant Network</p>
        </div>
        <button
          className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-1 px-3 text-2xs font-semibold text-gray-400">{group.title}</p>
            <div className="space-y-px">
              {group.items.map((item) => {
                const active = activeItem?.path === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 rounded-md px-3 py-[7px] text-[13px] transition-colors ${
                      active
                        ? 'bg-teal-50 font-semibold text-teal-800'
                        : 'font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className={active ? 'text-teal-700' : 'text-gray-400'}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 py-3 text-2xs leading-relaxed text-gray-400">
        Academic prototype · synthetic data
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-gray-950/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 z-50 w-72 max-w-[85vw] shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="-ml-1 rounded-lg p-2 text-gray-500 hover:bg-gray-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              {pageGroup && (
                <div className="flex items-center gap-1 text-2xs font-medium text-gray-400">
                  <span>{pageGroup}</span>
                  <ChevronRight size={12} />
                </div>
              )}
              <p className="truncate font-display text-[15px] font-bold text-gray-900">{pageTitle}</p>
            </div>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-gray-100"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                {initials}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-[13px] font-semibold text-gray-900">{user?.name ?? 'User'}</span>
                <span className="block text-2xs text-gray-500">{ROLE_LABEL[role] ?? role}</span>
              </span>
              <ChevronDown size={14} className="hidden text-gray-400 sm:block" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-raised"
              >
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-gray-900">{user?.name ?? 'User'}</p>
                  <p className="truncate text-xs text-gray-500">{user?.email ?? ROLE_LABEL[role]}</p>
                </div>
                <button
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children || <Outlet />}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
