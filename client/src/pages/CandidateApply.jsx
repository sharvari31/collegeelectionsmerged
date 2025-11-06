import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "";
const token = () => localStorage.getItem("token") || "";

const GROUPS = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "nonteaching", label: "Non-Teaching" },
];

const POSITIONS = {
  student: [
    "Student Council President",
    "Cultural Head",
    "Treasurer",
    "Student Coordinator",
  ],
  teacher: ["HOD IT", "HOD Commerce", "HOD Data Science & Analytics"],
  nonteaching: [
    "Head of Administration",
    "Head of Emergencies",
    "Head of Course Coordinators",
  ],
};

export default function CandidateApply() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const initialGroup = (() => {
    const g = params.get("group");
    return ["student", "teacher", "nonteaching"].includes(g) ? g : "student";
  })();

  const [form, setForm] = useState({
    name: "",
    group: initialGroup,
    position: POSITIONS[initialGroup][0],
    department: "",
    photoUrl: "",
    manifesto: "",
  });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  // Require login
  useEffect(() => {
    if (!token()) {
      const next = `/apply?group=${encodeURIComponent(initialGroup)}`;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChange = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => ({
      ...f,
      [k]: v,
      ...(k === "group" ? { position: POSITIONS[v]?.[0] || "" } : {}),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!form.name || !form.group || !form.position) {
      setErr("name, group, position are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/candidates/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        /* ignore parse error; we'll show a generic message if needed */
      }

      if (!res.ok) throw new Error(data.message || `Failed (${res.status})`);

      setOk(data.message || "Application submitted");
      // Optional: reset a few fields
      // setForm((f) => ({ ...f, department: "", photoUrl: "", manifesto: "" }));
    } catch (e) {
      setErr(e.message || "Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  const currentPositions = POSITIONS[form.group] || [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-pink-50 to-red-50 py-12 px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8 border border-pink-100">
        <h1 className="text-2xl font-bold text-red-700 mb-6">Candidate Application</h1>

        {err && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {err}
          </div>
        )}
        {ok && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
            {ok}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Full Name</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.name}
              onChange={onChange("name")}
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Election Group</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.group}
              onChange={onChange("group")}
            >
              {GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Position</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.position}
              onChange={onChange("position")}
            >
              {currentPositions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Department (optional)</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.department}
              onChange={onChange("department")}
              placeholder="e.g., IT / Commerce / Science"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Photo URL (optional)</label>
            <input
              className="w-full rounded-lg border px-3 py-2"
              value={form.photoUrl}
              onChange={onChange("photoUrl")}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Manifesto</label>
            <textarea
              className="w-full rounded-lg border px-3 py-2 h-36"
              value={form.manifesto}
              onChange={onChange("manifesto")}
              placeholder="Write a brief statement…"
            />
          </div>

          <button
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit Application"}
          </button>
        </form>
      </div>
    </main>
  );
}
