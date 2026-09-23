import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Filter,
  Activity,
  Heart,
  ShieldAlert,
} from 'lucide-react';
import { getRejectionAnalytics } from '../../api';
import { RejectionAnalyticsData } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import OrganBadge from '../../components/OrganBadge';

export default function RejectionAnalytics() {
  const [timeWindowDays, setTimeWindowDays] = useState<number | undefined>(undefined);

  const { data, isLoading } = useQuery<RejectionAnalyticsData>({
    queryKey: ['coordinator-rejection-analytics', timeWindowDays],
    queryFn: () => getRejectionAnalytics(timeWindowDays),
    refetchInterval: 15000,
  });

  if (isLoading) {
    return <LoadingSpinner message="Calculating comprehensive rejection analytics..." />;
  }

  const summary = data?.summary || {
    total_offers_evaluated: 0,
    total_rejections: 0,
    total_acceptances: 0,
    total_pending: 0,
    rejection_rate_pct: 0,
    acceptance_rate_pct: 0,
    avg_rejection_turnaround_minutes: 0,
    avg_acceptance_turnaround_minutes: 0,
  };

  const categories = data?.category_distribution || [];
  const organBreakdown = data?.organ_breakdown || {};

  // Category Color Map
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Medical reason':
        return 'bg-rose-500 text-white';
      case 'Hospital unavailable':
        return 'bg-amber-500 text-white';
      case 'Recipient unavailable':
        return 'bg-blue-500 text-white';
      case 'Transport issue':
        return 'bg-purple-500 text-white';
      case 'Preservation issue':
        return 'bg-cyan-500 text-white';
      case 'Organ quality':
        return 'bg-emerald-500 text-white';
      case 'Documentation issue':
        return 'bg-indigo-500 text-white';
      case 'Patient declined':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Regulatory Rejection Analytics & Feedback Loop
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Phase 15 Clinical Decision-Support Intelligence • Categorized organ refusal tracking & ML outcome training dataset
              </p>
            </div>
          </div>
        </div>

        {/* Time Window Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={timeWindowDays || 'all'}
            onChange={(e) => setTimeWindowDays(e.target.value === 'all' ? undefined : Number(e.target.value))}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 shadow-xs focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All-Time Historical</option>
            <option value="7">Past 7 Days</option>
            <option value="30">Past 30 Days</option>
            <option value="90">Past 90 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-white border border-gray-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
              Total Offers Dispatched
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {summary.total_offers_evaluated}
            </div>
            <span className="text-2xs text-gray-400">Sequential allocation offers</span>
          </div>
        </div>

        <div className="card p-4 bg-white border border-rose-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
              Rejection Rate
            </span>
            <div className="text-2xl font-extrabold text-rose-600 mt-0.5">
              {summary.rejection_rate_pct}%
            </div>
            <span className="text-2xs text-gray-400">{summary.total_rejections} offer refusals</span>
          </div>
        </div>

        <div className="card p-4 bg-white border border-emerald-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
              Acceptance Rate
            </span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
              {summary.acceptance_rate_pct}%
            </div>
            <span className="text-2xs text-gray-400">{summary.total_acceptances} accepted offers</span>
          </div>
        </div>

        <div className="card p-4 bg-white border border-gray-200 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xs font-semibold uppercase tracking-wider text-gray-500">
              Avg Turnaround Time
            </span>
            <div className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {summary.avg_rejection_turnaround_minutes}m
            </div>
            <span className="text-2xs text-gray-400">Response decision latency</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Category Distribution & Organ-wise Refusal Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 9 Standardized Rejection Categories Breakdown */}
        <div className="lg:col-span-7 card p-5 bg-white space-y-4 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Standardized Refusal Reasons Distribution
              </h2>
              <p className="text-2xs text-gray-500">
                Categorized by the 9 formal research dimensions
              </p>
            </div>
            <span className="text-2xs font-mono font-bold px-2 py-0.5 bg-gray-100 rounded text-gray-700">
              {summary.total_rejections} Total Events
            </span>
          </div>

          {categories.length === 0 ? (
            <EmptyState
              title="No Rejections Logged"
              message="No organ offer rejections have been recorded in this observation window."
            />
          ) : (
            <div className="space-y-3 pt-1">
              {categories.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${getCategoryColor(item.category)}`} />
                      {item.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs text-gray-500">{item.count} offers</span>
                      <span className="font-bold text-gray-900 font-mono w-12 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getCategoryColor(item.category)}`}
                      style={{ width: `${Math.max(item.percentage, item.count > 0 ? 3 : 0)}%` }}
                    />
                  </div>

                  {item.sample_notes && item.sample_notes.length > 0 && (
                    <p className="text-2xs text-gray-500 italic pl-4 truncate">
                      Sample Note: "{item.sample_notes[0]}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Organ-wise Refusal Matrix & Policy Impact */}
        <div className="lg:col-span-5 space-y-6">
          <div className="card p-5 bg-white space-y-4 border border-gray-200 shadow-xs">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Heart className="w-4 h-4 text-teal-600" />
                Organ-Wise Refusal Breakdown
              </h2>
              <p className="text-2xs text-gray-500">Distribution across Kidney, Liver, Heart, Lung</p>
            </div>

            {Object.keys(organBreakdown).length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">No organ-specific refusal records.</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(organBreakdown).map(([orgType, details]) => (
                  <div key={orgType} className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <OrganBadge organ={orgType} size="sm" />
                      <span className="font-mono font-bold text-gray-700">
                        {details.total_rejections} Rejections
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(details.categories)
                        .filter(([_, count]) => count > 0)
                        .map(([cat, count]) => (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded text-2xs font-medium bg-white border border-gray-200 text-gray-700"
                          >
                            {cat}: <strong>{count}</strong>
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Training Dataset Callout */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Downstream ML Retraining Dataset</span>
            </div>
            <p className="text-2xs text-indigo-800 leading-relaxed">
              Every rejection category and response timestamp is automatically ingested into the Phase 20 unified research data lake. This forms the training ground for downstream acceptance prediction algorithms.
            </p>
            <div className="pt-1 flex items-center justify-between text-2xs font-semibold text-indigo-900">
              <span>ML Samples Ready:</span>
              <strong className="font-mono">{data?.ml_training_samples_count || 0} Records</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
