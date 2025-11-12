import { motion } from "framer-motion";
import { CheckCircle, Clock } from "lucide-react";

export default function ApprovalFlow({ approvals }) {
  const steps = ["Researcher", "Hospital", "IRB"];

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
      <h2 className="text-xl font-semibold mb-4 text-center">Approval Progress</h2>

      <div className="space-y-3">
        {steps.map((role, i) => (
          <div key={role} className="flex items-center gap-2">
            {approvals[role.toLowerCase()] ? (
              <CheckCircle className="text-green-400" />
            ) : (
              <Clock className="text-gray-300" />
            )}
            <span className="w-28 text-sm font-semibold">{role}</span>
            <div className="w-full h-2 bg-gray-300 rounded-full">
              <motion.div
                className="h-2 bg-blue-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: approvals[role.toLowerCase()] ? "100%" : "0%" }}
                transition={{ duration: 0.8 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
