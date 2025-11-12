const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(typeof data === 'string' ? data : (data?.detail || res.statusText));
  return data as T;
}

export const api = {
  registerPatient: (address: string, name: string) =>
    jsonFetch('/patient/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_address: address, display_name: name })
    }),

  grantConsent: (address: string) =>
    jsonFetch('/patient/consent/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_address: address })
    }),

  revokeConsent: (address: string) =>
    jsonFetch('/patient/consent/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_address: address })
    }),

  trialInitiate: (trialId: number, content: string) => {
    const form = new FormData();
    form.append('file', new Blob([content], { type: 'text/plain' }), 'trial.txt');
    form.append('trial_id', String(trialId));
    return fetch(`${BASE}/trial/initiate`, { method: 'POST', body: form }).then(r => r.json());
  },

  trialApprove: (trialId: number, role: 'researcher'|'hospital'|'irb') =>
    jsonFetch('/trial/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial_id: trialId, role })
    }),

  trialFinalize: (trialId: number) =>
    jsonFetch('/trial/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial_id: trialId })
    }),

  trialReportMismatch: (trialId: number) =>
    jsonFetch('/trial/report_mismatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trial_id: trialId })
    }),

  access: (patientAddress: string, purpose: string, actor: string) =>
    jsonFetch('/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_address: patientAddress, purpose, actor })
    }),

  auditPatient: (address: string) => jsonFetch(`/audit/patient/${address}`),
  auditResearcher: () => jsonFetch('/audit/researcher'),
  integrityEvents: () => jsonFetch('/events/integrity'),
};

export type PatientAudit = {
  patient: { address: string, display_name: string, consent: string },
  access_summaries: { purpose: string, actor: string, timestamp: number }[]
};

export type ResearcherAudit = {
  trials: { trial_id: number, hash: string, local_path: string }[],
  access_logs: { patient_address: string, purpose: string, actor: string, timestamp: number }[]
};

export type IntegrityEvent = { trial_id: number, old_hash: string, new_hash: string, timestamp: number };
