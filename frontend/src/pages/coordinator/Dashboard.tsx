import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Heart,
  Activity,
  GitMerge,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  ArrowRight,
} from 'lucide-react';
import { getCoordinatorDashboard } from '../../api';
import LoadingSpinner from '../../components/LoadingSpinner';

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

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transplant Coordinator Central Command</h1>
          <p className="text-sm text-gray-500 mt-1">
            Centralized organ allocation matching engine, sequential priority offers, and multi-center transplant coordination
          </p>
        </div>
        <Link to="/coordinator/matching" className="btn-primary text-sm inline-flex items-center gap-2">
          <GitMerge className="w-4 h-4" /> Start Organ Matching
        </Link>
      </div>

      {/* Academic Disclaimer Notice */}
      <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-3">
        <Heart className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Academic Decision-Support Prototype:</span> This system computes prioritized compatibility rankings using an academic multi-factor scoring model (ABO compatibility hard filter + Urgency + Waiting Time). Final transplant allocation is authorized exclusively by the certified clinical coordinator.
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Cross-Hospital Pool Metrics
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase">Available Organs</span>
              <Heart className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{available_organs}</div>
            <div className="text-xs text-green-600 font-medium mt-1">Ready for matching</div>
          </div>

          <div className="stat-card border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase">Eligible Receivers</span>
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{eligible_receivers}</div>
            <div className="text-xs text-blue-600 font-medium mt-1">Active on waiting list</div>
          </div>

          <div className="stat-card border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase">Pending Offers</span>
              <Inbox className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{pending_offers}</div>
            <div className="text-xs text-orange-600 font-medium mt-1">Awaiting hospital reply</div>
          </div>

          <div className="stat-card border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between text-gray-500 mb-1">
              <span className="text-xs font-medium uppercase">Completed Transplants</span>
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{completed_allocations}</div>
            <div className="text-xs text-purple-600 font-medium mt-1">Successfully allocated</div>
          </div>
        </div>
      </div>

      {/* Secondary Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 border-l-4 border-l-cyan-500">
          <div className="text-xs font-medium uppercase text-gray-400">Organs Currently Offered</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{offered_organs}</div>
          <p className="text-xs text-gray-500 mt-1">Sequential offer locking enabled</p>
        </div>

        <div className="card p-5 border-l-4 border-l-indigo-500">
          <div className="text-xs font-medium uppercase text-gray-400">Calculated Matches</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{active_matches}</div>
          <p className="text-xs text-gray-500 mt-1">Priority list pairs computed</p>
        </div>

        <div className="card p-5 border-l-4 border-l-rose-500">
          <div className="text-xs font-medium uppercase text-gray-400">Unallocated Organs</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{unallocated_organs}</div>
          <p className="text-xs text-gray-500 mt-1">All eligible candidates exhausted</p>
        </div>
      </div>

      {/* Workflow Navigation shortcuts */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900 pb-3 border-b border-gray-100">
          Transplant Allocation Lifecycle Shortcuts
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/coordinator/matching"
            className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 hover:bg-teal-100/70 transition-colors"
          >
            <GitMerge className="w-5 h-5 text-teal-700 mb-2" />
            <div className="font-semibold text-sm text-gray-900">1. Run Matching</div>
            <p className="text-2xs text-gray-600 mt-1">ABO hard filters + Priority scoring</p>
          </Link>

          <Link
            to="/coordinator/offers"
            className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 hover:bg-orange-100/70 transition-colors"
          >
            <Inbox className="w-5 h-5 text-orange-700 mb-2" />
            <div className="font-semibold text-sm text-gray-900">2. Active Offers</div>
            <p className="text-2xs text-gray-600 mt-1">Sequential single-hospital offers</p>
          </Link>

          <Link
            to="/coordinator/allocations"
            className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 hover:bg-purple-100/70 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5 text-purple-700 mb-2" />
            <div className="font-semibold text-sm text-gray-900">3. Confirm Allocation</div>
            <p className="text-2xs text-gray-600 mt-1">Review accepted offers & finalize</p>
          </Link>

          <Link
            to="/coordinator/completed"
            className="p-4 rounded-xl bg-green-50/70 border border-green-200 hover:bg-green-100/70 transition-colors"
          >
            <Heart className="w-5 h-5 text-green-700 mb-2" />
            <div className="font-semibold text-sm text-gray-900">4. Complete Transplant</div>
            <p className="text-2xs text-gray-600 mt-1">Final completion & data dispatch</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
