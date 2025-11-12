import React, { useState } from "react";
import ActionPanel from "./components/ActionPanel";
import StatusCard from "./components/StatusCard";
import LogPanel from "./components/LogPanel";

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [consentActive, setConsentActive] = useState(false);
  const backend = "http://127.0.0.1:8000";

  const appendLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const callApi = async (endpoint: string, label: string, body: any = {}) => {
    try {
      setLoading(true);
      appendLog(`➡️ Sending request: ${label}`);
      const res = await fetch(`${backend}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.status >= 400) {
        appendLog(`❌ ${label} failed: ${data.detail || JSON.stringify(data)}`);
      } else {
        appendLog(`✅ ${label} succeeded: ${JSON.stringify(data)}`);
        if (endpoint.includes("grant")) setConsentActive(true);
        if (endpoint.includes("revoke")) setConsentActive(false);
      }
    } catch (err: any) {
      appendLog(`❌ ${label} failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    const patient = {
      patient_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      hospital_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    };
    switch (action) {
      case "register":
        await callApi("patient/register", "Register Patient", patient);
        break;
      case "grant":
        await callApi("patient/consent/grant", "Grant Consent", patient);
        break;
      case "revoke":
        await callApi("patient/consent/revoke", "Revoke Consent", patient);
        break;
      case "upload":
        await callApi("patient/upload", "Upload Data", {
          ...patient,
          content: "mock_medical_record_data",
        });
        break;
      case "view":
        await callApi("hospital/view", "Hospital View Data", {
          ...patient,
          purpose: "clinical review",
        });
        break;
      case "audit":
        const address = patient.patient_address;
        appendLog(`🔍 Fetching audit logs for ${address}`);
        const res = await fetch(`${backend}/audit/patient/${address}`);
        const data = await res.json();
        appendLog(`📜 Audit logs: ${JSON.stringify(data.access_logs)}`);
        break;
      default:
        appendLog(`⚠️ Unknown action: ${action}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-blue-500 to-cyan-500 text-white py-8 px-3 flex flex-col items-center overflow-hidden">
      <div className="scale-[0.95] transform origin-top flex flex-col items-center w-full">
        <h1 className="text-3xl font-extrabold mb-8 drop-shadow-lg tracking-wide text-center">
          🧬 Patient–Hospital Blockchain Demo
        </h1>
        <div className="mb-6 w-full max-w-lg">
          <StatusCard consentActive={consentActive} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl items-stretch">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col">
            <h2 className="text-lg font-semibold mb-3 text-center">
              Action Panel
            </h2>
            <ActionPanel onAction={handleAction} loading={loading} />
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col">
            <h2 className="text-lg font-semibold mb-3 text-center">
              System Log
            </h2>
            <div className="flex-1 overflow-y-auto">
              <LogPanel logs={logs} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
