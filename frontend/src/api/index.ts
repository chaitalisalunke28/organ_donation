import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Inject JWT token from localStorage and let Axios set multipart boundary automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getAdminDashboard = () => api.get('/admin/dashboard');
export const getHospitals = () => api.get('/admin/hospitals');
export const getHospital = (id: number) => api.get(`/admin/hospitals/${id}`);
export const getHospitalDetails = (id: number) => api.get(`/admin/hospitals/${id}/details`);
export const createHospital = (data: Record<string, unknown>) => api.post('/admin/hospitals', data);
export const updateHospitalStatus = (id: number, status: string) =>
  api.patch(`/admin/hospitals/${id}/status`, { status });

// ── Hospital ───────────────────────────────────────────────────────────────────
export const getHospitalDashboard = () => api.get('/hospital/dashboard');
export const getPatients = (params?: Record<string, string>) =>
  api.get('/hospital/patients', { params });
export const getPatient = (id: number) => api.get(`/hospital/patients/${id}`);
export const createPatient = (data: Record<string, unknown>) => api.post('/hospital/patients', data);
export const checkEligibility = (id: number) =>
  api.post(`/hospital/patients/${id}/check-eligibility`);
export const verifyPatientEligibility = (id: number) =>
  api.post(`/hospital/patients/${id}/verify-eligibility`);
export const getPatientOrgans = (id: number) => api.get(`/hospital/patients/${id}/organs`);
export const addOrgan = (patientId: number, data: Record<string, unknown>) =>
  api.post(`/hospital/patients/${patientId}/organs`, data);
export const getPatientReports = (id: number) => api.get(`/hospital/patients/${id}/reports`);
export const getHospitalOrgans = (params?: Record<string, string>) =>
  api.get('/hospital/organs', { params });
export const getVerifiedPool = (organType?: string) =>
  api.get('/hospital/verified-pool', { params: organType ? { organ_type: organType } : {} });
export const getAllocationRequests = () => api.get('/hospital/allocation-requests');
export const getAllocationHistory = () => api.get('/hospital/allocation-history');
export const getHospitalAllocationDetail = (id: number) => api.get(`/hospital/allocations/${id}`);
export const getHospitalNotifications = () => api.get('/hospital/notifications');
export const markNotificationRead = (id: number) => api.post(`/hospital/notifications/${id}/read`);

export const uploadReport = (patientId: number, reportType: string, file: File) => {
  const form = new FormData();
  form.append('report_type', reportType);
  form.append('file', file);
  return api.post(`/hospital/patients/${patientId}/reports`, form);
};

export const respondToOffer = (
  offerId: number,
  action: 'ACCEPT' | 'REJECT',
  rejectionReason?: string,
  rejectionNotes?: string
) => {
  const form = new FormData();
  form.append('action', action);
  if (rejectionReason) form.append('rejection_reason', rejectionReason);
  if (rejectionNotes) form.append('rejection_notes', rejectionNotes);
  return api.post(`/hospital/offers/${offerId}/respond`, form);
};

export const getHospitalReadiness = (patientId: number) =>
  api.get(`/hospital/readiness/${patientId}`);

export const updateHospitalReadiness = (data: Record<string, any>) => {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      form.append(k, String(v));
    }
  });
  return api.post('/hospital/readiness/update', form);
};

export const updateCandidateStatus = (patientId: number, status: string, reason?: string) => {
  const form = new FormData();
  form.append('candidate_status', status);
  if (reason) form.append('reason', reason);
  return api.post(`/hospital/receivers/${patientId}/status`, form);
};

// ── Coordinator ───────────────────────────────────────────────────────────────
export const getCoordinatorDashboard = () => api.get('/coordinator/dashboard');
export const getEligibleDonors = (organType?: string) =>
  api.get('/coordinator/donors', { params: organType ? { organ_type: organType } : {} });
export const getEligibleReceivers = (organType?: string) =>
  api.get('/coordinator/receivers', { params: organType ? { organ_type: organType } : {} });
export const getAvailableOrgans = (params?: Record<string, string>) =>
  api.get('/coordinator/organs', { params });
export const getActivePolicy = (organType = 'KIDNEY') =>
  api.get('/coordinator/policies/active', { params: { organ_type: organType } });
export const getCoordinatorReadiness = (hospitalId: number, receiverId: number) =>
  api.get(`/coordinator/readiness/${hospitalId}/${receiverId}`);
export const getCoordinatorTransportPlan = (organId: number, receiverId: number) =>
  api.get(`/coordinator/transport-plan/${organId}/${receiverId}`);
export const getCoordinatorRiskAssessment = (organId: number, receiverId: number) =>
  api.get(`/coordinator/risk-assessment/${organId}/${receiverId}`);
export const matchOrgan = (organId: number) => api.post(`/coordinator/match/${organId}`);
export const getPriorityList = (organId: number) =>
  api.get(`/coordinator/priority-list/${organId}`);
export const sendOffer = (organId: number, receiverId: number, priorityNumber: number) => {
  const form = new FormData();
  form.append('organ_id', String(organId));
  form.append('receiver_id', String(receiverId));
  form.append('priority_number', String(priorityNumber));
  return api.post('/coordinator/offers', form);
};
export const getOffers = (status?: string) =>
  api.get('/coordinator/offers', { params: status ? { status_filter: status } : {} });
export const expireOffer = (offerId: number) =>
  api.post(`/coordinator/offers/${offerId}/expire`);
export const getAllocations = (status?: string) =>
  api.get('/coordinator/allocations', { params: status ? { status_filter: status } : {} });
export const getAllocationDetail = (id: number) => api.get(`/coordinator/allocations/${id}`);
export const confirmAllocation = (id: number) =>
  api.post(`/coordinator/allocations/${id}/confirm`);
export const completeAllocation = (id: number) =>
  api.post(`/coordinator/allocations/${id}/complete`);
export const markUnallocated = (id: number) =>
  api.post(`/coordinator/allocations/${id}/unallocated`);
export const getRejectionHistory = () => api.get('/coordinator/rejection-history');
export const getCoordinatorNotifications = () => api.get('/coordinator/notifications');

// ── Document & PDF Fetch Helpers ─────────────────────────────────────────────
export const viewHospitalReportPdf = async (reportId: number) => {
  const res = await api.get(`/hospital/reports/${reportId}/view`, { responseType: 'blob' });
  // Uploaded evidence may be an image, so keep the type the server reports
  const blob = new Blob([res.data], { type: String(res.headers['content-type'] || 'application/pdf') });
  return URL.createObjectURL(blob);
};

export const viewCoordinatorReportPdf = async (reportId: number) => {
  const res = await api.get(`/coordinator/reports/${reportId}/view`, { responseType: 'blob' });
  // Uploaded evidence may be an image, so keep the type the server reports
  const blob = new Blob([res.data], { type: String(res.headers['content-type'] || 'application/pdf') });
  return URL.createObjectURL(blob);
};

export const downloadHospitalAllocationPdf = async (allocationId: number, filename = 'Allocation_Certificate.pdf') => {
  const res = await api.get(`/hospital/allocations/${allocationId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadHospitalRecipientDossierPdf = async (allocationId: number, filename = 'Recipient_Clinical_Dossier.pdf') => {
  const res = await api.get(`/hospital/allocations/${allocationId}/recipient-dossier-pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadCoordinatorAllocationPdf = async (allocationId: number, filename = 'Allocation_Certificate.pdf') => {
  const res = await api.get(`/coordinator/allocations/${allocationId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const downloadCoordinatorRecipientDossierPdf = async (allocationId: number, filename = 'Recipient_Clinical_Dossier.pdf') => {
  const res = await api.get(`/coordinator/allocations/${allocationId}/recipient-dossier-pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ─── Dynamic Revalidation, Impact Analysis & Match Stability (Phases 10-12) ──

export const getAllocationEvents = async (limit = 50) => {
  const { data } = await api.get(`/coordinator/events?limit=${limit}`);
  return data;
};

export const getAllocationTimeline = async (allocationId: number) => {
  const { data } = await api.get(`/coordinator/allocations/${allocationId}/events`);
  return data;
};

export const simulateDynamicChange = async (formData: FormData) => {
  const { data } = await api.post('/coordinator/events/simulate-change', formData);
  return data;
};

export const getMatchStabilitySimulation = async (organId: number, receiverId: number) => {
  const { data } = await api.get(`/coordinator/stability-simulation/${organId}/${receiverId}`);
  return data;
};

export const revalidateAllocation = async (allocationId: number, notes?: string) => {
  const form = new FormData();
  if (notes) form.append('notes', notes);
  const { data } = await api.post(`/coordinator/allocations/${allocationId}/revalidate`, form);
  return data;
};

// ─── What-If Scenario Simulation (Phase 13) ──────────────────────────────────

export const runWhatIfSimulation = async (params: {
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
}) => {
  const form = new FormData();
  form.append('organ_id', params.organ_id.toString());
  form.append('receiver_id', params.receiver_id.toString());
  if (params.simulated_delay_minutes !== undefined) {
    form.append('simulated_delay_minutes', params.simulated_delay_minutes.toString());
  }
  if (params.icu_available !== undefined) form.append('icu_available', params.icu_available.toString());
  if (params.ot_available !== undefined) form.append('ot_available', params.ot_available.toString());
  if (params.surgeon_available !== undefined) form.append('surgeon_available', params.surgeon_available.toString());
  if (params.transplant_team_available !== undefined) form.append('transplant_team_available', params.transplant_team_available.toString());
  if (params.recipient_ready !== undefined) form.append('recipient_ready', params.recipient_ready.toString());
  if (params.recipient_present !== undefined) form.append('recipient_present', params.recipient_present.toString());
  if (params.documents_complete !== undefined) form.append('documents_complete', params.documents_complete.toString());
  if (params.transport_mode) form.append('transport_mode', params.transport_mode);
  if (params.route_status) form.append('route_status', params.route_status);

  const { data } = await api.post('/coordinator/simulate/what-if', form);
  return data;
};

// ─── Permanent Allocation Decision Record (Phase 14) ─────────────────────────

export const getAllocationDecisionRecord = async (allocationId: number) => {
  const { data } = await api.get(`/coordinator/allocations/${allocationId}/decision-record`);
  return data;
};

export const getHospitalAllocationDecisionRecord = async (allocationId: number) => {
  const { data } = await api.get(`/hospital/allocations/${allocationId}/decision-record`);
  return data;
};

// ─── Rejection Analytics (Phase 15) ──────────────────────────────────────────

export const getRejectionAnalytics = async (days?: number) => {
  const params = days ? { days } : {};
  const { data } = await api.get('/coordinator/analytics/rejections', { params });
  return data;
};

// ─── Multi-Organ Procurement & Allocation (Phase 19) ─────────────────────────

export const getMultiOrganDonor = async (donorId: number) => {
  const { data } = await api.get(`/coordinator/multi-organ/donors/${donorId}`);
  return data;
};

export const matchMultiOrganBatch = async (donorId: number) => {
  const { data } = await api.post(`/coordinator/multi-organ/match/${donorId}`);
  return data;
};

// ─── Research Data Lake & Dataset Export (Phase 20) ──────────────────────────

export const getResearchDataset = async (organType?: string) => {
  const params = organType && organType !== 'ALL' ? { organ_type: organType } : {};
  const { data } = await api.get('/coordinator/research/dataset', { params });
  return data;
};

export const downloadResearchCsv = async (organType?: string) => {
  const params = organType && organType !== 'ALL' ? { organ_type: organType } : {};
  const response = await api.get('/coordinator/research/dataset/csv', {
    params,
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `organ_allocation_research_dataset_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
};




