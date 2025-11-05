import User, { USER_GROUPS, USER_ROLES } from "../models/User.js";
import { signToken } from "../utils/jwt.js";

const ADMIN_LIKE = new Set(["superadmin", "studentAdmin", "teacherAdmin", "nonTeachingAdmin"]);

/** Normalize/validate helpers */
const pickGroup = (raw) => {
  const g = (raw || "").toLowerCase();
  return USER_GROUPS.includes(g) ? g : "student";
};
const pickRole = (raw) => {
  if (!raw) return "student";
  const r = raw.trim();
  return USER_ROLES.includes(r) ? r : "student";
};
const isTenDigitId = (s) => /^\d{10}$/.test(String(s || "").trim());

/**
 * POST /api/auth/register
 * body: { name, email, password, group?, role?, memberId? }
 * - memberId (10 digits) required for non-admin roles
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, group, role, memberId } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password required" });
    }

    const normalizedRole = pickRole(role);
    const normalizedGroup = pickGroup(group);

    // For non-admin users, College ID is required and must be 10 digits
    if (!ADMIN_LIKE.has(normalizedRole)) {
      if (!isTenDigitId(memberId)) {
        return res.status(400).json({ message: "College ID must be exactly 10 digits" });
      }
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already registered" });

    // If memberId provided, ensure uniqueness
    if (memberId) {
      const idExists = await User.findOne({ memberId: String(memberId).trim() });
      if (idExists) return res.status(409).json({ message: "College ID already registered" });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      group: normalizedGroup,
      role: normalizedRole,
      memberId: memberId ? String(memberId).trim() : undefined,
    });

    const token = signToken({
      id: user._id,
      role: user.role,
      group: user.group,
      name: user.name,
      memberId: user.memberId || null,
    });

    return res.status(201).json({
      message: "Registered",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        group: user.group,
        memberId: user.memberId || null,
        department: user.department,
      },
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ message: "Registration failed" });
  }
};

/**
 * POST /api/auth/login
 * body: { email?, memberId?, password }
 * - If memberId is present (10 digits), login by id
 * - Else login by email
 */
export const login = async (req, res) => {
  try {
    const { email, memberId, password } = req.body || {};
    if (!password) {
      return res.status(400).json({ message: "password required" });
    }

    let user;
    if (isTenDigitId(memberId)) {
      user = await User.findOne({ memberId: String(memberId).trim() }).select("+password");
    } else if (email) {
      user = await User.findOne({ email: String(email).toLowerCase().trim() }).select("+password");
    } else {
      return res.status(400).json({ message: "Provide email or 10-digit College ID" });
    }

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken({
      id: user._id,
      role: user.role,
      group: user.group,
      name: user.name,
      memberId: user.memberId || null,
    });

    return res.json({
      message: "Logged in",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        group: user.group,
        memberId: user.memberId || null,
        department: user.department,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
};

/**
 * GET /api/auth/me
 */
export const me = async (req, res) => {
  try {
    const u = await User.findById(req.user.id).lean();
    if (!u) return res.status(404).json({ message: "User not found" });
    return res.json({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      group: u.group,
      memberId: u.memberId || null,
      department: u.department,
      createdAt: u.createdAt,
    });
  } catch (err) {
    console.error("me error:", err);
    return res.status(500).json({ message: "Failed to load profile" });
  }
};
