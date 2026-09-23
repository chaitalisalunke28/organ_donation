import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Heart,
  Users,
  GitMerge,
  CheckCircle2,
  Inbox,
  ArrowRight,
  Send,
  Calculator,
  PackageX,
  Info,
} from 'lucide-react';
import { getCoordinatorDashboard } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';

const LIFECYCLE = [
  {
    step: 1,
    to: '/coordinator/matching',
    title: 'Run matching',
    text: 'ABO hard filter, then priority scoring',
    icon: <GitMerge className="h-4 w-4" />,
  },
  {
    step: 2,
    to: '/coordinator/offers',
    title: 'Send offers',
    text: 'Sequential offers to one hospital at a time',
    icon: <Inbox className="h-4 w-4" />,
  },
  {
    step: 3,
    to: '/coordinator/allocations',
    title: 'Confirm allocation',
    text: 'Review accepted offers and finalise',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    step: 4,
    to: '/coordinator/completed',
    title: 'Complete transplant',
    text: 'Record completion and dispatch data',
    icon: <Heart className="h-4 w-4" />,
  },
];

export default function CoordinatorDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['coordinator-dashboard'],
    queryFn: () => getCoordinatorDashboard().then((res) => res.data),
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading central coordinator metrics..." />;
  }

  const {
    available_organs = 0,
    offered_organs = 0,
    eligible_receivers = 0,
    active_matches = 0,
    pending_offers = 0,
    completed_allocations = 0,
    unallocated_organs = 0,
  } = data || {};

  const secondary = [
    {
      label: 'Organs currently offered',
      value: offered_organs,
      hint: 'Locked while an offer is open',
      icon: <Send className="h-4 w-4" />,
    },
    {
      label: 'Calculated matches',
      value: active_matches,
      hint: 'Ranked donor–recipient pairs',
      icon: <Calculator className="h-4 w-4" />,
    },
    {
      label: 'Unallocated organs',
      value: unallocated_organs,
      hint: 'All eligible candidates exhausted',
      icon: <PackageX className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Coordination overview"
        description="Match available organs to eligible recipients, manage offers and track each allocation to completion. Figures refresh every 10 seconds."
        actions={
          <Link to="/coordinator/matching" className="btn-primary">
            <GitMerge className="h-4 w-4" /> Start organ matching
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Available organs"
          value={available_organs}
          icon={<Heart className="h-[18px] w-[18px]" />}
          tone="rose"
          to="/coordinator/organs"
          footer="Ready for matching"
        />
        <StatCard
          label="Eligible receivers"
          value={eligible_receivers}
          icon={<Users className="h-[18px] w-[18px]" />}
          tone="brand"
          to="/coordinator/receivers"
          footer="Active on the waiting list"
        />
        <StatCard
          label="Pending offers"
          value={pending_offers}
          icon={<Inbox className="h-[18px] w-[18px]" />}
          tone="amber"
          to="/coordinator/offers"
          footer={pending_offers > 0 ? 'Awaiting a hospital reply' : 'No offers outstanding'}
        />
        <StatCard
          label="Completed transplants"
          value={completed_allocations}
          icon={<CheckCircle2 className="h-[18px] w-[18px]" />}
          tone="green"
          to="/coordinator/completed"
          footer="Successfully allocated"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lifecycle */}
        <section className="card lg:col-span-2">
          <h2 className="text-base font-bold text-gray-900">Allocation lifecycle</h2>
          <p className="mt-0.5 text-xs text-gray-500">Each organ moves through these stages in order</p>

          <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {LIFECYCLE.map((s, i) => (
              <li key={s.step} className="relative">
                <Link
                  to={s.to}
                  className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:bg-gray-50/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      {s.icon}
                    </span>
                    <span className="font-mono text-2xs font-semibold text-gray-400">0{s.step}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-gray-500">{s.text}</p>
                </Link>
                {i < LIFECYCLE.length - 1 && (
                  <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full bg-white text-gray-300 xl:block" />
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Pipeline status */}
        <section className="card">
          <h2 className="text-base font-bold text-gray-900">Pipeline</h2>
          <ul className="mt-4 space-y-1">
            {secondary.map((m) => (
              <li key={m.label} className="flex items-center gap-3 rounded-lg px-1 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                  {m.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.hint}</p>
                </div>
                <span className="font-display text-xl font-bold text-gray-950">{m.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex gap-3 rounded-(--radius-card) border border-gray-200 bg-white p-4 text-xs leading-relaxed text-gray-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
        <p>
          <span className="font-semibold text-gray-900">Decision support only.</span> Candidates are first screened
          by hard rules (organ type, eligibility, ABO blood group, antibodies and crossmatch), then ranked by a points
          score (urgency, waiting/dialysis time, HLA match, blood-group match and distance). Final allocation is
          authorised by the clinical coordinator.
        </p>
      </div>
    </div>
  );
}
