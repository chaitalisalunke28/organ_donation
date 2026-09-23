import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Heart, Users, UserPlus, FileCheck, Inbox, CheckCircle2, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { getHospitalDashboard } from '../../api';
import OrganBadge from '../../components/OrganBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

function EligibilitySplit({ eligible = 0, notEligible = 0 }: { eligible?: number; notEligible?: number }) {
  const total = eligible + notEligible;
  const pct = total ? Math.round((eligible / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="bg-emerald-500" style={{ width: `${pct}%` }} />
        {notEligible > 0 && <div className="bg-rose-400" style={{ width: `${100 - pct}%` }} />}
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {eligible} eligible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          {notEligible} not eligible
        </span>
      </div>
    </div>
  );
}

const QUICK_LINKS = [
  {
    to: '/hospital/verified-pool',
    title: 'Verified Pool',
    text: 'Eligible donors & receivers ready for matching',
    icon: <FileCheck className="h-5 w-5" />,
    tone: 'bg-teal-50 text-teal-600',
  },
  {
    to: '/hospital/allocation-requests',
    title: 'Allocation Requests',
    text: 'Accept or decline organ offers for your patients',
    icon: <Inbox className="h-5 w-5" />,
    tone: 'bg-amber-50 text-amber-600',
  },
  {
    to: '/hospital/allocation-history',
    title: 'Allocation History',
    text: 'Past donor and receiver allocations',
    icon: <Clock className="h-5 w-5" />,
    tone: 'bg-violet-50 text-violet-600',
  },
];

export default function HospitalDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['hospital-dashboard'],
    queryFn: () => getHospitalDashboard().then((res) => res.data),
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading hospital dashboard..." />;
  }

  const { donors = {}, receivers = {}, organs = {}, active_allocation_requests = 0, completed_allocations = 0 } = data || {};

  return (
    <div className="space-y-8">
      <PageHeader
        title="Hospital overview"
        description="Register donors, manage your recipient waiting list, upload clinical evidence and respond to organ offers."
        actions={
          <>
            <Link to="/hospital/add-receiver" className="btn-secondary">
              <UserPlus className="h-4 w-4" /> Add Receiver
            </Link>
            <Link to="/hospital/add-donor" className="btn-primary">
              <Heart className="h-4 w-4" /> Add Donor
            </Link>
          </>
        }
      />

      {active_allocation_requests > 0 && (
        <Link
          to="/hospital/allocation-requests"
          className="flex items-center gap-4 rounded-(--radius-card) border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 transition-shadow hover:shadow-raised"
        >
          <span className="icon-tile bg-amber-100 text-amber-700">
            <AlertCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">
              {active_allocation_requests} organ offer{active_allocation_requests === 1 ? '' : 's'} awaiting your decision
            </p>
            <p className="text-xs text-gray-600">Offers are time-sensitive. Review them before they expire.</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-amber-700" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registered donors"
          value={donors.total || 0}
          icon={<Heart className="h-[18px] w-[18px]" />}
          tone="rose"
          to="/hospital/donors"
          footer={<EligibilitySplit eligible={donors.eligible} notEligible={donors.not_eligible} />}
        />
        <StatCard
          label="Registered receivers"
          value={receivers.total || 0}
          icon={<Users className="h-[18px] w-[18px]" />}
          tone="brand"
          to="/hospital/receivers"
          footer={<EligibilitySplit eligible={receivers.eligible} notEligible={receivers.not_eligible} />}
        />
        <StatCard
          label="Open offers"
          value={active_allocation_requests}
          icon={<Inbox className="h-[18px] w-[18px]" />}
          tone="amber"
          to="/hospital/allocation-requests"
          footer={active_allocation_requests > 0 ? 'Needs a decision from your team' : 'Nothing waiting on you'}
        />
        <StatCard
          label="Transplants completed"
          value={completed_allocations}
          icon={<CheckCircle2 className="h-[18px] w-[18px]" />}
          tone="green"
          to="/hospital/allocation-history"
          footer="Across all completed allocations"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Organ availability */}
        <section className="card lg:col-span-2">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Organs available from verified donors</h2>
              <p className="mt-0.5 text-xs text-gray-500">Registered and eligible for matching right now</p>
            </div>
            <Link
              to="/hospital/verified-pool"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700"
            >
              Verified pool <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {['kidney', 'liver', 'heart', 'lung'].map((organ) => {
              const count = organs[organ] || 0;
              return (
                <div
                  key={organ}
                  className={`rounded-xl border p-4 ${count ? 'border-gray-200 bg-white' : 'border-dashed border-gray-200 bg-gray-50/60'}`}
                >
                  <OrganBadge organ={organ.toUpperCase()} size="sm" />
                  <p className={`mt-3 font-display text-2xl font-bold ${count ? 'text-gray-950' : 'text-gray-300'}`}>
                    {count}
                  </p>
                  <p className="text-xs text-gray-500">available</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick links */}
        <section className="card p-2 md:p-2">
          <p className="section-label px-3 pb-1 pt-3">Shortcuts</p>
          <div className="divide-y divide-gray-100">
            {QUICK_LINKS.map((q) => (
              <Link key={q.to} to={q.to} className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-50">
                <span className={`icon-tile ${q.tone}`}>{q.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{q.title}</p>
                  <p className="truncate text-xs text-gray-500">{q.text}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
