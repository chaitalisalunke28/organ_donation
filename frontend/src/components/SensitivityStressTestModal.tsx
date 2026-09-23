import React, { useState } from 'react';
import { X, Sliders, Shield, Clock, AlertTriangle, TrendingDown, Activity, CheckCircle2 } from 'lucide-react';
import { PriorityMatch } from '../types';
import { StabilityBadge } from './StabilityBadge';

interface SensitivityStressTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: PriorityMatch | null;
  organUid?: string;
  organType?: string;
}

export const SensitivityStressTestModal: React.FC<SensitivityStressTestModalProps> = ({
  isOpen,
  onClose,
  candidate,
  organUid = 'ORG-001',
  organType = 'KIDNEY',
}) => {
  const [interactiveDelay, setInteractiveDelay] = useState<number>(30);

  if (!isOpen || !candidate) return null;

  const baselineScore = candidate.stability_score ?? 85.0;
  const baselineTier = candidate.stability_tier ?? 'HIGH';
  const subScores = candidate.stability_sub_scores || {
    compatibility_certainty: 95.0,
    hospital_readiness: 85.0,
    preservation_buffer: 80.0,
    transport_robustness: 90.0,
    documentation_completeness: 100.0,
  };

  const horizons = candidate.sensitivity?.horizons || [
    { delay_minutes: 0, label: 'Baseline (Current)', stability_score: baselineScore, stability_tier: baselineTier, remaining_buffer_hours: 18.0, is_ischemia_exhausted: false },
    { delay_minutes: 30, label: '+30 min transport', stability_score: Math.max(30, baselineScore - 12), stability_tier: 'HIGH', remaining_buffer_hours: 17.5, is_ischemia_exhausted: false },
    { delay_minutes: 60, label: '+60 min transport', stability_score: Math.max(25, baselineScore - 24), stability_tier: 'MODERATE', remaining_buffer_hours: 17.0, is_ischemia_exhausted: false },
    { delay_minutes: 90, label: '+90 min transport', stability_score: Math.max(20, baselineScore - 38), stability_tier: 'LOW', remaining_buffer_hours: 16.5, is_ischemia_exhausted: false },
    { delay_minutes: 120, label: '+120 min transport', stability_score: Math.max(15, baselineScore - 52), stability_tier: 'LOW', remaining_buffer_hours: 16.0, is_ischemia_exhausted: false },
    { delay_minutes: 180, label: '+180 min transport', stability_score: Math.max(10, baselineScore - 70), stability_tier: 'CRITICAL_FRAGILITY', remaining_buffer_hours: 15.0, is_ischemia_exhausted: false },
  ];

  const maxDelayTolerance = candidate.max_delay_tolerance_minutes ?? 180;
  const baseRemainingBuffer = candidate.remaining_preservation_buffer_hours ?? 18.0;

  // Interactive slider calculation
  const simRemainingBuffer = Math.max(0, baseRemainingBuffer - interactiveDelay / 60);
  const simBufferScore = Math.min(100, Math.max(0, (simRemainingBuffer / 24.0) * 120));
  const simCompositeScore = Math.round(
    0.2 * (subScores.compatibility_certainty || 95) +
    0.25 * (subScores.hospital_readiness || 85) +
    0.25 * simBufferScore +
    0.15 * (subScores.transport_robustness || 80) +
    0.15 * (subScores.documentation_completeness || 100)
  );

  const getTierForScore = (s: number) => {
    if (s >= 85) return 'VERY_HIGH';
    if (s >= 70) return 'HIGH';
    if (s >= 50) return 'MODERATE';
    if (s >= 30) return 'LOW';
    return 'CRITICAL_FRAGILITY';
  };

  const simTier = getTierForScore(simCompositeScore);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-teal-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-700/60 rounded-xl border border-teal-500/30">
              <Shield className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Match Stability & Sensitivity Stress-Test</h3>
                <span className="px-2 py-0.5 text-xs bg-teal-700/80 rounded-full font-mono text-teal-100 border border-teal-500/40">
                  Phase 12 Research Engine
                </span>
              </div>
              <p className="text-xs text-teal-200">
                Evaluating allocation vulnerability to logistical & temporal shock horizons
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Candidate & Organ Quick Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-medium text-slate-500">Candidate</div>
              <div className="text-sm font-bold text-slate-900">
                {candidate.receiver_name} ({candidate.receiver_uid})
              </div>
              <div className="text-xs text-slate-600">{candidate.hospital_name}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Allocated Organ</div>
              <div className="text-sm font-bold text-teal-700">
                {organType} ({organUid})
              </div>
              <div className="text-xs text-slate-600">NOTTO Score: {candidate.total_score} pts</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500">Baseline Stability</div>
              <div className="mt-1 flex items-center gap-2">
                <StabilityBadge tier={baselineTier} score={baselineScore} size="md" />
              </div>
            </div>
          </div>

          {/* 5-Factor Stability Decomposition */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              6-Factor Stability Decomposition (Weights Breakdown)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Compatibility Certainty', weight: '20%', score: subScores.compatibility_certainty ?? 95, color: 'bg-emerald-500' },
                { label: 'Hospital Operational Readiness', weight: '25%', score: subScores.hospital_readiness ?? 85, color: 'bg-blue-500' },
                { label: 'Preservation Buffer Reserve', weight: '25%', score: subScores.preservation_buffer ?? 80, color: 'bg-teal-500' },
                { label: 'Transport Logistics Robustness', weight: '15%', score: subScores.transport_robustness ?? 85, color: 'bg-indigo-500' },
                { label: 'Documentation & Clinical Data', weight: '15%', score: subScores.documentation_completeness ?? 100, color: 'bg-purple-500' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-medium text-slate-700">{item.label} <span className="text-slate-400">({item.weight})</span></span>
                    <span className="font-bold text-slate-900">{item.score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Temporal Horizon Stress-Testing Matrix */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              Multi-Horizon Delay Degradation Matrix
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Simulated Delay Horizon</th>
                    <th className="px-3.5 py-2.5">Remaining Safe Buffer</th>
                    <th className="px-3.5 py-2.5">Projected Stability</th>
                    <th className="px-3.5 py-2.5">Degradation Curve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {horizons.map((h, i) => (
                    <tr key={i} className={i === 0 ? 'bg-teal-50/40 font-medium' : 'hover:bg-slate-50'}>
                      <td className="px-3.5 py-2.5 font-medium text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {h.label}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-700">
                        {h.remaining_buffer_hours.toFixed(1)} hrs
                      </td>
                      <td className="px-3.5 py-2.5">
                        <StabilityBadge tier={h.stability_tier} score={h.stability_score} size="sm" />
                      </td>
                      <td className="px-3.5 py-2.5 w-48">
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-300 ${
                              h.stability_score >= 70
                                ? 'bg-emerald-500'
                                : h.stability_score >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(5, h.stability_score)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive What-If Simulator */}
          <div className="p-4 bg-teal-50/70 rounded-xl border border-teal-200 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                  Interactive Sensitivity Simulator
                </span>
              </div>
              <span className="text-xs font-mono font-bold bg-teal-200 text-teal-900 px-2.5 py-0.5 rounded-full">
                Simulated Added Delay: +{interactiveDelay} mins
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="240"
              step="15"
              value={interactiveDelay}
              onChange={(e) => setInteractiveDelay(parseInt(e.target.value))}
              className="w-full h-2 bg-teal-200 rounded-lg appearance-none cursor-pointer accent-teal-700"
            />
            <div className="flex justify-between text-[11px] text-teal-700 font-mono">
              <span>+0 min (On-Time)</span>
              <span>+60 min (Moderate Traffic)</span>
              <span>+120 min (Heavy Congestion)</span>
              <span>+240 min (Extreme Delay)</span>
            </div>

            {/* Realtime Recalculated Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="bg-white p-2.5 rounded-lg border border-teal-200 text-center">
                <div className="text-[11px] text-slate-500">Effective Buffer</div>
                <div className="text-sm font-bold text-teal-800 font-mono">
                  {simRemainingBuffer.toFixed(2)} hrs
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200 text-center">
                <div className="text-[11px] text-slate-500">Recalculated Stability</div>
                <div className="mt-0.5 flex justify-center">
                  <StabilityBadge tier={simTier} score={simCompositeScore} size="sm" />
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-teal-200 text-center">
                <div className="text-[11px] text-slate-500">Max Delay Tolerance</div>
                <div className="text-sm font-bold text-amber-800 font-mono">
                  {maxDelayTolerance} mins
                </div>
              </div>
            </div>
          </div>

          {/* Research Insight Disclaimer */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p>
              <strong className="text-slate-800">Architectural Note:</strong> Match Stability is strictly separated from Allocation Priority. Priority ranking dictates recipient entitlement under national policy; Match Stability quantifies resilience against temporal disruption.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Close Stress-Test
          </button>
        </div>
      </div>
    </div>
  );
};
