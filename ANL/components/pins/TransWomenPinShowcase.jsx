import { useState } from "react";

const MOCK_USER = { id: 1, name: "Ava", age: 25, match: 88, online: true, isNew: false, photoUrl: null };

// ─── Paths ────────────────────────────────────────────────────────────────────

// Butterfly wings
const BUTTERFLY_L = "M28,28 C28,28 10,18 6,8 C4,2 10,0 14,4 C18,8 22,18 28,28Z";
const BUTTERFLY_R = "M28,28 C28,28 46,18 50,8 C52,2 46,0 42,4 C38,8 34,18 28,28Z";
const BUTTERFLY_LB = "M28,28 C28,28 8,32 4,42 C2,50 8,52 14,48 C20,44 24,36 28,28Z";
const BUTTERFLY_RB = "M28,28 C28,28 48,32 52,42 C54,50 48,52 42,48 C36,44 32,36 28,28Z";
const BUTTERFLY_BODY = "M28,10 C26,10 24,14 24,20 L24,36 C24,42 26,46 28,46 C30,46 32,42 32,36 L32,20 C32,14 30,10 28,10Z";

// Star / celestial
const STAR = "M28,2 L33,20 L52,20 L37,31 L42,50 L28,39 L14,50 L19,31 L4,20 L23,20 Z";

// Phoenix / flame
const PHOENIX = "M28,54 C20,46 8,36 8,24 C8,14 16,6 24,8 C26,8 28,10 28,10 C28,10 30,8 32,8 C40,6 48,14 48,24 C48,36 36,46 28,54Z";
const PHOENIX_WINGS = "M8,24 C4,18 2,10 8,8 C14,6 20,12 28,10 M48,24 C52,18 54,10 48,8 C42,6 36,12 28,10";

// Trans symbol ⚧
const TRANS_CIRCLE = "M28,42 A18,18 0 1,1 27.9,42Z";
const TRANS_ARROW1 = "M40,16 L50,6 M50,6 L50,14 M50,6 L42,6";
const TRANS_CROSS  = "M28,4 L28,0 M24,2 L32,2";

// Hourglass (femme shape)
const HOURGLASS = "M10,4 L46,4 L36,28 L46,52 L10,52 L20,28 Z";

// Crescent moon
const CRESCENT = "M28,2 C16,2 6,12 6,28 C6,44 16,54 28,54 C20,54 14,44 14,28 C14,12 20,2 28,2Z";

// Venus mirror ♀ stylized
const VENUS_CIRCLE = "M28,36 A14,14 0 1,1 27.9,36Z";
const VENUS_STEM   = "M28,50 L28,58 M22,54 L34,54";

// Lotus
const LOTUS_C = "M28,48 C22,40 14,30 14,22 C14,14 20,10 28,10 C36,10 42,14 42,22 C42,30 34,40 28,48Z";
const LOTUS_L = "M14,22 C10,16 6,8 10,4 C14,0 20,6 22,14";
const LOTUS_R = "M42,22 C46,16 50,8 46,4 C42,0 36,6 34,14";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TW_COLORS = {
  primary:   "#f7a8c4",
  secondary: "#55cdfc",
  white:     "#ffffff",
  accent:    "#ff6eb4",
  glow:      "rgba(247,168,196,0.6)",
};

const Initial = ({ user, x = 28, y = 28, fill = "#fff", fontSize = 13 }) => (
  <text x={x} y={y} textAnchor="middle" dominantBaseline="middle"
    fontSize={fontSize} fontFamily="'Bebas Neue', sans-serif"
    letterSpacing="1" fill={fill} style={{ userSelect: "none" }}>
    {user.name[0]}
  </text>
);

const OnlineDot = ({ cx = 46, cy = 46 }) => (
  <circle cx={cx} cy={cy} r="4.5" fill="#44ff88" stroke="#080808" strokeWidth="2"/>
);

// ─── Pin Components ───────────────────────────────────────────────────────────

// 1. Butterfly
const ButterflyPin = ({ user, selected }) => {
  const col = selected ? TW_COLORS.accent : "#1e1e1e";
  const s1 = selected ? TW_COLORS.primary : "rgba(247,168,196,0.6)";
  const s2 = selected ? TW_COLORS.secondary : "rgba(85,205,252,0.5)";
  return (
    <svg width="60" height="60" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={`bwg-${user.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={TW_COLORS.primary} stopOpacity={selected ? 0.9 : 0.7}/>
          <stop offset="50%" stopColor={TW_COLORS.white}   stopOpacity={selected ? 0.6 : 0.3}/>
          <stop offset="100%" stopColor={TW_COLORS.secondary} stopOpacity={selected ? 0.9 : 0.7}/>
        </linearGradient>
      </defs>
      {/* Upper wings */}
      <path d={BUTTERFLY_L}  fill={`url(#bwg-${user.id})`} stroke={s1} strokeWidth="1.5"/>
      <path d={BUTTERFLY_R}  fill={`url(#bwg-${user.id})`} stroke={s2} strokeWidth="1.5"/>
      {/* Lower wings */}
      <path d={BUTTERFLY_LB} fill={`url(#bwg-${user.id})`} stroke={s1} strokeWidth="1.5" opacity="0.8"/>
      <path d={BUTTERFLY_RB} fill={`url(#bwg-${user.id})`} stroke={s2} strokeWidth="1.5" opacity="0.8"/>
      {/* Body */}
      <path d={BUTTERFLY_BODY} fill={col} stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      <Initial user={user} y={28} fill="#fff" fontSize={11}/>
      {user.online && <OnlineDot cx={40} cy={44}/>}
    </svg>
  );
};

// 2. Star / Celestial
const StarPin = ({ user, selected }) => {
  const col = selected ? TW_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TW_COLORS.accent : "rgba(247,168,196,0.6)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <radialGradient id={`stg-${user.id}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={TW_COLORS.white} stopOpacity={selected ? 0.3 : 0.1}/>
          <stop offset="100%" stopColor={TW_COLORS.primary} stopOpacity={selected ? 0.6 : 0.2}/>
        </radialGradient>
      </defs>
      {selected && <path d={STAR} fill={TW_COLORS.glow} transform="scale(1.15) translate(-3.5,-3.5)"/>}
      <path d={STAR} fill={col} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d={STAR} fill={`url(#stg-${user.id})`}/>
      <Initial user={user} y={26} fill={selected ? "#000" : "#fff"} fontSize={12}/>
      {user.online && <OnlineDot cx={44} cy={10}/>}
    </svg>
  );
};

// 3. Phoenix / Flame
const PhoenixPin = ({ user, selected }) => {
  const col = selected ? "#ff6eb4" : "#1e1e1e";
  const stroke = selected ? "#ffaacc" : "rgba(255,110,180,0.6)";
  return (
    <svg width="56" height="58" viewBox="0 0 56 58" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <linearGradient id={`phg-${user.id}`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={TW_COLORS.secondary} stopOpacity="0.8"/>
          <stop offset="50%" stopColor={TW_COLORS.white}    stopOpacity="0.4"/>
          <stop offset="100%" stopColor={TW_COLORS.primary} stopOpacity="0.9"/>
        </linearGradient>
      </defs>
      {/* Wings */}
      <path d={PHOENIX_WINGS} fill="none" stroke={selected ? "rgba(247,168,196,0.6)" : "rgba(247,168,196,0.3)"} strokeWidth="2" strokeLinecap="round"/>
      {/* Body */}
      <path d={PHOENIX} fill={col} stroke={stroke} strokeWidth="1.8"/>
      <path d={PHOENIX} fill={`url(#phg-${user.id})`} opacity="0.35"/>
      <Initial user={user} y={30} fill="#fff" fontSize={12}/>
      {/* flame tip */}
      <path d="M24,8 C26,4 30,4 32,8 C30,6 26,6 24,8Z" fill={TW_COLORS.secondary} opacity="0.8"/>
      {user.online && <OnlineDot cx={44} cy={46}/>}
    </svg>
  );
};

// 4. Trans Symbol ⚧
const TransSymbolPin = ({ user, selected }) => {
  const col = selected ? TW_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TW_COLORS.accent : "rgba(247,168,196,0.6)";
  return (
    <svg width="56" height="64" viewBox="0 0 56 64" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`tsc-${user.id}`}><circle cx="28" cy="30" r="18"/></clipPath></defs>
      {selected && <circle cx="28" cy="30" r="22" fill={TW_COLORS.glow} opacity="0.3"/>}
      <circle cx="28" cy="30" r="18" fill={col} stroke={stroke} strokeWidth="2"/>
      {/* ♀ stem */}
      <line x1="28" y1="48" x2="28" y2="58" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="54" x2="34" y2="54" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      {/* ♂ arrow */}
      <line x1="40" y1="12" x2="50" y2="4"  stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="50" y1="4"  x2="50" y2="12" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="50" y1="4"  x2="42" y2="4"  stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      {/* + on top */}
      <line x1="28" y1="4"  x2="28" y2="12" stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <line x1="24" y1="8"  x2="32" y2="8"  stroke={stroke} strokeWidth="2" strokeLinecap="round"/>
      <Initial user={user} y={30} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={44} cy={46}/>}
    </svg>
  );
};

// 5. Hourglass (femme silhouette)
const HourglassPin = ({ user, selected }) => {
  const col = selected ? TW_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TW_COLORS.accent : "rgba(247,168,196,0.5)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id={`hg-${user.id}`}><path d={HOURGLASS}/></clipPath>
        <linearGradient id={`hgg-${user.id}`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={TW_COLORS.secondary} stopOpacity="0.6"/>
          <stop offset="50%" stopColor={TW_COLORS.white} stopOpacity="0.1"/>
          <stop offset="100%" stopColor={TW_COLORS.primary} stopOpacity="0.6"/>
        </linearGradient>
      </defs>
      <path d={HOURGLASS} fill={col} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      <path d={HOURGLASS} fill={`url(#hgg-${user.id})`} opacity="0.4"/>
      <Initial user={user} y={14} fill={selected ? "#000" : "#fff"} fontSize={11}/>
      <Initial user={user} y={42} fill={selected ? "#000" : "#fff"} fontSize={11}/>
      {/* waist line */}
      <line x1="18" y1="28" x2="38" y2="28" stroke={selected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)"} strokeWidth="1.5" clipPath={`url(#hg-${user.id})`}/>
      {user.online && <OnlineDot cx={44} cy={46}/>}
    </svg>
  );
};

// 6. Crescent Moon
const CrescentPin = ({ user, selected }) => {
  const col = selected ? TW_COLORS.secondary : "#1e1e1e";
  const stroke = selected ? TW_COLORS.primary : "rgba(85,205,252,0.5)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`cm-${user.id}`}><path d={CRESCENT}/></clipPath></defs>
      {selected && <circle cx="28" cy="28" r="26" fill={TW_COLORS.glow} opacity="0.15"/>}
      <path d={CRESCENT} fill={col} stroke={stroke} strokeWidth="2"/>
      <Initial user={user} y={28} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={30} cy={46}/>}
    </svg>
  );
};

// 7. Venus Symbol
const VenusPin = ({ user, selected }) => {
  const col = selected ? TW_COLORS.accent : "#1e1e1e";
  const stroke = selected ? TW_COLORS.primary : "rgba(247,168,196,0.6)";
  return (
    <svg width="56" height="64" viewBox="0 0 56 64" style={{ overflow: "visible", display: "block" }}>
      <defs><clipPath id={`vn-${user.id}`}><circle cx="28" cy="28" r="18"/></clipPath></defs>
      {selected && <circle cx="28" cy="28" r="22" fill={TW_COLORS.glow} opacity="0.25"/>}
      <circle cx="28" cy="28" r="18" fill={col} stroke={stroke} strokeWidth="2"/>
      <line x1="28" y1="46" x2="28" y2="58" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="20" y1="53" x2="36" y2="53" stroke={stroke} strokeWidth="2.5" strokeLinecap="round"/>
      <Initial user={user} y={28} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={44} cy={14}/>}
    </svg>
  );
};

// 8. Lotus
const LotusPin = ({ user, selected }) => {
  const col = selected ? TW_COLORS.primary : "#1e1e1e";
  const stroke = selected ? TW_COLORS.accent : "rgba(247,168,196,0.5)";
  const sideStroke = selected ? "rgba(85,205,252,0.8)" : "rgba(85,205,252,0.4)";
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id={`lt-${user.id}`}><path d={LOTUS_C}/></clipPath>
        <linearGradient id={`ltg-${user.id}`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={TW_COLORS.white} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={TW_COLORS.primary} stopOpacity="0.5"/>
        </linearGradient>
      </defs>
      <path d={LOTUS_L} fill={col} stroke={sideStroke} strokeWidth="1.5" strokeLinejoin="round" opacity="0.8"/>
      <path d={LOTUS_R} fill={col} stroke={sideStroke} strokeWidth="1.5" strokeLinejoin="round" opacity="0.8"/>
      <path d={LOTUS_C} fill={col} stroke={stroke} strokeWidth="2"/>
      <path d={LOTUS_C} fill={`url(#ltg-${user.id})`} opacity="0.5"/>
      <Initial user={user} y={30} fill={selected ? "#000" : "#fff"}/>
      {user.online && <OnlineDot cx={44} cy={44}/>}
    </svg>
  );
};

// 9. Drop Pin with trans flag gradient
const TransFlagDropPin = ({ user, selected }) => {
  const HEART = "M28,46 C28,46 6,32 6,18 C6,9 13,4 20,4 C24,4 28,7 28,7 C28,7 32,4 36,4 C43,4 50,9 50,18 C50,32 28,46 28,46Z";
  return (
    <svg width="56" height="66" viewBox="0 0 56 66" style={{ overflow: "visible", display: "block" }}>
      <defs>
        <clipPath id={`tfd-${user.id}`}><path d={HEART}/></clipPath>
        <linearGradient id={`tfg-${user.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#55cdfc"/>
          <stop offset="30%"  stopColor="#f7a8c4"/>
          <stop offset="50%"  stopColor="#ffffff"/>
          <stop offset="70%"  stopColor="#f7a8c4"/>
          <stop offset="100%" stopColor="#55cdfc"/>
        </linearGradient>
      </defs>
      <path d={HEART} fill={`url(#tfg-${user.id})`} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" clipPath={`url(#tfd-${user.id})`}/>
      <path d={HEART} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      <Initial user={user} y={24} fill="#1a1a1a" fontSize={13}/>
      <path d="M24,46 L28,62 L32,46Z" fill="#f7a8c4" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinejoin="round"/>
      <rect x="15" y="30" width="26" height="12" rx="6" fill="rgba(0,0,0,0.4)"/>
      <text x="28" y="36" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontFamily="'DM Sans', sans-serif" fontWeight="800" fill="#fff">{user.match}%</text>
    </svg>
  );
};

// ─── Config ───────────────────────────────────────────────────────────────────
const PINS = [
  { id: "butterfly",    label: "Butterfly 🦋",      desc: "Pink/white/blue gradient wings" },
  { id: "star",         label: "Star ✨",            desc: "Celestial, 5-point with glow" },
  { id: "phoenix",      label: "Phoenix 🔥",         desc: "Flame body, spread wings" },
  { id: "transsymbol",  label: "Trans Symbol ⚧",     desc: "⚧ with ♀ stem + ♂ arrow + cross" },
  { id: "hourglass",    label: "Hourglass",          desc: "Femme silhouette, gradient fill" },
  { id: "crescent",     label: "Crescent Moon 🌙",   desc: "Blue crescent, celestial" },
  { id: "venus",        label: "Venus ♀",            desc: "Circle + cross stem" },
  { id: "lotus",        label: "Lotus 🪷",           desc: "Three-petal bloom, side petals" },
  { id: "transflagdrop",label: "Trans Flag Drop 🏳️‍⚧️", desc: "Heart drop pin with flag gradient" },
];

const PinRenderer = ({ id, user, selected }) => {
  switch (id) {
    case "butterfly":     return <ButterflyPin     user={user} selected={selected}/>;
    case "star":          return <StarPin          user={user} selected={selected}/>;
    case "phoenix":       return <PhoenixPin       user={user} selected={selected}/>;
    case "transsymbol":   return <TransSymbolPin   user={user} selected={selected}/>;
    case "hourglass":     return <HourglassPin     user={user} selected={selected}/>;
    case "crescent":      return <CrescentPin      user={user} selected={selected}/>;
    case "venus":         return <VenusPin         user={user} selected={selected}/>;
    case "lotus":         return <LotusPin         user={user} selected={selected}/>;
    case "transflagdrop": return <TransFlagDropPin user={user} selected={selected}/>;
    default: return null;
  }
};

export default function ANLTransWomenPinShowcase() {
  const [selected,  setSelected]  = useState(null);
  const [favorites, setFavorites] = useState([]);
  const toggleFav = (id) => setFavorites(p => p.includes(id) ? p.filter(f => f !== id) : [...p, id]);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", fontFamily: "'DM Sans', sans-serif", padding: "24px 16px 48px", color: "#fff" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        .pin-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 24px 16px 18px; display: flex; flex-direction: column; align-items: center; gap: 16px; cursor: pointer; transition: border-color 0.2s, background 0.2s; position: relative; }
        .pin-card:hover { border-color: rgba(247,168,196,0.3); background: rgba(247,168,196,0.04); }
        .pin-card.active { border-color: rgba(247,168,196,0.6); background: rgba(247,168,196,0.07); }
        .pin-card.favorited { border-color: rgba(85,205,252,0.5); background: rgba(85,205,252,0.05); }
        .fav-btn { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 16px; cursor: pointer; opacity: 0.5; transition: opacity 0.15s, transform 0.15s; }
        .fav-btn:hover, .fav-btn.on { opacity: 1; transform: scale(1.2); }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
        .label { font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.85); text-align: center; }
        .desc { font-size: 10px; color: rgba(255,255,255,0.3); text-align: center; line-height: 1.4; margin-top: 4px; }
        .fav-tag { background: rgba(247,168,196,0.12); border: 1px solid rgba(247,168,196,0.3); color: #f7a8c4; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .badge { font-size: 9px; color: #f7a8c4; font-weight: 700; letter-spacing: 1px; background: rgba(247,168,196,0.1); padding: 3px 10px; border-radius: 10px; }
        /* Trans flag accent bar */
        .flag-bar { height: 4px; border-radius: 2px; background: linear-gradient(90deg, #55cdfc, #f7a8c4, #ffffff, #f7a8c4, #55cdfc); margin-bottom: 24px; }
      `}</style>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 4, lineHeight: 1 }}>
          ALL<span style={{ color: "#ffa032" }}>NIGHT</span>LONG
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: 1 }}>
          TRANS WOMEN PINS · TAP TO SELECT · 🦋 TO FAVORITE
        </div>
      </div>

      <div className="flag-bar"/>

      {favorites.length > 0 && (
        <div style={{ marginBottom: 24, padding: 16, background: "rgba(247,168,196,0.05)", borderRadius: 16, border: "1px solid rgba(247,168,196,0.15)" }}>
          <div style={{ fontSize: 10, color: "#f7a8c4", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>FAVORITES</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {favorites.map(id => {
              const p = PINS.find(p => p.id === id);
              return <div key={id} className="fav-tag">{p?.label}</div>;
            })}
          </div>
        </div>
      )}

      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 3, marginBottom: 4 }}>Trans Women</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5, marginBottom: 16 }}>9 STYLES · CLICK TO PREVIEW SELECTED STATE</div>

      <div className="grid">
        {PINS.map(pin => (
          <div key={pin.id}
            className={`pin-card ${selected === pin.id ? "active" : ""} ${favorites.includes(pin.id) ? "favorited" : ""}`}
            onClick={() => setSelected(p => p === pin.id ? null : pin.id)}>
            <button className={`fav-btn ${favorites.includes(pin.id) ? "on" : ""}`}
              onClick={(e) => { e.stopPropagation(); toggleFav(pin.id); }}>
              {favorites.includes(pin.id) ? "🦋" : "🤍"}
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
          { cond: "Selected / tapped",      pin: "Trans Flag Drop (heart pointer + match %)" },
          { cond: "Match ≥ 90% + online",   pin: "Butterfly (full wing gradient)" },
          { cond: "New user",               pin: "Lotus (blooming = new arrival)" },
          { cond: "Top rated",              pin: "Phoenix (rare, elevated)" },
          { cond: "Default online",         pin: "Star or Venus (user-chosen in settings)" },
          { cond: "Offline",                pin: "Crescent Moon (dimmed)" },
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
