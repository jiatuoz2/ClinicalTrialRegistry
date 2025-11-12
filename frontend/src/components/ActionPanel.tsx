import React from "react";

interface ActionPanelProps {
  onAction: (action: string) => void;
  loading: boolean;
}

export default function ActionPanel({ onAction, loading }: ActionPanelProps) {
  const commonBtn =
    "w-full py-2 rounded-xl text-sm font-semibold transition-all duration-200";

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white/5 p-4 rounded-xl shadow-inner">
        <h3 className="text-base font-semibold mb-3 text-blue-200">1. Patient Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            className={`${commonBtn} bg-indigo-500 hover:bg-indigo-600`}
            disabled={loading}
            onClick={() => onAction("register")}
          >
            Register Patient
          </button>
          <button
            className={`${commonBtn} bg-green-500 hover:bg-green-600`}
            disabled={loading}
            onClick={() => onAction("grant")}
          >
            Grant Consent
          </button>
          <button
            className={`${commonBtn} bg-pink-500 hover:bg-pink-600`}
            disabled={loading}
            onClick={() => onAction("revoke")}
          >
            Revoke Consent
          </button>
          <button
            className={`${commonBtn} bg-cyan-500 hover:bg-cyan-600 col-span-2`}
            disabled={loading}
            onClick={() => onAction("upload")}
          >
            Upload Data
          </button>
        </div>
      </div>

      <div className="bg-white/5 p-4 rounded-xl shadow-inner">
        <h3 className="text-base font-semibold mb-3 text-blue-200">2. Hospital & Audit</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            className={`${commonBtn} bg-yellow-500 hover:bg-yellow-600`}
            disabled={loading}
            onClick={() => onAction("view")}
          >
            Hospital View Data
          </button>
          <button
            className={`${commonBtn} bg-gray-500 hover:bg-gray-600`}
            disabled={loading}
            onClick={() => onAction("audit")}
          >
            View Audit Logs
          </button>
        </div>
      </div>
    </div>
  );
}
