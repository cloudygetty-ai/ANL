import { useState } from "react";

const MOCK_USER = { id: 1, name: "Zev", age: 26, match: 85, online: true, isNew: false, photoUrl: null };

// ─── Paths ────────────────────────────────────────────────────────────────────

// Arrow pointing up-right (masculine energy)
const ARROW_BODY = "M8,48 L8,16 L20,16 L28,4 L36,16 L48,16 L48,48 Z";

// Mars symbol ♂ circle
const MARS_CIRCLE = "M28,36 A16,16 0 1,1 27.9,36Z";
const MARS_ARROW  = "M38,18 L50,6 M50,6 L50,14 M50,6 L42,6";

// Bolt / lightning
const BOLT = "M32,2 L16,28 L28,28 L20,54 L40,24 L28,24 Z";

// Fist
const FIST = "M18,28 C18,22 20,18 24,16 L24,8 C24,6 26,4 28,4 C30,4 32,6 32,8 L32,12 C34,10 36,10 38,12 L38,16 C40,14 42,14 44,16 L44,20 C46,18 48,20 48,22 L48,32 C48,40 42,48 34,50 L22,50 C18,48 14,44 14,38 L14,32 C14,30 16,28 18,28Z";

// Shield (different from male regular)
const WARRIOR_SHIELD = "M28,2 L48,10 L48,30 C48,42 40,50 28,54 C16,50 8,42 8,30 L8,10 Z";
const SHIELD_CROSS_H = "M14,26 L42,26";
const SHIELD_CROSS_V = "M28,12 L28,40";

// Dragon / wing shape
const DRAGON_BODY = "M28,50 C20,44 8,34 8,22 C8,12 16,6 22,8 C24,8 26,10 28,12 C30,10 32,8 34,8 C40,6 48,12 48,22 C48,34 36,44 28,50Z";
const DRAGON_WING_L = "M8,22 C4,16 2,8 6,4 C10,0 16,6 20,12";
const DRAGON_WING_R = "M48,22 C52,16 54,8 50,4 C46,0 40,6 36,12";

// Flame (taller, masculine)
const FLAME = "M28,54 C18,46 6,34 6,22 C6,10 14,2 22,4 C24,4 26,6 28,8 C30,6 32,4 34,4 C42,2 50,10 50,22 C50,34 38,46 28,54Z";
const FLAME_INNER = "M28,44 C22,38 16,30 16,22 C16,16 20,12 24,14 C26,14 28,16 28,18 C28,16 30,14 32,14 C36,12 40,16 40,22 C40,30 34,38 28,44Z";

// Axe silhouette
const AXE_HANDLE = "M26,54 L30,54 L30,20 L26,20 Z";
const AXE_HEAD   = "M10,6 C10,2 18,0 28,0 C38,0 46,2 46,6 L46,20 L10,20 Z";

// Trans symbol male version
const TRANS_M_CIRCLE = "M22,36 A14,14 0 1,1 21.9,36Z";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TM_COLORS = {
  primary: "#55cdfc",
  secondary: "#f7a8c4",
  white: "#ffffff",
  accent: "#2299dd",
  dark: "#1a1a1a",
};

const Initial = ({ x = 28, y = 28, fill = "#fff", fontSize = 13, user }) => (
  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
    fontSize={fontSize} fontFamily="'Bebas Neue', sans-serif"
    letterSpacing="1" fill={fill} style={{ userSelect: "none" }}>
    {user.name[0]}
  </text>
);

const OnlineDot = ({ cx = 46, cy = 46 }) => (
  <circle cx={cx} cy={cy} r="4.5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>
);

// ─── Pins ─────────────────────────────────────────────────────────────────────

// 1. Mars Symbol ♂
const MarsPin = ({ user, selected }) => {
  const col = selected ? TM_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TM_COLORS.accent : "rgba(85,205,252,0.6)";
  return (
    <svg width="56" height="60" viewBox="0 0 56 60" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`mp-${user.id}`}><circle cx="28" cy="34" r="16"/></clipPath></defs>
      {selected && <circle cx="28" cy="34" r="20" fill="rgba(85,205,252,0.2)"/>}
      <circle cx="28" cy="34" r="16" fill={col} stroke={stroke} strokeWidth="2"/>
      <path d={MARS_ARROW} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Initial user={user} y={34} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={42} cy={20}/>}
    </svg>
  );
};

// 2. Lightning Bolt ⚡
const BoltPin = ({ user, selected }) => {
  const col = selected ? "#ffdd44" : "#1e1e1e";
  const stroke = selected ? "#ffee88" : "rgba(255,220,68,0.6)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id={`bp-${user.id}`}><path d={BOLT}/></clipPath>
        <linearGradient id={`blg-${user.id}`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={TM_COLORS.primary} stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#ffdd44" stopOpacity="0.8"/>
        </linearGradient>
      </defs>
      {selected && <path d={BOLT} fill="rgba(255,220,68,0.2)" transform="scale(1.1) translate(-2.5,-2.5)"/>}
      <path d={BOLT} fill={col} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
      {selected && <path d={BOLT} fill={`url(#blg-${user.id})`} opacity="0.5"/>}
      <Initial user={user} y={30} fill={selected ? "#000" : "#fff"} fontSize={11}/>
      {user.online && <OnlineDot cx={40} cy={10}/>}
    </svg>
  );
};

// 3. Fist ✊
const FistPin = ({ user, selected }) => {
  const col = selected ? TM_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TM_COLORS.accent : "rgba(85,205,252,0.5)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`fp-${user.id}`}><path d={FIST}/></clipPath></defs>
      <path d={FIST} fill={col} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      {/* knuckle lines */}
      <line x1="24" y1="16" x2="24" y2="22" stroke={selected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.07)"} strokeWidth="1.5" strokeLinecap="round" clipPath={`url(#fp-${user.id})`}/>
      <line x1="32" y1="14" x2="32" y2="20" stroke={selected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.07)"} strokeWidth="1.5" strokeLinecap="round" clipPath={`url(#fp-${user.id})`}/>
      <line x1="40" y1="16" x2="40" y2="22" stroke={selected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.07)"} strokeWidth="1.5" strokeLinecap="round" clipPath={`url(#fp-${user.id})`}/>
      <Initial user={user} y={36} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={44} cy={44}/>}
    </svg>
  );
};

// 4. Warrior Shield
const WarriorShieldPin = ({ user, selected }) => {
  const col = selected ? TM_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TM_COLORS.accent : "rgba(85,205,252,0.5)";
  return (
    <svg width="56" height="60" viewBox="0 0 56 60" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`ws-${user.id}`}><path d={WARRIOR_SHIELD}/></clipPath></defs>
      {selected && <path d={WARRIOR_SHIELD} fill="rgba(85,205,252,0.15)" transform="scale(1.06) translate(-1.5,-1)"/>}
      <path d={WARRIOR_SHIELD} fill={col} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      {/* cross detail */}
      <line x1="14" y1="26" x2="42" y2="26" stroke={selected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.08)"} strokeWidth="1.5" strokeLinecap="round" clipPath={`url(#ws-${user.id})`}/>
      <line x1="28" y1="12" x2="28" y2="40" stroke={selected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.08)"} strokeWidth="1.5" strokeLinecap="round" clipPath={`url(#ws-${user.id})`}/>
      <Initial user={user} y={28} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={44} cy={10}/>}
    </svg>
  );
};

// 5. Dragon / Wings
const DragonPin = ({ user, selected }) => {
  const col = selected ? TM_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TM_COLORS.accent : "rgba(85,205,252,0.5)";
  const wingStroke = selected ? "rgba(247,168,196,0.7)" : "rgba(247,168,196,0.3)";
  return (
    <svg width="60" height="56" viewBox="0 0 60 56" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`dp-${user.id}`}><path d={DRAGON_BODY}/></clipPath></defs>
      <path d={DRAGON_WING_L} fill="none" stroke={wingStroke} strokeWidth="2" strokeLinecap="round"/>
      <path d={DRAGON_WING_R} fill="none" stroke={wingStroke} strokeWidth="2" strokeLinecap="round"/>
      <path d={DRAGON_BODY} fill={col} stroke={stroke} strokeWidth="1.8"/>
      <Initial user={user} y={30} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={46} cy={44}/>}
    </svg>
  );
};

// 6. Flame
const FlamePin = ({ user, selected }) => {
  const col = selected ? TM_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TM_COLORS.accent : "rgba(85,205,252,0.5)";
  const innerCol = selected ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.05)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`flm-${user.id}`}><path d={FLAME}/></clipPath></defs>
      <path d={FLAME} fill={col} stroke={stroke} strokeWidth="1.8"/>
      <path d={FLAME_INNER} fill={innerCol} clipPath={`url(#flm-${user.id})`}/>
      <Initial user={user} y={30} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={44} cy={44}/>}
    </svg>
  );
};

// 7. Trans Symbol (male-coded)
const TransMaleSymbolPin = ({ user, selected }) => {
  const col = selected ? TM_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TM_COLORS.accent : "rgba(85,205,252,0.6)";
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`tms-${user.id}`}><circle cx="22" cy="36" r="14"/></clipPath></defs>
      {selected && <circle cx="22" cy="36" r="18" fill="rgba(85,205,252,0.15)"/>}
      <circle cx="22" cy="36" r="14" fill={col} stroke={stroke} strokeWidth="2"/>
      {/* ♀ stem under */}
      <line x1="22" y1="50" x2="22" y2="58" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="55" x2="28" y2="55" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      {/* ♂ arrow */}
      <line x1="32" y1="18" x2="44" y2="8"  stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="44" y1="8"  x2="44" y2="16" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="44" y1="8"  x2="36" y2="8"  stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      {/* cross on top */}
      <line x1="22" y1="4"  x2="22" y2="12" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="18" y1="8"  x2="26" y2="8"  stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <Initial user={user} x={22} y={36} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={48} cy={20}/>}
    </svg>
  );
};

// 8. Axe
const AxePin = ({ user, selected }) => {
  const col = selected ? TM_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TM_COLORS.accent : "rgba(85,205,252,0.5)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id={`axh-${user.id}`}><path d={AXE_HEAD}/></clipPath>
        <linearGradient id={`axg-${user.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={selected ? TM_COLORS.primary : "#2a2a2a"}/>
          <stop offset="100%" stopColor={selected ? TM_COLORS.accent : "#111"}/>
        </linearGradient>
      </defs>
      {/* handle */}
      <rect x="26" y="20" width="4" height="34" rx="2" fill={selected ? "rgba(85,205,252,0.4)" : "rgba(255,255,255,0.15)"}/>
      {/* head */}
      <path d={AXE_HEAD} fill={`url(#axg-${user.id})`} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      {/* edge highlight */}
      <line x1="10" y1="20" x2="46" y2="20" stroke={selected ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"} strokeWidth="1" clipPath={`url(#axh-${user.id})`}/>
      <Initial user={user} y={12} fill={selected ? "#000" : "#fff"} fontSize={11}/>
      {user.online && <OnlineDot cx={44} cy={44}/>}
    </svg>
  );
};

// 9. Trans Flag Drop Pin
const TransMaleFlagDropPin = ({ user, selected }) => {
  const TEARDROP = "M28,2 C28,2 6,22 6,36 C6,46 16,54 28,54 C40,54 50,46 50,36 C50,22 28,2 28,2Z";
  return (
    <svg width="56" height="66" viewBox="0 0 56 66" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id={`tmfd-${user.id}`}><path d={TEARDROP}/></clipPath>
        <linearGradient id={`tmfg-${user.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#55cdfc"/>
          <stop offset="30%"  stopColor="#f7a8c4"/>
          <stop offset="50%"  stopColor="#ffffff"/>
          <stop offset="70%"  stopColor="#f7a8c4"/>
          <stop offset="100%" stopColor="#55cdfc"/>
        </linearGradient>
      </defs>
      <path d={TEARDROP} fill={`url(#tmfg-${user.id})`} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      <Initial user={user} y={36} fill="#1a1a1a" fontSize={14}/>
      {/* arrow pointing up = ♂ energy */}
      <path d="M22,16 L28,6 L34,16 M28,6 L28,26" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="14" y="38" width="28" height="12" rx="6" fill="rgba(0,0,0,0.35)"/>
      <text x="28" y="44" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans', sans-serif" fontWeight="800" fill="#fff">{user.match}%</text>
    </svg>
  );
};

// ─── Config ───────────────────────────────────────────────────────────────────
const PINS = [
  { id: "mars",          label: "Mars ♂",           desc: "Circle + arrow, male symbol" },
  { id: "bolt",          label: "Lightning ⚡",      desc: "Bold bolt, blue-to-gold gradient" },
  { id: "fist",          label: "Fist ✊",           desc: "Knuckle detail, strong silhouette" },
  { id: "warriorshield", label: "Warrior Shield",    desc: "Cross-divided shield detail" },
  { id: "dragon",        label: "Dragon 🐉",         desc: "Body + spread wing details" },
  { id: "flame",         label: "Flame 🔥",          desc: "Tall flame with inner glow" },
  { id: "transmalesym",  label: "Trans Symbol ⚧",   desc: "⚧ male-coded with blue tones" },
  { id: "axe",           label: "Axe 🪓",            desc: "Head + handle, edge highlight" },
  { id: "transflagdrop", label: "Trans Flag Drop",   desc: "Teardrop with flag gradient + ♂ arrow" },
];

const PinRenderer = ({ id, user, selected }) => {
  switch (id) {
    case "mars":          return <MarsPin              user={user} selected={selected}/>;
    case "bolt":          return <BoltPin              user={user} selected={selected}/>;
    case "fist":          return <FistPin              user={user} selected={selected}/>;
    case "warriorshield": return <WarriorShieldPin     user={user} selected={selected}/>;
    case "dragon":        return <DragonPin            user={user} selected={selected}/>;
    case "flame":         return <FlamePin             user={user} selected={selected}/>;
    case "transmalesym":  return <TransMaleSymbolPin   user={user} selected={selected}/>;
    case "axe":           return <AxePin               user={user} selected={selected}/>;
    case "transflagdrop": return <TransMaleFlagDropPin user={user} selected={selected}/>;
    default: return null;
  }
};

export default function ANLTransMenPinShowcase() {
  const [selected,  setSelected]  = useState(null);
  const [favorites, setFavorites] = useState([]);
  const toggleFav = (id) => setFavorites(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "'DM Sans', sans-serif", padding: "24px 16px 48px", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        .pin-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 24px 16px 18px; display: flex; flex-direction: column; align-items: center; gap: 16px; cursor: pointer; transition: border-color 0.2s, background 0.2s; position: relative; }
        .pin-card:hover { border-color: rgba(85,205,252,0.3); background: rgba(85,205,252,0.04); }
        .pin-card.active { border-color: rgba(85,205,252,0.6); background: rgba(85,205,252,0.07); }
        .pin-card.favorited { border-color: rgba(247,168,196,0.5); background: rgba(247,168,196,0.05); }
        .fav-btn { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 16px; cursor: pointer; opacity: 0.5; transition: opacity 0.15s, transform 0.15s; }
        .fav-btn:hover, .fav-btn.on { opacity: 1; transform: scale(1.2); }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
        .label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); text-align: center; }
        .desc { font-size: 10px; color: rgba(255,255,255,0.3); text-align: center; line-height: 1.4; margin-top: 4px; }
        .fav-tag { background: rgba(85,205,252,0.12); border: 1px solid rgba(85,205,252,0.3); color: #55cdfc; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge { font-size: 9px; color: #55cdfc; font-weight: 700; letter-spacing: 1px; background: rgba(85,205,252,0.1); padding: 3px 10px; border-radius: 10px; }
        .flag-bar { height: 4px; border-radius: 2px; background: linear-gradient(90deg, #55cdfc, #f7a8c4, #ffffff, #f7a8c4, #55cdfc); margin-bottom: 24px; }
      `}</style>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 4, lineHeight: 1 }}>
          ALL<span style={{ color: "#ffa032" }}>NIGHT</span>LONG
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: 1 }}>
          TRANS MEN PINS · TAP TO SELECT · ⚡ TO FAVORITE
        </div>
      </div>

      <div className="flag-bar"/>

      {favorites.length > 0 && (
        <div style={{ marginBottom: 24, padding: 16, background: "rgba(85,205,252,0.05)", borderRadius: 16, border: "1px solid rgba(85,205,252,0.15)" }}>
          <div style={{ fontSize: 10, color: "#55cdfc", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>FAVORITES</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {favorites.map(id => {
              const p = PINS.find(p => p.id === id);
              return <div key={id} className="fav-tag">{p?.label}</div>;
            })}
          </div>
        </div>
      )}

      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, marginBottom: 4 }}>Trans Men</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5, marginBottom: 16 }}>9 STYLES · CLICK TO PREVIEW SELECTED STATE</div>

      <div className="grid">
        {PINS.map(pin => (
          <div key={pin.id}
            className={`pin-card ${selected === pin.id ? "active" : ""} ${favorites.includes(pin.id) ? "favorited" : ""}`}
            onClick={() => setSelected(p => p === pin.id ? null : pin.id)}>
            <button className={`fav-btn ${favorites.includes(pin.id) ? "on" : ""}`}
              onClick={(e) => { e.stopPropagation(); toggleFav(pin.id); }}>
              {favorites.includes(pin.id) ? "⚡" : "🤍"}
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80 }}>
              <PinRenderer id={pin.id} user={MOCK_USER} selected={selected === pin.id}/>
            </div>
            <div><div className="label">{pin.label}</div><div className="desc">{pin.desc}</div></div>
            {selected === pin.id && <div className="badge">SELECTED STATE</div>}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 36, padding: 20, background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, marginBottom: 12 }}>SMART ROUTING LOGIC</div>
        {[
          { cond: "Selected / tapped",      pin: "Trans Flag Drop (teardrop + ♂ arrow + match %)" },
          { cond: "Match ≥ 90% + online",   pin: "Dragon (rare, powerful)" },
          { cond: "New user",               pin: "Lightning Bolt (arrival with energy)" },
          { cond: "Top rated",              pin: "Fist or Axe (user-chosen in settings)" },
          { cond: "Default online",         pin: "Mars or Flame (user-chosen in settings)" },
          { cond: "Offline",                pin: "Warrior Shield (standing guard, dimmed)" },
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 9, alignItems: "flex-start" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 140 }}>{r.cond}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>→ {r.pin}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
