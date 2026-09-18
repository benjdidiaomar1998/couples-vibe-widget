import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { CoupleData, PairingCodeInfo } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory data store for the live server
interface UserRecord {
  uid: string;
  displayName: string;
  avatarBg: string;
  coupleId?: string;
  createdAt: number;
}

const users: Map<string, UserRecord> = new Map();
const couples: Map<string, CoupleData> = new Map();
const pairingCodes: Map<string, PairingCodeInfo> = new Map();

// Seed initial default couple for quick instant testing
const DEFAULT_COUPLE_ID = "couple_demo_love";
const USER_A_ID = "user_alex_a";
const USER_B_ID = "user_jordan_b";

users.set(USER_A_ID, {
  uid: USER_A_ID,
  displayName: "Alex",
  avatarBg: "#F43F5E",
  coupleId: DEFAULT_COUPLE_ID,
  createdAt: Date.now() - 86400000 * 7,
});

users.set(USER_B_ID, {
  uid: USER_B_ID,
  displayName: "Jordan",
  avatarBg: "#8B5CF6",
  coupleId: DEFAULT_COUPLE_ID,
  createdAt: Date.now() - 86400000 * 7,
});

couples.set(DEFAULT_COUPLE_ID, {
  id: DEFAULT_COUPLE_ID,
  members: {
    [USER_A_ID]: true,
    [USER_B_ID]: true,
  },
  membersData: {
    [USER_A_ID]: {
      uid: USER_A_ID,
      displayName: "Alex",
      avatarBg: "#F43F5E",
    },
    [USER_B_ID]: {
      uid: USER_B_ID,
      displayName: "Jordan",
      avatarBg: "#8B5CF6",
    },
  },
  currentVibes: {
    [USER_A_ID]: {
      vibes: ["excited", "loved"],
      updatedAt: Date.now() - 1000 * 60 * 5,
    },
    [USER_B_ID]: {
      vibes: ["happy", "sleepy"],
      updatedAt: Date.now() - 1000 * 60 * 12,
    },
  },
  vibeHistory: [
    {
      id: "hist_1",
      senderId: USER_B_ID,
      senderName: "Jordan",
      vibes: ["happy", "sleepy"],
      timestamp: Date.now() - 1000 * 60 * 12,
    },
    {
      id: "hist_2",
      senderId: USER_A_ID,
      senderName: "Alex",
      vibes: ["excited", "loved"],
      timestamp: Date.now() - 1000 * 60 * 5,
    },
  ],
  createdAt: Date.now() - 86400000 * 7,
});

// Clean up expired pairing codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, info] of pairingCodes.entries()) {
    if (info.expiresAt < now) {
      pairingCodes.delete(code);
    }
  }
}, 60000);

// Helper to generate format "7K4P-92"
function generateCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let part1 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let part2 = "";
  for (let i = 0; i < 2; i++) {
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${part1}-${part2}`;
}

// ----------------- API ROUTES ----------------- //

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Authenticate / session
app.post("/api/auth/session", (req, res) => {
  const { uid, displayName, avatarBg } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "Missing uid" });
  }

  let user = users.get(uid);
  if (!user) {
    user = {
      uid,
      displayName: displayName || "My Vibe",
      avatarBg: avatarBg || "#F43F5E",
      createdAt: Date.now(),
    };
    users.set(uid, user);
  } else if (displayName) {
    user.displayName = displayName;
    if (avatarBg) user.avatarBg = avatarBg;
  }

  let couple: CoupleData | null = null;
  if (user.coupleId) {
    couple = couples.get(user.coupleId) || null;
  }

  res.json({ user, couple });
});

// Generate pairing code
app.post("/api/pairing/generate", (req, res) => {
  const { uid } = req.body;
  const user = users.get(uid);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  let code = generateCode();
  while (pairingCodes.has(code)) {
    code = generateCode();
  }

  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const pairingInfo: PairingCodeInfo = {
    code,
    creatorId: uid,
    creatorName: user.displayName,
    expiresAt,
    used: false,
  };

  pairingCodes.set(code, pairingInfo);
  res.json({ code, expiresAt });
});

// Connect pairing code
app.post("/api/pairing/connect", (req, res) => {
  const { uid, code } = req.body;
  const user = users.get(uid);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Pairing code is required" });
  }

  // Format lookup: normalize dashes & uppercase
  const cleanCode = code.trim().toUpperCase();
  let matchedCode: string | null = null;
  let info: PairingCodeInfo | undefined;

  for (const [existingCode, val] of pairingCodes.entries()) {
    if (
      existingCode === cleanCode ||
      existingCode.replace("-", "") === cleanCode.replace("-", "")
    ) {
      matchedCode = existingCode;
      info = val;
      break;
    }
  }

  if (!matchedCode || !info) {
    return res.status(404).json({ error: "We couldn't find that pairing code." });
  }

  if (info.expiresAt < Date.now()) {
    pairingCodes.delete(matchedCode);
    return res.status(410).json({ error: "This pairing code has expired." });
  }

  if (info.used) {
    return res.status(400).json({ error: "This pairing code was already used." });
  }

  if (info.creatorId === uid) {
    return res.status(400).json({ error: "You cannot connect with your own pairing code!" });
  }

  const partner = users.get(info.creatorId);
  if (!partner) {
    return res.status(404).json({ error: "Partner account not found" });
  }

  // Create new couple relationship
  const newCoupleId = `couple_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newCouple: CoupleData = {
    id: newCoupleId,
    members: {
      [partner.uid]: true,
      [user.uid]: true,
    },
    membersData: {
      [partner.uid]: {
        uid: partner.uid,
        displayName: partner.displayName,
        avatarBg: partner.avatarBg,
      },
      [user.uid]: {
        uid: user.uid,
        displayName: user.displayName,
        avatarBg: user.avatarBg,
      },
    },
    currentVibes: {
      [partner.uid]: { vibes: ["loved"], updatedAt: Date.now() },
      [user.uid]: { vibes: ["happy"], updatedAt: Date.now() },
    },
    vibeHistory: [
      {
        id: `event_${Date.now()}`,
        senderId: partner.uid,
        senderName: partner.displayName,
        vibes: ["loved"],
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now(),
  };

  couples.set(newCoupleId, newCouple);
  partner.coupleId = newCoupleId;
  user.coupleId = newCoupleId;

  // Invalidate pairing code
  info.used = true;
  pairingCodes.delete(matchedCode);

  res.json({
    success: true,
    couple: newCouple,
    partner: {
      uid: partner.uid,
      displayName: partner.displayName,
      avatarBg: partner.avatarBg,
    },
  });
});

// Get couple state
app.get("/api/couples/:coupleId", (req, res) => {
  const couple = couples.get(req.params.coupleId);
  if (!couple) {
    return res.status(404).json({ error: "Couple not found" });
  }
  res.json({ couple });
});

// Update vibes
app.post("/api/couples/:coupleId/vibes", (req, res) => {
  const { coupleId } = req.params;
  const { uid, vibes } = req.body;

  const couple = couples.get(coupleId);
  if (!couple) {
    return res.status(404).json({ error: "Couple not found" });
  }

  if (!couple.members[uid]) {
    return res.status(403).json({ error: "You are not a member of this couple" });
  }

  const vibeList = Array.isArray(vibes) ? vibes : [];
  const now = Date.now();

  couple.currentVibes[uid] = {
    vibes: vibeList,
    updatedAt: now,
  };

  const user = users.get(uid);
  const senderName = user?.displayName || "Partner";

  if (vibeList.length > 0) {
    couple.vibeHistory.unshift({
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: uid,
      senderName,
      vibes: vibeList,
      timestamp: now,
    });

    // Retain only latest 20 events
    if (couple.vibeHistory.length > 20) {
      couple.vibeHistory = couple.vibeHistory.slice(0, 20);
    }
  }

  res.json({
    success: true,
    currentVibes: couple.currentVibes,
    vibeHistory: couple.vibeHistory,
  });
});

// Unpair
app.post("/api/couples/:coupleId/unpair", (req, res) => {
  const { coupleId } = req.params;
  const { uid } = req.body;

  const couple = couples.get(coupleId);
  if (couple && couple.members[uid]) {
    for (const memberId of Object.keys(couple.members)) {
      const u = users.get(memberId);
      if (u) delete u.coupleId;
    }
    couples.delete(coupleId);
  }

  res.json({ success: true });
});

// Reset to default demo couple
app.post("/api/demo/reset", (_req, res) => {
  const demoCouple: CoupleData = {
    id: DEFAULT_COUPLE_ID,
    members: { [USER_A_ID]: true, [USER_B_ID]: true },
    membersData: {
      [USER_A_ID]: { uid: USER_A_ID, displayName: "Alex", avatarBg: "#F43F5E" },
      [USER_B_ID]: { uid: USER_B_ID, displayName: "Jordan", avatarBg: "#8B5CF6" },
    },
    currentVibes: {
      [USER_A_ID]: { vibes: ["excited", "loved"], updatedAt: Date.now() },
      [USER_B_ID]: { vibes: ["happy", "sleepy"], updatedAt: Date.now() - 300000 },
    },
    vibeHistory: [
      {
        id: "hist_demo_1",
        senderId: USER_B_ID,
        senderName: "Jordan",
        vibes: ["happy", "sleepy"],
        timestamp: Date.now() - 300000,
      },
      {
        id: "hist_demo_2",
        senderId: USER_A_ID,
        senderName: "Alex",
        vibes: ["excited", "loved"],
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now() - 86400000 * 7,
  };

  couples.set(DEFAULT_COUPLE_ID, demoCouple);

  res.json({ success: true, couple: demoCouple });
});

// ----------------- VITE / STATIC INTEGRATION ----------------- //

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Couples Vibe Server running on port ${PORT}`);
  });
}

startServer();
