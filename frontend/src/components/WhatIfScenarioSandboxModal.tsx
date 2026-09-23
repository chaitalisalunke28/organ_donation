import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  Clock,
  Building2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Activity,
  CheckCircle2,
  Info,
  ShieldCheck,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { runWhatIfSimulation } from '../api';
import { WhatIfScenarioResult, WhatIfScenarioRequest } from '../types';
import { StabilityBadge } from './StabilityBadge';
import RiskBadge from './RiskBadge';
import ReadinessBadge from './ReadinessBadge';

interface WhatIfScenarioSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  organId: number;
  receiverId: number;
  organUid?: string;
  organType?: string;
  receiverName?: string;
  receiverUid?: string;
  hospitalName?: string;
}

export const WhatIfScenarioSandboxModal: React.FC<WhatIfScenarioSandboxModalProps> = ({
  isOpen,
  onClose,
  organId,
  receiverId,
  organUid = 'ORG-001',
  organType = 'KIDNEY',
  receiverName = 'Candidate',
  receiverUid = 'PT-001',
  hospitalName = 'Center',
}) => {
  // Scenario Parameters State
  const [delayMinutes, setDelayMinutes] = useState<number>(60);
  const [icuAvailable, setIcuAvailable] = useState<boolean>(true);
  const [otAvailable, setOtAvailable] = useState<boolean>(true);
  const [surgeonAvailable, setSurgeonAvailable] = useState<boolean>(true);
  const [teamAvailable, setTeamAvailable] = useState<boolean>(true);
  const [recipientReady, setRecipientReady] = useState<boolean>(true);
  const [documentsComplete, setDocumentsComplete] = useState<boolean>(true);
  const [transportMode, setTransportMode] = useState<string>('AMBULANCE_ROAD');
  const [routeStatus, setRouteStatus] = useState<string>('MODERATE_TRAFFIC');

  const [activePreset, setActivePreset] = useState<string>('delay60');
  const [simulationResult, setSimulationResult] = useState<WhatIfScenarioResult | null>(null);

  const simMutation = useMutation({
    mutationFn: (params: WhatIfScenarioRequest) => runWhatIfSimulation(params),
    onSuccess: (data: WhatIfScenarioResult) => {
      setSimulationResult(data);
    },
  });

  // Execute simulation whenever parameters change or on initial open
  useEffect(() => {
    if (isOpen && organId && receiverId) {
      simMutation.mutate({
        organ_id: organId,
        receiver_id: receiverId,
        simulated_delay_minutes: delayMinutes,
        icu_available: icuAvailable,
        ot_available: otAvailable,
        surgeon_available: surgeonAvailable,
        transplant_team_available: teamAvailable,
        recipient_ready: recipientReady,
        documents_complete: documentsComplete,
        transport_mode: transportMode,
        route_status: routeStatus,
      });
    }
  }, [
    isOpen,
    organId,
    receiverId,
    delayMinutes,
    icuAvailable,
    otAvailable,
    surgeonAvailable,
    teamAvailable,
    recipientReady,
    documentsComplete,
    transportMode,
    routeStatus,
  ]);

  if (!isOpen) return null;

  // Preset Handlers
  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    if (presetKey === 'delay60') {
      setDelayMinutes(60);
      setIcuAvailable(true);
      setOtAvailable(true);
      setSurgeonAvailable(true);
      setDocumentsComplete(true);
      setRouteStatus('MODERATE_TRAFFIC');
    } else if (presetKey === 'icuUnavailable') {
      setDelayMinutes(0);
      setIcuAvailable(false);
      setOtAvailable(true);
      setSurgeonAvailable(true);
      setDocumentsComplete(true);
      setRouteStatus('OPTIMAL_CLEAR');
    } else if (presetKey === 'otBottleneck') {
      setDelayMinutes(30);
      setIcuAvailable(true);
      setOtAvailable(false);
      setSurgeonAvailable(false);
      setDocumentsComplete(true);
      setRouteStatus('OPTIMAL_CLEAR');
    } else if (presetKey === 'docsIncomplete') {
      setDelayMinutes(0);
      setIcuAvailable(true);
      setOtAvailable(true);
      setSurgeonAvailable(true);
      setDocumentsComplete(false);
      setRouteStatus('OPTIMAL_CLEAR');
    } else if (presetKey === 'greenCorridor') {
      setDelayMinutes(0);
      setIcuAvailable(true);
      setOtAvailable(true);
      setSurgeonAvailable(true);
      setDocumentsComplete(true);
      setTransportMode('GREEN_CORRIDOR_EXPRESS');
      setRouteStatus('OPTIMAL_CLEAR');
    }
  };

  const handleReset = () => {
    setActivePreset('baseline');
    setDelayMinutes(0);
    setIcuAvailable(true);
    setOtAvailable(true);
    setSurgeonAvailable(true);
    setTeamAvailable(true);
    setRecipientReady(true);
    setDocumentsComplete(true);
    setTransportMode('AMBULANCE_ROAD');
    setRouteStatus('OPTIMAL_CLEAR');
  };

  const base = simulationResult?.baseline;
  const sim = simulationResult?.simulated;
  const deltas = simulationResult?.comparative_deltas;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-teal-900 via-cyan-950 to-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-800/60 rounded-xl border border-teal-500/30">
              <Sparkles className="w-6 h-6 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">What-If Scenario Simulation Sandbox (Digital Twin)</h3>
                <span className="px-2 py-0.5 text-xs bg-amber-400/20 text-amber-200 font-bold rounded-full border border-amber-400/40">
                  Phase 13 Advisory
                </span>
              </div>
              <p className="text-xs text-teal-200">
                Non-destructive stress-testing • Real allocation records are strictly preserved and unmodified
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-800/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Target Allocation Context Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500">Candidate Recipient</div>
              <div className="text-sm font-bold text-slate-900">
                {receiverName} <span className="text-xs font-mono font-normal text-slate-500">({receiverUid})</span>
              </div>
              <div className="text-xs text-slate-600">{hospitalName}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Donor Organ</div>
              <div className="text-sm font-bold text-teal-800">
                {organType} <span className="text-xs font-mono font-normal text-teal-600">({organUid})</span>
              </div>
              <div className="text-xs text-slate-600">Simulated Digital Twin Profile</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
                ✓ Non-Destructive Dry Run
              </span>
            </div>
          </div>

          {/* Preset Scenarios Selector */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>One-Click Scenario Presets</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: 'delay60', label: '⚡ +60m Traffic Delay', desc: 'Preservation Erosion' },
                { id: 'icuUnavailable', label: '🏥 ICU Bed Shortage', desc: 'Feasibility Drop' },
                { id: 'otBottleneck', label: '👨‍⚕️ OT / Surgeon Bottleneck', desc: 'Docking Delay' },
                { id: 'docsIncomplete', label: '📄 Missing Legal Docs', desc: 'Regulatory Hold' },
                { id: 'greenCorridor', label: '🚁 Air Express Corridor', desc: 'Speed Optimization' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`p-2.5 text-left rounded-xl border transition ${
                    activePreset === p.id
                      ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">{p.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Parameters Configuration */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Interactive Scenario Controls
                </span>
              </div>
              <button
                onClick={handleReset}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset to Baseline
              </button>
            </div>

            {/* Slider for Added Transport Delay */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700">Simulated Additional Delay:</span>
                <span className="font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                  +{delayMinutes} minutes
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="240"
                step="15"
                value={delayMinutes}
                onChange={(e) => {
                  setDelayMinutes(parseInt(e.target.value));
                  setActivePreset('custom');
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-700"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0m (On-Time)</span>
                <span>+60m (Moderate)</span>
                <span>+120m (Severe)</span>
                <span>+240m (Extreme Delay)</span>
              </div>
            </div>

            {/* Parameter Toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={icuAvailable}
                  onChange={(e) => {
                    setIcuAvailable(e.target.checked);
                    setActivePreset('custom');
                  }}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className={icuAvailable ? 'text-slate-800 font-medium' : 'text-rose-600 font-bold'}>
                  ICU Available
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={otAvailable}
                  onChange={(e) => {
                    setOtAvailable(e.target.checked);
                    setActivePreset('custom');
                  }}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className={otAvailable ? 'text-slate-800 font-medium' : 'text-rose-600 font-bold'}>
                  OT Available
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={surgeonAvailable}
                  onChange={(e) => {
                    setSurgeonAvailable(e.target.checked);
                    setActivePreset('custom');
                  }}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className={surgeonAvailable ? 'text-slate-800 font-medium' : 'text-rose-600 font-bold'}>
                  Surgeon Ready
                </span>
              </label>

              <label className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teamAvailable}
                  onChange={(e) => {
                    setTeamAvailable(e.target.checked);
                    setActivePreset('custom');
                  }}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-slate-800 font-medium">Team Ready</span>
              </label>

              <label className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recipientReady}
                  onChange={(e) => {
                    setRecipientReady(e.target.checked);
                    setActivePreset('custom');
                  }}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="text-slate-800 font-medium">Recipient Ready</span>
              </label>

              <label className="flex items-center gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={documentsComplete}
                  onChange={(e) => {
                    setDocumentsComplete(e.target.checked);
                    setActivePreset('custom');
                  }}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <span className={documentsComplete ? 'text-slate-800 font-medium' : 'text-rose-600 font-bold'}>
                  Docs Complete
                </span>
              </label>
            </div>
          </div>

          {/* Side-By-Side Comparison Grid (Baseline vs. What-If) */}
          {simulationResult && base && sim && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-teal-600" />
                <span>Side-By-Side Impact Analysis (Current Baseline vs. Simulated Scenario)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Cold Ischemic Preservation Buffer */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>Preservation Buffer</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xs text-slate-400">Baseline</div>
                      <div className="text-sm font-bold text-slate-700 font-mono">
                        {base.preservation_buffer_hours}h
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <div className="text-right">
                      <div className="text-2xs text-teal-600 font-bold">Simulated</div>
                      <div className={`text-base font-extrabold font-mono ${
                        sim.preservation_buffer_hours <= 0
                          ? 'text-rose-600'
                          : sim.preservation_buffer_hours < 4
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}>
                        {sim.preservation_buffer_hours}h
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-slate-500">Buffer Delta:</span>
                    <span className={`font-bold font-mono text-xs ${
                      (deltas?.preservation_buffer_delta_hours || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {deltas?.preservation_buffer_delta_hours || 0} hrs
                    </span>
                  </div>
                </div>

                {/* 2. ML Operational Risk */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                    <span>ML Operational Risk</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xs text-slate-400">Baseline</div>
                      <RiskBadge tier={base.operational_risk_tier} percentage={base.operational_risk_percentage} size="sm" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <div className="text-right">
                      <div className="text-2xs text-teal-600 font-bold">Simulated</div>
                      <RiskBadge tier={sim.operational_risk_tier} percentage={sim.operational_risk_percentage} size="sm" />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-slate-500">Risk Shift:</span>
                    <span className={`font-bold font-mono text-xs ${
                      (deltas?.operational_risk_delta_pct || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {(deltas?.operational_risk_delta_pct || 0) > 0 ? '+' : ''}{deltas?.operational_risk_delta_pct || 0}%
                    </span>
                  </div>
                </div>

                {/* 3. Match Stability */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Match Stability</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xs text-slate-400">Baseline</div>
                      <StabilityBadge tier={base.match_stability_tier} score={base.match_stability_score} size="sm" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <div className="text-right">
                      <div className="text-2xs text-teal-600 font-bold">Simulated</div>
                      <StabilityBadge tier={sim.match_stability_tier} score={sim.match_stability_score} size="sm" />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-slate-500">Stability Shift:</span>
                    <span className={`font-bold font-mono text-xs ${
                      (deltas?.match_stability_delta_pct || 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {deltas?.match_stability_delta_pct || 0}%
                    </span>
                  </div>
                </div>

                {/* 4. Hospital Feasibility */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                  <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hospital Feasibility</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xs text-slate-400">Baseline</div>
                      <ReadinessBadge status={base.readiness_status} score={base.readiness_score} size="sm" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <div className="text-right">
                      <div className="text-2xs text-teal-600 font-bold">Simulated</div>
                      <ReadinessBadge status={sim.readiness_status} score={sim.readiness_score} size="sm" />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-[11px] text-slate-500">Checklist Score:</span>
                    <span className="font-bold font-mono text-xs text-slate-800">
                      {sim.readiness_score}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Advisory Clinical Guidance Banner */}
              <div className="mt-4 p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wide">
                  <Info className="w-4 h-4 text-teal-600" />
                  <span>Scenario Advisory Assessment</span>
                </div>
                <p className="text-xs text-slate-700 font-medium">
                  {simulationResult.advisory_summary}
                </p>

                {sim.bottlenecks && sim.bottlenecks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sim.bottlenecks.map((b, i) => (
                      <span key={i} className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md border border-rose-200">
                        ⚠ {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <div className="text-2xs text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>Advisory Simulation Sandbox • In-Memory Pure Evaluation</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Close Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
