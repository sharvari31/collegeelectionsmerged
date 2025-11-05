import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const USER_ROLES = [
  // platform-wide owner
  "superadmin",

  // council-specific admins
  "studentAdmin",
  "teacherAdmin",
  "nonTeachingAdmin",

  // participants
  "candidate",
  "voter",

  // legacy roles kept for backward compatibility
  "student",
  "teacher",
  "nonteaching",
];

export const USER_GROUPS = ["student", "teacher", "nonteaching"];

// roles that DO NOT require a college id
const ADMIN_LIKE = new Set(["superadmin", "studentAdmin", "teacherAdmin", "nonTeachingAdmin"]);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // NEW: 10-digit College ID (required for non-admin users)
    memberId: {
      type: String,
      trim: true,
      // required for non-admins only
      required: function () {
        return !ADMIN_LIKE.has(this.role || "student");
      },
      match: [/^\d{10}$/, "College ID must be exactly 10 digits"],
      unique: false, // we set index below to avoid migration explosions; see index notes
      sparse: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    /**
     * role
     */
    role: {
      type: String,
      enum: USER_ROLES,
      default: "student",
      index: true,
    },

    /**
     * group identifies which council a user belongs to
     */
    group: {
      type: String,
      enum: USER_GROUPS,
      default: "student",
    },

    department: { type: String, default: "" },
  },
  { timestamps: true }
);

// hash password if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// convenience compare method
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Indexes
// Keep email unique
userSchema.index({ email: 1 }, { unique: true });
// Make memberId unique where present (sparse allows old docs without memberId)
userSchema.index({ memberId: 1 }, { unique: true, sparse: true });

export default mongoose.model("User", userSchema);
