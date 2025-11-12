import { motion, AnimatePresence } from "framer-motion";

export default function LogPanel({ logs }) {
  return (
    <div className="bg-black/60 rounded-2xl p-5 h-full overflow-y-auto shadow-inner font-mono text-sm">
      <h2 className="text-lg font-semibold text-blue-300 mb-3">System Log</h2>
      <AnimatePresence>
        {logs.slice(-20).map((log, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`mb-1 ${
              log.includes("✅")
                ? "text-green-400"
                : log.includes("❌")
                ? "text-red-400"
                : "text-gray-200"
            }`}
          >
            {log}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
