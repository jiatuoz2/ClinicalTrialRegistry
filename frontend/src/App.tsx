import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Patient from "./pages/Patient";
import Hospital from "./pages/Hospital";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/patient" element={<Patient />} />
        <Route path="/hospital" element={<Hospital />} />
      </Routes>
    </BrowserRouter>
  );
}
