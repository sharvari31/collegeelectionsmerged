// client/src/pages/admin/AdminReview.jsx
import { useEffect, useMemo, useState } from "react";
import { getToken } from "../../utils/auth";

const API = import.meta.env.VITE_API_URL || "";

const GROUPS = [
  { value: "", label: "All Groups" },
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "nonteaching", label: "Non-Teaching" },
];

const STATUS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export default function AdminReview() {
  const token = getToken();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // filters
  const [status, setStatus] = useState("pending");
  const [group, setGroup] = useState("");
  const [q, setQ] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setErr("");
      const url =
        group && group.length
          ? `${API}/api/candidates/all?group=${encodeURIComponent(group)}`
          : `${API}/api/candidates/all`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Failed (${res.status})`);
      setAll(data.candidates || []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  const items = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return (all || [])
      .filter((r) => (status ? (r.status || "pending") === status : true))
      .filter((r) =>
        qn
          ? [r.name, r.position, r.department]
              .map((x) => (x || "").toString().toLowerCase())
              .some((t) => t.includes(qn))
          : true
      );
  }, [all, status, q]);

  const act = async (id, kind) => {
    const path = kind === "approve" ? "approve" : kind === "reject" ? "reject" : "disqualify";
    try {
      setErr("");
      const res = await fetch(`${API}/api/admin/candidates/${id}/${path}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `${kind} failed (${res.status})`);
      await fetchData();
    } catch (e) {
      setErr(e.message || "Action failed");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-pink-50 to-red-50 py-10 px-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-red-700">Admin • Review Candidates</h1>
            <p className="text-gray-600">Approve / Reject applications and toggle Disqualified.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="border rounded-lg px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              className="border rounded-lg px-3 py-2"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              {GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>

            <input
              className="border rounded-lg px-3 py-2"
              placeholder="Search name/position/department"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <a
              href="/admin/candidates"
              className="px-4 py-2 rounded-lg bg-white border border-red-600 text-red-600 hover:bg-red-50 transition"
            >
              Manage List
            </a>
          </div>
        </div>

        {err && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">{err}</div>
        )}

        {/* table/list */}
        <div className="bg-white rounded-2xl shadow border border-pink-100 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-[1000px] w-full">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b bg-pink-50/60">
                  <th className="py-2 px-3">Candidate</th>
                  <th className="py-2 px-3">Group</th>
                  <th className="py-2 px-3">Position</th>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Disqualified</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="py-4 px-3" colSpan={7}>
                      Loading…
                    </td>
                  </tr>
                )}

                {!loading &&
                  items.map((r) => (
                    <tr key={r._id} className="border-b">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {r.photo || r.photoUrl ? (
                            <img
                              src={r.photo || r.photoUrl}
                              alt={r.name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-pink-100" />
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{r.name}</div>
                            <div className="text-xs text-gray-500">
                              {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 capitalize">{r.group}</td>
                      <td className="py-3 px-3">{r.position}</td>
                      <td className="py-3 px-3">{r.department || "-"}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            r.status === "approved"
                              ? "bg-green-100 text-green-700"
                              : r.status === "rejected"
                              ? "bg-gray-200 text-gray-700"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {r.status || "pending"}
                        </span>
                      </td>
                      <td className="py-3 px-3">{r.disqualified ? "Yes" : "No"}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={r.status === "approved"}
                            onClick={() => act(r._id, "approve")}
                            className={`px-3 py-1 rounded-lg ${
                              r.status === "approved"
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            Approve
                          </button>
                          <button
                            disabled={r.status === "rejected"}
                            onClick={() => act(r._id, "reject")}
                            className={`px-3 py-1 rounded-lg ${
                              r.status === "rejected"
                                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                : "bg-gray-800 text-white hover:bg-gray-900"
                            }`}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => act(r._id, "toggle")}
                            className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50"
                          >
                            {r.disqualified ? "Re-qualify" : "Disqualify"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loading && items.length === 0 && (
                  <tr>
                    <td className="py-6 px-3 text-gray-600" colSpan={7}>
                      No candidates for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
