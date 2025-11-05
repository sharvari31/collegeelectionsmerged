import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { parseJwt } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Login() {
  const [emailOrId, setEmailOrId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const redirectAfterAuth = (user) => {
    const params = new URLSearchParams(location.search);
    const next = params.get("next");
    if (next) return navigate(next, { replace: true });

    const role = user?.role || "";
    const group = user?.group || "";

    const adminRoles = ["superadmin", "admin", "studentAdmin", "teacherAdmin", "nonTeachingAdmin"];
    if (adminRoles.includes(role)) return navigate("/admin", { replace: true });

    if (group === "student") return navigate("/e/student", { replace: true });
    if (group === "teacher") return navigate("/e/teacher", { replace: true });
    if (group === "nonteaching") return navigate("/e/nonteaching", { replace: true });

    navigate("/elections", { replace: true });
  };

  const isTenDigitId = (s) => /^\d{10}$/.test(String(s || "").trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const body = isTenDigitId(emailOrId)
        ? { memberId: String(emailOrId).trim(), password }
        : { email: String(emailOrId).trim(), password };

      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      const user = parseJwt(data.token);
      redirectAfterAuth(user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-pink-50 to-red-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-pink-100"
      >
        <h1 className="text-3xl font-bold text-red-700 mb-6">Login</h1>

        {error && (
          <div className="mb-4 text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">
            {error}
          </div>
        )}

        <label className="block mb-3">
          <span className="text-gray-700">Email or College ID (10 digits)</span>
          <input
            type="text"
            className="mt-1 w-full border rounded-lg p-2"
            value={emailOrId}
            onChange={(e) => setEmailOrId(e.target.value)}
            required
            placeholder="you@college.edu  or  2300123456"
          />
        </label>

        <label className="block mb-6">
          <span className="text-gray-700">Password</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button
          type="submit"
          className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Sign In
        </button>
      </form>
    </main>
  );
}
