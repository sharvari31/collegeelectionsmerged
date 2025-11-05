// backend/server/controllers/candidate.controller.js
import Candidate from "../models/Candidate.js";

/**
 * Public (protected) voter list
 * GET /api/candidates?role=&position=
 */
export const listCandidates = async (req, res) => {
  try {
    const { role, position } = req.query;
    if (!role || !position) {
      return res.status(400).json({ message: "role and position are required" });
    }
    const filter = {
      group: role,
      position: { $regex: `^${position}$`, $options: "i" },
      status: "approved",
    };
    const docs = await Candidate.find(filter).sort({ disqualified: 1, name: 1 });
    const candidates = docs.map((c) => ({
      _id: c._id,
      name: c.name,
      department: c.department || "",
      photo: c.photoUrl || "",
      manifesto: c.manifesto || "",
      disqualified: !!c.disqualified,
      status: c.status || "pending",
      group: c.group,
      position: c.position,
    }));
    return res.json({ candidates });
  } catch (err) {
    console.error("listCandidates error:", err);
    res.status(500).json({ message: "Failed to load candidates" });
  }
};

/**
 * Admin/all list
 * GET /api/candidates/all?group=&position=
 */
export const listAllCandidates = async (req, res) => {
  try {
    const { group, position } = req.query;
    const filter = {};
    if (group) filter.group = group;
    if (position) filter.position = { $regex: `^${position}$`, $options: "i" };

    const docs = await Candidate.find(filter).sort({ group: 1, position: 1, name: 1 });
    const candidates = docs.map((c) => ({
      _id: c._id,
      name: c.name,
      group: c.group,
      position: c.position,
      department: c.department || "",
      photo: c.photoUrl || "",
      manifesto: c.manifesto || "",
      disqualified: !!c.disqualified,
      status: c.status || "pending",
      createdAt: c.createdAt,
    }));
    res.json({ candidates, count: candidates.length });
  } catch (err) {
    console.error("listAllCandidates error:", err);
    res.status(500).json({ message: "Failed to load candidates" });
  }
};

/**
 * Apply/update candidate (user)
 * POST /api/candidates/apply
 * - Uses new canonical field `user`
 * - Back-compat: reads any old docs saved with `userId`
 * - Surfaces friendly 409s for duplicate seat applications
 */
export const applyCandidate = async (req, res) => {
  try {
    const user = req.user?.id; // ✅ canonical
    const {
      name,
      group,
      position,
      department = "",
      manifesto = "",
      photoUrl = "",
    } = req.body || {};

    if (!name || !group || !position) {
      return res.status(400).json({ message: "name, group, position are required" });
    }

    // Find an existing application by this user for this seat (new or legacy)
    let doc = await Candidate.findOne({
      group,
      position,
      $or: [{ user }, { userId: user }], // back-compat read
    });

    if (!doc) {
      // Create using the new field name
      try {
        doc = await Candidate.create({
          user,                // ✅ canonical
          name: name.trim(),
          group,
          position,
          department,
          manifesto,
          photoUrl,
          status: "pending",
          disqualified: false,
        });
        return res.json({ message: "Application submitted", candidate: doc });
      } catch (err) {
        // Handle duplicate key errors from schema unique indexes
        if (err?.code === 11000) {
          return res.status(409).json({
            message:
              "Duplicate application detected: either you already applied for this seat, or a candidate with the same name already exists for this seat.",
          });
        }
        console.error("applyCandidate(create) error:", err);
        return res.status(500).json({ message: "Failed to submit application" });
      }
    }

    if (doc.status === "approved") {
      return res.status(409).json({ message: "Already approved for this position" });
    }

    // Update existing pending/rejected application
    doc.name = name.trim();
    doc.department = department;
    doc.manifesto = manifesto;
    doc.photoUrl = photoUrl;
    doc.status = "pending";

    // If the old doc was legacy-only (had userId but no user), set user now
    if (!doc.user) doc.user = user;

    try {
      await doc.save();
      return res.json({ message: "Application updated", candidate: doc });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({
          message:
            "Duplicate conflict while updating: this seat already has the same candidate, or you already have an application for this seat.",
        });
      }
      console.error("applyCandidate(save) error:", err);
      return res.status(500).json({ message: "Failed to submit application" });
    }
  } catch (err) {
    console.error("applyCandidate error:", err);
    return res.status(500).json({ message: "Failed to submit application" });
  }
};

/**
 * My applications
 * GET /api/candidates/mine
 * - Returns apps whether saved as {user} or legacy {userId}
 */
export const myApplications = async (req, res) => {
  try {
    const user = req.user?.id;
    const docs = await Candidate.find({
      $or: [{ user }, { userId: user }], // back-compat read
    }).sort({ createdAt: -1 });
    res.json({ applications: docs });
  } catch (err) {
    console.error("myApplications error:", err);
    res.status(500).json({ message: "Failed to load applications" });
  }
};

/**
 * Admin: approve/reject/disqualify
 */
export const approveCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Candidate.findById(id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    doc.status = "approved";
    await doc.save();
    res.json({ message: "Approved", candidate: doc });
  } catch (err) {
    console.error("approveCandidate error:", err);
    res.status(500).json({ message: "Failed to approve" });
  }
};

export const rejectCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Candidate.findById(id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    doc.status = "rejected";
    await doc.save();
    res.json({ message: "Rejected", candidate: doc });
  } catch (err) {
    console.error("rejectCandidate error:", err);
    res.status(500).json({ message: "Failed to reject" });
  }
};

export const toggleDisqualified = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Candidate.findById(id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    doc.disqualified = !doc.disqualified;
    await doc.save();
    res.json({ message: "Toggled", candidate: doc });
  } catch (err) {
    console.error("toggleDisqualified error:", err);
    res.status(500).json({ message: "Failed to toggle" });
  }
};

/**
 * Dev seed (optional)
 */
export const seedCandidates = async (req, res) => {
  try {
    const { role = "student", position = "Student Council President" } = req.body || {};
    const seed = [
      {
        name: "Anupama Shah",
        group: role,
        position,
        department: "student",
        photoUrl:
          "https://images.unsplash.com/photo-1607746882042-944635dfe10e?q=80&w=600&auto=format&fit=crop",
        manifesto: "I will improve engagement, events and transparency.",
        status: "approved",
        disqualified: false,
      },
      {
        name: "Vanraj Kapadia",
        group: role,
        position,
        department: "commerce",
        photoUrl:
          "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=600&auto=format&fit=crop",
        manifesto: "Budget discipline and fair opportunities.",
        status: "approved",
        disqualified: true,
      },
    ];
    let inserted = 0;
    for (const c of seed) {
      const r = await Candidate.updateOne(
        { group: c.group, position: c.position, name: c.name },
        { $setOnInsert: c },
        { upsert: true }
      );
      if (r.upsertedCount === 1) inserted += 1;
    }
    res.json({ message: "Seed done", inserted });
  } catch (err) {
    console.error("seedCandidates error:", err);
    res.status(500).json({ message: "Failed to seed candidates" });
  }
};
