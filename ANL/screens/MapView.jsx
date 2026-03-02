import { useState, useEffect } from "react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1,  name: "Mia",   age: 24, gender: "f",  distance: 0.3, x: 52, y: 44, online: true,  vibe: "Tonight only 🔥",    match: 94, isNew: false, isTop: false },
  { id: 2,  name: "Jade",  age: 27, gender: "f",  distance: 0.8, x: 40, y: 56, online: true,  vibe: "Down for anything",   match: 88, isNew: false, isTop: false },
  { id: 3,  name: "Reese", age: 22, gender: "f",  distance: 1.2, x: 65, y: 35, online: true,  vibe: "Spontaneous",         match: 76, isNew: true,  isTop: false },
  { id: 4,  name: "Sasha", age: 29, gender: "f",  distance: 1.9, x: 28, y: 72, online: false, vibe: "Late night vibes",    match: 81, isNew: false, isTop: false },
  { id: 5,  name: "Nova",  age: 25, gender: "f",  distance: 2.4, x: 74, y: 62, online: true,  vibe: "No strings 😈",      match: 91, isNew: false, isTop: false },
  { id: 6,  name: "Dre",   age: 26, gender: "m",  distance: 0.5, x: 43, y: 38, online: true,  vibe: "What's good 👊",     match: 89, isNew: false, isTop: true  },
  { id: 7,  name: "Kai",   age: 23, gender: "m",  distance: 1.1, x: 41, y: 60, online: true,  vibe: "Free tonight",        match: 72, isNew: true,  isTop: false },
  { id: 8,  name: "Elle",  age: 26, gender: "f",  distance: 0.6, x: 58, y: 28, online: true,  vibe: "Just got out 👀",    match: 85, isNew: false, isTop: false },
  { id: 9,  name: "Zara",  age: 31, gender: "f",  distance: 4.2, x: 20, y: 40, online: false, vibe: "Adventurous",         match: 68, isNew: false, isTop: false },
  { id: 10, name: "Max",   age: 28, gender: "m",  distance: 1.8, x: 62, y: 68, online: true,  vibe: "Let's link",          match: 92, isNew: false, isTop: false },
  { id: 11, name: "Jace",  age: 24, gender: "m",  distance: 3.0, x: 22, y: 58, online: false, vibe: "Lowkey vibes",        match: 74, isNew: false, isTop: false },
  { id: 12, name: "Cole",  age: 30, gender: "m",  distance: 2.1, x: 78, y: 42, online: true,  vibe: "Night's still young", match: 83, isNew: true,  isTop: false },
  { id: 13, name: "Luna",  age: 25, gender: "tw", distance: 0.7, x: 55, y: 60, online: true,  vibe: "Good energy only ✨",  match: 93, isNew: false, isTop: false },
  { id: 14, name: "Aria",  age: 28, gender: "tw", distance: 1.4, x: 34, y: 30, online: true,  vibe: "Late night magic 🦋",  match: 79, isNew: true,  isTop: false },
  { id: 15, name: "Sera",  age: 23, gender: "tw", distance: 2.8, x: 68, y: 22, online: false, vibe: "Dream girl energy",    match: 85, isNew: false, isTop: true  },
  { id: 16, name: "Iris",  age: 30, gender: "tw", distance: 1.9, x: 18, y: 64, online: true,  vibe: "Come find me 🌙",     match: 71, isNew: false, isTop: false },
];

const EVENTS = [
  { id: 1, name: "Late Night Rooftop", x: 60, y: 50, type: "party", count: 34 },
  { id: 2, name: "Bar Night",          x: 35, y: 45, type: "bar",   count: 18 },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const CLUSTER_THRESHOLD = 9;

const BUTT_SHAPES = [
  "M4,20 C4,8 20,0 28,0 C36,0 52,8 52,20 C52,32 44,44 28,52 C12,44 4,32 4,20Z",
  "M2,22 C2,9 18,0 28,0 C38,0 54,9 54,22 C54,35 45,46 28,54 C11,46 2,35 2,22Z",
  "M6,18 C6,7 20,0 28,0 C36,0 50,7 50,18 C50,30 43,43 28,50 C13,43 6,30 6,18Z",
  "M3,21 C3,8 19,0 28,0 C37,0 53,8 53,21 C53,34 44,45 28,53 C12,45 3,34 3,21Z",
  "M5,19 C5,7 19,0 28,0 C37,0 51,7 51,19 C51,31 43,44 28,51 C13,44 5,31 5,19Z",
  "M2,24 C2,10 17,0 28,0 C39,0 54,10 54,24 C54,37 45,47 28,56 C11,47 2,37 2,24Z",
];

// ─── Trans Women SVG Paths ────────────────────────────────────────────────────
const BUTTERFLY_L   = "M28,28 C28,28 10,18 6,8 C4,2 10,0 14,4 C18,8 22,18 28,28Z";
const BUTTERFLY_R   = "M28,28 C28,28 46,18 50,8 C52,2 46,0 42,4 C38,8 34,18 28,28Z";
const BUTTERFLY_LB  = "M28,28 C28,28 8,32 4,42 C2,50 8,52 14,48 C20,44 24,36 28,28Z";
const BUTTERFLY_RB  = "M28,28 C28,28 48,32 52,42 C54,50 48,52 42,48 C36,44 32,36 28,28Z";
const BUTTERFLY_BODY= "M28,10 C26,10 24,14 24,20 L24,36 C24,42 26,46 28,46 C30,46 32,42 32,36 L32,20 C32,14 30,10 28,10Z";
const STAR_PATH     = "M28,2 L33,20 L52,20 L37,31 L42,50 L28,39 L14,50 L19,31 L4,20 L23,20 Z";
const PHOENIX_PATH  = "M28,54 C20,46 8,36 8,24 C8,14 16,6 24,8 C26,8 28,10 28,10 C28,10 30,8 32,8 C40,6 48,14 48,24 C48,36 36,46 28,54Z";
const PHOENIX_WINGS = "M8,24 C4,18 2,10 8,8 C14,6 20,12 28,10 M48,24 C52,18 54,10 48,8 C42,6 36,12 28,10";
const CRESCENT_PATH = "M28,2 C16,2 6,12 6,28 C6,44 16,54 28,54 C20,54 14,44 14,28 C14,12 20,2 28,2Z";
const HOURGLASS_PATH= "M10,4 L46,4 L36,28 L46,52 L10,52 L20,28 Z";
const LOTUS_C       = "M28,48 C22,40 14,30 14,22 C14,14 20,10 28,10 C36,10 42,14 42,22 C42,30 34,40 28,48Z";
const LOTUS_L       = "M14,22 C10,16 6,8 10,4 C14,0 20,6 22,14";
const LOTUS_R       = "M42,22 C46,16 50,8 46,4 C42,0 36,6 34,14";
const VENUS_CIRCLE  = 18; // radius used in circle element

const TW = {
  pink:  "#f7a8c4",
  blue:  "#55cdfc",
  white: "#ffffff",
  accent:"#ff6eb4",
  glow:  "rgba(247,168,196,0.5)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const femaleMatchColor = (pct) => pct >= 90 ? "#ff4466" : pct >= 75 ? "#ffa032" : "#ffcc44";
const maleMatchColor   = (pct) => pct >= 90 ? "#4488ff" : pct >= 75 ? "#44aaff" : "#88ccff";
const twMatchColor     = (pct) => pct >= 90 ? TW.accent : pct >= 75 ? TW.pink   : TW.blue;

const getFemalePin = (user, isSelected) => {
  if (isSelected)                      return "f_heartdrop";
  if (user.match >= 90 && user.online) return "f_matchcolor";
  if (user.isNew)                      return "f_cartoon";
  return "f_classic";
};

const getMalePin = (user, isSelected) => {
  if (isSelected)                      return "m_eggplantdrop";
  if (user.match >= 90 && user.online) return "m_chest";
  if (user.isNew)                      return "m_skull";
  if (user.isTop)                      return "m_flex";
  if (!user.online)                    return "m_shield";
  return "m_eggplant";
};

const getTransWomenPin = (user, isSelected) => {
  if (isSelected)                      return "tw_flagdrop";
  if (user.match >= 90 && user.online) return "tw_butterfly";
  if (user.isNew)                      return "tw_lotus";
  if (user.isTop)                      return "tw_phoenix";
  if (!user.online)                    return "tw_crescent";
  return "tw_star";
};

const getPinType = (user, isSelected) => {
  if (user.gender === "f")  return getFemalePin(user, isSelected);
  if (user.gender === "m")  return getMalePin(user, isSelected);
  if (user.gender === "tw") return getTransWomenPin(user, isSelected);
  return "f_classic";
};

const getPulseColor = (user) => {
  if (user.gender === "tw") return user.match >= 90 ? TW.accent : TW.pink;
  if (user.gender === "m")  return user.match >= 90 ? "#4488ff" : "rgba(136,68,255,0.4)";
  return user.match >= 90 ? "#ff4466" : "rgba(255,160,50,0.5)";
};

const getSelectedGlow = (user) => {
  if (user.gender === "tw") return "drop-shadow(0 0 12px rgba(247,168,196,0.9))";
  if (user.gender === "m")  return "drop-shadow(0 0 10px rgba(136,68,255,0.8))";
  return "drop-shadow(0 0 10px rgba(255,60,100,0.8))";
};

const getPanelAccent = (user) => {
  if (user.gender === "tw") return TW.pink;
  if (user.gender === "m")  return "#8844ff";
  return "#ff3c64";
};

const buildClusters = (users) => {
  const visited = new Set();
  const clusters = [];
  users.forEach((u) => {
    if (visited.has(u.id)) return;
    const group = users.filter((v) => Math.hypot(u.x - v.x, u.y - v.y) < CLUSTER_THRESHOLD);
    if (group.length >= 3) {
      group.forEach((v) => visited.add(v.id));
      clusters.push({
        id: `cluster-${u.id}`,
        x: group.reduce((s, v) => s + v.x, 0) / group.length,
        y: group.reduce((s, v) => s + v.y, 0) / group.length,
        count: group.length,
        users: group,
      });
    }
  });
  const clusteredIds = new Set(clusters.flatMap((c) => c.users.map((u) => u.id)));
  return { clusters, clusteredIds };
};

// ─── Shared ───────────────────────────────────────────────────────────────────
const Crack = ({ clipId, color = "rgba(255,255,255,0.08)" }) => (
  <line x1="28" y1="3" x2="28" y2="30" stroke={color} strokeWidth="1.6" strokeLinecap="round" clipPath={`url(#${clipId})`}/>
);

const Initial = ({ user, x = 28, y = 26, fill = "#fff", fontSize = 13 }) => (
  user.photoUrl
    ? <image href={user.photoUrl} x="0" y="0" width="56" height="56" preserveAspectRatio="xMidYMid slice"/>
    : <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fontFamily="'Bebas Neue', sans-serif" letterSpacing="1" fill={fill} style={{ userSelect: "none" }}>
        {user.name[0]}
      </text>
);

const OnlineDot = ({ cx = 44, cy = 44 }) => (
  <circle cx={cx} cy={cy} r="5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>
);

// ─── Female Pins ──────────────────────────────────────────────────────────────
const F_Classic = ({ user }) => {
  const path = BUTT_SHAPES[user.id % BUTT_SHAPES.length];
  const cid = `fc-${user.id}`;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
      <defs><clipPath id={cid}><path d={path}/></clipPath></defs>
      <path d={path} fill="#1e1e1e" stroke="rgba(255,160,50,0.5)" strokeWidth="1.8"/>
      <Initial user={user} y={24}/>
      <Crack clipId={cid}/>
      {user.online && <OnlineDot/>}
    </svg>
  );
};

const F_HeartDrop = ({ user }) => {
  const H = "M28,46 C28,46 6,32 6,18 C6,9 13,4 20,4 C24,4 28,7 28,7 C28,7 32,4 36,4 C43,4 50,9 50,18 C50,32 28,46 28,46Z";
  const cid = `fhd-${user.id}`;
  return (
    <svg width="56" height="66" viewBox="0 0 56 66" style={{ overflow:"visible", display:"block" }}>
      <defs><clipPath id={cid}><path d={H}/></clipPath></defs>
      <path d={H} fill="rgba(255,60,100,0.2)" transform="scale(1.08) translate(-2,-1)"/>
      <path d={H} fill="#ff3c64" stroke="#ff6080" strokeWidth="1.5"/>
      <Initial user={user} y={24} fill="#fff"/>
      <Crack clipId={cid} color="rgba(0,0,0,0.25)"/>
      <path d="M24,46 L28,62 L32,46Z" fill="#ff3c64" stroke="#ff6080" strokeWidth="1" strokeLinejoin="round"/>
      <rect x="15" y="30" width="26" height="12" rx="6" fill="rgba(0,0,0,0.5)"/>
      <text x="28" y="36" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#fff">{user.match}%</text>
    </svg>
  );
};

const F_MatchColor = ({ user }) => {
  const path = BUTT_SHAPES[user.id % BUTT_SHAPES.length];
  const col = femaleMatchColor(user.match);
  const cid = `fmc-${user.id}`;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
      <defs>
        <clipPath id={cid}><path d={path}/></clipPath>
        <radialGradient id={`fmg-${user.id}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={col} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={col} stopOpacity="0.4"/>
        </radialGradient>
      </defs>
      <path d={path} fill="#1a1a1a" stroke={col} strokeWidth="2"/>
      <path d={path} fill={`url(#fmg-${user.id})`} opacity="0.35"/>
      <Initial user={user} y={22}/>
      <Crack clipId={cid} color="rgba(0,0,0,0.2)"/>
      <rect x="15" y="34" width="26" height="12" rx="6" fill={col}/>
      <text x="28" y="40" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#000">{user.match}%</text>
      {user.online && <OnlineDot/>}
    </svg>
  );
};

const F_Cartoon = ({ user }) => {
  const path = BUTT_SHAPES[user.id % BUTT_SHAPES.length];
  const cid = `fct-${user.id}`;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
      <defs><clipPath id={cid}><path d={path}/></clipPath></defs>
      <path d={path} fill="#1a1a1a" stroke="#fff" strokeWidth="3.5" strokeLinejoin="round"/>
      <Initial user={user} y={22}/>
      <Crack clipId={cid} color="rgba(255,255,255,0.15)"/>
      <rect x="12" y="34" width="30" height="12" rx="6" fill="#ffdc32"/>
      <text x="27" y="40" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#000">NEW</text>
      {user.online && <OnlineDot/>}
    </svg>
  );
};

// ─── Male Pins ────────────────────────────────────────────────────────────────
const EGGPLANT_PATH = "M28,54 C16,54 8,44 8,32 C8,18 14,6 22,3 C24,2 26,2 28,2 C30,2 32,2 34,3 C42,6 48,18 48,32 C48,44 40,54 28,54Z";
const EGGPLANT_LEAF = "M28,2 C28,2 22,-4 16,-2 C18,3 24,3 28,2Z M28,2 C28,2 34,-4 40,-2 C38,3 32,3 28,2Z";
const CHEST_PATH    = "M4,28 C4,16 10,6 18,4 C22,3 26,8 28,8 C30,8 34,3 38,4 C46,6 52,16 52,28 C52,40 42,52 28,52 C14,52 4,40 4,28Z";
const SHIELD_PATH   = "M28,2 L50,12 L50,32 C50,44 40,52 28,56 C16,52 6,44 6,32 L6,12 Z";
const FLEX_PATH     = "M10,48 C10,40 8,30 10,22 C12,14 18,8 24,8 C28,8 30,12 32,14 C36,10 42,8 46,12 C50,16 50,24 46,28 C48,32 48,40 46,48 C38,52 18,52 10,48Z";
const SKULL_PATH    = "M28,2 C14,2 6,12 6,24 C6,34 12,40 18,42 L18,50 L38,50 L38,42 C44,40 50,34 50,24 C50,12 42,2 28,2Z";

const M_Eggplant = ({ user }) => (
  <svg width="56" height="60" viewBox="0 0 56 60" style={{ overflow:"visible", display:"block" }}>
    <path d={EGGPLANT_LEAF} fill="#44aa44"/>
    <line x1="28" y1="2" x2="28" y2="6" stroke="#44aa44" strokeWidth="2" strokeLinecap="round"/>
    <path d={EGGPLANT_PATH} fill="#1e1e1e" stroke="rgba(136,68,255,0.6)" strokeWidth="1.8"/>
    <ellipse cx="20" cy="18" rx="4" ry="7" fill="rgba(255,255,255,0.07)" transform="rotate(-20,20,18)"/>
    <Initial user={user} y={32}/>
    {user.online && <OnlineDot cy={50}/>}
  </svg>
);

const M_EggplantDrop = ({ user }) => (
  <svg width="56" height="74" viewBox="0 0 56 74" style={{ overflow:"visible", display:"block" }}>
    <path d={EGGPLANT_LEAF} fill="#44aa44"/>
    <line x1="28" y1="2" x2="28" y2="6" stroke="#44aa44" strokeWidth="2" strokeLinecap="round"/>
    <path d={EGGPLANT_PATH} fill="#8844ff" stroke="#aa66ff" strokeWidth="1.8"/>
    <ellipse cx="20" cy="18" rx="4" ry="7" fill="rgba(255,255,255,0.1)" transform="rotate(-20,20,18)"/>
    <Initial user={user} fill="#fff" y={32}/>
    <path d="M22,54 L28,72 L34,54Z" fill="#8844ff" stroke="#aa66ff" strokeWidth="1" strokeLinejoin="round"/>
    <rect x="14" y="36" width="28" height="12" rx="6" fill="rgba(0,0,0,0.5)"/>
    <text x="28" y="42" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#fff">{user.match}%</text>
  </svg>
);

const M_Chest = ({ user }) => {
  const col = maleMatchColor(user.match);
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
      <defs>
        <radialGradient id={`mcg-${user.id}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={col} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={col} stopOpacity="0.4"/>
        </radialGradient>
      </defs>
      <path d={CHEST_PATH} fill="#1a1a1a" stroke={col} strokeWidth="2"/>
      <path d={CHEST_PATH} fill={`url(#mcg-${user.id})`} opacity="0.3"/>
      <path d="M20,10 C22,18 26,22 28,22 C30,22 34,18 36,10" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeLinecap="round"/>
      <Initial user={user} y={34}/>
      <rect x="15" y="36" width="26" height="12" rx="6" fill={col}/>
      <text x="28" y="42" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#000">{user.match}%</text>
      {user.online && <OnlineDot/>}
    </svg>
  );
};

const M_Shield = ({ user }) => (
  <svg width="56" height="60" viewBox="0 0 56 60" style={{ overflow:"visible", display:"block" }}>
    <path d={SHIELD_PATH} fill="#141414" stroke="rgba(255,255,255,0.1)" strokeWidth="1.8" strokeLinejoin="round"/>
    <Initial user={user} y={30} fill="rgba(255,255,255,0.4)"/>
    <rect x="16" y="38" width="24" height="10" rx="5" fill="rgba(255,255,255,0.06)"/>
    <text x="28" y="43" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontFamily="'DM Sans',sans-serif" fontWeight="700" fill="rgba(255,255,255,0.3)">AWAY</text>
  </svg>
);

const M_Flex = ({ user }) => (
  <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
    <path d={FLEX_PATH} fill="#1e1e1e" stroke="rgba(255,136,68,0.6)" strokeWidth="2" strokeLinejoin="round"/>
    <Initial user={user} y={30}/>
    <rect x="12" y="34" width="32" height="12" rx="6" fill="#ff8844"/>
    <text x="28" y="40" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#000">TOP 🔥</text>
    {user.online && <OnlineDot/>}
  </svg>
);

const M_Skull = ({ user }) => {
  const cid = `msk-${user.id}`;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
      <defs><clipPath id={cid}><path d={SKULL_PATH}/></clipPath></defs>
      <path d={SKULL_PATH} fill="#1a1a1a" stroke="#fff" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M20,22 A4,4 0 1,1 19.9,22Z M36,22 A4,4 0 1,1 35.9,22Z" fill="#080808" clipPath={`url(#${cid})`}/>
      <path d="M20,46 L20,50 M24,46 L24,50 M28,46 L28,50 M32,46 L32,50 M36,46 L36,50" fill="none" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" clipPath={`url(#${cid})`}/>
      <line x1="18" y1="42" x2="38" y2="42" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" clipPath={`url(#${cid})`}/>
      <rect x="12" y="26" width="30" height="10" rx="5" fill="#ffdc32"/>
      <text x="27" y="31" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#000">NEW</text>
      {user.online && <OnlineDot cx={44} cy={8}/>}
    </svg>
  );
};

// ─── Trans Women Pins ─────────────────────────────────────────────────────────

// Butterfly — match ≥ 90% + online
const TW_Butterfly = ({ user }) => (
  <svg width="60" height="58" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
    <defs>
      <linearGradient id={`bwg-${user.id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"   stopColor={TW.pink}  stopOpacity="0.95"/>
        <stop offset="50%"  stopColor={TW.white} stopOpacity="0.5"/>
        <stop offset="100%" stopColor={TW.blue}  stopOpacity="0.95"/>
      </linearGradient>
    </defs>
    <path d={BUTTERFLY_L}  fill={`url(#bwg-${user.id})`} stroke={TW.pink} strokeWidth="1.5"/>
    <path d={BUTTERFLY_R}  fill={`url(#bwg-${user.id})`} stroke={TW.blue} strokeWidth="1.5"/>
    <path d={BUTTERFLY_LB} fill={`url(#bwg-${user.id})`} stroke={TW.pink} strokeWidth="1.5" opacity="0.8"/>
    <path d={BUTTERFLY_RB} fill={`url(#bwg-${user.id})`} stroke={TW.blue} strokeWidth="1.5" opacity="0.8"/>
    <path d={BUTTERFLY_BODY} fill="#1a1a1a" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
    {/* match badge */}
    <rect x="16" y="20" width="24" height="10" rx="5" fill={TW.accent}/>
    <text x="28" y="25" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#fff">{user.match}%</text>
    <Initial user={user} y={34} fill="#fff" fontSize={11}/>
    {user.online && <OnlineDot cx={40} cy={44}/>}
  </svg>
);

// Star — default online
const TW_Star = ({ user }) => (
  <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
    <defs>
      <radialGradient id={`stg-${user.id}`} cx="50%" cy="50%" r="60%">
        <stop offset="0%"   stopColor={TW.white} stopOpacity="0.2"/>
        <stop offset="100%" stopColor={TW.pink}  stopOpacity="0.4"/>
      </radialGradient>
    </defs>
    <path d={STAR_PATH} fill="#1e1e1e" stroke={TW.pink} strokeWidth="1.8" strokeLinejoin="round"/>
    <path d={STAR_PATH} fill={`url(#stg-${user.id})`}/>
    <Initial user={user} y={26} fill="#fff" fontSize={12}/>
    {user.online && <OnlineDot cx={44} cy={10}/>}
  </svg>
);

// Phoenix — isTop
const TW_Phoenix = ({ user }) => (
  <svg width="56" height="58" viewBox="0 0 56 58" style={{ overflow:"visible", display:"block" }}>
    <defs>
      <linearGradient id={`phg-${user.id}`} x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%"   stopColor={TW.blue}  stopOpacity="0.9"/>
        <stop offset="50%"  stopColor={TW.white} stopOpacity="0.4"/>
        <stop offset="100%" stopColor={TW.pink}  stopOpacity="0.9"/>
      </linearGradient>
    </defs>
    <path d={PHOENIX_WINGS} fill="none" stroke="rgba(247,168,196,0.4)" strokeWidth="2" strokeLinecap="round"/>
    <path d={PHOENIX_PATH} fill="#1a1a1a" stroke={TW.pink} strokeWidth="1.8"/>
    <path d={PHOENIX_PATH} fill={`url(#phg-${user.id})`} opacity="0.4"/>
    <Initial user={user} y={30} fill="#fff" fontSize={12}/>
    <rect x="12" y="34" width="32" height="12" rx="6" fill={TW.accent}/>
    <text x="28" y="40" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#fff">TOP ✨</text>
    {user.online && <OnlineDot cx={44} cy={46}/>}
  </svg>
);

// Crescent Moon — offline
const TW_Crescent = ({ user }) => (
  <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
    <path d={CRESCENT_PATH} fill="#141414" stroke="rgba(85,205,252,0.25)" strokeWidth="1.8"/>
    <Initial user={user} y={28} fill="rgba(255,255,255,0.35)" fontSize={12}/>
    <rect x="16" y="36" width="24" height="10" rx="5" fill="rgba(85,205,252,0.08)"/>
    <text x="28" y="41" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontFamily="'DM Sans',sans-serif" fontWeight="700" fill="rgba(85,205,252,0.4)">AWAY</text>
  </svg>
);

// Hourglass — alt default (user setting)
const TW_Hourglass = ({ user }) => {
  const cid = `hg-${user.id}`;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
      <defs>
        <clipPath id={cid}><path d={HOURGLASS_PATH}/></clipPath>
        <linearGradient id={`hgg-${user.id}`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%"   stopColor={TW.blue}  stopOpacity="0.6"/>
          <stop offset="50%"  stopColor={TW.white} stopOpacity="0.1"/>
          <stop offset="100%" stopColor={TW.pink}  stopOpacity="0.6"/>
        </linearGradient>
      </defs>
      <path d={HOURGLASS_PATH} fill="#1e1e1e" stroke={TW.pink} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d={HOURGLASS_PATH} fill={`url(#hgg-${user.id})`} opacity="0.5"/>
      <line x1="18" y1="28" x2="38" y2="28" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" clipPath={`url(#${cid})`}/>
      <Initial user={user} y={14} fill="#fff" fontSize={11}/>
      <Initial user={user} y={42} fill="#fff" fontSize={11}/>
      {user.online && <OnlineDot/>}
    </svg>
  );
};

// Trans Symbol ⚧ — alt default
const TW_TransSymbol = ({ user }) => (
  <svg width="56" height="64" viewBox="0 0 56 64" style={{ overflow:"visible", display:"block" }}>
    <circle cx="28" cy="28" r="18" fill="#1e1e1e" stroke={TW.pink} strokeWidth="2"/>
    <line x1="28" y1="46" x2="28" y2="58" stroke={TW.pink}  strokeWidth="2" strokeLinecap="round"/>
    <line x1="22" y1="53" x2="34" y2="53" stroke={TW.pink}  strokeWidth="2" strokeLinecap="round"/>
    <line x1="40" y1="12" x2="50" y2="4"  stroke={TW.blue}  strokeWidth="2" strokeLinecap="round"/>
    <line x1="50" y1="4"  x2="50" y2="12" stroke={TW.blue}  strokeWidth="2" strokeLinecap="round"/>
    <line x1="50" y1="4"  x2="42" y2="4"  stroke={TW.blue}  strokeWidth="2" strokeLinecap="round"/>
    <line x1="28" y1="4"  x2="28" y2="12" stroke={TW.white} strokeWidth="2" strokeLinecap="round"/>
    <line x1="24" y1="8"  x2="32" y2="8"  stroke={TW.white} strokeWidth="2" strokeLinecap="round"/>
    <Initial user={user} y={28} fill="#fff"/>
    {user.online && <OnlineDot cx={44} cy={44}/>}
  </svg>
);

// Trans Flag Drop — selected
const TW_FlagDrop = ({ user }) => {
  const H = "M28,46 C28,46 6,32 6,18 C6,9 13,4 20,4 C24,4 28,7 28,7 C28,7 32,4 36,4 C43,4 50,9 50,18 C50,32 28,46 28,46Z";
  const cid = `tfd-${user.id}`;
  return (
    <svg width="56" height="66" viewBox="0 0 56 66" style={{ overflow:"visible", display:"block" }}>
      <defs>
        <clipPath id={cid}><path d={H}/></clipPath>
        <linearGradient id={`tfg-${user.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={TW.blue}  stopOpacity="1"/>
          <stop offset="28%"  stopColor={TW.pink}  stopOpacity="1"/>
          <stop offset="50%"  stopColor={TW.white} stopOpacity="1"/>
          <stop offset="72%"  stopColor={TW.pink}  stopOpacity="1"/>
          <stop offset="100%" stopColor={TW.blue}  stopOpacity="1"/>
        </linearGradient>
      </defs>
      {/* glow halo */}
      <path d={H} fill={TW.glow} transform="scale(1.1) translate(-2.5,-1.5)"/>
      <path d={H} fill={`url(#tfg-${user.id})`} clipPath={`url(#${cid})`}/>
      <path d={H} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      <Initial user={user} y={24} fill="#1a1a1a" fontSize={13}/>
      <path d="M24,46 L28,62 L32,46Z" fill={TW.pink} stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeLinejoin="round"/>
      <rect x="15" y="30" width="26" height="12" rx="6" fill="rgba(0,0,0,0.45)"/>
      <text x="28" y="36" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#fff">{user.match}%</text>
    </svg>
  );
};

// Lotus — isNew
const TW_Lotus = ({ user }) => (
  <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow:"visible", display:"block" }}>
    <defs>
      <linearGradient id={`ltg-${user.id}`} x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%"   stopColor={TW.white} stopOpacity="0.2"/>
        <stop offset="100%" stopColor={TW.pink}  stopOpacity="0.5"/>
      </linearGradient>
    </defs>
    <path d={LOTUS_L} fill="#1a1a1a" stroke="rgba(85,205,252,0.5)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.85"/>
    <path d={LOTUS_R} fill="#1a1a1a" stroke="rgba(85,205,252,0.5)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.85"/>
    <path d={LOTUS_C} fill="#1a1a1a" stroke={TW.pink} strokeWidth="2"/>
    <path d={LOTUS_C} fill={`url(#ltg-${user.id})`} opacity="0.5"/>
    <Initial user={user} y={30} fill="#fff" fontSize={12}/>
    <rect x="12" y="34" width="30" height="12" rx="6" fill={TW.blue}/>
    <text x="27" y="40" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#000">NEW</text>
    {user.online && <OnlineDot/>}
  </svg>
);

// Venus ♀ — alt default
const TW_Venus = ({ user }) => (
  <svg width="56" height="64" viewBox="0 0 56 64" style={{ overflow:"visible", display:"block" }}>
    <circle cx="28" cy="26" r={VENUS_CIRCLE} fill="#1e1e1e" stroke={TW.pink} strokeWidth="2"/>
    <line x1="28" y1="44" x2="28" y2="58" stroke={TW.pink}  strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="20" y1="52" x2="36" y2="52" stroke={TW.pink}  strokeWidth="2.5" strokeLinecap="round"/>
    {/* inner sparkle */}
    <circle cx="28" cy="26" r="7" fill="none" stroke="rgba(247,168,196,0.2)" strokeWidth="1"/>
    <Initial user={user} y={26} fill="#fff"/>
    {user.online && <OnlineDot cx={44} cy={12}/>}
  </svg>
);

// ─── Cluster ──────────────────────────────────────────────────────────────────
const ClusterPin = ({ cluster }) => {
  const path = BUTT_SHAPES[0];
  const hasMales  = cluster.users.some(u => u.gender === "m");
  const hasFemales= cluster.users.some(u => u.gender === "f");
  const hasTW     = cluster.users.some(u => u.gender === "tw");
  const col = hasTW ? TW.pink : (hasMales && hasFemales) ? "#ffa032" : hasMales ? "#4488ff" : "#ff4466";
  const emoji = hasTW ? "🦋" : (hasMales && hasFemales) ? "👫" : hasMales ? "👨" : "👩";
  const offsets = [
    { dx: -7, dy: 5, op: 0.35, s: 0.82 },
    { dx:  6, dy: 4, op: 0.55, s: 0.88 },
    { dx:  0, dy: 0, op: 1,    s: 1    },
  ];
  return (
    <svg width="80" height="70" viewBox="-12 -8 80 74" style={{ overflow:"visible", display:"block" }}>
      {offsets.map((o, i) => (
        <g key={i} transform={`translate(${o.dx},${o.dy}) scale(${o.s})`} opacity={o.op}>
          <path d={path} fill="#1a1a1a" stroke={`${col}88`} strokeWidth="1.5"/>
        </g>
      ))}
      <path d={path} fill="#1e1e1e" stroke={col} strokeWidth="2"/>
      <line x1="28" y1="3" x2="28" y2="30" stroke="rgba(255,255,255,0.07)" strokeWidth="1.6" strokeLinecap="round"/>
      <rect x="10" y="30" width="36" height="14" rx="7" fill={col}/>
      <text x="28" y="37" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontFamily="'DM Sans',sans-serif" fontWeight="800" fill="#000">
        {emoji} +{cluster.count}
      </text>
    </svg>
  );
};

// ─── Pin Router ───────────────────────────────────────────────────────────────
const PinRenderer = ({ pinType, user }) => {
  switch (pinType) {
    // female
    case "f_classic":      return <F_Classic      user={user}/>;
    case "f_heartdrop":    return <F_HeartDrop    user={user}/>;
    case "f_matchcolor":   return <F_MatchColor   user={user}/>;
    case "f_cartoon":      return <F_Cartoon      user={user}/>;
    // male
    case "m_eggplant":     return <M_Eggplant     user={user}/>;
    case "m_eggplantdrop": return <M_EggplantDrop user={user}/>;
    case "m_chest":        return <M_Chest        user={user}/>;
    case "m_shield":       return <M_Shield       user={user}/>;
    case "m_flex":         return <M_Flex         user={user}/>;
    case "m_skull":        return <M_Skull        user={user}/>;
    // trans women
    case "tw_butterfly":   return <TW_Butterfly   user={user}/>;
    case "tw_star":        return <TW_Star        user={user}/>;
    case "tw_phoenix":     return <TW_Phoenix     user={user}/>;
    case "tw_crescent":    return <TW_Crescent    user={user}/>;
    case "tw_hourglass":   return <TW_Hourglass   user={user}/>;
    case "tw_transsymbol": return <TW_TransSymbol user={user}/>;
    case "tw_flagdrop":    return <TW_FlagDrop    user={user}/>;
    case "tw_lotus":       return <TW_Lotus       user={user}/>;
    case "tw_venus":       return <TW_Venus       user={user}/>;
    default:               return null;
  }
};

const SmartPin = ({ user, isSelected, onClick, pulseDelay }) => {
  const pinType  = getPinType(user, isSelected);
  const pulseCol = getPulseColor(user);
  return (
    <div onClick={onClick} style={{
      position: "absolute",
      left: `${user.x}%`, top: `${user.y}%`,
      transform: "translate(-50%, -50%)",
      zIndex: isSelected ? 30 : 10,
      cursor: "pointer",
      filter: isSelected ? getSelectedGlow(user) : "drop-shadow(0 3px 8px rgba(0,0,0,0.8))",
      transition: "filter 0.2s",
    }}>
      {user.online && !isSelected && (
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 56, height: 56,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          border: `1.5px solid ${pulseCol}`,
          animation: "ringPulse 2.5s ease-out infinite",
          animationDelay: `${pulseDelay}s`,
          pointerEvents: "none",
        }}/>
      )}
      <PinRenderer pinType={pinType} user={user}/>
    </div>
  );
};

// ─── Main Map ─────────────────────────────────────────────────────────────────
export default function ANLMapView() {
  const [selected,      setSelected]      = useState(null);
  const [filter,        setFilter]        = useState("all");
  const [genderFilter,  setGenderFilter]  = useState("all");
  const [showHeat,      setShowHeat]      = useState(true);
  const [panelOpen,     setPanelOpen]     = useState(false);
  const [pulseMap,      setPulseMap]      = useState({});
  const [time,          setTime]          = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const map = {};
    MOCK_USERS.forEach((u, i) => { map[u.id] = i * 0.32; });
    setPulseMap(map);
  }, []);

  const filtered = MOCK_USERS.filter(u => {
    if (filter === "online" && !u.online)        return false;
    if (filter === "close"  && u.distance > 1.5) return false;
    if (genderFilter === "f"  && u.gender !== "f")  return false;
    if (genderFilter === "m"  && u.gender !== "m")  return false;
    if (genderFilter === "tw" && u.gender !== "tw") return false;
    return true;
  });

  const { clusters, clusteredIds } = buildClusters(filtered);
  const soloUsers = filtered.filter(u => !clusteredIds.has(u.id));

  const hour = time.getHours();
  const isLateNight = hour >= 22 || hour < 4;

  const handlePin  = (user) => { setSelected(user); setPanelOpen(true); };
  const closePanel = () => { setPanelOpen(false); setTimeout(() => setSelected(null), 300); };

  const panelAccent = selected ? getPanelAccent(selected) : "#ffa032";
  const matchCol    = selected
    ? selected.gender === "tw" ? twMatchColor(selected.match)
    : selected.gender === "m"  ? maleMatchColor(selected.match)
    : femaleMatchColor(selected.match)
    : "#ffa032";

  return (
    <div style={{ width:"100%", height:"100vh", background:"#080808", fontFamily:"'DM Sans',sans-serif", overflow:"hidden", position:"relative", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes ringPulse {
          0%   { width:56px; height:56px; opacity:0.7; }
          100% { width:94px; height:94px; opacity:0; }
        }
        .map-bg {
          background-color:#0d0d0d;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px);
          background-size:40px 40px;
        }
        .dist-ring { position:absolute; top:50%; left:50%; border-radius:50%; border:1px solid rgba(255,255,255,0.04); transform:translate(-50%,-50%); pointer-events:none; }
        .heat-blob { position:absolute; border-radius:50%; pointer-events:none; filter:blur(32px); }
        .event-badge { background:rgba(255,60,100,0.9); backdrop-filter:blur(8px); border:1px solid rgba(255,60,100,0.5); border-radius:20px; padding:4px 10px; font-size:11px; color:#fff; font-weight:600; white-space:nowrap; }
        .pill { padding:7px 13px; border-radius:20px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.6); font-size:11px; font-weight:500; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif; }
        .pill.active     { background:#ffa032; border-color:#ffa032; color:#000; }
        .pill.f.active   { background:#ff3c64; border-color:#ff3c64; color:#fff; }
        .pill.m.active   { background:#4488ff; border-color:#4488ff; color:#fff; }
        .pill.tw.active  { background:#f7a8c4; border-color:#f7a8c4; color:#1a1a1a; }
        .pill:hover:not(.active) { border-color:rgba(255,255,255,0.3); color:#fff; }
        .side-panel { position:absolute; bottom:0; left:0; right:0; background:rgba(10,10,10,0.98); backdrop-filter:blur(20px); border-top:1px solid rgba(255,255,255,0.08); border-radius:24px 24px 0 0; padding:24px; z-index:100; transition:transform 0.35s cubic-bezier(0.32,0.72,0,1); }
        .side-panel.open   { transform:translateY(0); }
        .side-panel.closed { transform:translateY(100%); }
        .match-bg   { height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; }
        .match-fill { height:100%; border-radius:2px; transition:width 0.8s cubic-bezier(0.22,1,0.36,1); }
        .btn-primary { flex:1; padding:14px; border-radius:14px; border:none; font-weight:700; font-size:14px; cursor:pointer; font-family:'DM Sans',sans-serif; transition:opacity 0.15s; }
        .btn-primary:active { opacity:0.8; }
        .btn-ghost { padding:14px 20px; border-radius:14px; border:1px solid rgba(255,255,255,0.12); background:transparent; color:rgba(255,255,255,0.7); font-size:18px; cursor:pointer; }
        /* trans flag bar used on TW panel */
        .flag-stripe { height:3px; border-radius:1.5px; background:linear-gradient(90deg,#55cdfc,#f7a8c4,#fff,#f7a8c4,#55cdfc); margin-bottom:12px; }
      `}</style>

      {/* Header */}
      <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:50, padding:"20px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#fff", letterSpacing:3, lineHeight:1 }}>
            ALL<span style={{ color:"#ffa032" }}>NIGHT</span>LONG
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:3, letterSpacing:1, fontWeight:500 }}>
            {isLateNight ? "🌙 LATE NIGHT" : "📍 NEARBY"} · {filtered.filter(u => u.online).length} ACTIVE
          </div>
        </div>
        <button onClick={() => setShowHeat(p => !p)} style={{ background:showHeat ? "rgba(255,160,50,0.15)" : "rgba(255,255,255,0.05)", border:`1px solid ${showHeat ? "rgba(255,160,50,0.4)" : "rgba(255,255,255,0.1)"}`, borderRadius:12, padding:"8px 14px", color:showHeat ? "#ffa032" : "rgba(255,255,255,0.4)", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:1 }}>HEAT</button>
      </div>

      {/* Map */}
      <div className="map-bg" style={{ flex:1, position:"relative", overflow:"hidden" }} onClick={() => panelOpen && closePanel()}>
        {[120, 220, 320].map((r, i) => <div key={i} className="dist-ring" style={{ width:r*2, height:r*2 }}/>)}

        {/* Heat blobs */}
        {showHeat && filtered.filter(u => u.online).map(u => (
          <div key={u.id} className="heat-blob" style={{
            left:`${u.x}%`, top:`${u.y}%`, width:110, height:110,
            transform:"translate(-50%,-50%)",
            background: u.gender === "tw"
              ? `radial-gradient(circle,rgba(247,168,196,0.12),transparent 70%)`
              : u.gender === "m"
                ? `radial-gradient(circle,rgba(68,136,255,0.10),transparent 70%)`
                : u.match >= 90
                  ? `radial-gradient(circle,rgba(255,60,100,0.12),transparent 70%)`
                  : `radial-gradient(circle,rgba(255,160,50,0.09),transparent 70%)`,
          }}/>
        ))}

        {/* Events */}
        {EVENTS.map(ev => (
          <div key={ev.id} style={{ position:"absolute", left:`${ev.x}%`, top:`${ev.y}%`, transform:"translate(-50%,-50%)", zIndex:8, cursor:"pointer" }}>
            <div className="event-badge">{ev.type === "party" ? "🎉" : "🍸"} {ev.name} · {ev.count}</div>
          </div>
        ))}

        {/* Clusters */}
        {clusters.map(cluster => (
          <div key={cluster.id} onClick={(e) => { e.stopPropagation(); handlePin(cluster.users[0]); }}
            style={{ position:"absolute", left:`${cluster.x}%`, top:`${cluster.y}%`, transform:"translate(-50%,-50%)", zIndex:12, cursor:"pointer", filter:"drop-shadow(0 3px 10px rgba(0,0,0,0.8))" }}>
            <ClusterPin cluster={cluster}/>
          </div>
        ))}

        {/* Solo users */}
        {soloUsers.map(user => (
          <SmartPin key={user.id} user={user}
            isSelected={selected?.id === user.id}
            onClick={(e) => { e.stopPropagation(); handlePin(user); }}
            pulseDelay={pulseMap[user.id] || 0}
          />
        ))}

        {/* You */}
        <div style={{ position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)", zIndex:20 }}>
          <div style={{ width:16, height:16, background:"#ffa032", borderRadius:"50%", border:"3px solid #fff", boxShadow:"0 0 0 4px rgba(255,160,50,0.3),0 0 20px rgba(255,160,50,0.5)" }}/>
        </div>
        <div style={{ position:"absolute", top:"50%", left:"calc(50% + 128px)", transform:"translateY(-50%)", fontSize:9, color:"rgba(255,255,255,0.2)", letterSpacing:1, fontWeight:600 }}>1 MI</div>
        <div style={{ position:"absolute", top:"50%", left:"calc(50% + 228px)", transform:"translateY(-50%)", fontSize:9, color:"rgba(255,255,255,0.15)", letterSpacing:1, fontWeight:600 }}>2 MI</div>

        {/* Legend */}
        <div style={{ position:"absolute", top:80, right:16, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"10px 12px", display:"flex", flexDirection:"column", gap:6 }}>
          {[
            { color:"#ff4466", label:"🍑 90%+ Match" },
            { color:"#ffa032", label:"🍑 Nearby" },
            { color:"#ffdc32", label:"🍑 New" },
            { color:"#4488ff", label:"🍆 90%+ Match" },
            { color:"#8844ff", label:"🍆 Nearby" },
            { color:"#ff8844", label:"🍆 Top Rated" },
            { color:TW.accent, label:"🦋 90%+ Match" },
            { color:TW.pink,   label:"🦋 Nearby" },
            { color:TW.blue,   label:"🦋 New / Away" },
            { color:"#ffa032", label:"👥 Cluster" },
          ].map((l, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:l.color, flexShrink:0 }}/>
              <span style={{ fontSize:9, color:"rgba(255,255,255,0.35)", letterSpacing:0.3, fontWeight:600 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ position:"absolute", bottom:68, left:20, right:20, zIndex:50, display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
        {[
          { key:"all", label:"All",       cls:"" },
          { key:"f",   label:"🍑 Women",  cls:"f" },
          { key:"m",   label:"🍆 Men",    cls:"m" },
          { key:"tw",  label:"🦋 Trans W",cls:"tw" },
        ].map(f => (
          <button key={f.key} className={`pill ${f.cls} ${genderFilter === f.key ? "active" : ""}`} onClick={() => setGenderFilter(f.key)}>{f.label}</button>
        ))}
        <div style={{ width:1, background:"rgba(255,255,255,0.1)", margin:"0 2px" }}/>
        {[
          { key:"all",    label:"All" },
          { key:"online", label:"🟢 Online" },
          { key:"close",  label:"📍 < 1.5 mi" },
        ].map(f => (
          <button key={f.key} className={`pill ${filter === f.key ? "active" : ""}`} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>

      <div style={{ position:"absolute", bottom:114, left:"50%", transform:"translateX(-50%)", zIndex:50, fontSize:11, color:"rgba(255,255,255,0.25)", letterSpacing:0.5, fontWeight:500, whiteSpace:"nowrap" }}>
        {filtered.length} nearby · {filtered.filter(u => u.online).length} online · {clusters.length > 0 ? `${clusters.reduce((s,c)=>s+c.count,0)} clustered` : "no clusters"}
      </div>

      {/* Bottom strip */}
      {!panelOpen && (
        <div style={{ position:"absolute", bottom:130, left:20, right:20, zIndex:45 }}>
          <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
            {filtered.filter(u => u.online).slice(0, 8).map(u => {
              const strokeCol = u.gender === "tw"
                ? (u.match >= 90 ? TW.accent : TW.pink)
                : u.gender === "m"
                  ? (u.match >= 90 ? maleMatchColor(u.match) : "rgba(136,68,255,0.5)")
                  : (u.match >= 90 ? femaleMatchColor(u.match) : "rgba(255,160,50,0.5)");
              return (
                <div key={u.id} onClick={() => handlePin(u)} style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"pointer" }}>
                  <svg width="36" height="40" viewBox="0 0 56 60" style={{ overflow:"visible", filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.8))" }}>
                    {u.gender === "tw" ? (
                      <>
                        <path d={STAR_PATH} fill="#1e1e1e" stroke={strokeCol} strokeWidth="2"/>
                        <text x="28" y="26" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontFamily="'Bebas Neue',sans-serif" fill="#fff" style={{ userSelect:"none" }}>{u.name[0]}</text>
                      </>
                    ) : u.gender === "m" ? (
                      <>
                        <path d={EGGPLANT_PATH} fill="#1e1e1e" stroke={strokeCol} strokeWidth="2"/>
                        <path d={EGGPLANT_LEAF} fill="#44aa44"/>
                        <text x="28" y="32" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontFamily="'Bebas Neue',sans-serif" fill="#fff" style={{ userSelect:"none" }}>{u.name[0]}</text>
                      </>
                    ) : (
                      <>
                        <defs><clipPath id={`bs-${u.id}`}><path d={BUTT_SHAPES[u.id % BUTT_SHAPES.length]}/></clipPath></defs>
                        <path d={BUTT_SHAPES[u.id % BUTT_SHAPES.length]} fill="#1e1e1e" stroke={strokeCol} strokeWidth="2"/>
                        <line x1="28" y1="3" x2="28" y2="30" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" strokeLinecap="round" clipPath={`url(#bs-${u.id})`}/>
                        <text x="28" y="24" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontFamily="'Bebas Neue',sans-serif" fill="#fff" style={{ userSelect:"none" }}>{u.name[0]}</text>
                      </>
                    )}
                  </svg>
                  <span style={{ fontSize:9, color:"rgba(255,255,255,0.4)", letterSpacing:0.3, fontWeight:600 }}>{u.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail panel */}
      <div className={`side-panel ${panelOpen ? "open" : "closed"}`}>
        {selected && (
          <>
            {/* trans flag stripe if tw */}
            {selected.gender === "tw" && <div className="flag-stripe"/>}

            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
              <div style={{
                width:60, height:60,
                borderRadius: selected.gender === "m" ? "12px" : selected.gender === "tw" ? "50% 50% 40% 40%" : "50%",
                background:"linear-gradient(135deg,#1a1a1a,#2a2a2a)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#fff",
                border:`2px solid ${panelAccent}`,
                boxShadow:`0 0 14px ${panelAccent}44`,
                flexShrink:0,
              }}>
                {selected.name[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:20, fontWeight:700, color:"#fff" }}>{selected.name}</span>
                  <span style={{ fontSize:14, color:"rgba(255,255,255,0.4)" }}>{selected.age}</span>
                  {selected.online && <span style={{ fontSize:10, background:"rgba(68,255,136,0.15)", color:"#44ff88", padding:"2px 8px", borderRadius:10, fontWeight:600, letterSpacing:0.5 }}>ONLINE</span>}
                  {selected.isNew  && <span style={{ fontSize:10, background:"rgba(255,220,50,0.15)",  color:"#ffdc32", padding:"2px 8px", borderRadius:10, fontWeight:600, letterSpacing:0.5 }}>NEW</span>}
                  {selected.isTop  && <span style={{ fontSize:10, background:`${panelAccent}22`,       color:panelAccent, padding:"2px 8px", borderRadius:10, fontWeight:600, letterSpacing:0.5 }}>TOP ✨</span>}
                </div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", marginTop:3 }}>📍 {selected.distance} mi · {selected.vibe}</div>
              </div>
              <button onClick={closePanel} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", fontSize:22, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>

            <div style={{ marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", letterSpacing:1, fontWeight:600 }}>VIBE MATCH</span>
                <span style={{ fontSize:13, fontWeight:700, color:matchCol }}>{selected.match}%</span>
              </div>
              <div className="match-bg">
                <div className="match-fill" style={{ width:`${selected.match}%`, background:`linear-gradient(90deg,${panelAccent},${matchCol})` }}/>
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost">💬</button>
              <button className="btn-ghost">{selected.gender === "tw" ? "🦋" : selected.gender === "m" ? "🤜" : "❤️"}</button>
              <button className="btn-primary" style={{ background:panelAccent, color: selected.gender === "tw" ? "#1a1a1a" : "#000" }}>Send a Vibe</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
