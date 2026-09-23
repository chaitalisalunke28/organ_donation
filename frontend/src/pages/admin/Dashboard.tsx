import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle,
  XCircle,
  Users,
  HeartPulse,
  Plus,
  ArrowRight,
    AlertTriangle,
} from 'lucide-react';
import { getAdminDashboard } from '../../api';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

function RateBar({ rate, label }: { rate: number | null; label: string }) {
  return (
    <div className="space-y-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate ?? 0}%` }} />
      </div>
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="font-semibold text-gray-700">{rate !== null ? `${rate}%` : '—'}</span>
      </div>
    </div>
  );
}

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
      <PageHeader
        title="Network overview"
        description="Hospitals, donors and receivers across the transplant network."
        actions={
          <Link to="/admin/hospitals/add" className="btn-primary">
            <Plus className="h-4 w-4" /> Register hospital
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Hospitals"
          value={stats.total_hospitals ?? 0}
          icon={<Building2 className="h-[18px] w-[18px]" />}
          tone="brand"
          to="/admin/hospitals"
          footer={
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {stats.active_hospitals ?? 0} active
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                {stats.inactive_hospitals ?? 0} inactive
              </span>
            </div>
          }
        />
        <StatCard
          label="Donors"
          value={stats.total_donors ?? 0}
          icon={<HeartPulse className="h-[18px] w-[18px]" />}
          tone="rose"
          footer={<RateBar rate={donorEligibilityRate} label={`${stats.eligible_donors ?? 0} eligible`} />}
        />
        <StatCard
          label="Receivers"
          value={stats.total_receivers ?? 0}
          icon={<Users className="h-[18px] w-[18px]" />}
          tone="violet"
          footer={<RateBar rate={receiverEligibilityRate} label={`${stats.eligible_receivers ?? 0} eligible`} />}
        />
      </div>

      {/* Lower Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Hospitals Table */}
        <div className="lg:col-span-2 card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Recently registered hospitals</h2>
            <Link
              to="/admin/hospitals"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
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
                          className="hover:text-teal-600 transition-colors"
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
                className="mt-3 text-sm font-semibold text-teal-600 hover:underline"
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
            <h2 className="text-base font-bold text-gray-900">Quick actions</h2>

            <Link
              to="/admin/hospitals/add"
              className="flex items-center gap-3 p-3 rounded-xl border border-teal-100 bg-teal-50/60 hover:bg-teal-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Add hospital</p>
                <p className="text-xs text-gray-500">Register a new transplant centre</p>
              </div>
              <ArrowRight className="w-4 h-4 text-teal-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/admin/hospitals"
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Manage hospitals</p>
                <p className="text-xs text-gray-500">View, activate or deactivate</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
