import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import ClinicalTrialRegistryABI from "../abi/ClinicalTrialRegistry.json";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

import {
  Users,
  FileText,
  AlertTriangle,
  Search,
  Activity,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

const CONTRACT_ADDRESS = import.meta.env.VITE_REGISTRY_ADDRESS;

const MOCK_ENROLLMENT = [
  { month: "2025-01", patients: 12 },
  { month: "2025-02", patients: 22 },
  { month: "2025-03", patients: 41 },
  { month: "2025-04", patients: 55 },
  { month: "2025-05", patients: 67 },
  { month: "2025-06", patients: 85 },
];

const MOCK_SYMPTOMS = [
  { name: "Headache", value: 30 },
  { name: "Fatigue", value: 22 },
  { name: "Dizziness", value: 15 },
  { name: "Nausea", value: 10 },
  { name: "Other", value: 7 },
];

const MOCK_ADHERENCE = [
  { name: "Compliant", value: 82, color: "#10b981" },
  { name: "Non-Compliant", value: 18, color: "#ef4444" },
];

const MOCK_SUMMARY = {
  total_patients: 1248,
  total_reports: 8902,
  adherence_rate: 0.92,
  severe_events: 3,
};

const MOCK_PATIENTS = [
  {
    study_id: "CT-2025-0001",
    wallet_address: "0xa95e27521c26df0326649510338fee2cf3ef6606",
    authorized: false,
  },
  {
    study_id: "CT-2025-0002",
    wallet_address: "0xb54ff2037d88ae368912eeaa2113fc88aa8923e1",
    authorized: true,
  },
];

const shortWallet = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

const fmt = (ts: string) => new Date(ts).toLocaleString();

export default function Hospital() {
  const backend = "http://127.0.0.1:8000";

  const [activeView, setActiveView] = useState<
    "dashboard" | "records" | "patient-details"
  >("dashboard");

  const [summary, setSummary] = useState(MOCK_SUMMARY);
  const [enrollmentTrend, setEnrollmentTrend] = useState(MOCK_ENROLLMENT);
  const [symptoms, setSymptoms] = useState(MOCK_SYMPTOMS);
  const [adherence, setAdherence] = useState(MOCK_ADHERENCE);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);

  const [patients, setPatients] = useState<any[]>(MOCK_PATIENTS);
  const [patientData, setPatientData] = useState<any | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const [studyId, setStudyId] = useState("");
  const [drawerReport, setDrawerReport] = useState<any | null>(null);

  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [purpose, setPurpose] = useState("");
  const [pendingPatient, setPendingPatient] = useState<any | null>(null);

  const hospitalWallet = localStorage.getItem("hospital_wallet");

  useEffect(() => {
    fetch(`${backend}/stats/summary`)
      .then((r) => r.json())
      .then((data) => {
        setSummary({
          total_patients: data.total_patients ?? MOCK_SUMMARY.total_patients,
          total_reports: data.total_reports ?? MOCK_SUMMARY.total_reports,
          adherence_rate: data.adherence_rate ?? MOCK_SUMMARY.adherence_rate,
          severe_events: data.severe_events ?? MOCK_SUMMARY.severe_events,
        });
      })
      .catch(() => setSummary(MOCK_SUMMARY));
  }, []);

  useEffect(() => {
    fetch(`${backend}/stats/enrollment-trend`)
      .then((r) => r.json())
      .then((data) => {
        const real = data.items || [];
        const merged = [
          ...real,
          ...MOCK_ENROLLMENT.filter(
            (m) => !real.some((r: { month: string }) => r.month === m.month)
          ),
        ];
        setEnrollmentTrend(merged);
      })
      .catch(() => setEnrollmentTrend(MOCK_ENROLLMENT));
  }, []);

  useEffect(() => {
    fetch(`${backend}/stats/symptoms`)
      .then((r) => r.json())
      .then((data) => {
        const real = data.items || [];
        const merged = [
          ...real,
          ...MOCK_SYMPTOMS.filter(
            (m) =>
              !real.some(
                (r: { name: string; value: number }) => r.name === m.name
              )
          ),
        ];
        setSymptoms(merged);
      })
      .catch(() => setSymptoms(MOCK_SYMPTOMS));
  }, []);

  useEffect(() => {
    fetch(`${backend}/stats/adherence`)
      .then((r) => r.json())
      .then((data) => {
        const real = [
          {
            name: "Compliant",
            value: data.compliant ?? null,
            color: "#10b981",
          },
          {
            name: "Non-Compliant",
            value: data.non_compliant ?? null,
            color: "#ef4444",
          },
        ];

        const merged = real.map((item, i) => ({
          ...item,
          value: item.value ?? MOCK_ADHERENCE[i].value,
        }));

        setAdherence(merged);
      })
      .catch(() => setAdherence(MOCK_ADHERENCE));
  }, []);

  useEffect(() => {
    fetch(`${backend}/patients`)
      .then((r) => r.json())
      .then((data) => setPatients(data.patients || MOCK_PATIENTS))
      .catch(() => setPatients(MOCK_PATIENTS));
  }, []);

  useEffect(() => {
    fetch(`${backend}/access-logs`)
      .then((r) => r.json())
      .then((data) => setAccessLogs(data.logs || []))
      .catch(() => setAccessLogs([]));
  }, []);

  useEffect(() => {
    if (!patientData) return;
    const id = patientData.study_id as string;
    const interval = setInterval(() => {
      fetchPatientFromApi(id);
    }, 5000);
    return () => clearInterval(interval);
  }, [patientData]);

  useEffect(() => {
    if (activeView !== "records") return;
    const interval = setInterval(() => {
      fetch(`${backend}/patients`)
        .then((r) => r.json())
        .then((data) => setPatients(data.patients || MOCK_PATIENTS))
        .catch(() => setPatients(MOCK_PATIENTS));
    }, 3000);
    return () => clearInterval(interval);
  }, [activeView]);

  const callViewOnChain = async (patientWallet: string, purpose: string) => {
    try {
      // @ts-ignore
      if (!window.ethereum) {
        alert("Metamask not found");
        return null;
      }
      // @ts-ignore
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddr = await signer.getAddress();

      if (hospitalWallet?.toLowerCase() !== signerAddr.toLowerCase()) {
        alert(
          "Please switch MetaMask to the hospital wallet.\n" +
            `Current: ${signerAddr}\nExpected: ${hospitalWallet}`
        );
        return null;
      }

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        ClinicalTrialRegistryABI,
        signer
      );

      const tx = await contract.viewData(patientWallet, purpose);
      await tx.wait();
      return tx.hash;
    } catch (err: any) {
      alert("Blockchain error: " + (err.reason || err.message));
      return null;
    }
  };

  const fetchPatientFromApi = async (id: string) => {
    try {
      const res = await fetch(`${backend}/self-report/${id}`);

      if (!res.ok) {
        setAuthorized(false);
        setPatientData(null);
        setReports([]);
        return;
      }

      const data = await res.json();
      const pt = data.patient;

      setAuthorized(pt.authorized);

      if (!pt.authorized) {
        setPatientData(null);
        setReports([]);
        return;
      }

      setPatientData(pt);
      setReports(data.self_reports || []);
    } catch {
      setAuthorized(null);
      setPatientData(null);
      setReports([]);
    }
  };

  const requestViewAccess = (p: any) => {
    if (p.authorized === false) {
      setAuthorized(false);
      setPatientData(null);
      setReports([]);
      setActiveView("patient-details");
      return;
    }
    setPendingPatient(p);
    setPurpose("");
    setShowPurposeModal(true);
  };

  const confirmPurpose = async () => {
    if (!pendingPatient) return;
    const id = pendingPatient.study_id as string;

    const walletRes = await fetch(`${backend}/patient/wallet/${id}`);
    const walletData = await walletRes.json();
    const patientWallet = walletData.wallet_address;

    const txHash = await callViewOnChain(patientWallet, purpose);
    if (!txHash) return;

    await fetch(`${backend}/access-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        study_id: id,
        purpose,
        tx_hash: txHash,
        hospital_wallet: hospitalWallet,
      }),
    });

    const logsRes = await fetch(`${backend}/access-logs`);
    const logs = await logsRes.json();
    setAccessLogs(logs.logs || []);

    await fetchPatientFromApi(id);
    setStudyId(id);
    setActiveView("patient-details");

    setShowPurposeModal(false);
    setPurpose("");
    setPendingPatient(null);
  };

  const handleSearch = () => {
    if (!studyId.trim()) return;
    const id = studyId.trim();
    const p = patients.find((x) => x.study_id === id);
    if (p) {
      requestViewAccess(p);
    } else {
      setAuthorized(false);
      setPatientData(null);
      setReports([]);
      setActiveView("patient-details");
    }
  };

  const handleBackToRecords = async () => {
    let freshPatients = MOCK_PATIENTS;
    try {
      const r = await fetch(`${backend}/patients`);
      const data = await r.json();
      freshPatients = data.patients || MOCK_PATIENTS;
    } catch {}
    setPatients(freshPatients);  
    setPatientData(null);
    setAuthorized(null);
    setReports([]);
    setStudyId("");
    setActiveView("records");
  };

  const viewTitle =
    activeView === "dashboard"
      ? "Dashboard"
      : activeView === "records"
      ? "Patient Records"
      : "Patient Details";

  const totalAdherence = adherence.reduce(
    (sum, a) => sum + (a.value ?? 0),
    0
  );
  const compliantValue =
    adherence.find((a) => a.name === "Compliant")?.value ??
    MOCK_ADHERENCE[0].value;
  const compliantPercent =
    totalAdherence > 0
      ? Math.round((compliantValue / totalAdherence) * 100)
      : Math.round(MOCK_SUMMARY.adherence_rate * 100);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 font-sans flex">
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xl">
            <Activity /> ClinicalAdmin
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveView("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition 
              ${
                activeView === "dashboard"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
          >
            <Activity size={18} /> Dashboard
          </button>
          <button
            onClick={() => setActiveView("records")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition 
              ${
                activeView === "records"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
          >
            <Users size={18} /> Patient Records
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 mb-3">
            <p className="font-semibold text-slate-700">Connected Wallet</p>
            <p className="truncate">{hospitalWallet}</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("hospital_wallet");
              window.location.href = "/";
            }}
            className="w-full py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800">
            {viewTitle} Overview
          </h1>
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={18}
            />
            <input
              value={studyId}
              onChange={(e) => setStudyId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search Study ID..."
              className="pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 w-64 transition"
            />
          </div>
        </header>

        <div className="p-8">
          {activeView === "dashboard" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="grid grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      <Users size={20} />
                    </div>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      +12%
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm">Total Enrolled</p>
                  <h3 className="text-3xl font-bold text-slate-800">
                    {summary.total_patients.toLocaleString()}
                  </h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                      <FileText size={20} />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm">Reports Submitted</p>
                  <h3 className="text-3xl font-bold text-slate-800">
                    {summary.total_reports.toLocaleString()}
                  </h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                      <Activity size={20} />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm">Avg. Adherence</p>
                  <h3 className="text-3xl font-bold text-slate-800">
                    {(summary.adherence_rate * 100).toFixed(0)}%
                  </h3>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                      <AlertTriangle size={20} />
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                      Action Req
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm">
                    Severe Adverse Events
                  </p>
                  <h3 className="text-3xl font-bold text-slate-800">
                    {summary.severe_events}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">
                    Patient Enrollment Trend
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={enrollmentTrend}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b" }}
                          dy={10}
                          tickFormatter={(value) => {
                            const [year, month] = value.split("-").map(Number);
                            const monthNames = [
                              "Jan",
                              "Feb",
                              "Mar",
                              "Apr",
                              "May",
                              "Jun",
                              "Jul",
                              "Aug",
                              "Sep",
                              "Oct",
                              "Nov",
                              "Dec",
                            ];
                            return monthNames[month - 1];
                          }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b" }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow:
                              "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="patients"
                          stroke="#2563eb"
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            fill: "#2563eb",
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">
                    Reported Symptoms
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={symptoms} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          horizontal
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fill: "#64748b" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "#f1f5f9" }}
                          contentStyle={{ borderRadius: "12px" }}
                        />
                        <Bar
                          dataKey="value"
                          fill="#3b82f6"
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">
                    Medication Adherence
                  </h3>
                  <div className="h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={adherence}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {adherence.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-slate-800">
                          {compliantPercent}%
                        </span>
                        <p className="text-xs text-slate-500">Compliant</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white flex flex-col justify-center relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">
                      On-chain Access Logs
                    </h3>
                    <p className="text-blue-100 mb-4 max-w-md">
                      Below are all historical access transactions.
                    </p>
                    <div className="bg-white/10 rounded-xl p-4 max-h-40 overflow-y-auto space-y-3 text-sm">
                      {accessLogs.length === 0 ? (
                        <p className="text-blue-100 text-xs">
                          No access recorded yet.
                        </p>
                      ) : (
                        accessLogs.map((log: any, i: number) => (
                          <div
                            key={i}
                            className="border-b border-white/20 pb-2"
                          >
                            <p className="font-mono text-xs truncate">
                              {log.tx_hash}
                            </p>
                            <p className="text-[10px] text-blue-100">
                              {fmt(log.chain_timestamp || log.db_timestamp)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <FileText
                    className="absolute -right-10 -bottom-10 text-white opacity-10"
                    size={200}
                  />
                </div>
              </div>
            </div>
          )}

          {activeView === "records" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">
                  Patient Registry
                </h2>
              </div>
              <table className="w-full text-left text-sm table-fixed">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="p-4 w-40">Study ID</th>
                    <th className="p-4 w-64">Wallet</th>
                    <th className="p-4 w-32">Status</th>
                    <th className="p-4 w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-medium text-slate-900">
                        {p.study_id}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {shortWallet(p.wallet_address)}
                      </td>
                      <td className="p-4">
                        {p.authorized ? (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                            Authorized
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs font-bold">
                            Restricted
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => requestViewAccess(p)}
                          className="inline-flex items-center justify-end gap-1 text-blue-600 font-medium hover:underline"
                        >
                          View <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeView === "patient-details" && (
            <div className="animate-fadeIn space-y-6">
              <button
                onClick={handleBackToRecords}
                className="mb-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm hover:bg-slate-50"
              >
                ← Back to Records
              </button>

              {!patientData && authorized === false && (
                <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 p-6">
                  <p className="text-slate-600 font-semibold text-lg mb-2">
                    You do not have permission to view this patient&apos;s data.
                  </p>
                </div>
              )}

              {patientData && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-2xl font-bold mb-4 text-slate-800">
                      Patient Information
                    </h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Study ID</p>
                        <p className="font-medium text-slate-800">
                          {patientData.study_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Wallet</p>
                        <p className="font-mono text-xs text-slate-800 break-all">
                          {patientData.wallet_address}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Age</p>
                        <p className="font-medium text-slate-800">
                          {patientData.age ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Gender</p>
                        <p className="font-medium text-slate-800 capitalize">
                          {patientData.gender ?? "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Status</p>
                        <p>
                          {patientData.authorized ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                              Authorized
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-full text-xs font-bold">
                              Restricted
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Initial Case File</p>
                        {patientData.initial_record_url ? (
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-600" />
                            <a
                              href={patientData.initial_record_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline break-all"
                            >
                              View Medical PDF
                            </a>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">No file uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">
                      Self Reports
                    </h3>
                    {reports.length === 0 ? (
                      <p className="text-slate-500 text-sm">
                        No reports submitted yet.
                      </p>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Symptoms</th>
                            <th className="p-3">Medication</th>
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {reports.map((r, i) => (
                            <tr
                              key={i}
                              className="hover:bg-slate-50 cursor-pointer"
                              onClick={() => setDrawerReport(r)}
                            >
                              <td className="p-4 font-medium">
                                {new Date(r.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-4">
                                {r.symptoms.length > 0 ? (
                                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                                    {r.symptoms.length} Issues
                                  </span>
                                ) : (
                                  "None"
                                )}
                              </td>
                              <td className="p-4">
                                {r.medication_compliance ? (
                                  <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle size={14} /> Taken
                                  </span>
                                ) : (
                                  <span className="text-red-500 flex items-center gap-1">
                                    <AlertCircle size={14} /> Missed
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-blue-600 font-medium">
                                →
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

     {drawerReport && (
         <div>
             {/* Overlay */}
             <div
                 className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                 onClick={() => setDrawerReport(null)}
             ></div>

             {/* Drawer */}
             <div className="fixed top-0 right-0 w-[420px] h-full bg-white shadow-2xl z-50 p-6 overflow-y-auto animate-fadeIn">

                 {/* Header */}
                 <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xl font-bold text-slate-800">Report Detail</h2>
                     <button
                         onClick={() => setDrawerReport(null)}
                         className="text-slate-500 hover:text-slate-700 text-xl"
                     >
                         ✕
                     </button>
                 </div>

                 {/* Date */}
                 <div className="mb-4 text-sm text-slate-600">
                     <p className="font-semibold text-slate-700 mb-1">Date</p>
                     <p>{new Date(drawerReport.created_at).toLocaleString()}</p>
                 </div>

                 {/* Medication */}
                 <div className="mb-6">
                     <p className="font-semibold text-slate-700 mb-1">
                         Medication Compliance
                     </p>
                     {drawerReport.medication_compliance ? (
                         <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                             Taken
                         </span>
                     ) : (
                         <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                             Missed
                         </span>
                     )}
                 </div>

                 {/* Symptoms */}
                 <div>
                     <p className="font-semibold text-slate-700 mb-2">Symptoms</p>

                     {(!drawerReport.symptoms ||
                         drawerReport.symptoms.length === 0) && (
                         <p className="text-slate-400 text-sm">
                             No symptoms reported.
                         </p>
                     )}

                     <div className="space-y-3">
                         {drawerReport.symptoms?.map((s: any, i: number) => (
                             <div
                                 key={i}
                                 className="border border-slate-200 bg-slate-50 rounded-xl p-3 flex justify-between items-center"
                             >
                                 <span className="font-medium text-slate-700">
                                     {s.symptom}
                                 </span>

                                 <span
                                     className={`px-3 py-1 rounded-lg text-xs font-bold ${
                                         s.severity === "Mild"
                                             ? "bg-yellow-100 text-yellow-700"
                                             : s.severity === "Moderate"
                                             ? "bg-orange-100 text-orange-700"
                                             : "bg-red-100 text-red-700"
                                     }`}
                                 >
                                     {(s.severity || "").toUpperCase()}
                                 </span>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
         </div>
      )}

      {showPurposeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-[420px]">
            <h2 className="text-xl font-bold text-slate-800 mb-3">
              Access Purpose
            </h2>
            <p className="text-slate-600 text-sm mb-4">
              Please provide the reason for accessing this patient&apos;s
              records. This will be recorded on-chain and in the audit log.
            </p>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Clinical review for follow-up evaluation"
              className="w-full h-28 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setShowPurposeModal(false);
                  setPendingPatient(null);
                  setPurpose("");
                }}
                className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={!purpose.trim()}
                onClick={confirmPurpose}
                className={`px-5 py-2 text-sm rounded-xl text-white font-medium ${
                  purpose.trim()
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-200 cursor-not-allowed"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
