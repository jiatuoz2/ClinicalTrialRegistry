import { motion } from "framer-motion";

interface StatusCardProps {
  consentActive: boolean;
}

export default function StatusCard({ consentActive }: StatusCardProps) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center shadow-xl"
    >
      <h2 className="text-xl font-semibold mb-4">Patient Consent</h2>
      <motion.div
        animate={{
          backgroundColor: consentActive ? "#22c55e" : "#ef4444",
          scale: [1, 1.1, 1],
        }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="mx-auto w-8 h-8 rounded-full mb-3"
      />
      <p className="text-lg font-semibold mb-4">
        {consentActive ? "Active ✅" : "Revoked ❌"}
      </p>
    </motion.div>
  );
}
