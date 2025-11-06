import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "";

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [manifesto, setManifesto] = useState(null); // {name, text}
  // Canonical vote shape: { _id, user, role, position, candidate }
  const [myVote, setMyVote] = useState(null);
  const [voting, setVoting] = useState(false);

  const token = localStorage.getItem("token");
  const location = useLocation();
  const navigate = useNavigate();

  // read role & position from query string
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const role = params.get("role") || "student";
  const position = params.get("position") || "";

  // guard: must be logged in
  useEffect(() => {
    if (!token) {
      const next = `/candidates?role=${encodeURIComponent(role)}&position=${encodeURIComponent(position)}`;
      navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role, position]);

  // normalize a vote doc from API (handles legacy userId/candidateId)
  const normalizeVote = (v) => {
    if (!v) return null;
    return {
      _id: v._id,
      user: v.user || v.userId || null,
      role: v.role,
      position: v.position,
      candidate: v.candidate || v.candidateId || null,
    };
  };

  // load: candidates + my vote
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErr("");

        // fetch candidates (approved + visible even if disqualified)
        const candRes = await fetch(
          `${API}/api/candidates?role=${encodeURIComponent(role)}&position=${encodeURIComponent(position)}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          }
        );
        const candData = await candRes.json().catch(() => ({}));
        if (!candRes.ok) throw new Error(candData.message || `Failed to load candidates (${candRes.status})`);
        setCandidates(candData.candidates || []);

        // fetch my vote (to disable buttons)
        const voteRes = await fetch(
          `${API}/api/votes/my?role=${encodeURIComponent(role)}&position=${encodeURIComponent(position)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }
        );
        const voteData = await voteRes.json().catch(() => ({}));
        if (voteRes.ok) setMyVote(normalizeVote(voteData.vote));
        else setMyVote(null);
      } catch (e) {
        setErr(e.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, position, token]);

  const handleVote = async (candidateId) => {
    try {
      setVoting(true);
      setErr("");

      // Send canonical "candidate" (backend still accepts candidateId, but we prefer candidate)
      const res = await fetch(`${API}/api/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ role, position, candidate: candidateId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Vote failed (${res.status})`);

      // mark as voted (normalize the returned vote)
      setMyVote(normalizeVote(data?.vote) || { candidate: candidateId, role, position });
      alert("Vote recorded ✅");
    } catch (e) {
      alert(e.message || "Failed to vote");
    } finally {
      setVoting(false);
    }
  };

  const alreadyVotedId = myVote?.candidate || null; // canonical
  const hasVoted = !!myVote;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-pink-50 to-red-50 py-10 px-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-pink-100">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-red-700">
              Candidates • {position || "Position"}
            </h1>
            <p className="text-gray-600">
              Election group: <span className="font-medium capitalize">{role}</span>
            </p>
            {hasVoted && (
              <div className="mt-2 inline-flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full text-sm">
                <span>✅ You’ve voted for this position</span>
              </div>
            )}
          </div>
          <Link
            to={`/e/${role}`}
            className="px-4 py-2 rounded-lg bg-white border border-red-600 text-red-600 hover:bg-red-50 transition"
          >
            ← Back to Portal
          </Link>
        </div>

        {loading && (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-60 rounded-xl bg-pink-50 border border-pink-100 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && err && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {err}
          </div>
        )}

        {!loading && !err && (
          <div className="grid md:grid-cols-3 gap-6">
            {candidates.map((c) => {
              const isChosen = alreadyVotedId && alreadyVotedId === c._id;
              return (
                <div
                  key={c._id}
                  className={`rounded-xl border border-pink-100 bg-white shadow hover:shadow-md transition overflow-hidden ${
                    c.disqualified ? "opacity-70" : ""
                  }`}
                >
                  {c.photo && (
                    <img
                      src={c.photo}
                      alt={c.name}
                      className="h-40 w-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{c.name}</h3>
                        <p className="text-sm text-gray-600">{c.department || ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.disqualified && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                            Disqualified
                          </span>
                        )}
                        {isChosen && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Your Vote
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-gray-700">
                      {c.manifesto || "Manifesto not provided."}
                    </p>

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => setManifesto({ name: c.name, text: c.manifesto })}
                        className="px-3 py-2 rounded-lg border border-red-600 text-red-600 hover:bg-red-50 transition"
                      >
                        View Manifesto
                      </button>
                      <button
                        disabled={!!c.disqualified || hasVoted || voting}
                        onClick={() => handleVote(c._id)}
                        className={`px-3 py-2 rounded-lg text-white transition ${
                          c.disqualified || hasVoted || voting
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {hasVoted ? (isChosen ? "Voted" : "Vote Disabled") : voting ? "Voting..." : "Vote"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {candidates.length === 0 && (
              <div className="col-span-full p-6 rounded-xl bg-pink-50 border border-pink-100 text-gray-700">
                No candidates found for this position yet.
              </div>
            )}
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
