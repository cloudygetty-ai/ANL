import { useState, useEffect } from "react";

const MOCK_USER = { id: 1, name: "Mia", age: 24, match: 91, online: true, photoUrl: null };

// ─── Shape paths ─────────────────────────────────────────────────────────────

const BUTT_CLASSIC   = "M4,20 C4,8 20,0 28,0 C36,0 52,8 52,20 C52,32 44,44 28,52 C12,44 4,32 4,20Z";
const BUTT_ROUND     = "M6,22 C6,10 16,2 28,2 C40,2 50,10 50,22 C50,36 40,50 28,54 C16,50 6,36 6,22Z";
const PEACH          = "M28,2 C18,2 6,10 6,22 C6,36 14,48 22,52 C24,53 26,54 28,54 C30,54 32,53 34,52 C42,48 50,36 50,22 C50,10 38,2 28,2Z";
const HEART_BUTT     = "M28,50 C28,50 4,34 4,20 C4,10 12,4 20,4 C24,4 28,7 28,7 C28,7 32,4 36,4 C44,4 52,10 52,20 C52,34 28,50 28,50Z";
const SILHOUETTE     = "M10,48 C10,38 14,28 14,22 C14,12 20,4 28,4 C36,4 42,12 42,22 C42,28 46,38 46,48 C40,52 34,54 28,54 C22,54 16,52 10,48Z";
const CARTOON        = "M5,21 C4,8 19,1 28,1 C37,1 52,8 51,21 C52,33 43,46 28,53 C13,46 4,33 5,21Z";
const DROPPIN_TOP    = "M4,20 C4,8 20,0 28,0 C36,0 52,8 52,20 C52,32 44,44 28,52 C12,44 4,32 4,20Z";
const MINIMAL_CIRCLE = "M28,2 A26,26 0 1,1 27.9,2Z";

// ─── Color helpers ────────────────────────────────────────────────────────────

const matchColor = (pct) => {
  if (pct >= 90) return "#ff4466";
  if (pct >= 75) return "#ffa032";
  return "#ffcc44";
};

// ─── Individual pin components ────────────────────────────────────────────────

const CrackLine = ({ clipId, color = "rgba(0,0,0,0.3)" }) => (
  <line x1="28" y1="2" x2="28" y2="30"
    stroke={color} strokeWidth="1.8" strokeLinecap="round"
    clipPath={`url(#${clipId})`} />
);

const PhotoOrInitial = ({ user, clipId, fontSize = 14 }) => (
  user.photoUrl
    ? <image href={user.photoUrl} x="0" y="0" width="56" height="56"
        clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
    : <text x="28" y="24" textAnchor="middle" dominantBaseline="middle"
        fontSize={fontSize} fontFamily="'Bebas Neue', sans-serif"
        letterSpacing="1" fill="#fff" style={{ userSelect: "none" }}>
        {user.name[0]}
      </text>
);

// 1. Classic butt
const ClassicPin = ({ user, selected, size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56"
    style={{ filter: selected ? "drop-shadow(0 0 8px rgba(255,160,50,0.9))" : "drop-shadow(0 3px 8px rgba(0,0,0,0.8))", overflow: "visible" }}>
    <defs><clipPath id="cc1"><path d={BUTT_CLASSIC}/></clipPath></defs>
    <path d={BUTT_CLASSIC} fill={selected ? "#ffa032" : "#1e1e1e"}
      stroke={selected ? "#ffa032" : "rgba(255,160,50,0.5)"} strokeWidth="2"/>
    <PhotoOrInitial user={user} clipId="cc1"/>
    <CrackLine clipId="cc1" color={selected ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.1)"}/>
  </svg>
);

// 2. Peach 🍑
const PeachPin = ({ user, selected, size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56"
    style={{ filter: selected ? "drop-shadow(0 0 8px rgba(255,100,50,0.9))" : "drop-shadow(0 3px 8px rgba(0,0,0,0.8))", overflow: "visible" }}>
    <defs><clipPath id="pc1"><path d={PEACH}/></clipPath></defs>
    <path d={PEACH} fill={selected ? "#ff6632" : "#1e1e1e"}
      stroke={selected ? "#ff6632" : "rgba(255,100,50,0.6)"} strokeWidth="2"/>
    <PhotoOrInitial user={user} clipId="pc1"/>
    <CrackLine clipId="pc1"/>
    {/* Peach leaf */}
    <path d="M28,2 C28,2 32,-4 36,-2 C34,2 28,2 28,2Z" fill="#44aa44" stroke="none"/>
  </svg>
);

// 3. Heart-butt drop pin
const HeartDropPin = ({ user, selected, size = 64 }) => (
  <svg width={size} height={size+12} viewBox="0 0 56 68"
    style={{ filter: selected ? "drop-shadow(0 0 8px rgba(255,60,100,0.9))" : "drop-shadow(0 3px 8px rgba(0,0,0,0.8))", overflow: "visible" }}>
    <defs><clipPath id="hd1"><path d={HEART_BUTT}/></clipPath></defs>
    <path d={HEART_BUTT} fill={selected ? "#ff3c64" : "#1e1e1e"}
      stroke={selected ? "#ff3c64" : "rgba(255,60,100,0.6)"} strokeWidth="2"/>
    <PhotoOrInitial user={user} clipId="hd1"/>
    <CrackLine clipId="hd1"/>
    {/* Drop pointer */}
    <path d="M24,50 L28,64 L32,50Z" fill={selected ? "#ff3c64" : "#1e1e1e"}
      stroke={selected ? "#ff3c64" : "rgba(255,60,100,0.5)"} strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

// 4. Silhouette (side profile)
const SilhouettePin = ({ user, selected, size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56"
    style={{ filter: selected ? "drop-shadow(0 0 8px rgba(255,160,50,0.9))" : "drop-shadow(0 3px 8px rgba(0,0,0,0.8))", overflow: "visible" }}>
    <defs><clipPath id="sl1"><path d={SILHOUETTE}/></clipPath></defs>
    <path d={SILHOUETTE} fill={selected ? "#ffa032" : "#1e1e1e"}
      stroke={selected ? "#ffa032" : "rgba(255,255,255,0.15)"} strokeWidth="2.5" strokeLinejoin="round"/>
    <PhotoOrInitial user={user} clipId="sl1"/>
    <CrackLine clipId="sl1" color="rgba(255,255,255,0.08)"/>
  </svg>
);

// 5. Cartoon (thick wobbly stroke)
const CartoonPin = ({ user, selected, size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56"
    style={{ filter: selected ? "drop-shadow(0 0 10px rgba(255,220,50,0.9))" : "drop-shadow(0 3px 8px rgba(0,0,0,0.8))", overflow: "visible" }}>
    <defs><clipPath id="ct1"><path d={CARTOON}/></clipPath></defs>
    <path d={CARTOON} fill={selected ? "#ffdc32" : "#1a1a1a"}
      stroke="#fff" strokeWidth="3.5" strokeLinejoin="round"/>
    <PhotoOrInitial user={user} clipId="ct1" fontSize={13}/>
    <CrackLine clipId="ct1" color="rgba(0,0,0,0.2)"/>
  </svg>
);

// 6. Minimal circle with crack only
const MinimalPin = ({ user, selected, size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56"
    style={{ filter: selected ? "drop-shadow(0 0 8px rgba(255,160,50,0.7))" : "drop-shadow(0 2px 6px rgba(0,0,0,0.7))", overflow: "visible" }}>
    <defs><clipPath id="mn1"><circle cx="28" cy="28" r="26"/></clipPath></defs>
    <circle cx="28" cy="28" r="26" fill={selected ? "#ffa032" : "#111"}
      stroke={selected ? "#ffa032" : "rgba(255,255,255,0.12)"} strokeWidth="1.5"/>
    <PhotoOrInitial user={user} clipId="mn1"/>
    {/* Just the crack curve — minimal */}
    <path d="M28,4 C26,10 26,18 28,26" stroke="rgba(255,255,255,0.15)"
      strokeWidth="1.2" fill="none" strokeLinecap="round"
      clipPath="url(#mn1)"/>
  </svg>
);

// 7. Match color pin (color = match %)
const MatchColorPin = ({ user, selected, size = 56 }) => {
  const col = matchColor(user.match);
  return (
    <svg width={size} height={size} viewBox="0 0 56 56"
      style={{ filter: `drop-shadow(0 0 8px ${col}88)`, overflow: "visible" }}>
      <defs>
        <clipPath id="mc1"><path d={BUTT_ROUND}/></clipPath>
        <linearGradient id="mcg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.9"/>
          <stop offset="100%" stopColor={col} stopOpacity="0.4"/>
        </linearGradient>
      </defs>
      <path d={BUTT_ROUND} fill={selected ? col : "#1a1a1a"}
        stroke={col} strokeWidth="2"/>
      {!selected && <path d={BUTT_ROUND} fill="url(#mcg1)" opacity="0.3"/>}
      <PhotoOrInitial user={user} clipId="mc1"/>
      <CrackLine clipId="mc1" color="rgba(0,0,0,0.2)"/>
      {/* Match % badge */}
      <rect x="16" y="34" width="24" height="12" rx="6"
        fill={col} opacity="0.95"/>
      <text x="28" y="40" textAnchor="middle" dominantBaseline="middle"
        fontSize="8" fontFamily="'DM Sans', sans-serif" fontWeight="700" fill="#000">
        {user.match}%
      </text>
    </svg>
  );
};

// 8. Size = activity (just larger — in map context size varies)
const ActivityPin = ({ user, selected, activityScale = 1.3, size = 56 }) => {
  const s = size * activityScale;
  return (
    <svg width={s} height={s} viewBox="0 0 56 56"
      style={{ filter: selected ? "drop-shadow(0 0 10px rgba(68,255,136,0.9))" : "drop-shadow(0 3px 10px rgba(0,0,0,0.8))", overflow: "visible" }}>
      <defs><clipPath id="ac1"><path d={BUTT_ROUND}/></clipPath></defs>
      <path d={BUTT_ROUND} fill={selected ? "#44ff88" : "#1a1a1a"}
        stroke={selected ? "#44ff88" : "rgba(68,255,136,0.5)"} strokeWidth="2"/>
      <PhotoOrInitial user={user} clipId="ac1"/>
      <CrackLine clipId="ac1" color="rgba(0,0,0,0.15)"/>
    </svg>
  );
};

// 9. Stacked cluster butt
const StackedPin = ({ count = 3, size = 64 }) => {
  const offsets = [
    { x: -8, y: 6, op: 0.4, scale: 0.85 },
    { x: 6, y: 4, op: 0.6, scale: 0.9 },
    { x: 0, y: 0, op: 1, scale: 1 },
  ];
  return (
    <svg width={size + 20} height={size + 20} viewBox="-14 -10 84 80" style={{ overflow: "visible" }}>
      {offsets.map((o, i) => (
        <g key={i} transform={`translate(${o.x}, ${o.y}) scale(${o.scale})`} opacity={o.op}>
          <path d={BUTT_CLASSIC} fill="#1a1a1a"
            stroke="rgba(255,160,50,0.6)" strokeWidth="1.5"/>
        </g>
      ))}
      <path d={BUTT_CLASSIC} fill="#1e1e1e" stroke="#ffa032" strokeWidth="2"/>
      <CrackLine clipId="dummy" color="rgba(255,255,255,0.08)"/>
      <rect x="14" y="32" width="28" height="14" rx="7" fill="#ffa032"/>
      <text x="28" y="39" textAnchor="middle" dominantBaseline="middle"
        fontSize="9" fontFamily="'DM Sans', sans-serif" fontWeight="800" fill="#000">
        +{count}
      </text>
    </svg>
  );
};

// 10. Jiggle pin (animated)
const JigglePin = ({ user, selected, size = 56 }) => (
  <>
    <style>{`
      @keyframes jiggle {
        0%,100% { transform: rotate(0deg); }
        20% { transform: rotate(-6deg); }
        40% { transform: rotate(6deg); }
        60% { transform: rotate(-4deg); }
        80% { transform: rotate(4deg); }
      }
      .jiggle-svg { animation: jiggle 0.5s ease-in-out; }
      .jiggle-svg:hover { animation: jiggle 0.5s ease-in-out; }
    `}</style>
    <svg width={size} height={size} viewBox="0 0 56 56" className="jiggle-svg"
      style={{ filter: selected ? "drop-shadow(0 0 8px rgba(255,160,50,0.9))" : "drop-shadow(0 3px 8px rgba(0,0,0,0.8))", overflow: "visible", transformOrigin: "28px 50px" }}>
      <defs><clipPath id="jg1"><path d={BUTT_CLASSIC}/></clipPath></defs>
      <path d={BUTT_CLASSIC} fill={selected ? "#ffa032" : "#1e1e1e"}
        stroke={selected ? "#ffa032" : "rgba(255,160,50,0.5)"} strokeWidth="2"/>
      <PhotoOrInitial user={user} clipId="jg1"/>
      <CrackLine clipId="jg1" color="rgba(255,255,255,0.1)"/>
    </svg>
  </>
);

// 11. Sitting on map (shadow beneath)
const SittingPin = ({ user, selected, size = 56 }) => (
  <svg width={size + 10} height={size + 14} viewBox="-5 0 66 70" style={{ overflow: "visible" }}>
    {/* Shadow ellipse */}
    <ellipse cx="28" cy="62" rx="18" ry="5"
      fill="rgba(0,0,0,0.5)" filter="url(#blur1)"/>
    <defs>
      <filter id="blur1"><feGaussianBlur stdDeviation="2"/></filter>
      <clipPath id="st1"><path d={BUTT_CLASSIC}/></clipPath>
    </defs>
    <path d={BUTT_CLASSIC} fill={selected ? "#ffa032" : "#1e1e1e"}
      stroke={selected ? "#ffa032" : "rgba(255,160,50,0.5)"} strokeWidth="2"/>
    <PhotoOrInitial user={user} clipId="st1"/>
    <CrackLine clipId="st1" color="rgba(255,255,255,0.1)"/>
  </svg>
);

// ─── Showcase ─────────────────────────────────────────────────────────────────

const PINS = [
  { id: "classic",    label: "Classic Butt",      desc: "Original shape, crack, initials/photo" },
  { id: "peach",      label: "Peach 🍑",           desc: "Rounder + leaf detail" },
  { id: "heartdrop",  label: "Heart Drop Pin",     desc: "Flipped heart + location pointer" },
  { id: "silhouette", label: "Silhouette",         desc: "Taller, side-profile shape" },
  { id: "cartoon",    label: "Cartoon",            desc: "Thick white stroke, wobbly" },
  { id: "minimal",    label: "Minimal Crack",      desc: "Circle with subtle crack curve only" },
  { id: "matchcolor", label: "Match Color",        desc: "Pin color = match %, % badge" },
  { id: "activity",   label: "Activity Size",      desc: "Bigger pin = more active user" },
  { id: "stacked",    label: "Cluster Stack",      desc: "Multiple users in one area" },
  { id: "jiggle",     label: "Jiggle",             desc: "Wobbles on hover/tap" },
  { id: "sitting",    label: "Sitting + Shadow",   desc: "Appears to sit on the map" },
];

const PinRenderer = ({ id, user, selected }) => {
  switch (id) {
    case "classic":    return <ClassicPin user={user} selected={selected}/>;
    case "peach":      return <PeachPin user={user} selected={selected}/>;
    case "heartdrop":  return <HeartDropPin user={user} selected={selected}/>;
    case "silhouette": return <SilhouettePin user={user} selected={selected}/>;
    case "cartoon":    return <CartoonPin user={user} selected={selected}/>;
    case "minimal":    return <MinimalPin user={user} selected={selected}/>;
    case "matchcolor": return <MatchColorPin user={user} selected={selected}/>;
    case "activity":   return <ActivityPin user={user} selected={selected} activityScale={1.2}/>;
    case "stacked":    return <StackedPin count={5}/>;
    case "jiggle":     return <JigglePin user={user} selected={selected}/>;
    case "sitting":    return <SittingPin user={user} selected={selected}/>;
    default:           return null;
  }
};

export default function ANLPinShowcase() {
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useState([]);

  const toggleFav = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080808",
      fontFamily: "'DM Sans', sans-serif",
      padding: "24px 16px 48px",
      color: "#fff",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; }
        .pin-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 24px 16px 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          position: relative;
        }
        .pin-card:hover {
          border-color: rgba(255,160,50,0.3);
          background: rgba(255,160,50,0.04);
        }
        .pin-card.active {
          border-color: rgba(255,160,50,0.6);
          background: rgba(255,160,50,0.07);
        }
        .pin-card.favorited {
          border-color: rgba(255,60,100,0.5);
          background: rgba(255,60,100,0.06);
        }
        .fav-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.15s, transform 0.15s;
        }
        .fav-btn:hover, .fav-btn.on { opacity: 1; transform: scale(1.2); }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }
        .label {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.85);
          text-align: center;
          letter-spacing: 0.3px;
        }
        .desc {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          text-align: center;
          line-height: 1.4;
        }
        .fav-strip {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .fav-tag {
          background: rgba(255,60,100,0.15);
          border: 1px solid rgba(255,60,100,0.3);
          color: #ff3c64;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .section-label {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          letter-spacing: 3px;
          color: #fff;
          margin-bottom: 4px;
        }
        .section-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.5px;
          margin-bottom: 16px;
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 4, lineHeight: 1 }}>
          ALL<span style={{ color: "#ffa032" }}>NIGHT</span>LONG
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: 1 }}>
          PIN VARIANT SHOWCASE · TAP TO SELECT · ❤️ TO FAVORITE
        </div>
      </div>

      {/* Favorites strip */}
      {favorites.length > 0 && (
        <div style={{ marginBottom: 28, padding: "16px", background: "rgba(255,60,100,0.06)", borderRadius: 16, border: "1px solid rgba(255,60,100,0.15)" }}>
          <div style={{ fontSize: 10, color: "#ff3c64", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>FAVORITES</div>
          <div className="fav-strip">
            {favorites.map(id => {
              const pin = PINS.find(p => p.id === id);
              return <div key={id} className="fav-tag">{pin?.label}</div>;
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="section-label">All Variants</div>
      <div className="section-sub">11 STYLES · CLICK TO PREVIEW SELECTED STATE</div>

      <div className="grid">
        {PINS.map(pin => (
          <div
            key={pin.id}
            className={`pin-card ${selected === pin.id ? "active" : ""} ${favorites.includes(pin.id) ? "favorited" : ""}`}
            onClick={() => setSelected(prev => prev === pin.id ? null : pin.id)}
          >
            <button
              className={`fav-btn ${favorites.includes(pin.id) ? "on" : ""}`}
              onClick={(e) => { e.stopPropagation(); toggleFav(pin.id); }}
            >
              {favorites.includes(pin.id) ? "❤️" : "🤍"}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 72, position: "relative" }}>
              <PinRenderer id={pin.id} user={MOCK_USER} selected={selected === pin.id} />
            </div>

            <div>
              <div className="label">{pin.label}</div>
              <div className="desc" style={{ marginTop: 4 }}>{pin.desc}</div>
            </div>

            {selected === pin.id && (
              <div style={{
                fontSize: 9, color: "#ffa032", fontWeight: 700, letterSpacing: 1,
                background: "rgba(255,160,50,0.1)", padding: "3px 10px", borderRadius: 10,
              }}>SELECTED STATE</div>
            )}
          </div>
        ))}
      </div>

      {/* Combo suggestion */}
      <div style={{ marginTop: 36, padding: 20, background: "rgba(255,255,255,0.03)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: 1, marginBottom: 12 }}>COMBO SUGGESTIONS</div>
        {[
          { name: "Default online user", combo: "Peach 🍑 + Jiggle on tap + Match color badge" },
          { name: "Offline user",        combo: "Minimal Crack, desaturated" },
          { name: "Cluster (3+ nearby)", combo: "Stacked Pin with count" },
          { name: "High match (90%+)",   combo: "Match Color (red) + Activity Size (larger)" },
          { name: "New user",            combo: "Cartoon + Jiggle (draws attention)" },
        ].map((c, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", minWidth: 130 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>→ {c.combo}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
