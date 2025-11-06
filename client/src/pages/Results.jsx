// client/src/pages/Results.jsx
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "";

export default function Results() {
  const [group, setGroup] = useState("student");
  const [positions, setPositions] = useState([]);
  const [position, setPosition] = useState("");
  const [data, setData] = useState({ published: false, results: [] });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔹 Load positions when group changes
  useEffect(() => {
    const loadPositions = async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API}/api/elections/${group}/positions`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || "Failed to load positions");

        // remove hyphens to match election titles (e.g., "HOD IT" not "HOD – IT")
        const posList = json?.positions?.map((p) =>
          p.title.replace(/–/g, "-").replace(/-/g, " ")
        ) || [];
        setPositions(posList);
        setPosition(posList[0] || "");
      } catch (e) {
        setErr(e.message);
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };
    loadPositions();
  }, [group]);

  // 🔹 Load results whenever group or position changes
  useEffect(() => {
    const fetchResults = async () => {
      if (!position) return;
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(
          `${API}/api/results?role=${encodeURIComponent(group)}&position=${encodeURIComponent(position)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || "Failed to load results");
        const results = Array.isArray(json.results) ? json.results : [];
        setData({ published: !!json.published, results });
      } catch (e) {
        setErr(e.message);
        setData({ published: false, results: [] });
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [group, position]);

  const handleRefresh = async () => {
    if (!position) return;
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(
        `${API}/api/results?role=${encodeURIComponent(group)}&position=${encodeURIComponent(position)}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Failed to load results");
      setData({ published: !!json.published, results: json.results || [] });
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-pink-50 to-red-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-red-700 mb-4">Election Results</h1>

        <div className="flex gap-3 mb-4 flex-wrap">
          <select
            className="px-3 py-2 rounded-lg border"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="nonteaching">Non-Teaching</option>
          </select>

          <select
            className="px-3 py-2 rounded-lg border"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            {positions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-lg border border-red-600 text-red-600 hover:bg-red-50 transition"
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {loading && <div className="text-gray-600">Loading…</div>}
        {err && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 mb-4">
            {err}
          </div>
        )}

        {!loading && !err && (
          <>
            {/* 🔹 Only show this if not published AND results exist */}
            {!data.published && data.results.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 mb-4">
                Results not published yet.
              </div>
            )}

            {data.results.length === 0 ? (
              <div className="p-6 rounded-xl bg-white border border-pink-100 shadow text-gray-600">
                No votes yet for this position.
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {data.results.map((r) => (
                  <div
                    key={r._id || r.name}
                    className="p-4 rounded-xl bg-white border border-pink-100 shadow"
                  >
                    <div className="flex items-center gap-3">
                      {r.photo ? (
                        <img
                          src={r.photo}
                          alt={r.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-pink-100" />
                      )}
                      <div>
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-sm text-gray-600">
                          {r.department || ""}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm">
                      Votes: <span className="font-semibold">{r.votes ?? 0}</span>
                    </div>
                    {r.isWinner && (
                      <div className="mt-2 inline-block text-xs bg-green-100 text-green-800 rounded-full px-2 py-1">
                        Winner
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
