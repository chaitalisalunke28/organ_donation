import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle,
  XCircle,
  Users,
  HeartPulse,
  UserCheck,
  UserMinus,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { getAdminDashboard } from '../../api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface RecentHospital {
  id: number;
  hospital_id: string;
  name: string;
  city: string;
  hospital_type: string;
  status: string;
  created_at?: string;
}

interface DashboardStats {
  total_hospitals: number;
  active_hospitals: number;
  inactive_hospitals: number;
  total_donors: number;
  total_receivers: number;
  eligible_donors: number;
  eligible_receivers: number;
  recent_hospitals?: RecentHospital[];
}

// ── Sub-components ─────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  iconColor: string;
  iconBg: string;
  sub?: string;
}

function StatCard({ icon, value, label, iconColor, iconBg, sub }: StatCardProps) {
  return (
    <div className="stat-card flex items-start gap-4">
      <div className={`${iconBg} rounded-xl p-3 shrink-0`}>
        <div className={iconColor}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function HospitalStatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className="badge-eligible inline-flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> Active
      </span>
    );
  }
  return (
    <span className="badge-not-eligible inline-flex items-center gap-1">
      <XCircle className="w-3 h-3" /> Inactive
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { data, isLoading, isError, error } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: () => getAdminDashboard().then((r) => r.data),
    refetchInterval: 60_000,
  });

  // ── Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg
            className="animate-spin w-8 h-8 text-teal-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Loading dashboard…</span>
        </div>
      </div>
    );
  }

  // ── Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="card flex flex-col items-center gap-3 text-red-600 max-w-sm w-full text-center">
          <AlertTriangle className="w-10 h-10" />
          <p className="font-semibold">Failed to load dashboard</p>
          <p className="text-sm text-gray-500">
            {(error as { message?: string })?.message ?? 'An unexpected error occurred.'}
          </p>
        </div>
      </div>
    );
  }

  const stats = data!;

  const statCards: StatCardProps[] = [
    {
      icon: <Building2 className="w-5 h-5" />,
      value: stats.total_hospitals ?? 0,
      label: 'Total Hospitals',
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      icon: <CheckCircle className="w-5 h-5" />,
      value: stats.active_hospitals ?? 0,
      label: 'Active Hospitals',
      iconColor: 'text-green-600',
      iconBg: 'bg-green-50',
    },
    {
      icon: <XCircle className="w-5 h-5" />,
      value: stats.inactive_hospitals ?? 0,
      label: 'Inactive Hospitals',
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50',
    },
    {
      icon: <Users className="w-5 h-5" />,
      value: stats.total_donors ?? 0,
      label: 'Total Donors',
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
    },
    {
      icon: <HeartPulse className="w-5 h-5" />,
      value: stats.total_receivers ?? 0,
      label: 'Total Receivers',
      iconColor: 'text-pink-600',
      iconBg: 'bg-pink-50',
    },
    {
      icon: <UserCheck className="w-5 h-5" />,
      value: stats.eligible_donors ?? 0,
      label: 'Eligible Donors',
      iconColor: 'text-teal-600',
      iconBg: 'bg-teal-50',
      sub: `of ${stats.total_donors ?? 0} total donors`,
    },
    {
      icon: <UserMinus className="w-5 h-5" />,
      value: stats.eligible_receivers ?? 0,
      label: 'Eligible Receivers',
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      sub: `of ${stats.total_receivers ?? 0} total receivers`,
    },
  ];

  const donorEligibilityRate =
    stats.total_donors > 0
      ? Math.round((stats.eligible_donors / stats.total_donors) * 100)
      : null;

  const receiverEligibilityRate =
    stats.total_receivers > 0
      ? Math.round((stats.eligible_receivers / stats.total_receivers) * 100)
      : null;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            System-wide overview — hospitals, donors &amp; receivers
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Auto-refreshes every 60 s</span>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Lower Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Hospitals Table */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Recent Hospitals
            </h2>
            <Link
              to="/admin/hospitals"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium transition-colors"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats.recent_hospitals && stats.recent_hospitals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Hospital ID</th>
                    <th className="table-header">Name</th>
                    <th className="table-header">City</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recent_hospitals.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell font-mono text-xs text-gray-500">{h.hospital_id}</td>
                      <td className="table-cell font-medium text-gray-900">
                        <Link
                          to={`/admin/hospitals/${h.id}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {h.name}
                        </Link>
                      </td>
                      <td className="table-cell text-gray-600">{h.city}</td>
                      <td className="table-cell text-gray-600 capitalize">
                        {h.hospital_type.charAt(0).toUpperCase() + h.hospital_type.slice(1).toLowerCase()}
                      </td>
                      <td className="table-cell">
                        <HospitalStatusBadge status={h.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Building2 className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">No hospitals registered yet.</p>
              <Link
                to="/admin/hospitals/add"
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Add the first hospital
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions + Summary */}
        <div className="space-y-4">
          {/* Quick Actions Card */}
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              Quick Actions
            </h2>

            <Link
              to="/admin/hospitals/add"
              className="flex items-center gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-800">Add Hospital</p>
                <p className="text-xs text-blue-600">Register a new hospital</p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/hospitals"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Manage Hospitals</p>
                <p className="text-xs text-gray-500">View, activate or deactivate</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Eligibility Summary */}
          <div className="card space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wider text-gray-500">
              Eligibility Rates
            </h2>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Donor eligibility</span>
                <span className="font-semibold text-teal-700">
                  {donorEligibilityRate !== null ? `${donorEligibilityRate}%` : '—'}
                </span>
              </div>
              {donorEligibilityRate !== null && (
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-teal-500 h-1.5 rounded-full"
                    style={{ width: `${donorEligibilityRate}%` }}
                  />
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Receiver eligibility</span>
                <span className="font-semibold text-orange-700">
                  {receiverEligibilityRate !== null ? `${receiverEligibilityRate}%` : '—'}
                </span>
              </div>
              {receiverEligibilityRate !== null && (
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-orange-500 h-1.5 rounded-full"
                    style={{ width: `${receiverEligibilityRate}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
