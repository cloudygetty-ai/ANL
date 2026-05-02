import { useState, useEffect, useCallback, useRef } from "react";

// ─── TOKENS ───────────────────────────────────────────────────────────────────
const C = {
  bg:     "#08090d", surface:"#0f1018", surf2:"#161821", surf3:"#1d1f2b",
  border: "#ffffff0f", border2:"#ffffff18",
  text:   "#f0f0f5", dim:"#6b6d7d", muted:"#9497aa",
  accent: "#ff4d6d", green:"#22c55e", blue:"#4d79ff", amber:"#f59e0b",
  font:   "'DM Mono','Fira Code',monospace",
  sans:   "'DM Sans',system-ui,sans-serif",
};

const SEED_USERS = [
  { id:1, name:"RawDog69",    age:34, emoji:"🐺", role:"Top",       bio:"No labels, no limits.",      dist:"0.1mi", online:true,  tags:["bareback","anon","DDF"],    col:"#ff4d6d", liked:false },
  { id:2, name:"PigBottom88", age:28, emoji:"🐷", role:"Bottom",    bio:"Use me.",                    dist:"0.2mi", online:true,  tags:["pig","group","anon"],        col:"#a855f7", liked:false },
  { id:3, name:"DaddyBear",   age:47, emoji:"🐻", role:"Versatile", bio:"Growl.",                     dist:"0.4mi", online:true,  tags:["bear","daddy","pnp"],        col:"#f97316", liked:false },
  { id:4, name:"SlutBoi",     age:22, emoji:"🌸", role:"Bottom",    bio:"Yes to most things.",        dist:"0.5mi", online:false, tags:["twink","submissive","oral"], col:"#ec4899", liked:false },
  { id:5, name:"OpenHole",    age:31, emoji:"💦", role:"Bottom",    bio:"Door's open.",               dist:"0.7mi", online:true,  tags:["anon","hosting","glory"],    col:"#06b6d4", liked:false },
  { id:6, name:"VersTop",     age:38, emoji:"🔱", role:"Top",       bio:"Hung and wired.",            dist:"0.9mi", online:true,  tags:["hung","pnp","nsa"],          col:"#eab308", liked:false },
  { id:7, name:"CuriousStr8", age:26, emoji:"👀", role:"Curious",   bio:"First time exploring.",      dist:"1.1mi", online:false, tags:["curious","discreet","anon"], col:"#10b981", liked:false },
  { id:8, name:"GroupHost",   age:44, emoji:"🏠", role:"Host",      bio:"Party of 4+ welcome.",      dist:"1.3mi", online:true,  tags:["hosting","group","anon"],    col:"#6366f1", liked:false },
];

const VIBE_TAGS = ["anon","bareback","oral","group","pig","daddy","bear","twink","submissive","dominant","versatile","hosting","DDF","pnp","nsa","discreet","hung","curious","glory","outdoor"];
const LOOKING   = ["hookup","oral only","group","date","curious","anything"];
const ROLES     = ["Top","Bottom","Versatile","Curious","Host"];
const EMOJIS    = ["🍑","🐺","🐷","🐻","💦","🔱","🌸","👀","🏠","🫦","😈","🖤"];
const COLORS    = [C.accent,"#a855f7","#f97316","#ec4899","#06b6d4","#eab308","#10b981","#6366f1"];
const FAKE_REPLIES = ["Come through 🔥","DM me your loc","👀","What u into?","Stats?","U host?","On my way 💦","Horny af rn","Yes daddy"];
const CRUISING_STATUSES = ["Hosting now 🏠","In my car 🚗","Come find me 👀","Door's unlocked 🚪","Need it bad 💦","Cruising the park 🌲","Glory hole open 🕳","Group happening now 🔥","Wired and ready ⚡"];

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const KEY     = "he_profile_v4";
const POS_KEY = "he_pin_pos_v1";
const loadProfile = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
const saveProfile = p => localStorage.setItem(KEY, JSON.stringify(p));
const loadPinPos  = () => { try { return JSON.parse(localStorage.getItem(POS_KEY)); } catch { return null; } };
const savePinPos  = p => localStorage.setItem(POS_KEY, JSON.stringify(p));

const DEFAULT = { name:"", age:"", bio:"", role:"Versatile", looking:"hookup", tags:[], emoji:"🍑", col:C.accent, isAnon:false, isSetup:false, videoURL:null, photoURL:null };

// ─── VIDEO AVATAR ─────────────────────────────────────────────────────────────
function VideoAvatar({ user, size=44, showStatus=true }) {
  const vidRef = useRef(null);
  useEffect(() => {
    if (vidRef.current && user.videoURL) { vidRef.current.src = user.videoURL; vidRef.current.play().catch(()=>{}); }
  }, [user.videoURL]);
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,${user.col}cc,${user.col}55)`, border:`2px solid ${user.col}`, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.45, boxShadow:`0 0 ${size/3}px ${user.col}44` }}>
        {user.videoURL
          ? <video ref={vidRef} autoPlay loop muted playsInline style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          : user.photoURL
            ? <img src={user.photoURL} style={{ width:"100%",height:"100%",objectFit:"cover" }} alt=""/>
            : user.emoji}
      </div>
      {showStatus && user.online && <div style={{ position:"absolute", bottom:1, right:1, width:Math.max(8,size*.18), height:Math.max(8,size*.18), borderRadius:"50%", background:C.green, border:`2px solid ${C.bg}` }}/>}
    </div>
  );
}

// ─── STATIC PIN ───────────────────────────────────────────────────────────────
function Pin({ user, onClick, style: extraStyle }) {
  const [pulsed, setPulsed] = useState(false);
  useEffect(() => { const t = setTimeout(()=>setPulsed(true), Math.random()*2000); return()=>clearTimeout(t); }, []);
  return (
    <div onClick={onClick} style={{ position:"relative", cursor:"pointer", userSelect:"none", transition:"transform 0.15s", ...extraStyle }}
      onMouseEnter={e=>e.currentTarget.style.transform="scale(1.15)"}
      onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
      {user.online && pulsed && <div style={{ position:"absolute", inset:-6, borderRadius:"50%", background:`${user.col}22`, animation:"ping 2.5s ease-out infinite" }}/>}
      <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${user.col}cc,${user.col}55)`, border:`2px solid ${user.col}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:`0 0 10px ${user.col}55` }}>{user.emoji}</div>
      {user.online && <div style={{ position:"absolute", bottom:0, right:0, width:10, height:10, borderRadius:"50%", background:C.green, border:`2px solid ${C.bg}` }}/>}
    </div>
  );
}

// ─── DRAGGABLE MY PIN ─────────────────────────────────────────────────────────
function DraggableMyPin({ profile, pos, onMove, cruisingStatus }) {
  const containerRef = useRef(null);
  const dragging     = useRef(false);
  const origin       = useRef({});
  const [isDragging, setIsDragging] = useState(false);
  const [showHint,   setShowHint]   = useState(true);

  useEffect(() => { const t = setTimeout(()=>setShowHint(false), 3500); return()=>clearTimeout(t); }, []);

  const getMap = () => document.querySelector("[data-mapcontainer]");

  const onPointerDown = (e) => {
    e.preventDefault();
    dragging.current = true;
    setIsDragging(true);
    setShowHint(false);
    const r = getMap()?.getBoundingClientRect();
    if (!r) return;
    origin.current = { mx:e.clientX, my:e.clientY, px:pos.x, py:pos.y, rw:r.width, rh:r.height };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup",   onPointerUp);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const { mx, my, px, py, rw, rh } = origin.current;
    const nx = Math.max(4, Math.min(96, px + ((e.clientX - mx) / rw) * 100));
    const ny = Math.max(4, Math.min(96, py + ((e.clientY - my) / rh) * 100));
    onMove({ x:nx, y:ny });
  };

  const onPointerUp = () => {
    dragging.current = false;
    setIsDragging(false);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup",   onPointerUp);
  };

  return (
    <div ref={containerRef} style={{ position:"absolute", left:`${pos.x}%`, top:`${pos.y}%`, transform:"translate(-50%,-50%)", zIndex:isDragging?50:10, touchAction:"none" }}>
      {showHint && !cruisingStatus && (
        <div style={{ position:"absolute", bottom:"115%", left:"50%", transform:"translateX(-50%)", background:"rgba(8,9,13,0.92)", border:`1px solid ${C.border2}`, borderRadius:6, padding:"4px 8px", whiteSpace:"nowrap", fontSize:9, color:C.muted, fontFamily:C.font, pointerEvents:"none" }}>
          hold & drag to move
        </div>
      )}
      {cruisingStatus && (
        <div style={{ position:"absolute", bottom:"115%", left:"50%", transform:"translateX(-50%)", background:C.amber, borderRadius:8, padding:"3px 8px", whiteSpace:"nowrap", fontSize:9, color:"#000", fontFamily:C.font, fontWeight:700, boxShadow:`0 0 14px ${C.amber}88`, animation:"badgePop 0.3s ease" }}>
          {cruisingStatus}
        </div>
      )}
      {isDragging && <>
        <div style={{ position:"absolute", inset:-10, borderRadius:"50%", border:`2px solid ${profile.col}66`, animation:"pingRing 0.7s ease-out infinite" }}/>
        <div style={{ position:"absolute", inset:-20, borderRadius:"50%", border:`1px solid ${profile.col}33`, animation:"pingRing 0.7s ease-out 0.15s infinite" }}/>
      </>}
      <div onPointerDown={onPointerDown} style={{ cursor:isDragging?"grabbing":"grab", transform:isDragging?"scale(1.22)":"scale(1)", transition:isDragging?"none":"transform 0.15s" }}>
        <VideoAvatar user={{ ...profile, online:true }} size={44}/>
      </div>
      <div style={{ position:"absolute", top:"110%", left:"50%", transform:"translateX(-50%)", fontSize:9, color:C.accent, fontFamily:C.font, whiteSpace:"nowrap", background:"rgba(8,9,13,0.88)", padding:"2px 6px", borderRadius:4 }}>YOU</div>
    </div>
  );
}

// ─── CRUISING STATUS PICKER ───────────────────────────────────────────────────
function CruisingStatusPicker({ current, onSet, onClear, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:600, display:"flex", alignItems:"flex-end", backdropFilter:"blur(6px)" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%", maxWidth:480, margin:"0 auto", background:C.surface, borderRadius:"16px 16px 0 0", padding:"20px 20px 36px", fontFamily:C.sans, display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:C.text }}>📡 Cruising Status</div>
            <div style={{ fontSize:10, color:C.dim, fontFamily:C.font, marginTop:2 }}>Broadcasts on your pin · auto-clears in 30 min</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.dim, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        {current && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:`${C.amber}15`, border:`1px solid ${C.amber}44`, borderRadius:10, padding:"10px 14px" }}>
            <div style={{ fontSize:12, color:C.amber, fontWeight:600 }}>{current}</div>
            <button onClick={()=>{onClear();onClose();}} style={{ background:"none", border:"none", color:C.dim, fontSize:11, fontFamily:C.font, cursor:"pointer" }}>Clear</button>
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {CRUISING_STATUSES.map(s=>(
            <button key={s} onClick={()=>{onSet(s);onClose();}} style={{ textAlign:"left", padding:"11px 14px", background:current===s?`${C.amber}15`:C.surf2, border:`1px solid ${current===s?C.amber:C.border2}`, borderRadius:10, color:C.text, fontSize:12, fontFamily:C.sans, cursor:"pointer", transition:"all 0.15s" }}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SHARED PRIMITIVES ────────────────────────────────────────────────────────
function Tag({ label, col, active, onClick }) {
  return <button onClick={onClick} style={{ padding:"4px 11px", borderRadius:20, fontSize:10, fontFamily:C.font, border:`1px solid ${active?col:C.border2}`, background:active?`${col}22`:"transparent", color:active?C.text:C.dim, cursor:"pointer", transition:"all 0.15s" }}>{label}</button>;
}

function Btn({ label, col=C.accent, onClick, outline, disabled, small, full }) {
  return <button onClick={onClick} disabled={disabled} style={{ padding:small?"7px 16px":"11px 22px", borderRadius:10, fontSize:small?11:12, fontFamily:C.font, letterSpacing:"0.05em", fontWeight:600, width:full?"100%":undefined, border:`1px solid ${outline?col:"transparent"}`, background:outline?"transparent":col, color:outline?col:"#fff", cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1, transition:"all 0.15s" }}>{label}</button>;
}

function FI({ label, value, onChange, placeholder, multi, maxLength, type="text" }) {
  const base = { width:"100%", boxSizing:"border-box", background:C.surf2, border:`1px solid ${C.border2}`, borderRadius:8, color:C.text, fontFamily:C.font, fontSize:12, padding:"10px 12px", outline:"none", resize:"none" };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {label && <div style={{ fontSize:9, color:C.dim, fontFamily:C.font, letterSpacing:"0.1em" }}>{label}</div>}
      {multi ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} rows={3} style={base}/> : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} style={base}/>}
    </div>
  );
}

// ─── GROUP VIDEO ROOM ─────────────────────────────────────────────────────────
function GroupVideoRoom({ myProfile, roomUser, onClose }) {
  const localRef = useRef(null); const streamRef = useRef(null);
  const [muted,setMuted]=useState(false); const [camOff,setCamOff]=useState(false);
  const [elapsed,setElapsed]=useState(0); const [camErr,setCamErr]=useState(false);
  const TILES = [roomUser,{name:"GroupHost",emoji:"🏠",col:"#6366f1",online:true},{name:"DaddyBear",emoji:"🐻",col:"#f97316",online:true}];

  useEffect(()=>{
    navigator.mediaDevices?.getUserMedia({video:true,audio:true})
      .then(s=>{streamRef.current=s;if(localRef.current){localRef.current.srcObject=s;localRef.current.play().catch(()=>{});}})
      .catch(()=>setCamErr(true));
    const t=setInterval(()=>setElapsed(s=>s+1),1000);
    return()=>{clearInterval(t);streamRef.current?.getTracks().forEach(t=>t.stop());};
  },[]);

  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{ position:"fixed",inset:0,background:"#000",zIndex:800,display:"flex",flexDirection:"column",fontFamily:C.sans }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize:12,color:C.dim,fontFamily:C.font }}>📹 LIVE · {fmt(elapsed)}</div>
        <div style={{ fontSize:11,color:C.muted }}>{TILES.length+1} in room</div>
      </div>
      <div style={{ flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,overflow:"hidden" }}>
        <div style={{ position:"relative",background:"#111",overflow:"hidden" }}>
          {camErr||camOff
            ? <div style={{ width:"100%",height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8 }}>
                <div style={{ fontSize:36 }}>{myProfile?.emoji||"🍑"}</div>
                {camErr&&<div style={{ fontSize:10,color:C.dim,textAlign:"center",padding:"0 12px" }}>Camera unavailable</div>}
              </div>
            : <video ref={localRef} autoPlay muted playsInline style={{ width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)" }}/>
          }
          <div style={{ position:"absolute",bottom:6,left:8,fontSize:10,color:"#fff",background:"rgba(0,0,0,0.6)",padding:"2px 6px",borderRadius:4 }}>{myProfile?.name||"You"} {muted?"🔇":""}</div>
        </div>
        {TILES.map((u,i)=>(
          <div key={i} style={{ position:"relative",background:"#0d0d0d",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${u.col}cc,${u.col}44)`,border:`2px solid ${u.col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,animation:"pulse 2s ease-in-out infinite" }}>{u.emoji}</div>
            <div style={{ position:"absolute",bottom:6,left:8,fontSize:10,color:"#fff",background:"rgba(0,0,0,0.6)",padding:"2px 6px",borderRadius:4 }}>{u.name}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex",justifyContent:"center",gap:16,padding:"16px",background:"rgba(0,0,0,0.8)" }}>
        {[
          {icon:muted?"🔇":"🎤",label:muted?"Unmute":"Mute",fn:()=>{streamRef.current?.getAudioTracks().forEach(t=>{t.enabled=muted;});setMuted(m=>!m);}},
          {icon:camOff?"📵":"📷",label:camOff?"Cam On":"Cam Off",fn:()=>{streamRef.current?.getVideoTracks().forEach(t=>{t.enabled=camOff;});setCamOff(c=>!c);}},
          {icon:"📞",label:"End",fn:onClose,red:true},
        ].map(b=>(
          <button key={b.label} onClick={b.fn} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:b.red?"#cc2244":"rgba(255,255,255,0.1)",border:"none",borderRadius:12,padding:"10px 18px",color:"#fff",cursor:"pointer",fontSize:11,fontFamily:C.font }}>
            <span style={{ fontSize:22 }}>{b.icon}</span>{b.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MEDIA CHAT ───────────────────────────────────────────────────────────────
function MediaChat({ user, myProfile, onVideoCall }) {
  const [msgs,setMsgs]=useState([{from:"them",text:"Hey. You nearby?",type:"text"}]);
  const [input,setInput]=useState(""); const [typing,setTyping]=useState(false); const [preview,setPreview]=useState(null);
  const fileRef=useRef(null); const camRef=useRef(null); const bottomRef=useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const fakeReply=useCallback(()=>{
    setTyping(true);
    setTimeout(()=>{ setTyping(false);setMsgs(ms=>[...ms,{from:"them",text:FAKE_REPLIES[Math.floor(Math.random()*FAKE_REPLIES.length)],type:"text"}]); },1200+Math.random()*800);
  },[]);

  const sendText=()=>{ if(!input.trim()) return; setMsgs(ms=>[...ms,{from:"me",text:input.trim(),type:"text"}]); setInput(""); fakeReply(); };
  const handleFile=e=>{ const f=e.target.files?.[0];if(!f)return;const url=URL.createObjectURL(f);setPreview({url,mediaType:f.type.startsWith("video")?"video":"image"});e.target.value=""; };
  const sendMedia=()=>{ setMsgs(ms=>[...ms,{from:"me",url:preview.url,type:preview.mediaType}]);setPreview(null);setTimeout(()=>setMsgs(ms=>[...ms,{from:"them",text:"🔥",type:"text"}]),900); };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%" }}>
      <div style={{ flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8 }}>
        {msgs.map((m,i)=>(
          <div key={i} style={{ display:"flex",justifyContent:m.from==="me"?"flex-end":"flex-start" }}>
            {m.type==="text"&&<div style={{ maxWidth:"75%",padding:"8px 12px",borderRadius:12,fontSize:12,lineHeight:1.5,background:m.from==="me"?C.accent:C.surf2,color:C.text,borderBottomRightRadius:m.from==="me"?3:12,borderBottomLeftRadius:m.from==="them"?3:12 }}>{m.text}</div>}
            {m.type==="image"&&<img src={m.url} style={{ maxWidth:"60%",borderRadius:10 }} alt="shared"/>}
            {m.type==="video"&&<video src={m.url} controls style={{ maxWidth:"60%",borderRadius:10 }}/>}
          </div>
        ))}
        {typing&&<div style={{ display:"flex",gap:4,padding:"8px 12px",background:C.surf2,borderRadius:12,width:52,borderBottomLeftRadius:3 }}>{[0,1,2].map(i=><div key={i} style={{ width:6,height:6,borderRadius:"50%",background:C.dim,animation:`typingDot 1.2s ease infinite`,animationDelay:`${i*0.2}s` }}/>)}</div>}
        <div ref={bottomRef}/>
      </div>
      {preview&&(
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 14px",background:C.surf3,borderTop:`1px solid ${C.border}` }}>
          {preview.mediaType==="image"?<img src={preview.url} style={{ width:48,height:48,borderRadius:6,objectFit:"cover" }} alt=""/>:<video src={preview.url} style={{ width:48,height:48,borderRadius:6,objectFit:"cover" }} muted/>}
          <div style={{ flex:1,fontSize:11,color:C.muted }}>Ready to send</div>
          <Btn label="Send" small onClick={sendMedia} col={user.col}/>
          <button onClick={()=>setPreview(null)} style={{ background:"none",border:"none",color:C.dim,fontSize:18,cursor:"pointer" }}>✕</button>
        </div>
      )}
      <div style={{ display:"flex",gap:8,padding:"10px 14px",borderTop:`1px solid ${C.border}`,alignItems:"center" }}>
        <input ref={camRef} type="file" accept="image/*,video/*" capture="environment" style={{ display:"none" }} onChange={handleFile}/>
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={handleFile}/>
        <button onClick={()=>camRef.current?.click()} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.dim,padding:4 }}>📷</button>
        <button onClick={()=>fileRef.current?.click()} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.dim,padding:4 }}>🖼</button>
        <button onClick={onVideoCall} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.dim,padding:4 }}>📹</button>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} placeholder="Message..." style={{ flex:1,background:C.surf2,border:`1px solid ${C.border2}`,borderRadius:8,color:C.text,fontFamily:C.font,fontSize:12,padding:"8px 12px",outline:"none" }}/>
        <Btn label="→" small onClick={sendText} col={user.col}/>
      </div>
    </div>
  );
}

// ─── PROFILE DRAWER ───────────────────────────────────────────────────────────
function ProfileDrawer({ user, myProfile, onClose, onLike, liked, onVideoCall }) {
  const [tab,setTab]=useState("profile");
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:400,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%",maxWidth:480,margin:"0 auto",background:C.surface,borderRadius:"16px 16px 0 0",maxHeight:"88vh",display:"flex",flexDirection:"column",fontFamily:C.sans }}>
        <div style={{ height:110,background:`linear-gradient(135deg,${user.col}33,${user.col}0a)`,borderRadius:"16px 16px 0 0",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0 }}>
          <VideoAvatar user={user} size={68}/>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.dim,fontSize:22,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ padding:"10px 16px 0",flexShrink:0 }}>
          <div style={{ display:"flex",alignItems:"baseline",justifyContent:"space-between" }}>
            <div>
              <div style={{ fontSize:17,fontWeight:700,color:C.text }}>{user.name}</div>
              <div style={{ fontSize:11,color:C.dim }}>{user.age} · {user.role} · {user.dist}</div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={onLike} style={{ width:36,height:36,borderRadius:"50%",background:liked?`${C.accent}33`:C.surf2,border:`1px solid ${liked?C.accent:C.border2}`,fontSize:18,cursor:"pointer" }}>{liked?"❤️":"🤍"}</button>
              <button onClick={onVideoCall} style={{ width:36,height:36,borderRadius:"50%",background:C.surf2,border:`1px solid ${C.border2}`,fontSize:18,cursor:"pointer" }}>📹</button>
            </div>
          </div>
        </div>
        <div style={{ display:"flex",borderBottom:`1px solid ${C.border}`,padding:"0 16px",marginTop:8,flexShrink:0 }}>
          {["profile","chat","media"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:"8px 14px",fontSize:10,fontFamily:C.font,background:"none",border:"none",textTransform:"uppercase",letterSpacing:"0.06em",borderBottom:`2px solid ${tab===t?user.col:"transparent"}`,color:tab===t?C.text:C.dim,cursor:"pointer" }}>{t}</button>
          ))}
        </div>
        <div style={{ flex:1,overflowY:"auto" }}>
          {tab==="profile"&&(
            <div style={{ padding:"14px 16px",display:"flex",flexDirection:"column",gap:12 }}>
              {user.bio&&<div style={{ fontSize:12,color:C.muted,lineHeight:1.65 }}>{user.bio}</div>}
              <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{(user.tags||[]).map(t=><div key={t} style={{ fontSize:10,padding:"4px 10px",borderRadius:20,border:`1px solid ${user.col}44`,color:C.muted,background:`${user.col}11` }}>{t}</div>)}</div>
            </div>
          )}
          {tab==="chat"&&<div style={{ height:400 }}><MediaChat user={user} myProfile={myProfile} onVideoCall={onVideoCall}/></div>}
          {tab==="media"&&(
            <div style={{ padding:"14px 16px" }}>
              <div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em",marginBottom:10 }}>MEDIA GRID</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3 }}>
                {[...Array(9)].map((_,i)=><div key={i} style={{ aspectRatio:"1",background:C.surf2,border:`1px solid ${C.border}`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:C.border2 }}>📷</div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MY PROFILE SHEET ─────────────────────────────────────────────────────────
function MyProfileSheet({ profile, onEdit, onClose, onReset, onGoLive, onCruising }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:400,display:"flex",alignItems:"flex-end",backdropFilter:"blur(6px)" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%",maxWidth:480,margin:"0 auto",background:C.surface,borderRadius:"16px 16px 0 0",padding:"20px 20px 36px",fontFamily:C.sans,display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ fontSize:15,fontWeight:700,color:C.text }}>My Profile</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.dim,fontSize:20,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"flex",gap:14,alignItems:"center" }}>
          <VideoAvatar user={profile} size={64} showStatus={false}/>
          <div>
            <div style={{ fontSize:16,fontWeight:700,color:C.text }}>{profile.name}</div>
            <div style={{ fontSize:11,color:C.dim }}>{profile.age} · {profile.role}</div>
            <div style={{ fontSize:10,color:profile.isAnon?C.accent:C.green,marginTop:2 }}>{profile.isAnon?"👻 Ghost Mode":"● Visible on map"}</div>
          </div>
        </div>
        {profile.bio&&<div style={{ fontSize:12,color:C.muted,lineHeight:1.6,background:C.surf2,padding:"10px 12px",borderRadius:8 }}>{profile.bio}</div>}
        <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{(profile.tags||[]).map(t=><div key={t} style={{ fontSize:10,padding:"4px 10px",borderRadius:20,border:`1px solid ${profile.col}55`,color:C.muted,background:`${profile.col}11` }}>{t}</div>)}</div>
        <div style={{ display:"flex",gap:10 }}>
          <Btn label="✏️ Edit" onClick={onEdit} full/>
          <Btn label="📹 Go Live" onClick={onGoLive} outline full/>
        </div>
        <Btn label="📡 Cruising Status" onClick={()=>{onClose();onCruising();}} outline col={C.amber} full/>
        <button onClick={onReset} style={{ background:"none",border:"none",color:C.dim,fontSize:10,fontFamily:C.font,cursor:"pointer",letterSpacing:"0.05em",textAlign:"left" }}>Reset profile</button>
      </div>
    </div>
  );
}

// ─── PROFILE EDITOR ───────────────────────────────────────────────────────────
function ProfileEditor({ profile, onSave, onClose }) {
  const [form,setForm]=useState({...profile});
  const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false);
  const vidRef=useRef(null); const photoRef=useRef(null);

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const toggleTag=t=>set("tags",form.tags.includes(t)?form.tags.filter(x=>x!==t):form.tags.length<5?[...form.tags,t]:form.tags);
  const handleMedia=(e,type)=>{ const f=e.target.files?.[0];if(!f)return;const url=URL.createObjectURL(f);type==="video"?set("videoURL",url):set("photoURL",url);e.target.value=""; };
  const handleSave=()=>{ setSaving(true);setTimeout(()=>{ saveProfile(form);setSaving(false);setSaved(true);onSave(form);setTimeout(()=>setSaved(false),1500); },500); };

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"flex-end",backdropFilter:"blur(6px)" }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:"100%",maxWidth:480,margin:"0 auto",background:C.surface,borderRadius:"16px 16px 0 0",padding:"20px 20px 32px",maxHeight:"92vh",overflowY:"auto",fontFamily:C.sans,display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ fontSize:15,fontWeight:700,color:C.text }}>Edit Profile</div>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.dim,fontSize:20,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"flex",gap:12,alignItems:"center" }}>
          <VideoAvatar user={form} size={60} showStatus={false}/>
          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
            <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleMedia(e,"photo")}/>
            <input ref={vidRef} type="file" accept="video/*" style={{ display:"none" }} onChange={e=>handleMedia(e,"video")}/>
            <Btn label="📷 Set Photo" small onClick={()=>photoRef.current?.click()} outline col={form.col}/>
            <Btn label="📹 Set Video Profile" small onClick={()=>vidRef.current?.click()} outline col={form.col}/>
          </div>
        </div>
        {form.videoURL&&<div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ fontSize:10,color:C.green,fontFamily:C.font }}>✓ Video profile set</div><button onClick={()=>set("videoURL",null)} style={{ background:"none",border:"none",color:C.dim,fontSize:11,cursor:"pointer" }}>Remove</button></div>}
        <FI label="HANDLE" value={form.name} onChange={v=>set("name",v)} placeholder="Your handle" maxLength={24}/>
        <FI label="AGE" value={String(form.age)} onChange={v=>set("age",v.replace(/\D/g,"").slice(0,2))} placeholder="Age" maxLength={2}/>
        <FI label="BIO" value={form.bio} onChange={v=>set("bio",v)} placeholder="Say something real..." multi maxLength={160}/>
        <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>ROLE</div><div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{ROLES.map(r=><Tag key={r} label={r} col={form.col} active={form.role===r} onClick={()=>set("role",r)}/>)}</div></div>
        <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>LOOKING FOR</div><div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{LOOKING.map(l=><Tag key={l} label={l} col={form.col} active={form.looking===l} onClick={()=>set("looking",l)}/>)}</div></div>
        <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>TAGS (max 5) — {form.tags.length}/5</div><div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{VIBE_TAGS.map(t=><Tag key={t} label={t} col={form.col} active={form.tags.includes(t)} onClick={()=>toggleTag(t)}/>)}</div></div>
        <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>EMOJI</div><div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>{EMOJIS.map(e=><div key={e} onClick={()=>set("emoji",e)} style={{ fontSize:22,cursor:"pointer",border:`2px solid ${form.emoji===e?C.accent:"transparent"}`,borderRadius:8,padding:4 }}>{e}</div>)}</div></div>
        <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>COLOR</div><div style={{ display:"flex",gap:8 }}>{COLORS.map(c=><div key={c} onClick={()=>set("col",c)} style={{ width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${form.col===c?"#fff":"transparent"}` }}/>)}</div></div>
        <div style={{ display:"flex",alignItems:"center",gap:10,background:C.surf2,border:`1px solid ${C.border2}`,borderRadius:8,padding:"10px 14px",cursor:"pointer" }} onClick={()=>set("isAnon",!form.isAnon)}>
          <div style={{ width:20,height:20,borderRadius:4,background:form.isAnon?C.accent:"transparent",border:`2px solid ${form.isAnon?C.accent:C.border2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,transition:"all 0.15s" }}>{form.isAnon?"✓":""}</div>
          <div><div style={{ fontSize:11,color:C.text }}>Ghost Mode</div><div style={{ fontSize:10,color:C.dim }}>Hidden on map</div></div>
        </div>
        <Btn label={saving?"Saving…":saved?"✓ Saved!":"Save Changes"} onClick={handleSave} disabled={saving||!form.name.trim()} col={saved?C.green:C.accent} full/>
      </div>
    </div>
  );
}

// ─── PROFILE SETUP ────────────────────────────────────────────────────────────
function ProfileSetup({ onSave }) {
  const [step,setStep]=useState(0);
  const [form,setForm]=useState({...DEFAULT});
  const [saving,setSaving]=useState(false);
  const vidRef=useRef(null); const photoRef=useRef(null);

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const toggleTag=t=>set("tags",form.tags.includes(t)?form.tags.filter(x=>x!==t):form.tags.length<5?[...form.tags,t]:form.tags);
  const handleMedia=(e,type)=>{ const f=e.target.files?.[0];if(!f)return;const url=URL.createObjectURL(f);type==="video"?set("videoURL",url):set("photoURL",url);e.target.value=""; };

  const ageNum=parseInt(form.age,10);
  const ageValid=!isNaN(ageNum)&&ageNum>=18&&ageNum<=99;
  const nameValid=form.name.trim().length>=2;
  const canNext=nameValid&&ageValid;

  const handleSave=()=>{ setSaving(true);setTimeout(()=>{ const p={...form,isSetup:true};saveProfile(p);onSave(p); },600); };

  return (
    <div style={{ position:"fixed",inset:0,background:C.bg,zIndex:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:C.sans,padding:24,overflowY:"auto" }}>
      <div style={{ display:"flex",gap:6,marginBottom:32 }}>{[0,1,2].map(i=><div key={i} style={{ width:step===i?20:8,height:8,borderRadius:4,background:step>=i?C.accent:C.border2,transition:"all 0.3s" }}/>)}</div>
      <div style={{ width:"100%",maxWidth:400 }}>
        {step===0&&(
          <div style={{ textAlign:"center",display:"flex",flexDirection:"column",gap:20,alignItems:"center" }}>
            <div style={{ fontSize:64 }}>🍑</div>
            <div style={{ fontSize:26,fontWeight:700,color:C.text,letterSpacing:"-0.02em" }}>THE HOLE EATERS</div>
            <div style={{ fontSize:13,color:C.dim,lineHeight:1.6,maxWidth:280 }}>Anonymous. Local. No judgment.<br/>Find what you're looking for.</div>
            <div style={{ background:C.surf2,border:`1px solid ${C.border2}`,borderRadius:10,padding:"12px 16px",fontSize:11,color:C.muted,textAlign:"left",lineHeight:1.7 }}>⚠️ Adults 18+ only · No real names shown · Your location is approximate</div>
            <Btn label="Create My Profile →" onClick={()=>setStep(1)}/>
          </div>
        )}
        {step===1&&(
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div style={{ fontSize:18,fontWeight:700,color:C.text }}>The basics</div>
            <div style={{ display:"flex",gap:12,alignItems:"center",background:C.surf2,border:`1px solid ${C.border2}`,borderRadius:10,padding:"12px" }}>
              <div style={{ width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${form.col}cc,${form.col}44)`,border:`2px solid ${form.col}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>
                {form.videoURL?<video src={form.videoURL} autoPlay loop muted playsInline style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:form.photoURL?<img src={form.photoURL} style={{ width:"100%",height:"100%",objectFit:"cover" }} alt=""/>:form.emoji}
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleMedia(e,"photo")}/>
                <input ref={vidRef} type="file" accept="video/*" style={{ display:"none" }} onChange={e=>handleMedia(e,"video")}/>
                <Btn label="📷 Photo" small onClick={()=>photoRef.current?.click()} outline col={form.col}/>
                <Btn label="📹 Video Profile" small onClick={()=>vidRef.current?.click()} outline col={form.col}/>
              </div>
            </div>
            <FI label="HANDLE (shown to others)" value={form.name} onChange={v=>set("name",v)} placeholder="e.g. AnonymousDog" maxLength={24}/>
            {form.name.trim().length>0&&form.name.trim().length<2&&<div style={{ fontSize:10,color:C.accent,fontFamily:C.font,marginTop:-8 }}>At least 2 characters</div>}
            <FI label="AGE (must be 18+)" value={form.age} onChange={v=>set("age",v.replace(/\D/g,"").slice(0,2))} placeholder="25" maxLength={2}/>
            {form.age.length>0&&!ageValid&&<div style={{ fontSize:10,color:C.accent,fontFamily:C.font,marginTop:-8 }}>Must be 18–99</div>}
            <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>ROLE</div><div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{ROLES.map(r=><Tag key={r} label={r} col={form.col} active={form.role===r} onClick={()=>set("role",r)}/>)}</div></div>
            <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>EMOJI</div><div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>{EMOJIS.map(e=><div key={e} onClick={()=>set("emoji",e)} style={{ fontSize:20,cursor:"pointer",border:`2px solid ${form.emoji===e?C.accent:"transparent"}`,borderRadius:6,padding:3 }}>{e}</div>)}</div></div>
            <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>COLOR</div><div style={{ display:"flex",gap:8 }}>{COLORS.map(c=><div key={c} onClick={()=>set("col",c)} style={{ width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${form.col===c?"#fff":"transparent"}` }}/>)}</div></div>
            <div style={{ display:"flex",gap:10 }}>
              <Btn label="← Back" outline onClick={()=>setStep(0)}/>
              <Btn label="Next →" onClick={()=>setStep(2)} disabled={!canNext}/>
            </div>
          </div>
        )}
        {step===2&&(
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div style={{ fontSize:18,fontWeight:700,color:C.text }}>Your vibe</div>
            <FI label="BIO (optional)" value={form.bio} onChange={v=>set("bio",v)} placeholder="Keep it real..." multi maxLength={160}/>
            <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>LOOKING FOR</div><div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{LOOKING.map(l=><Tag key={l} label={l} col={form.col} active={form.looking===l} onClick={()=>set("looking",l)}/>)}</div></div>
            <div style={{ display:"flex",flexDirection:"column",gap:5 }}><div style={{ fontSize:9,color:C.dim,fontFamily:C.font,letterSpacing:"0.1em" }}>TAGS (max 5)</div><div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>{VIBE_TAGS.map(t=><Tag key={t} label={t} col={form.col} active={form.tags.includes(t)} onClick={()=>toggleTag(t)}/>)}</div></div>
            <div style={{ display:"flex",alignItems:"center",gap:10,background:C.surf2,border:`1px solid ${C.border2}`,borderRadius:8,padding:"10px 14px",cursor:"pointer" }} onClick={()=>set("isAnon",!form.isAnon)}>
              <div style={{ width:20,height:20,borderRadius:4,background:form.isAnon?C.accent:"transparent",border:`2px solid ${form.isAnon?C.accent:C.border2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>{form.isAnon?"✓":""}</div>
              <div><div style={{ fontSize:11,color:C.text }}>Ghost Mode</div><div style={{ fontSize:10,color:C.dim }}>Hidden on map</div></div>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <Btn label="← Back" outline onClick={()=>setStep(1)}/>
              <Btn label={saving?"Saving…":"Go Live 🔥"} onClick={handleSave} disabled={saving||!nameValid}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAP VIEW ─────────────────────────────────────────────────────────────────
function MapView({ users, myProfile, myPos, onMovePin, onSelectUser, cruisingStatus }) {
  const PIN_POSITIONS = users.map((u,i) => ({ left:10+(i*137.5%80), top:10+(i*97.3%75) }));
  return (
    <div data-mapcontainer="1" style={{ position:"relative",width:"100%",height:"100%",background:`radial-gradient(ellipse at 40% 40%,#0d1020,#08090d)`,overflow:"hidden" }}>
      {[...Array(12)].map((_,i)=><div key={`h${i}`} style={{ position:"absolute",left:0,right:0,top:`${(i+1)*8}%`,height:1,background:"#ffffff04" }}/>)}
      {[...Array(12)].map((_,i)=><div key={`v${i}`} style={{ position:"absolute",top:0,bottom:0,left:`${(i+1)*8}%`,width:1,background:"#ffffff04" }}/>)}
      <div style={{ position:"absolute",left:"35%",top:"30%",width:200,height:200,background:`radial-gradient(circle,${C.accent}18,transparent 70%)`,borderRadius:"50%",animation:"pulse 3s ease-in-out infinite" }}/>
      {users.map((u,i)=>(
        <div key={u.id} style={{ position:"absolute",left:`${PIN_POSITIONS[i].left}%`,top:`${PIN_POSITIONS[i].top}%`,transform:"translate(-50%,-50%)" }}>
          <Pin user={u} onClick={()=>onSelectUser(u)}/>
        </div>
      ))}
      {myProfile && !myProfile.isAnon && (
        <DraggableMyPin profile={myProfile} pos={myPos} onMove={onMovePin} cruisingStatus={cruisingStatus}/>
      )}
      {myProfile?.isAnon && (
        <div style={{ position:"absolute",bottom:60,left:"50%",transform:"translateX(-50%)",background:`${C.accent}22`,border:`1px solid ${C.accent}44`,borderRadius:8,padding:"6px 12px",fontSize:10,color:C.accent,fontFamily:C.font,whiteSpace:"nowrap" }}>👻 Ghost Mode — you're invisible</div>
      )}
      <div style={{ position:"absolute",top:12,left:12,background:"rgba(8,9,13,0.88)",border:`1px solid ${C.border2}`,borderRadius:8,padding:"6px 10px",fontSize:10,color:C.muted,fontFamily:C.font,backdropFilter:"blur(8px)" }}>
        {users.filter(u=>u.online).length} online nearby
      </div>
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function ListView({ users, onSelect }) {
  return (
    <div style={{ overflowY:"auto",flex:1,padding:"8px 0" }}>
      {users.map(u=>(
        <div key={u.id} onClick={()=>onSelect(u)} style={{ display:"flex",gap:12,alignItems:"center",padding:"12px 16px",cursor:"pointer",borderBottom:`1px solid ${C.border}`,transition:"background 0.1s" }}
          onMouseEnter={e=>e.currentTarget.style.background=C.surf2}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <div style={{ width:44,height:44,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${u.col}cc,${u.col}44)`,border:`2px solid ${u.col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,position:"relative" }}>
            {u.emoji}
            {u.online&&<div style={{ position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",background:C.green,border:`2px solid ${C.bg}` }}/>}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
              <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{u.name}</div>
              <div style={{ fontSize:10,color:C.dim }}>{u.dist}</div>
            </div>
            <div style={{ fontSize:11,color:C.dim }}>{u.age} · {u.role}</div>
            <div style={{ fontSize:11,color:C.muted,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis" }}>{u.bio}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function HoleEaters() {
  const [myProfile,    setMyProfile]    = useState(()=>loadProfile());
  const [myPos,        setMyPos]        = useState(()=>loadPinPos()||{x:50,y:52});
  const [users,        setUsers]        = useState(SEED_USERS);
  const [showEditor,   setShowEditor]   = useState(false);
  const [showMySheet,  setShowMySheet]  = useState(false);
  const [showCruising, setShowCruising] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [videoRoom,    setVideoRoom]    = useState(null);
  const [tab,          setTab]          = useState("map");
  const [toast,        setToast]        = useState(null);
  const [cruisingStatus,setCruisingStatus] = useState(null);

  const needsSetup = !myProfile?.isSetup;

  const showToast = useCallback((text,col=C.accent)=>{ setToast({text,col}); setTimeout(()=>setToast(null),3000); },[]);
  const handleProfileSave = p => { setMyProfile(p); setShowEditor(false); showToast("Profile saved ✓",C.green); };
  const handleMovePin = useCallback(pos=>{ setMyPos(pos); savePinPos(pos); },[]);
  const handleReset = ()=>{ if(confirm("Reset your profile?")){ localStorage.removeItem(KEY);localStorage.removeItem(POS_KEY);setMyProfile(null);setShowMySheet(false); } };
  const handleLike = u=>{ setUsers(us=>us.map(x=>x.id===u.id?{...x,liked:!x.liked}:x)); if(!u.liked) showToast(`❤️ Liked ${u.name}`); };

  if(needsSetup) return <ProfileSetup onSave={p=>{setMyProfile(p);showToast("Welcome 🔥",C.accent);}}/>;

  return (
    <div style={{ display:"flex",flexDirection:"column",width:"100%",maxWidth:480,margin:"0 auto",height:"100dvh",background:C.bg,fontFamily:C.sans,position:"relative",overflow:"hidden" }}>
      <style>{`
        @keyframes ping     {0%{transform:scale(0.8);opacity:1}75%,100%{transform:scale(2.4);opacity:0}}
        @keyframes pingRing {0%{transform:translate(-50%,-50%) scale(1);opacity:0.8}100%{transform:translate(-50%,-50%) scale(2.2);opacity:0}}
        @keyframes pulse    {0%,100%{opacity:0.4}50%{opacity:0.8}}
        @keyframes toastIn  {from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes badgePop {0%{transform:translateX(-50%) scale(0.7);opacity:0}60%{transform:translateX(-50%) scale(1.05)}100%{transform:translateX(-50%) scale(1);opacity:1}}
        @keyframes typingDot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:${C.border2};border-radius:2px;}
        input,textarea{outline:none;}input::placeholder,textarea::placeholder{color:${C.dim};}
        button{cursor:pointer;}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0 }}>
        <div style={{ display:"flex",flexDirection:"column" }}>
          <div style={{ fontSize:14,fontWeight:700,color:C.text,letterSpacing:"-0.01em" }}>🍑 <span style={{color:C.accent}}>HOLE</span> EATERS</div>
          {cruisingStatus&&<div style={{ fontSize:9,color:C.amber,fontFamily:C.font,marginTop:1 }}>📡 {cruisingStatus}</div>}
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <div style={{ display:"flex",background:C.surf2,borderRadius:8,padding:2 }}>
            {["map","list"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{ padding:"4px 12px",borderRadius:6,fontSize:10,fontFamily:C.font,letterSpacing:"0.05em",background:tab===t?C.surf3:"transparent",border:`1px solid ${tab===t?C.border2:"transparent"}`,color:tab===t?C.text:C.dim,transition:"all 0.15s" }}>{t}</button>
            ))}
          </div>
          <button onClick={()=>setShowMySheet(true)} style={{ width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${myProfile.col},${myProfile.col}66)`,border:`2px solid ${cruisingStatus?C.amber:myProfile.col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,boxShadow:cruisingStatus?`0 0 8px ${C.amber}66`:"none" }}>
            {myProfile.emoji}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1,overflow:"hidden",display:"flex",flexDirection:"column" }}>
        {tab==="map"
          ? <MapView users={users} myProfile={myProfile} myPos={myPos} onMovePin={handleMovePin} onSelectUser={setSelectedUser} cruisingStatus={cruisingStatus}/>
          : <ListView users={users} onSelect={setSelectedUser}/>
        }
      </div>

      {/* Toast */}
      {toast&&<div style={{ position:"absolute",top:70,right:14,zIndex:600,animation:"toastIn 0.3s ease",background:C.surf3,border:`1px solid ${toast.col}44`,borderRadius:10,padding:"10px 14px",fontSize:11,color:C.text,fontFamily:C.font,boxShadow:"0 4px 24px rgba(0,0,0,0.5)",maxWidth:240 }}>{toast.text}</div>}

      {/* Modals */}
      {selectedUser&&<ProfileDrawer user={selectedUser} myProfile={myProfile} onClose={()=>setSelectedUser(null)} onLike={()=>handleLike(selectedUser)} liked={users.find(u=>u.id===selectedUser.id)?.liked} onVideoCall={()=>{setVideoRoom(selectedUser);setSelectedUser(null);}}/>}
      {showMySheet&&<MyProfileSheet profile={myProfile} onEdit={()=>{setShowMySheet(false);setShowEditor(true);}} onClose={()=>setShowMySheet(false)} onReset={handleReset} onGoLive={()=>{setShowMySheet(false);setVideoRoom({name:"Solo Live",emoji:"📹",col:myProfile.col,tags:[],dist:"—"});}} onCruising={()=>setShowCruising(true)}/>}
      {showEditor&&<ProfileEditor profile={myProfile} onSave={handleProfileSave} onClose={()=>setShowEditor(false)}/>}
      {showCruising&&<CruisingStatusPicker current={cruisingStatus} onSet={s=>{setCruisingStatus(s);showToast(`📡 ${s}`,C.amber);}} onClear={()=>setCruisingStatus(null)} onClose={()=>setShowCruising(false)}/>}
      {videoRoom&&<GroupVideoRoom myProfile={myProfile} roomUser={videoRoom} onClose={()=>setVideoRoom(null)}/>}
    </div>
  );
}
