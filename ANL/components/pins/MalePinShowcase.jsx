import { useState } from "react";

const MOCK_USER = { id: 1, name: "Dre", age: 27, match: 91, online: true, isNew: false, photoUrl: null };

// ─── Shape Paths ──────────────────────────────────────────────────────────────

// Eggplant variants
const EGGPLANT_1 = "M28,54 C16,54 8,44 8,32 C8,18 14,6 22,3 C24,2 26,2 28,2 C30,2 32,2 34,3 C42,6 48,18 48,32 C48,44 40,54 28,54Z";
const EGGPLANT_LEAF = "M28,2 C28,2 22,-4 16,-2 C18,3 24,3 28,2Z M28,2 C28,2 34,-4 40,-2 C38,3 32,3 28,2Z";

// Chest/pec shape
const CHEST = "M4,28 C4,16 10,6 18,4 C22,3 26,8 28,8 C30,8 34,3 38,4 C46,6 52,16 52,28 C52,40 42,52 28,52 C14,52 4,40 4,28Z";
const CHEST_LINE = "M20,10 C22,18 26,22 28,22 C30,22 34,18 36,10";

// Shield
const SHIELD = "M28,2 L50,12 L50,32 C50,44 40,52 28,56 C16,52 6,44 6,32 L6,12 Z";

// Spade ♠
const SPADE = "M28,2 C28,2 6,18 6,30 C6,40 14,44 22,40 C18,46 14,50 10,52 L46,52 C42,50 38,46 34,40 C42,44 50,40 50,30 C50,18 28,2 28,2Z";

// Flex/muscle arm
const FLEX = "M10,48 C10,40 8,30 10,22 C12,14 18,8 24,8 C28,8 30,12 32,14 C36,10 42,8 46,12 C50,16 50,24 46,28 C48,32 48,40 46,48 C38,52 18,52 10,48Z";

// Diamond
const DIAMOND = "M28,2 L54,28 L28,54 L2,28 Z";

// Skull (simplified)
const SKULL = "M28,2 C14,2 6,12 6,24 C6,34 12,40 18,42 L18,50 L38,50 L38,42 C44,40 50,34 50,24 C50,12 42,2 28,2Z";
const SKULL_EYES = "M20,22 A4,4 0 1,1 19.9,22Z M36,22 A4,4 0 1,1 35.9,22Z";
const SKULL_TEETH = "M20,46 L20,50 M24,46 L24,50 M28,46 L28,50 M32,46 L32,50 M36,46 L36,50";

// Briefs
const BRIEFS = "M6,10 C6,10 10,36 14,42 C18,48 22,50 28,50 C34,50 38,48 42,42 C46,36 50,10 50,10 C44,6 36,4 28,4 C20,4 12,6 6,10Z";
const BRIEFS_BAND = "M6,10 C12,14 20,16 28,16 C36,16 44,14 50,10";
const BRIEFS_CREASE = "M28,16 L28,50";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const matchColor = (pct) => {
  if (pct >= 90) return "#4488ff";
  if (pct >= 75) return "#44aaff";
  return "#88ccff";
};

const PhotoOrInitial = ({ user, clipId, fill = "#fff", fontSize = 13, y = 28 }) => (
  user.photoUrl
    ? <image href={user.photoUrl} x="0" y="0" width="56" height="56"
        clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
    : <text x="28" y={y} textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fontFamily="'Bebas Neue', sans-serif"
        letterSpacing="1" fill={fill} style={{ userSelect: "none" }}>
        {user.name[0]}
      </text>
);

// ─── Pin Components ───────────────────────────────────────────────────────────

// 1. Eggplant 🍆
const EggplantPin = ({ user, selected }) => {
  const col = selected ? "#8844ff" : "#1e1e1e";
  const stroke = selected ? "#aa66ff" : "rgba(136,68,255,0.6)";
  return (
    <svg width="56" height="64" viewBox="0 0 56 64" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`ep-${user.id}`}><path d={EGGPLANT_1}/></clipPath></defs>
      {/* leaf */}
      <path d={EGGPLANT_LEAF} fill="#44aa44" stroke="none"/>
      {/* stem */}
      <line x1="28" y1="2" x2="28" y2="6" stroke="#44aa44" strokeWidth="2" strokeLinecap="round"/>
      {/* body */}
      <path d={EGGPLANT_1} fill={col} stroke={stroke} strokeWidth="2"/>
      {/* shine */}
      <ellipse cx="20" cy="18" rx="4" ry="7" fill="rgba(255,255,255,0.08)" transform="rotate(-20,20,18)"/>
      <PhotoOrInitial user={user} clipId={`ep-${user.id}`} y={30}/>
      {user.online && <circle cx="44" cy="50" r="5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>}
    </svg>
  );
};

// 2. Eggplant Drop Pin (eggplant on a location pin pointer)
const EggplantDropPin = ({ user, selected }) => {
  const col = selected ? "#8844ff" : "#1e1e1e";
  const stroke = selected ? "#aa66ff" : "rgba(136,68,255,0.6)";
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`edp-${user.id}`}><path d={EGGPLANT_1}/></clipPath></defs>
      <path d={EGGPLANT_LEAF} fill="#44aa44"/>
      <line x1="28" y1="2" x2="28" y2="6" stroke="#44aa44" strokeWidth="2" strokeLinecap="round"/>
      <path d={EGGPLANT_1} fill={col} stroke={stroke} strokeWidth="2"/>
      <ellipse cx="20" cy="18" rx="4" ry="7" fill="rgba(255,255,255,0.07)" transform="rotate(-20,20,18)"/>
      <PhotoOrInitial user={user} clipId={`edp-${user.id}`} y={30}/>
      {/* pointer */}
      <path d="M22,54 L28,70 L34,54Z" fill={col} stroke={stroke} strokeWidth="1" strokeLinejoin="round"/>
      {/* match badge */}
      <rect x="14" y="36" width="28" height="12" rx="6" fill={selected ? "rgba(0,0,0,0.4)" : "rgba(136,68,255,0.8)"}/>
      <text x="28" y="42" textAnchor="middle" dominantBaseline="middle"
        fontSize="8" fontFamily="'DM Sans', sans-serif" fontWeight="800" fill="#fff">
        {user.match}%
      </text>
    </svg>
  );
};

// 3. Chest/Pec
const ChestPin = ({ user, selected }) => {
  const col = selected ? "#4488ff" : "#1e1e1e";
  const stroke = selected ? "#66aaff" : "rgba(68,136,255,0.5)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`cp-${user.id}`}><path d={CHEST}/></clipPath></defs>
      <path d={CHEST} fill={col} stroke={stroke} strokeWidth="2"/>
      {/* pec dividing line */}
      <path d={CHEST_LINE} fill="none" stroke={selected ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.08)"} strokeWidth="1.5" strokeLinecap="round"/>
      <PhotoOrInitial user={user} clipId={`cp-${user.id}`} y={32}/>
      {user.online && <circle cx="44" cy="44" r="5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>}
    </svg>
  );
};

// 4. Shield
const ShieldPin = ({ user, selected }) => {
  const col = selected ? "#4488ff" : "#1e1e1e";
  const stroke = selected ? "#66aaff" : "rgba(68,136,255,0.5)";
  return (
    <svg width="56" height="60" viewBox="0 0 56 60" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`sh-${user.id}`}><path d={SHIELD}/></clipPath></defs>
      {selected && <path d={SHIELD} fill="rgba(68,136,255,0.2)" transform="scale(1.06) translate(-1.5,-1)"/>}
      <path d={SHIELD} fill={col} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <PhotoOrInitial user={user} clipId={`sh-${user.id}`} y={30}/>
      {user.online && <circle cx="44" cy="12" r="5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>}
    </svg>
  );
};

// 5. Spade ♠
const SpadePin = ({ user, selected }) => {
  const col = selected ? "#fff" : "#1e1e1e";
  const stroke = selected ? "#fff" : "rgba(255,255,255,0.4)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`sp-${user.id}`}><path d={SPADE}/></clipPath></defs>
      {selected && <path d={SPADE} fill="rgba(255,255,255,0.15)" transform="scale(1.05) translate(-1.3,-1.3)"/>}
      <path d={SPADE} fill={col} stroke={stroke} strokeWidth="1.5"/>
      <PhotoOrInitial user={user} clipId={`sp-${user.id}`} fill={selected ? "#000" : "#fff"} y={26}/>
      {user.online && <circle cx="44" cy="10" r="5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>}
    </svg>
  );
};

// 6. Flex/Muscle
const FlexPin = ({ user, selected }) => {
  const col = selected ? "#ff8844" : "#1e1e1e";
  const stroke = selected ? "#ffaa66" : "rgba(255,136,68,0.5)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`fl-${user.id}`}><path d={FLEX}/></clipPath></defs>
      <path d={FLEX} fill={col} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <PhotoOrInitial user={user} clipId={`fl-${user.id}`} y={30}/>
      {user.online && <circle cx="44" cy="44" r="5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>}
    </svg>
  );
};

// 7. Diamond
const DiamondPin = ({ user, selected }) => {
  const col = selected ? "#44ddff" : "#1e1e1e";
  const stroke = selected ? "#66eeff" : "rgba(68,221,255,0.5)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id={`di-${user.id}`}><path d={DIAMOND}/></clipPath>
        <linearGradient id={`dg-${user.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={selected ? "#44ddff" : "#1e1e1e"}/>
          <stop offset="100%" stopColor={selected ? "#0099cc" : "#111"}/>
        </linearGradient>
      </defs>
      {selected && <path d={DIAMOND} fill="rgba(68,221,255,0.2)" transform="scale(1.08) translate(-2,-2)"/>}
      <path d={DIAMOND} fill={`url(#dg-${user.id})`} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      {/* inner facet lines */}
      <line x1="28" y1="2" x2="28" y2="54" stroke={selected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.05)"} strokeWidth="1"/>
      <line x1="2" y1="28" x2="54" y2="28" stroke={selected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.05)"} strokeWidth="1"/>
      <PhotoOrInitial user={user} clipId={`di-${user.id}`} fill={selected ? "#000" : "#fff"} y={28}/>
      {user.online && <circle cx="50" cy="14" r="5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>}
    </svg>
  );
};

// 8. Skull
const SkullPin = ({ user, selected }) => {
  const col = selected ? "#eee" : "#1e1e1e";
  const stroke = selected ? "#fff" : "rgba(255,255,255,0.2)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`sk-${user.id}`}><path d={SKULL}/></clipPath></defs>
      <path d={SKULL} fill={col} stroke={stroke} strokeWidth="2"/>
      {/* eyes */}
      <path d={SKULL_EYES} fill={selected ? "#333" : "#080808"} clipPath={`url(#sk-${user.id})`}/>
      {/* teeth */}
      <path d={SKULL_TEETH} fill="none" stroke={selected ? "#333" : "#080808"} strokeWidth="2.5" strokeLinecap="round" clipPath={`url(#sk-${user.id})`}/>
      {/* jaw line */}
      <line x1="18" y1="42" x2="38" y2="42" stroke={selected ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.1)"} strokeWidth="1.5" clipPath={`url(#sk-${user.id})`}/>
      {user.online && <circle cx="44" cy="8" r="5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>}
    </svg>
  );
};

// 9. Briefs
const BriefsPin = ({ user, selected }) => {
  const col = selected ? "#4488ff" : "#1e1e1e";
  const stroke = selected ? "#66aaff" : "rgba(68,136,255,0.5)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`br-${user.id}`}><path d={BRIEFS}/></clipPath></defs>
      <path d={BRIEFS} fill={col} stroke={stroke} strokeWidth="2"/>
      {/* waistband */}
      <path d={BRIEFS_BAND} fill="none" stroke={selected ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.15)"} strokeWidth="3" strokeLinecap="round"/>
      {/* center crease */}
      <path d={BRIEFS_CREASE} fill="none" stroke={selected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.07)"} strokeWidth="1.5" strokeLinecap="round" clipPath={`url(#br-${user.id})`}/>
      <PhotoOrInitial user={user} clipId={`br-${user.id}`} y={34}/>
      {user.online && <circle cx="44" cy="44" r="5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>}
    </svg>
  );
};

// ─── Pin config ───────────────────────────────────────────────────────────────
const PINS = [
  { id: "eggplant",     label: "Eggplant 🍆",      desc: "Classic shape, shine, leaf detail" },
  { id: "eggplantdrop", label: "Eggplant Drop",     desc: "Location pointer + match % badge" },
  { id: "chest",        label: "Chest / Pec",       desc: "Two-lobe pec shape, center divider" },
  { id: "shield",       label: "Shield",            desc: "Bold, masculine crest shape" },
  { id: "spade",        label: "Spade ♠",           desc: "Card suit — ANL brand tie-in" },
  { id: "flex",         label: "Flex Arm 💪",       desc: "Flexed bicep silhouette" },
  { id: "diamond",      label: "Diamond",           desc: "Geometric, premium feel, facet lines" },
  { id: "skull",        label: "Skull",             desc: "Late night edge, eyes + teeth detail" },
  { id: "briefs",       label: "Briefs",            desc: "Waistband + center crease detail" },
];

const PinRenderer = ({ id, user, selected }) => {
  switch (id) {
    case "eggplant":     return <EggplantPin     user={user} selected={selected}/>;
    case "eggplantdrop": return <EggplantDropPin user={user} selected={selected}/>;
    case "chest":        return <ChestPin        user={user} selected={selected}/>;
    case "shield":       return <ShieldPin       user={user} selected={selected}/>;
    case "spade":        return <SpadePin        user={user} selected={selected}/>;
    case "flex":         return <FlexPin         user={user} selected={selected}/>;
    case "diamond":      return <DiamondPin      user={user} selected={selected}/>;
    case "skull":        return <SkullPin        user={user} selected={selected}/>;
    case "briefs":       return <BriefsPin       user={user} selected={selected}/>;
    default:             return null;
  }
};

// ─── Showcase ─────────────────────────────────────────────────────────────────
export default function ANLMalePinShowcase() {
  const [selected,  setSelected]  = useState(null);
  const [favorites, setFavorites] = useState([]);

  const toggleFav = (id) => setFavorites(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "'DM Sans', sans-serif", padding: "24px 16px 48px", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        .pin-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 24px 16px 18px;
          display: flex; flex-direction: column; align-items: center; gap: 16px;
          cursor: pointer; transition: border-color 0.2s, background 0.2s; position: relative;
        }
        .pin-card:hover { border-color: rgba(68,136,255,0.3); background: rgba(68,136,255,0.04); }
        .pin-card.active { border-color: rgba(68,136,255,0.6); background: rgba(68,136,255,0.07); }
        .pin-card.favorited { border-color: rgba(136,68,255,0.5); background: rgba(136,68,255,0.06); }
        .fav-btn { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 16px; cursor: pointer; opacity: 0.5; transition: opacity 0.15s, transform 0.15s; }
        .fav-btn:hover, .fav-btn.on { opacity: 1; transform: scale(1.2); }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
        .label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); text-align: center; letter-spacing: 0.3px; }
        .desc { font-size: 10px; color: rgba(255,255,255,0.3); text-align: center; line-height: 1.4; }
        .fav-tag { background: rgba(136,68,255,0.15); border: 1px solid rgba(136,68,255,0.3); color: #aa66ff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .selected-badge { font-size: 9px; color: #4488ff; font-weight: 700; letter-spacing: 1px; background: rgba(68,136,255,0.1); padding: 3px 10px; border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 4, lineHeight: 1 }}>
          ALL<span style={{ color: "#ffa032" }}>NIGHT</span>LONG
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: 1 }}>
          MALE PIN VARIANTS · TAP TO SELECT · 🍆 TO FAVORITE
        </div>
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div style={{ marginBottom: 28, padding: 16, background: "rgba(136,68,255,0.06)", borderRadius: 16, border: "1px solid rgba(136,68,255,0.15)" }}>
          <div style={{ fontSize: 10, color: "#aa66ff", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>FAVORITES</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {favorites.map(id => {
              const pin = PINS.find(p => p.id === id);
              return <div key={id} className="fav-tag">{pin?.label}</div>;
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, marginBottom: 4 }}>Male Variants</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5, marginBottom: 16 }}>9 STYLES · CLICK TO PREVIEW SELECTED STATE</div>

      <div className="grid">
        {PINS.map(pin => (
          <div
            key={pin.id}
            className={`pin-card ${selected === pin.id ? "active" : ""} ${favorites.includes(pin.id) ? "favorited" : ""}`}
            onClick={() => setSelected(p => p === pin.id ? null : pin.id)}
          >
            <button className={`fav-btn ${favorites.includes(pin.id) ? "on" : ""}`}
              onClick={(e) => { e.stopPropagation(); toggleFav(pin.id); }}>
              {favorites.includes(pin.id) ? "🍆" : "🤍"}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80, position: "relative" }}>
              <PinRenderer id={pin.id} user={MOCK_USER} selected={selected === pin.id}/>
            </div>

            <div>
              <div className="label">{pin.label}</div>
              <div className="desc" style={{ marginTop: 4 }}>{pin.desc}</div>
            </div>

            {selected === pin.id && <div className="selected-badge">SELECTED STATE</div>}
          </div>
        ))}
      </div>

      {/* Pairing guide */}
      <div style={{ marginTop: 36, padding: 20, background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1, marginBottom: 12 }}>PAIRING WITH FEMALE PINS</div>
        {[
          { female: "Butt (Classic)",   male: "Eggplant 🍆 — obvious match energy" },
          { female: "Match Color",      male: "Eggplant Drop — same badge treatment, blue tones" },
          { female: "Cartoon (New)",    male: "Skull — edgy new user energy" },
          { female: "Heart Drop",       male: "Shield — bold selected state for both" },
          { female: "Cluster Stack",    male: "Same cluster pin — gender-agnostic" },
        ].map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 120 }}>💁 {c.female}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>↔ 🧍 {c.male}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
