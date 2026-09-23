import React, { useState } from 'react';
import { X, History, AlertTriangle, ShieldAlert, CheckCircle2, Play, RefreshCw, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllocationEvents, simulateDynamicChange, revalidateAllocation } from '../api';
import { AllocationEvent } from '../types';
import { RevalidationBadge } from './RevalidationBadge';

interface DynamicEventAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocationId?: number;
  organId?: number;
  receiverId?: number;
  currentRevalidationStatus?: string;
}

export const DynamicEventAuditModal: React.FC<DynamicEventAuditModalProps> = ({
  isOpen,
  onClose,
  allocationId,
  organId,
  receiverId,
  currentRevalidationStatus = 'VALID',
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'timeline' | 'simulator'>('timeline');
  const [simEntity, setSimEntity] = useState<string>('HOSPITAL_READINESS');
  const [simField, setSimField] = useState<string>('icu_available');
  const [simOldVal, setSimOldVal] = useState<string>('true');
  const [simNewVal, setSimNewVal] = useState<string>('false');
  const [simReason, setSimReason] = useState<string>('Emergency trauma intake occupied last ICU bed');
  const [revalidationNotes, setRevalidationNotes] = useState<string>('');

  const { data: events = [], isLoading, refetch } = useQuery<AllocationEvent[]>({
    queryKey: ['allocationEvents', allocationId, organId],
    queryFn: () => getAllocationEvents(50),
    enabled: isOpen,
  });

  const simMutation = useMutation({
    mutationFn: (formData: FormData) => simulateDynamicChange(formData),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['coordinatorDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['activeAllocations'] });
      setActiveTab('timeline');
    },
  });

  const revalMutation = useMutation({
    mutationFn: (allocId: number) => revalidateAllocation(allocId, revalidationNotes),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['activeAllocations'] });
      queryClient.invalidateQueries({ queryKey: ['coordinatorDashboard'] });
      setRevalidationNotes('');
    },
  });

  if (!isOpen) return null;

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('entity_type', simEntity);
    fd.append('field_changed', simField);
    fd.append('old_value', simOldVal);
    fd.append('new_value', simNewVal);
    if (allocationId) fd.append('allocation_id', allocationId.toString());
    if (organId) fd.append('organ_id', organId.toString());
    if (receiverId) fd.append('patient_id', receiverId.toString());
    if (simReason) fd.append('reason', simReason);
    simMutation.mutate(fd);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700">
              <History className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Dynamic Revalidation & Change Impact Audit</h3>
                <span className="px-2 py-0.5 text-xs bg-teal-900/80 rounded-full font-mono text-teal-200 border border-teal-700">
                  Phases 10 & 11
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Tracking environmental disruptions, causal impacts, and coordinator revalidation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 gap-4">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'timeline'
                ? 'border-teal-600 text-teal-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Event Audit Timeline ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'simulator'
                ? 'border-teal-600 text-teal-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Play className="w-4 h-4" />
            Simulate Disruption (Testbench)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {/* Current Allocation State Banner */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-xs font-medium text-slate-500">Allocation Status:</div>
                  <RevalidationBadge status={currentRevalidationStatus} size="md" />
                </div>
                {allocationId && currentRevalidationStatus === 'REVALIDATION_REQUIRED' && (
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="Coordinator revalidation notes..."
                      value={revalidationNotes}
                      onChange={(e) => setRevalidationNotes(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-teal-500 flex-1"
                    />
                    <button
                      onClick={() => revalMutation.mutate(allocationId)}
                      disabled={revalMutation.isPending}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${revalMutation.isPending ? 'animate-spin' : ''}`} />
                      Revalidate Allocation
                    </button>
                  </div>
                )}
              </div>

              {/* Event Timeline List */}
              {isLoading ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading audit history...</div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No state mutation events recorded yet. Allocation parameters remain at initial baseline.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-4 rounded-xl border transition ${
                        ev.impact_severity === 'CRITICAL'
                          ? 'bg-rose-50/70 border-rose-200'
                          : ev.impact_severity === 'MODERATE'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                            {ev.event_uid}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {ev.entity_type} → {ev.field_changed}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                              ev.impact_severity === 'CRITICAL'
                                ? 'bg-rose-600 text-white'
                                : ev.impact_severity === 'MODERATE'
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {ev.impact_severity} IMPACT
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                          </span>
                        </div>
                      </div>

                      {/* Mutation Delta */}
                      <div className="text-xs text-slate-600 mb-2 flex items-center gap-2">
                        <span>Changed by <strong>{ev.changed_by}</strong>:</span>
                        <span className="font-mono line-through text-slate-400">{ev.old_value || 'None'}</span>
                        <span>→</span>
                        <span className="font-mono font-bold text-slate-900">{ev.new_value}</span>
                      </div>

                      {/* Impact Summary */}
                      <p className="text-xs text-slate-700 mb-2 font-medium">
                        {ev.impact_summary}
                      </p>

                      {/* Impact Dimensions Affected */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {ev.affects_compatibility && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 border border-purple-200">
                            ⚠ Compatibility Affected
                          </span>
                        )}
                        {ev.affects_priority && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 border border-blue-200">
                            ⚠ Priority Score Affected
                          </span>
                        )}
                        {ev.affects_operational_feasibility && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">
                            ⚠ Feasibility Affected
                          </span>
                        )}
                        {ev.affects_ml_risk && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800 border border-rose-200">
                            ⚠ ML Risk Shifted
                          </span>
                        )}
                        {ev.requires_revalidation && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-600 text-white animate-pulse">
                            🚨 Revalidation Required
                          </span>
                        )}
                      </div>

                      {/* Recommendations */}
                      {ev.recommendations && ev.recommendations.length > 0 && (
                        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                          <div className="font-semibold text-slate-700 text-[11px]">Recommended Protocol:</div>
                          {ev.recommendations.map((rec, rIdx) => (
                            <div key={rIdx} className="text-slate-600 flex items-start gap-1 text-[11px]">
                              <span>•</span>
                              <span>{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'simulator' && (
            <form onSubmit={handleSimulate} className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">Simulate Environmental Mutation</h4>
                <p className="text-xs text-slate-500">
                  Test how the Change Impact Analyzer evaluates unexpected disruptions (e.g. ICU unavailable, road accident delay, infection pause).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Entity Domain</label>
                  <select
                    value={simEntity}
                    onChange={(e) => {
                      setSimEntity(e.target.value);
                      if (e.target.value === 'HOSPITAL_READINESS') {
                        setSimField('icu_available');
                        setSimOldVal('true');
                        setSimNewVal('false');
                      } else if (e.target.value === 'ORGAN_TRANSPORT') {
                        setSimField('delay_minutes');
                        setSimOldVal('0');
                        setSimNewVal('45');
                      } else if (e.target.value === 'PATIENT_STATUS') {
                        setSimField('candidate_status');
                        setSimOldVal('ACTIVE');
                        setSimNewVal('TEMPORARILY_UNAVAILABLE');
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="HOSPITAL_READINESS">Hospital Operational Readiness</option>
                    <option value="ORGAN_TRANSPORT">Transport & Transit Logistics</option>
                    <option value="PATIENT_STATUS">Patient Clinical Lifecycle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Field Mutated</label>
                  <input
                    type="text"
                    value={simField}
                    onChange={(e) => setSimField(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Previous Value</label>
                  <input
                    type="text"
                    value={simOldVal}
                    onChange={(e) => setSimOldVal(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Mutated Value</label>
                  <input
                    type="text"
                    value={simNewVal}
                    onChange={(e) => setSimNewVal(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical / Logistical Rationale</label>
                <textarea
                  rows={2}
                  value={simReason}
                  onChange={(e) => setSimReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  placeholder="e.g. Sudden flood on highway or OT emergency..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={simMutation.isPending}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  <Play className={`w-3.5 h-3.5 ${simMutation.isPending ? 'animate-spin' : ''}`} />
                  Execute Simulation & Analyze Impact
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};
