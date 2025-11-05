// models/Candidate.js
import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    // Who submitted (linked to User)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true },
    group: {
      type: String,
      enum: ["student", "teacher", "nonteaching"],
      required: true,
    },
    position: { type: String, required: true },
    department: { type: String },
    manifesto: { type: String, default: "" },
    photoUrl: { type: String, default: "" },

    // Moderation flags
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    disqualified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Unique guards to prevent duplicate candidates
candidateSchema.index(
  { user: 1, group: 1, position: 1 },
  { unique: true, sparse: true }
);

candidateSchema.index(
  { name: 1, group: 1, position: 1 },
  { unique: true, sparse: true }
);

export default mongoose.model("Candidate", candidateSchema);
