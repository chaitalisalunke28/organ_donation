import React, { useState } from 'react';
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
  UserPlus,
  Shuffle,
  Bell,
  ChevronRight,
  Stethoscope,
  LayoutDashboard,
  Package,
  History,
  BarChart3,
  Layers,
  Database,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Hospitals', path: '/admin/hospitals', icon: <Building2 size={18} /> },
];

const HOSPITAL_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/hospital/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Add Donor', path: '/hospital/add-donor', icon: <UserPlus size={18} /> },
  { label: 'Add Receiver', path: '/hospital/add-receiver', icon: <UserPlus size={18} /> },
  { label: 'Donors', path: '/hospital/donors', icon: <Users size={18} /> },
  { label: 'Receivers', path: '/hospital/receivers', icon: <Users size={18} /> },
  { label: 'Verified Pool', path: '/hospital/verified-pool', icon: <CheckCircle size={18} /> },
  { label: 'Allocation Requests', path: '/hospital/allocation-requests', icon: <ClipboardList size={18} /> },
  { label: 'Allocation History', path: '/hospital/allocation-history', icon: <History size={18} /> },
];

const COORDINATOR_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/coordinator/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Eligible Donors', path: '/coordinator/donors', icon: <Users size={18} /> },
  { label: 'Eligible Receivers', path: '/coordinator/receivers', icon: <Users size={18} /> },
  { label: 'Available Organs', path: '/coordinator/organs', icon: <Heart size={18} /> },
  { label: 'Organ Matching', path: '/coordinator/matching', icon: <Shuffle size={18} /> },
  { label: 'Multi-Organ Batch', path: '/coordinator/multi-organ', icon: <Layers size={18} /> },
  { label: 'Active Offers', path: '/coordinator/offers', icon: <Bell size={18} /> },
  { label: 'Active Allocations', path: '/coordinator/allocations', icon: <Activity size={18} /> },
  { label: 'Rejection History', path: '/coordinator/rejections', icon: <XCircle size={18} /> },
  { label: 'Rejection Analytics', path: '/coordinator/analytics/rejections', icon: <BarChart3 size={18} /> },
  { label: 'Completed Allocations', path: '/coordinator/completed', icon: <CheckCircle size={18} /> },
  { label: 'Research Data Lake', path: '/coordinator/research-dataset', icon: <Database size={18} /> },
  { label: 'Unallocated Organs', path: '/coordinator/unallocated', icon: <Package size={18} /> },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  HOSPITAL: 'Hospital Staff',
  COORDINATOR: 'Coordinator',
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-violet-100 text-violet-700',
  HOSPITAL: 'bg-blue-100 text-blue-700',
  COORDINATOR: 'bg-teal-100 text-teal-700',
};

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = user?.role ?? 'ADMIN';

  const navItems: NavItem[] =
    role === 'ADMIN'
      ? ADMIN_NAV
      : role === 'HOSPITAL'
      ? HOSPITAL_NAV
      : COORDINATOR_NAV;

  const isActive = (path: string) => {
    if (path === location.pathname) return true;
    if (!path.endsWith('dashboard') && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-teal-100/80 bg-gradient-to-r from-teal-50/50 to-transparent">
        <div className="flex items-center justify-center w-10 h-10 bg-teal-600 rounded-xl shadow-xs text-white ring-2 ring-teal-600/20">
          <Stethoscope size={22} className="text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-base font-bold text-slate-900 tracking-tight leading-tight">OrganConnect</p>
            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-3xs font-black bg-teal-600 text-white tracking-widest uppercase">
              PRO
            </span>
          </div>
          <p className="text-[10px] text-teal-700 font-semibold tracking-wider uppercase mt-0.5">
            Transplant Network
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'bg-teal-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:bg-teal-50/80 hover:text-teal-800'
              }`}
            >
              <span
                className={`flex-shrink-0 transition-colors ${
                  active ? 'text-white' : 'text-slate-400 group-hover:text-teal-600'
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1 text-xs md:text-sm">{item.label}</span>
              {active && <ChevronRight size={14} className="text-teal-200" />}
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-teal-600 text-white font-bold text-sm shadow-xs flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() ?? 'H'}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">
              {user?.name ?? 'Hospital User'}
            </p>
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                ROLE_COLOR[role] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {ROLE_LABEL[role] ?? role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-2xs flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-4 md:px-6 h-15 bg-white border-b border-slate-200/90 shadow-2xs flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2.5 text-xs text-slate-600 hidden sm:flex">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span className="font-semibold text-slate-800">
                National Organ Allocation & Transplant Coordination Network
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-medium">NOTTO & Apex Guidelines Aligned</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Role badge */}
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${
                ROLE_COLOR[role] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              <Building2 size={12} />
              {ROLE_LABEL[role] ?? role}
            </span>

            {/* Username */}
            <span className="text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              {user?.name ?? 'User'}
            </span>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-rose-200"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
