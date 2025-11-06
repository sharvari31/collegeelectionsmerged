// client/src/pages/admin/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { getToken, getUserFromToken } from "../../utils/auth";

const API = import.meta.env.VITE_API_URL || "";

const ALL_GROUPS = [
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
  nonteaching: ["Head of Administration", "Head of Emergencies", "Head of Course Coordinators"],
};

export default function AdminDashboard() {
  const token = getToken();
  const me = getUserFromToken();

  // Restrict dropdown based on role
  const groups = useMemo(() => {
    const r = me?.role;
    if (!r) return [];
    if (r === "superadmin" || r === "admin") return ALL_GROUPS;
    if (r === "studentAdmin") return ALL_GROUPS.filter((g) => g.value === "student");
    if (r === "teacherAdmin") return ALL_GROUPS.filter((g) => g.value === "teacher");
    if (r === "nonTeachingAdmin") return ALL_GROUPS.filter((g) => g.value === "nonteaching");
    return [];
  }, [me?.role]);

  const [group, setGroup] = useState(groups[0]?.value || "student");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // manifesto modal
  const [manifesto, setManifesto] = useState(null);

  // live section
  const [livePos, setLivePos] = useState("Student Council President");
  const [live, setLive] = useState([]);
  const [liveErr, setLiveErr] = useState("");
  const positions = POSITIONS[group] || [];

  useEffect(() => {
    if (groups.length && !groups.find((g) => g.value === group)) {
      setGroup(groups[0].value);
    }
  }, [groups]); // keep selected in range

  // ---- list for group ----
  const fetchList = async () => {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`${API}/api/candidates/all?group=${encodeURIComponent(group)}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setList(data.candidates || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (group) fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);

  const patch = async (id, path) => {
    const res = await fetch(`${API}/api/admin/candidates/${id}/${path}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Failed: ${path}`);
  };

  const onApprove = async (id) => {
    try {
      await patch(id, "approve");
      await fetchList();
    } catch (e) {
      alert(e.message);
    }
  };

  const onReject = async (id) => {
    try {
      await patch(id, "reject");
      await fetchList();
    } catch (e) {
      alert(e.message);
    }
  };

  const onToggleDQ = async (id) => {
    try {
      await patch(id, "disqualify");
      await fetchList();
    } catch (e) {
      alert(e.message);
    }
  };

  // ---- live + publish/unpublish ----
  const fetchLive = async () => {
    try {
      setLiveErr("");
      const res = await fetch(
        `${API}/api/admin/results/live?role=${encodeURIComponent(group)}&position=${encodeURIComponent(livePos)}`,
        { headers: { Authorization: `Bearer ${token}` }, credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load live results");
      setLive(data.results || []);
    } catch (e) {
      setLiveErr(e.message);
      setLive([]);
    }
  };

  const publish = async () => {
    try {
      const res = await fetch(`${API}/api/admin/results/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ role: group, position: livePos }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to publish");
      alert("Published ✅");
    } catch (e) {
      alert(e.message);
    }
  };

  const unpublish = async () => {
    try {
      const res = await fetch(`${API}/api/admin/results/unpublish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ role: group, position: livePos }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to unpublish");
      alert("Unpublished");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-pink-50 to-red-50 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow border border-pink-100">
        {/* Header + group select */}
        <div className="p-6 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-extrabold text-red-700">Admin Dashboard</h1>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Group</label>
            <select
              className="px-3 py-2 rounded-lg border"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live voting + publish controls */}
        <div className="px-6">
          <div className="rounded-xl border border-pink-100 bg-white p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h2 className="font-semibold text-red-700">Live Voting</h2>
              <select
                className="px-2 py-1 rounded border"
                value={livePos}
                onChange={(e) => setLivePos(e.target.value)}
              >
                {(positions.length ? positions : [livePos]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchLive}
                className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Refresh
              </button>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={publish}
                  className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                >
                  Publish
                </button>
                <button
                  onClick={unpublish}
                  className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Unpublish
                </button>
              </div>
            </div>

            {liveErr && <div className="text-red-600 text-sm mb-2">{liveErr}</div>}

            {live.length === 0 ? (
              <div className="text-gray-600 text-sm">No votes yet.</div>
            ) : (
              <div className="grid md:grid-cols-3 gap-3">
                {live.map((r) => (
                  <div key={r._id} className="p-3 rounded border border-pink-100">
                    <div className="flex items-center gap-3">
                      {r.photo ? (
                        <img
                          src={r.photo}
                          alt={r.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-pink-100" />
                      )}
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-gray-600">{r.department || ""}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      Votes: <b>{r.votes}</b>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Candidate moderation table */}
        {loading ? (
          <div className="p-6 text-gray-600">Loading…</div>
        ) : err ? (
          <div className="p-6 text-red-600">{err}</div>
        ) : (
          <div className="p-6 overflow-x-auto">
            <table className="min-w-full border border-pink-100 rounded-xl text-sm">
              <thead className="bg-pink-100 text-red-700">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Position</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Disqualified</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr
                    key={c._id}
                    className={`border-t ${c.disqualified ? "bg-gray-100 text-gray-500" : "bg-white"}`}
                  >
                    <td className="p-3">
                      <button
                        className="underline text-red-700 hover:text-red-800"
                        onClick={() => setManifesto({ name: c.name, text: c.manifesto })}
                        title="View manifesto"
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="p-3">{c.position}</td>
                    <td
                      className={`p-3 font-semibold ${
                        c.status === "approved"
                          ? "text-green-600"
                          : c.status === "rejected"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {c.status || "pending"}
                    </td>
                    <td className="p-3">{c.disqualified ? "Yes" : "No"}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onApprove(c._id)}
                          disabled={c.status === "approved"}
                          className="px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition text-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onReject(c._id)}
                          disabled={c.status === "rejected"}
                          className="px-3 py-1 rounded-lg bg-gray-700 text-white hover:bg-gray-800 disabled:opacity-50 transition text-xs"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => onToggleDQ(c._id)}
                          className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-50 transition text-xs"
                        >
                          {c.disqualified ? "Re-qualify" : "Disqualify"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {list.length === 0 && (
                  <tr>
                    <td className="p-6 text-gray-600" colSpan={5}>
                      No candidates found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manifesto Modal */}
      {manifesto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-red-700">
                Manifesto • {manifesto.name}
              </h2>
              <button
                className="text-gray-600 hover:text-gray-900"
                onClick={() => setManifesto(null)}
              >
                ✕
              </button>
            </div>
            <div className="mt-4 max-h-80 overflow-y-auto text-gray-800 leading-relaxed whitespace-pre-wrap">
              {manifesto.text || "No manifesto provided."}
            </div>
            <div className="mt-6 text-right">
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
                onClick={() => setManifesto(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
