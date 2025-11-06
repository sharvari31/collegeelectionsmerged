// client/src/pages/admin/AdminCandidates.jsx
import { useEffect, useState } from "react";
import { getToken } from "../../utils/auth";

const API = import.meta.env.VITE_API_URL || "";

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `Request failed (${res.status})`);
  }
};

export default function AdminCandidates() {
  const token = getToken();
  const [candidates, setCandidates] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCandidates = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/candidates/all`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await safeJson(res).catch((e) => {
          throw new Error(e.message || `Failed (${res.status})`);
        });
        throw new Error(data.message || `Failed (${res.status})`);
      }
      const data = await safeJson(res);
      setCandidates(data.candidates || []);
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = async (id, path) => {
    const res = await fetch(`${API}/api/admin/candidates/${id}/${path}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    const data = await safeJson(res).catch((e) => {
      throw new Error(e.message || `Failed: ${path}`);
    });
    if (!res.ok) throw new Error(data.message || `Failed: ${path}`);
    return data;
  };

  const approve = async (id) => {
    try {
      await patch(id, "approve");
      await fetchCandidates();
      alert("Approved ✅");
    } catch (e) {
      alert(e.message);
    }
  };

  const reject = async (id) => {
    try {
      await patch(id, "reject");
      await fetchCandidates();
      alert("Rejected");
    } catch (e) {
      alert(e.message);
    }
  };

  const toggleDisq = async (id) => {
    try {
      await patch(id, "disqualify"); // backend uses /disqualify to toggle
      await fetchCandidates();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <p className="text-center p-10">Loading…</p>;
  if (err) return <p className="text-center p-10 text-red-600">{err}</p>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-pink-50 to-red-50 p-10">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow p-8 border border-pink-100">
        <h1 className="text-3xl font-bold text-red-700 mb-6">Manage Candidates</h1>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-pink-100 rounded-xl">
            <thead className="bg-pink-100 text-red-700">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Group</th>
                <th className="p-3 text-left">Position</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Disq</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c._id} className="border-t">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 capitalize">{c.group}</td>
                  <td className="p-3">{c.position}</td>
                  <td className="p-3 capitalize">{c.status}</td>
                  <td className="p-3">{c.disqualified ? "Yes" : "No"}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => approve(c._id)}
                      disabled={c.status === "approved"}
                      className="px-3 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reject(c._id)}
                      disabled={c.status === "rejected"}
                      className="px-3 py-1 rounded bg-gray-700 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => toggleDisq(c._id)}
                      className="px-3 py-1 rounded border text-xs hover:bg-gray-50"
                    >
                      {c.disqualified ? "Re-qualify" : "Disqualify"}
                    </button>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-3 text-gray-600">
                    No candidates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
