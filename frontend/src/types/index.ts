// Core types for the Organ Allocation System

export type UserRole = 'ADMIN' | 'HOSPITAL' | 'COORDINATOR';

export interface AuthUser {
  user_id: number;
  name: string;
  email: string;
  role: UserRole;
  hospital_id?: number;
  access_token: string;
}

export type HospitalStatus = 'ACTIVE' | 'INACTIVE';
export interface Hospital {
  id: number;
  hospital_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  contact: string;
  email: string;
  hospital_type: string;
  verification_status: string;
  status: HospitalStatus;
  created_at?: string;
}

export type PatientType = 'DONOR' | 'RECEIVER';
export type EligibilityStatus = 'PENDING_VERIFICATION' | 'ELIGIBLE' | 'NOT_ELIGIBLE';
export type BloodGroup = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-';
export type OrganType = 'KIDNEY' | 'LIVER' | 'HEART' | 'LUNG' | 'PANCREAS' | 'CORNEA' | 'OTHER';
export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type OrganStatus = 'AVAILABLE' | 'OFFERED' | 'ALLOCATED' | 'COMPLETED' | 'UNALLOCATED';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type AllocationStatus = 'IN_PROGRESS' | 'ALLOCATED' | 'COMPLETED' | 'UNALLOCATED';

export interface DonorProfile {
  id?: number;
  patient_id?: number;
  hypertension?: boolean;
  diabetes?: boolean;
  renal_history?: string;
  cardiac_history?: string;
  infection_history?: string;
  medical_history?: string;
  infectious_disease_screening?: string;
  relevant_test_results?: string;
  medical_information?: string;
}

export interface ReceiverProfile {
  id?: number;
  patient_id?: number;
  required_organ: OrganType;
  urgency_level: UrgencyLevel;
  waiting_start_date?: string;
  dialysis_status?: string;
  dialysis_start_date?: string;
  dialysis_duration_months?: number;
  previous_transplant?: boolean;
  previous_graft_failure?: boolean;
  number_of_previous_grafts?: number;
  pra?: number;
  cpra?: number;
  hla_typing?: string;
  hla_antibodies?: string;
  crossmatch_result?: string;
  pediatric_status?: boolean;
  prior_living_donor?: boolean;
  special_status?: string;
  medical_history?: string;
  medical_information?: string;
}

export interface Patient {
  id: number;
  patient_uid?: string;
  hospital_id: number;
  patient_type: PatientType;
  name: string;
  age: number;
  gender: string;
  blood_group: BloodGroup;
  height_cm?: number;
  weight_kg?: number;
  medical_condition?: string;
  eligibility_status: EligibilityStatus;
  candidate_status?: CandidateStatus;
  verification_status: string;
  created_at?: string;
  donor_profile?: DonorProfile;
  receiver_profile?: ReceiverProfile;
  hospital_name?: string;
}

export interface Organ {
  id: number;
  organ_uid?: string;
  donor_patient_id: number;
  organ_type: OrganType;
  organ_condition?: string;
  donor_creatinine?: number;
  kidney_function?: string;
  kidney_quality?: string;
  retrieval_time?: string;
  preservation_start?: string;
  preservation_method?: string;
  availability_status: OrganStatus;
  created_at?: string;
  donor_name?: string;
  donor_blood_group?: string;
  donor_hospital_name?: string;
  donor_uid?: string;
  donor_height_cm?: number;
  donor_weight_kg?: number;
  donor_hospital?: string;
  donor_hospital_id?: number;
}

export interface MedicalReport {
  id: number;
  report_type: string;
  original_filename?: string;
  verification_status: string;
  uploaded_at?: string;
}

export interface AllocationOffer {
  id: number;
  organ_id: number;
  organ_uid?: string;
  organ_type?: string;
  organ_condition?: string;
  receiver_id: number;
  receiver_uid?: string;
  receiver_name?: string;
  hospital_id: number;
  hospital_name?: string;
  priority_number: number;
  status: OfferStatus;
  rejection_reason?: string;
  rejection_notes?: string;
  created_at?: string;
  responded_at?: string;
}

export interface Allocation {
  id: number;
  allocation_uid?: string;
  organ_id: number;
  organ_uid?: string;
  organ_type?: string;
  donor_id: number;
  donor_name?: string;
  donor_uid?: string;
  donor_hospital?: string;
  donor_hospital_id: number;
  receiver_id?: number;
  receiver_name?: string;
  receiver_uid?: string;
  receiver_hospital?: string;
  receiver_hospital_id?: number;
  priority_number?: number;
  status: AllocationStatus;
  coordinator?: string;
  coordinator_id: number;
  allocated_at?: string;
  completed_at?: string;
  created_at?: string;
  rejection_count?: number;
  role?: string;
}

export interface ABOCompatibility {
  status: 'COMPATIBLE' | 'INCOMPATIBLE';
  compatibility_type: string;
  score_contribution: number;
  donor_blood_group: string;
  receiver_blood_group: string;
  is_exact_match: boolean;
}

export interface SizeCompatibility {
  donor_height_cm?: number;
  donor_weight_kg?: number;
  receiver_height_cm?: number;
  receiver_weight_kg?: number;
  height_difference_cm?: number;
  weight_difference_kg?: number;
  size_ratio?: number;
  size_compatibility: 'OPTIMAL' | 'ACCEPTABLE' | 'MISMATCH_CAUTION';
  score_contribution: number;
  description: string;
}

export interface HLAImmuneCompatibility {
  donor_hla?: string;
  receiver_hla?: string;
  hla_mismatches: number;
  mismatched_alleles?: string[];
  pra?: number;
  cpra?: number;
  has_dsa: boolean;
  dsa_list?: string[];
  sensitization_risk: 'LOW' | 'MODERATE' | 'HIGH';
  immune_compatibility: 'COMPATIBLE' | 'CONDITIONALLY_COMPATIBLE' | 'INCOMPATIBLE' | 'UNKNOWN';
  notes: string;
}

export interface CrossmatchCompatibility {
  crossmatch_type: string;
  crossmatch_result: 'NEGATIVE' | 'POSITIVE' | 'NOT_AVAILABLE';
  is_safe: boolean;
}

export interface CompatibilityAssessment {
  is_hard_compatible: boolean;
  overall_status: 'COMPATIBLE' | 'CONDITIONALLY_COMPATIBLE' | 'INCOMPATIBLE';
  abo: ABOCompatibility;
  size: SizeCompatibility;
  hla_immune: HLAImmuneCompatibility;
  crossmatch: CrossmatchCompatibility;
}

export interface AllocationRuleSet {
  id?: number;
  rule_set_id: string;
  organ_type: string;
  jurisdiction: string;
  policy_version: string;
  source_reference?: string;
  description?: string;
  is_active?: number;
  eligibility_rules?: any;
  priority_rules?: any;
  geographic_rules?: any;
  special_population_rules?: any;
}

export type CandidateStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'TEMPORARILY_UNAVAILABLE'
  | 'WITHDRAWN'
  | 'TRANSPLANTED'
  | 'DECEASED'
  | 'LOST_TO_FOLLOWUP';

export type ReadinessStatus = 'READY' | 'PARTIALLY_READY' | 'NOT_READY' | 'UNKNOWN';
export type TransportMode = 'AMBULANCE_ROAD' | 'AIR_CHARTER' | 'COMMERCIAL_AIR' | 'GREEN_CORRIDOR_EXPRESS' | 'INTERNAL_TRANSFER';
export type RouteStatus = 'OPTIMAL_CLEAR' | 'MODERATE_TRAFFIC' | 'WEATHER_DELAY' | 'IN_TRANSIT' | 'DELIVERED';
export type RiskTier = 'LOW_RISK' | 'MODERATE_RISK' | 'HIGH_RISK';

export interface HospitalReadiness {
  id?: number;
  hospital_id?: number;
  patient_id?: number;
  hospital_verified: boolean;
  recipient_ready: boolean;
  icu_available: boolean;
  ot_available: boolean;
  surgeon_available: boolean;
  transplant_team_available: boolean;
  required_equipment: boolean;
  blood_bank_ready: boolean;
  recipient_present: boolean;
  documents_complete: boolean;
  readiness_status: ReadinessStatus;
  readiness_score: number;
  bottleneck_notes?: string;
  estimated_prep_minutes: number;
  reported_by?: string;
  updated_at?: string;
  satisfied_factors?: string[];
  bottlenecks?: Array<{ factor_key: string; label: string; is_critical: boolean; description: string }>;
  summary?: string;
}

export interface OrganTransport {
  id?: number;
  distance_km: number;
  transport_mode: TransportMode;
  transport_provider?: string;
  estimated_duration_minutes: number;
  delay_minutes: number;
  total_transit_minutes: number;
  route_status: RouteStatus;
  transport_available: boolean;
  route_summary?: string;
}

export interface PreservationWindow {
  organ_type: string;
  max_cold_ischemia_hours: number;
  elapsed_preservation_minutes: number;
  elapsed_preservation_hours: number;
  expected_transport_minutes: number;
  projected_total_ischemia_hours: number;
  remaining_preservation_buffer_hours: number;
  remaining_buffer_minutes: number;
  buffer_ratio: number;
  preservation_risk_status: 'SAFE' | 'CAUTION' | 'CRITICAL_ISCHEMIA';
  risk_label: string;
  preservation_method?: string;
}

export interface OperationalRiskAssessment {
  risk_probability: number;
  risk_percentage: number;
  risk_tier: RiskTier;
  is_operationally_feasible: boolean;
  recommendation_label: string;
  summary_text: string;
  positive_factors: string[];
  risk_factors: string[];
  feature_attributions?: Record<string, number>;
  disclaimer: string;
}

export type StabilityTier = 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'CRITICAL_FRAGILITY';
export type ImpactSeverity = 'NEGLIGIBLE' | 'MODERATE' | 'CRITICAL';
export type RevalidationStatus = 'VALID' | 'REVALIDATION_REQUIRED' | 'REVALIDATED' | 'SUPERSEDED';

export interface MatchStabilityAssessment {
  stability_score: number;
  stability_tier: StabilityTier;
  tier_description: string;
  simulated_delay_minutes?: number;
  effective_remaining_buffer_hours?: number;
  is_ischemia_exhausted?: boolean;
  sub_scores: {
    compatibility_certainty: number;
    hospital_readiness: number;
    preservation_buffer: number;
    transport_robustness: number;
    documentation_completeness: number;
  };
}

export interface SensitivityHorizon {
  delay_minutes: number;
  label: string;
  stability_score: number;
  stability_tier: StabilityTier;
  remaining_buffer_hours: number;
  is_ischemia_exhausted: boolean;
}

export interface SensitivitySimulation {
  baseline_stability_score: number;
  baseline_stability_tier: StabilityTier;
  max_delay_tolerance_minutes: number;
  horizons: SensitivityHorizon[];
  sensitivity_summary: string;
}

export interface AllocationEvent {
  id: number;
  event_uid: string;
  allocation_id?: number;
  match_id?: number;
  organ_id?: number;
  patient_id?: number;
  entity_type: string;
  entity_id?: number;
  field_changed: string;
  old_value?: string;
  new_value?: string;
  changed_by?: string;
  reason?: string;
  timestamp: string;
  affects_compatibility: boolean;
  affects_priority: boolean;
  affects_operational_feasibility: boolean;
  affects_ml_risk: boolean;
  requires_revalidation: boolean;
  impact_severity: ImpactSeverity;
  impact_summary: string;
  recommendations: string[];
}

export interface PriorityMatch {
  priority_number: number;
  receiver_id: number;
  receiver_uid?: string;
  receiver_name: string;
  blood_group: string;
  required_organ: string;
  urgency: string;
  urgency_score: number;
  waiting_days: number;
  waiting_score: number;
  compatibility: string;
  compatibility_score: number;
  total_score: number;
  special_population_points?: number;
  dialysis_vintage_points?: number;
  hla_points?: number;
  abo_points?: number;
  geographic_points?: number;
  readiness_status?: ReadinessStatus;
  readiness_score?: number;
  hospital_readiness?: HospitalReadiness;
  transport?: OrganTransport;
  preservation?: PreservationWindow;
  remaining_preservation_buffer_hours?: number;
  preservation_risk_status?: 'SAFE' | 'CAUTION' | 'CRITICAL_ISCHEMIA';
  ml_risk?: OperationalRiskAssessment;
  operational_risk_probability?: number;
  operational_risk_tier?: RiskTier;
  is_operationally_feasible?: boolean;
  xai_positive_factors?: string[];
  xai_risk_factors?: string[];
  xai_disclaimer?: string;
  stability_score?: number;
  stability_tier?: StabilityTier;
  stability_tier_description?: string;
  stability_sub_scores?: Record<string, number>;
  sensitivity?: SensitivitySimulation;
  max_delay_tolerance_minutes?: number;
  rule_set_id?: string;
  policy_version?: string;
  source_reference?: string;
  overall_compatibility?: string;
  size_compatibility?: string;
  immune_compatibility?: string;
  crossmatch_result?: string;
  hla_mismatches?: number;
  compatibility_assessment?: CompatibilityAssessment;
  score_breakdown?: any;
  hospital_name?: string;
  hospital_id?: number;
  offer_status?: OfferStatus;
  offer_id?: number;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type?: string;
  is_read: number;
  created_at?: string;
}

export interface WhatIfScenarioRequest {
  organ_id: number;
  receiver_id: number;
  simulated_delay_minutes?: number;
  icu_available?: boolean;
  ot_available?: boolean;
  surgeon_available?: boolean;
  transplant_team_available?: boolean;
  recipient_ready?: boolean;
  recipient_present?: boolean;
  documents_complete?: boolean;
  transport_mode?: string;
  route_status?: string;
}

export interface WhatIfScenarioResult {
  is_simulated: boolean;
  disclaimer: string;
  organ_info: {
    organ_id: number;
    organ_uid: string;
    organ_type: string;
    donor_hospital: string;
  };
  receiver_info: {
    receiver_id: number;
    receiver_uid: string;
    receiver_name: string;
    receiver_hospital: string;
  };
  scenario_parameters_applied: {
    simulated_delay_minutes: number;
    icu_available: boolean;
    ot_available: boolean;
    surgeon_available: boolean;
    recipient_ready: boolean;
    documents_complete: boolean;
    transport_mode: string;
    route_status: string;
  };
  baseline: {
    preservation_buffer_hours: number;
    preservation_risk_status: 'SAFE' | 'CAUTION' | 'CRITICAL_ISCHEMIA';
    readiness_status: ReadinessStatus;
    readiness_score: number;
    operational_risk_percentage: number;
    operational_risk_tier: RiskTier;
    match_stability_score: number;
    match_stability_tier: StabilityTier;
  };
  simulated: {
    preservation_buffer_hours: number;
    preservation_risk_status: 'SAFE' | 'CAUTION' | 'CRITICAL_ISCHEMIA';
    readiness_status: ReadinessStatus;
    readiness_score: number;
    operational_risk_percentage: number;
    operational_risk_tier: RiskTier;
    match_stability_score: number;
    match_stability_tier: StabilityTier;
    bottlenecks: string[];
  };
  comparative_deltas: {
    preservation_buffer_delta_hours: number;
    operational_risk_delta_pct: number;
    match_stability_delta_pct: number;
    readiness_delta_score: number;
    risk_tier_transition: string;
    stability_tier_transition: string;
    readiness_status_transition: string;
  };
  advisory_summary: string;
  advisory_warnings: string[];
}

export interface AllocationDecisionRecord {
  id: number;
  record_uid: string;
  allocation_id: number;
  allocation_uid: string;
  timestamp: string;
  timestamp_formatted: string;
  organ: {
    organ_id: number;
    organ_uid?: string;
    organ_type: string;
  };
  donor: {
    donor_id: number;
    donor_uid?: string;
    donor_name?: string;
    donor_hospital?: string;
  };
  receiver: {
    receiver_id: number;
    receiver_uid?: string;
    receiver_name?: string;
    receiver_hospital?: string;
  };
  compatibility: {
    overall_compatibility: string;
    crossmatch_result: string;
    size_compatibility: string;
    hla_mismatches: number;
  };
  policy: {
    rule_set_id: string;
    policy_version: string;
    priority_number: number;
    priority_score: number;
    score_breakdown: any;
  };
  operational_feasibility: {
    readiness_status: ReadinessStatus;
    readiness_score: number;
    operational_risk_tier: RiskTier;
    operational_risk_probability: number;
    match_stability_tier: StabilityTier;
    match_stability_score: number;
    remaining_preservation_buffer_hours: number;
  };
  coordinator: {
    coordinator_id: number;
    coordinator_name: string;
    decision: string;
    clinical_justification: string;
  };
  rejection_audit_trail: string;
  digital_signature_hash: string;
}

// ─── Phase 15: Rejection Analytics Types ─────────────────────────────────────

export interface RejectionCategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  sample_notes: string[];
}

export interface RejectionAnalyticsData {
  summary: {
    total_offers_evaluated: number;
    total_rejections: number;
    total_acceptances: number;
    total_pending: number;
    rejection_rate_pct: number;
    acceptance_rate_pct: number;
    avg_rejection_turnaround_minutes: number;
    avg_acceptance_turnaround_minutes: number;
  };
  category_distribution: RejectionCategoryBreakdown[];
  organ_breakdown: Record<string, { total_rejections: number; categories: Record<string, number> }>;
  standard_categories: string[];
  ml_training_samples_count: number;
  dataset_records: Array<{
    offer_id: number;
    organ_id: number;
    organ_type: string;
    organ_condition: string;
    receiver_id: number;
    receiver_blood_group: string;
    priority_number: number;
    status: string;
    rejection_category?: string;
    rejection_reason?: string;
    rejection_notes?: string;
    created_at?: string;
    responded_at?: string;
  }>;
}

// ─── Phase 19: Multi-Organ Procurement & Batch Types ─────────────────────────

export interface MultiOrganSummaryItem {
  organ_id: number;
  organ_uid: string;
  organ_type: OrganType;
  availability_status: OrganStatus;
  organ_condition?: string;
  retrieval_time?: string;
  allocation_id?: number;
  allocation_status?: string;
  allocated_recipient?: string;
  allocated_hospital?: string;
}

export interface MultiOrganDonorSummary {
  donor_id: number;
  donor_uid: string;
  donor_name: string;
  donor_blood_group: BloodGroup;
  donor_age: number;
  donor_hospital: string;
  total_organs_procured: number;
  organs: MultiOrganSummaryItem[];
}

export interface PriorityRankItem {
  priority_number: number;
  receiver_id: number;
  receiver_uid: string;
  receiver_name: string;
  receiver_blood_group: BloodGroup;
  hospital_name: string;
  total_score: number;
  readiness_status: string;
  tier_qualifications?: string[];
  operational_risk_tier?: string;
  stability_score?: number;
  stability_tier?: string;
  [key: string]: any;
}

export interface MultiOrganBatchMatchResult {
  donor_uid: string;
  donor_name: string;
  donor_blood_group: BloodGroup;
  donor_hospital: string;
  matched_at: string;
  total_organs_evaluated: number;
  results: Array<{
    organ_id: number;
    organ_uid: string;
    organ_type: OrganType;
    total_candidates_matched: number;
    top_candidate?: PriorityRankItem;
    priority_list: PriorityRankItem[];
    policy_used: string;
  }>;
}

// ─── Phase 20: Research Data Lake Types ──────────────────────────────────────

export interface ResearchDatasetRecord {
  allocation_id: number;
  donor: any;
  organ: any;
  receiver: any;
  compatibility: any;
  allocation: any;
  operational: any;
  dynamic: any;
  outcome: any;
}

export interface ResearchDatasetExport {
  dataset_metadata: {
    title: string;
    version: string;
    generated_at: string;
    total_allocation_records: number;
    domains_covered: string[];
    academic_citation: string;
  };
  records: ResearchDatasetRecord[];
}
