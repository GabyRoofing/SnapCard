import { useState, useEffect, useRef } from "react";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#08050f", gold:"#FFD700", red:"#c8102e", green:"#4ade80",
  surface:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.09)",
  text:"#fff", muted:"rgba(255,255,255,0.38)", dim:"rgba(255,255,255,0.18)",
  neon:"#00f5ff", pink:"#ff00aa", purple:"#9000ff",
};

// ─── ATHLETES ─────────────────────────────────────────────────────────────────
const ATHLETES = [
  {
    id:1, name:"Luka Dončić", lastName:"DONČIĆ", initials:"LD",
    year:"2018", brand:"PANINI PRIZM", set:"PRIZM", number:"280",
    parallel:"SILVER PRIZM RC", team:"MAVERICKS", pos:"PG", sport:"NBA", jersey:"77",
    c1:"#00538C", c2:"#00A9CE", bg1:"#000a18", bg2:"#001428", accent:"#00f5ff",
    neonColor:"#00f5ff", prizm:true,
  },
  {
    id:2, name:"LeBron James", lastName:"JAMES", initials:"LJ",
    year:"2003", brand:"TOPPS CHROME", set:"CHROME", number:"111",
    parallel:"GOLD REFRACTOR /50", team:"LAKERS", pos:"SF", sport:"NBA", jersey:"23",
    c1:"#552583", c2:"#FDB927", bg1:"#0f0820", bg2:"#180c00", accent:"#FDB927",
    neonColor:"#FFD700", prizm:false,
  },
  {
    id:3, name:"Patrick Mahomes", lastName:"MAHOMES", initials:"PM",
    year:"2017", brand:"PANINI PRIZM", set:"PRIZM", number:"269",
    parallel:"SILVER PRIZM RC", team:"CHIEFS", pos:"QB", sport:"NFL", jersey:"15",
    c1:"#c8102e", c2:"#FFB81C", bg1:"#150005", bg2:"#200008", accent:"#ff4466",
    neonColor:"#ff00aa", prizm:true,
  },
  {
    id:4, name:"Aaron Judge", lastName:"JUDGE", initials:"AJ",
    year:"2017", brand:"TOPPS CHROME", set:"CHROME", number:"169",
    parallel:"REFRACTOR RC", team:"YANKEES", pos:"RF", sport:"MLB", jersey:"99",
    c1:"#003087", c2:"#E4002C", bg1:"#000510", bg2:"#000818", accent:"#4488ff",
    neonColor:"#4488ff", prizm:false,
  },
];

// ─── IMAGE COMPRESSION ────────────────────────────────────────────────────────
async function compressImage(base64, mime) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 500;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const out = canvas.toDataURL("image/jpeg", 0.80);
      resolve({ base64: out.split(",")[1], mime: "image/jpeg" });
    };
    img.onerror = () => resolve({ base64, mime });
    img.src = `data:${mime};base64,${base64}`;
  });
}

// ─── AI EXTRACTION ────────────────────────────────────────────────────────────
async function runExtraction(base64, mime) {
  const img = await compressImage(base64, mime);
  const res = await fetch("/api/analyze-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64: img.base64, mime: img.mime }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error || `Server error ${res.status}`);
  return data.card;
}

// ─── PRICE MOCK ───────────────────────────────────────────────────────────────
function mockPrice(card) {
  const base = { football:32, basketball:44, baseball:28, hockey:26, soccer:22 };
  let p = base[card.sport] || 30;
  if (card.is_graded && card.grade === "10") p *= 3.2;
  else if (card.is_graded) p *= 1.8;
  if (card.is_rookie_card) p *= 2.1;
  if (card.has_autograph)  p *= 4.2;
  if (card.has_patch)      p *= 1.9;
  if (/gold/i.test(card.parallel || ""))            p *= 2.4;
  if (/prizm|refractor/i.test(card.parallel || "")) p *= 1.35;
  return +(p * (0.82 + Math.random() * 0.36)).toFixed(2);
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const btn = (extra = {}) => ({
  border:"none", cursor:"pointer", fontFamily:"'Courier New',monospace", transition:"all .2s", ...extra,
});

function Screen({ children, style = {} }) {
  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, display:"flex", flexDirection:"column", fontFamily:"'Courier New',monospace", overflowY:"auto", overflowX:"hidden", ...style }}>
      {children}
    </div>
  );
}

function TopBar({ onBack, title, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"20px 20px 14px", borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
      {onBack && <button onClick={onBack} style={btn({ background:"none", color:C.muted, fontSize:14, padding:"0 14px 0 0" })}>← Back</button>}
      <div>
        <div style={{ color:C.text, fontWeight:700, fontSize:17 }}>{title}</div>
        {sub && <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Pill({ children, active, onClick, color }) {
  const bg  = active ? (color || C.gold) : "rgba(255,255,255,0.07)";
  const col = active ? (color && color !== C.gold ? "#fff" : "#000") : C.muted;
  return (
    <button onClick={onClick} style={btn({ padding:"10px 18px", borderRadius:22, fontSize:14, fontWeight:700, background:bg, color:col, border:`1.5px solid ${active?(color||C.gold):"rgba(255,255,255,0.1)"}`, boxShadow:active?`0 0 14px ${(color||C.gold)}44`:"none", fontFamily:"'Courier New',monospace" })}>
      {children}
    </button>
  );
}

// ─── RETRO CARD FACE ──────────────────────────────────────────────────────────
function RetroCardFace({ card, sx=50, sy=50, hov }) {
  const holo  = `conic-gradient(from ${sx*3.6}deg at ${sx}% ${sy}%,rgba(0,245,255,.18),rgba(144,0,255,.15),rgba(255,0,170,.18),rgba(0,245,255,.15))`;
  const lines = `repeating-linear-gradient(${sx*1.8}deg,transparent 0,rgba(0,245,255,.04) 1px,transparent 2px,transparent 6px)`;
  const scanlines = `repeating-linear-gradient(0deg,transparent 0,transparent 2px,rgba(0,0,0,.15) 3px,rgba(0,0,0,.15) 3px)`;

  return (
    <div style={{ width:"100%", height:"100%", borderRadius:3, overflow:"hidden", position:"relative", background:`linear-gradient(160deg,${card.bg1},${card.bg2})` }}>
      {/* Scanlines */}
      <div style={{ position:"absolute", inset:0, background:scanlines, pointerEvents:"none", zIndex:5 }}/>
      {/* Prizm lines */}
      {card.prizm && <div style={{ position:"absolute", inset:0, background:lines, opacity:hov?.9:.5, transition:"opacity .3s" }}/>}
      {/* Holo */}
      <div style={{ position:"absolute", inset:0, background:holo, opacity:hov?.85:.25, mixBlendMode:"color-dodge", transition:"opacity .3s" }}/>
      {/* Neon grid overlay */}
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${card.neonColor}18 1px,transparent 1px),linear-gradient(90deg,${card.neonColor}18 1px,transparent 1px)`, backgroundSize:"12px 12px", opacity:hov?.6:.2, transition:"opacity .3s" }}/>
      {/* Big jersey watermark */}
      <div style={{ position:"absolute", bottom:16, right:-6, fontSize:76, fontWeight:900, color:`${card.c1}22`, lineHeight:1, userSelect:"none", fontFamily:"'Courier New',monospace" }}>{card.jersey}</div>

      {/* Header */}
      <div style={{ position:"relative", zIndex:6, padding:"6px 6px 4px", display:"flex", justifyContent:"space-between", borderBottom:`1px solid ${card.neonColor}33` }}>
        <span style={{ fontSize:5, fontWeight:900, letterSpacing:".14em", color:card.neonColor, textTransform:"uppercase", textShadow:`0 0 8px ${card.neonColor}` }}>{card.brand}</span>
        <span style={{ fontSize:5, color:card.accent, fontWeight:700 }}>{card.year}</span>
      </div>

      {/* Player block */}
      <div style={{ position:"relative", zIndex:6, display:"flex", flexDirection:"column", alignItems:"center", padding:"8px 4px 4px" }}>
        {/* Glowing circle */}
        <div style={{
          width:48, height:48, borderRadius:"50%", marginBottom:6,
          background:`radial-gradient(circle at 35% 35%,${card.c1}ee,${card.c2}99)`,
          border:`2px solid ${card.neonColor}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:`0 0 20px ${card.neonColor}88, 0 0 40px ${card.neonColor}44, inset 0 1px 0 rgba(255,255,255,.2)`,
        }}>
          <span style={{ fontSize:16, fontWeight:900, color:"#fff", textShadow:`0 0 10px ${card.neonColor}`, fontFamily:"'Courier New',monospace" }}>{card.initials}</span>
        </div>
        {/* Name */}
        <div style={{ fontSize:12, fontWeight:900, color:"#fff", letterSpacing:".08em", textShadow:`0 0 12px ${card.neonColor}, 0 1px 6px rgba(0,0,0,.9)`, lineHeight:1, marginBottom:4, textAlign:"center", fontFamily:"'Courier New',monospace" }}>
          {card.lastName}
        </div>
        {/* Team + pos */}
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          <span style={{ fontSize:5.5, fontWeight:800, color:card.neonColor, letterSpacing:".1em", textTransform:"uppercase", textShadow:`0 0 6px ${card.neonColor}` }}>{card.team}</span>
          <span style={{ fontSize:5, color:C.dim }}>·</span>
          <span style={{ fontSize:5.5, color:C.muted, fontWeight:600 }}>{card.pos}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:6, padding:"4px 6px", borderTop:`1px solid ${card.neonColor}22`, display:"flex", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:4.5, color:card.neonColor, fontWeight:800, letterSpacing:".1em", textTransform:"uppercase", textShadow:`0 0 6px ${card.neonColor}` }}>{card.parallel}</div>
          <div style={{ fontSize:4, color:C.dim, marginTop:1 }}>#{card.number} · {card.set}</div>
        </div>
        <div style={{ fontSize:5, color:C.dim, fontWeight:700 }}>{card.sport}</div>
      </div>
    </div>
  );
}

// ─── PSA SLAB (retro version) ─────────────────────────────────────────────────
function RetroPSASlab({ card, isActive, onClick }) {
  const ref = useRef(null);
  const [tilt, setTilt]   = useState({ x:0, y:0 });
  const [shine, setShine] = useState({ x:50, y:50 });
  const [hov, setHov]     = useState(false);

  const onMove = e => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTilt({ x:((e.clientY-r.top-r.height/2)/(r.height/2))*-14, y:((e.clientX-r.left-r.width/2)/(r.width/2))*14 });
    setShine({ x:(e.clientX-r.left)/r.width*100, y:(e.clientY-r.top)/r.height*100 });
  };

  return (
    <div ref={ref} onClick={onClick} onMouseMove={onMove}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>{ setTilt({x:0,y:0}); setShine({x:50,y:50}); setHov(false); }}
      style={{ transition:hov?"none":"transform .7s cubic-bezier(.23,1,.32,1)", transform:`rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle:"preserve-3d", cursor:"pointer" }}>

      {/* Slab body */}
      <div style={{
        width:156, height:224, borderRadius:6,
        background:"linear-gradient(165deg,#1a1a2e,#0d0d1a,#1a1a2e)",
        padding:"8px 6px 5px",
        display:"flex", flexDirection:"column", gap:5,
        position:"relative", overflow:"hidden",
        border:isActive
          ? `1px solid ${card.neonColor}`
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow:isActive
          ? `0 0 30px ${card.neonColor}66, 0 0 60px ${card.neonColor}33, 0 20px 60px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.08)`
          : "0 12px 50px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.05)",
      }}>
        {/* Slab gloss */}
        <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at ${shine.x}% ${shine.y}%,rgba(255,255,255,.08),transparent 55%)`, pointerEvents:"none", zIndex:20 }}/>
        {/* Neon corner accents */}
        {isActive && ["tl","tr","bl","br"].map(p=>(
          <div key={p} style={{ position:"absolute", width:10, height:10, borderColor:card.neonColor, borderStyle:"solid", borderWidth:0, zIndex:21,
            boxShadow:`0 0 6px ${card.neonColor}`,
            ...(p==="tl"?{top:4,left:4,borderTopWidth:2,borderLeftWidth:2}:
               p==="tr"?{top:4,right:4,borderTopWidth:2,borderRightWidth:2}:
               p==="bl"?{bottom:4,left:4,borderBottomWidth:2,borderLeftWidth:2}:
                        {bottom:4,right:4,borderBottomWidth:2,borderRightWidth:2})
          }}/>
        ))}

        {/* Card face */}
        <div style={{ flex:1, borderRadius:3, overflow:"hidden", boxShadow:"inset 0 0 0 1px rgba(0,0,0,.3)" }}>
          <RetroCardFace card={card} sx={shine.x} sy={shine.y} hov={hov}/>
        </div>

        {/* PSA label — retro style */}
        <div style={{
          background:"linear-gradient(90deg,#0a0a1a,#111128)",
          borderRadius:3, padding:"4px 6px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexShrink:0,
          border:`1px solid ${card.neonColor}44`,
          boxShadow:`inset 0 0 10px ${card.neonColor}11`,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{
              background:"linear-gradient(135deg,#c8102e,#8a0010)",
              borderRadius:2, padding:"2px 5px",
              fontSize:7.5, fontWeight:900, color:"#fff", letterSpacing:".06em",
              fontFamily:"'Courier New',monospace",
              boxShadow:"0 0 8px rgba(200,16,46,.6)",
            }}>PSA</div>
            <div>
              <div style={{ fontSize:5, color:card.neonColor, letterSpacing:".06em", lineHeight:1.2, textShadow:`0 0 4px ${card.neonColor}` }}>GEM MINT</div>
              <div style={{ fontSize:4, color:"rgba(255,255,255,.3)" }}>#{String(card.id*31337).slice(0,8)}</div>
            </div>
          </div>
          <div style={{ fontSize:22, fontWeight:900, color:card.neonColor, fontFamily:"'Courier New',monospace", lineHeight:1, textShadow:`0 0 16px ${card.neonColor}, 0 0 32px ${card.neonColor}66` }}>10</div>
        </div>
      </div>
    </div>
  );
}

// ─── RETRO MACHINE CAROUSEL ───────────────────────────────────────────────────
function RetroMachineCarousel() {
  const [active, setActive] = useState(0);
  const dragX  = useRef(null);
  const moved  = useRef(false);
  const total  = ATHLETES.length;
  const R      = 200;

  useEffect(() => {
    const t = setInterval(() => { if (!moved.current) setActive(i=>(i+1)%total); }, 3200);
    return () => clearInterval(t);
  }, []);

  const handleDown = e => { dragX.current = e.clientX; moved.current = false; };
  const handleMove = () => { if (dragX.current !== null) moved.current = true; };
  const handleUp   = e => {
    if (dragX.current !== null) {
      const d = e.clientX - dragX.current;
      if (d < -50) setActive(i=>(i+1)%total);
      else if (d > 50) setActive(i=>(i-1+total)%total);
      dragX.current = null;
    }
  };

  const activeCard = ATHLETES[active];

  return (
    <div style={{ position:"relative", width:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>

      {/* Machine frame */}
      <div style={{
        position:"relative",
        width:"100%", maxWidth:420,
        background:"linear-gradient(180deg,#0d0d20 0%,#080510 100%)",
        border:`2px solid ${activeCard.neonColor}`,
        borderRadius:16,
        padding:"20px 16px 16px",
        boxShadow:`0 0 40px ${activeCard.neonColor}44, 0 0 80px ${activeCard.neonColor}22, inset 0 0 30px rgba(0,0,0,.8)`,
        transition:"border-color .6s, box-shadow .6s",
        overflow:"hidden",
      }}>
        {/* CRT scanline overlay on machine */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.08) 4px)", pointerEvents:"none", zIndex:0 }}/>

        {/* Machine top label */}
        <div style={{ position:"relative", zIndex:2, textAlign:"center", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:4 }}>
            <div style={{ height:1, flex:1, background:`linear-gradient(90deg,transparent,${activeCard.neonColor})` }}/>
            <span style={{ fontSize:9, fontWeight:900, letterSpacing:".25em", color:activeCard.neonColor, textTransform:"uppercase", textShadow:`0 0 10px ${activeCard.neonColor}`, fontFamily:"'Courier New',monospace" }}>
              CARD·SNAP·3000
            </span>
            <div style={{ height:1, flex:1, background:`linear-gradient(90deg,${activeCard.neonColor},transparent)` }}/>
          </div>
          <div style={{ fontSize:7, color:`${activeCard.neonColor}88`, letterSpacing:".2em", textTransform:"uppercase" }}>
            ◀ DRAG TO BROWSE ▶
          </div>
        </div>

        {/* Carousel viewport */}
        <div
          style={{ position:"relative", height:260, perspective:1000, display:"flex", alignItems:"center", justifyContent:"center", userSelect:"none", zIndex:2 }}
          onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp}>
          <div style={{ position:"relative", width:156, height:224, transformStyle:"preserve-3d" }}>
            {ATHLETES.map((card,i) => {
              const rad   = (i - active) * (360/total) * Math.PI / 180;
              const cosV  = (Math.cos(rad) + 1) / 2;
              const scale = 0.5 + 0.5 * cosV;
              const op    = 0.2 + 0.8 * cosV;
              return (
                <div key={card.id} style={{
                  position:"absolute", top:0, left:0,
                  transform:`translateX(${Math.sin(rad)*R}px) translateZ(${Math.cos(rad)*R-R}px) scale(${scale})`,
                  opacity:op, zIndex:Math.round(scale*100),
                  transition:"transform .7s cubic-bezier(.23,1,.32,1),opacity .7s",
                  transformOrigin:"center center",
                }}>
                  <RetroPSASlab card={card} isActive={i===active} onClick={()=>{ if(!moved.current) setActive(i); }}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active card info */}
        <div style={{ position:"relative", zIndex:2, textAlign:"center", marginTop:14 }}>
          <div style={{ fontSize:15, fontWeight:900, color:"#fff", letterSpacing:".06em", textShadow:`0 0 16px ${activeCard.neonColor}`, fontFamily:"'Courier New',monospace" }}>
            {activeCard.name.toUpperCase()}
          </div>
          <div style={{ fontSize:10, color:activeCard.neonColor, letterSpacing:".14em", marginTop:3, textShadow:`0 0 8px ${activeCard.neonColor}` }}>
            {activeCard.year} {activeCard.brand} · {activeCard.parallel}
          </div>
        </div>

        {/* Dot nav */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:14, position:"relative", zIndex:2 }}>
          {ATHLETES.map((_,i)=>(
            <div key={i} onClick={()=>setActive(i)} style={{
              width:i===active?24:7, height:7, borderRadius:4, cursor:"pointer",
              background:i===active?activeCard.neonColor:"rgba(255,255,255,.15)",
              boxShadow:i===active?`0 0 10px ${activeCard.neonColor}, 0 0 20px ${activeCard.neonColor}66`:"none",
              transition:"all .35s",
            }}/>
          ))}
        </div>

        {/* Machine bottom vent lines */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, height:6, background:`repeating-linear-gradient(90deg,${activeCard.neonColor}22 0,${activeCard.neonColor}22 3px,transparent 3px,transparent 8px)`, transition:"background .6s" }}/>
      </div>
    </div>
  );
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function LandingScreen({ onSnap, onBulk }) {
  const [tick, setTick] = useState(0);
  const [glitch, setGlitch] = useState(false);
  useEffect(()=>{
    const t = setInterval(()=>setTick(v=>v+1), 50);
    // Random glitch effect
    const g = setInterval(()=>{ setGlitch(true); setTimeout(()=>setGlitch(false), 120); }, 4000 + Math.random()*3000);
    return()=>{ clearInterval(t); clearInterval(g); };
  },[]);

  const neonCycle = ["#00f5ff","#ff00aa","#FFD700","#9000ff"];
  const neon = neonCycle[Math.floor(tick/80) % neonCycle.length];

  return (
    <Screen style={{ background:"#08050f" }}>
      <style>{`
        @keyframes sw{0%{transform:translateX(-120%)}100%{transform:translateX(220%)}}
        @keyframes flicker{0%,95%,100%{opacity:1}96%,99%{opacity:.7}}
        @keyframes gridScroll{from{backgroundPosition:0 0}to{backgroundPosition:0 40px}}
        @keyframes scanDown{0%{top:-4px}100%{top:100%}}
      `}</style>

      {/* Scrolling grid background */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        backgroundImage:"linear-gradient(rgba(0,245,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,245,255,0.04) 1px,transparent 1px)",
        backgroundSize:"40px 40px",
        animation:"gridScroll 3s linear infinite",
      }}/>

      {/* Moving scan line */}
      <div style={{ position:"fixed", left:0, right:0, height:4, background:"linear-gradient(90deg,transparent,rgba(0,245,255,.15),transparent)", pointerEvents:"none", zIndex:1, animation:"scanDown 6s linear infinite" }}/>

      {/* Vignette */}
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,.7) 100%)", pointerEvents:"none", zIndex:0 }}/>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"18px 22px", position:"relative", zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:8,
            background:"linear-gradient(135deg,#00f5ff22,#9000ff22)",
            border:"1.5px solid #00f5ff",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18,
            boxShadow:"0 0 16px rgba(0,245,255,.4)",
          }}>📸</div>
          <div>
            <span style={{
              color:"#00f5ff", fontWeight:900, fontSize:22,
              letterSpacing:".08em", fontFamily:"'Courier New',monospace",
              textShadow:"0 0 20px #00f5ff, 0 0 40px #00f5ff66",
              filter:glitch?"hue-rotate(90deg)":"none",
              transition:"filter .05s",
            }}>CARD<span style={{ color:"#ff00aa", textShadow:"0 0 20px #ff00aa" }}>SNAP</span></span>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {["HISTORY","SYS"].map(l=>(
            <button key={l} style={btn({ background:"rgba(0,245,255,.06)", border:"1px solid rgba(0,245,255,.25)", borderRadius:6, padding:"6px 12px", color:"#00f5ff", fontSize:10, letterSpacing:".12em" })}
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(0,245,255,.14)"; e.currentTarget.style.boxShadow="0 0 12px rgba(0,245,255,.3)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="rgba(0,245,255,.06)"; e.currentTarget.style.boxShadow="none"; }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Hero text */}
      <div style={{ textAlign:"center", padding:"0 24px 0", position:"relative", zIndex:10 }}>
        <div style={{ fontSize:9, letterSpacing:".3em", textTransform:"uppercase", color:"#ff00aa", fontWeight:700, marginBottom:10, textShadow:"0 0 12px #ff00aa", animation:"flicker 5s infinite" }}>
          ▶ INITIALIZING CARD SCANNER v2.0 ◀
        </div>
        <h1 style={{ fontSize:32, fontWeight:900, color:"#fff", margin:0, lineHeight:1.1, letterSpacing:".04em", fontFamily:"'Courier New',monospace" }}>
          <span style={{ color:"#00f5ff", textShadow:"0 0 24px #00f5ff, 0 0 48px #00f5ff44", display:"block", fontSize:36 }}>LIST CARDS</span>
          <span style={{ color:"#ff00aa", textShadow:"0 0 24px #ff00aa, 0 0 48px #ff00aa44", fontSize:28 }}>LIKE A PRO</span>
        </h1>
        <div style={{ fontSize:10, color:"rgba(0,245,255,.6)", letterSpacing:".18em", marginTop:8, fontFamily:"'Courier New',monospace" }}>
          PHOTO → EBAY LISTING IN 30 SECONDS
        </div>
      </div>

      {/* Machine carousel */}
      <div style={{ width:"100%", maxWidth:460, margin:"20px auto 16px", padding:"0 16px", position:"relative", zIndex:5 }}>
        <RetroMachineCarousel/>
      </div>

      {/* Stats — retro readout style */}
      <div style={{ display:"flex", gap:0, justifyContent:"center", marginBottom:20, position:"relative", zIndex:10 }}>
        {[{val:"28s",label:"AVG LIST TIME"},{val:"PSA 10",label:"GRADED READY"},{val:"EBAY",label:"LIVE OUTPUT"}].map(({val,label},i)=>(
          <div key={label} style={{ textAlign:"center", padding:"8px 20px", borderLeft:i>0?"1px solid rgba(0,245,255,.15)":"none" }}>
            <div style={{ color:"#00f5ff", fontWeight:900, fontSize:16, fontFamily:"'Courier New',monospace", textShadow:"0 0 12px #00f5ff" }}>{val}</div>
            <div style={{ color:"rgba(0,245,255,.45)", fontSize:8, marginTop:3, letterSpacing:".12em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ width:"100%", maxWidth:420, margin:"auto auto 0", padding:"0 20px 36px", display:"flex", flexDirection:"column", gap:10, position:"relative", zIndex:10 }}>

        {/* Primary snap button */}
        <button onClick={onSnap} style={btn({
          width:"100%", padding:"20px",
          borderRadius:8,
          background:"linear-gradient(135deg,rgba(0,245,255,.15),rgba(144,0,255,.15))",
          border:"2px solid #00f5ff",
          color:"#00f5ff", fontSize:17, fontWeight:900,
          letterSpacing:".12em",
          boxShadow:"0 0 30px rgba(0,245,255,.35), inset 0 0 20px rgba(0,245,255,.05)",
          position:"relative", overflow:"hidden",
          textShadow:"0 0 16px #00f5ff",
        })}
          onMouseEnter={e=>{ e.currentTarget.style.background="linear-gradient(135deg,rgba(0,245,255,.25),rgba(144,0,255,.25))"; e.currentTarget.style.boxShadow="0 0 50px rgba(0,245,255,.55), inset 0 0 30px rgba(0,245,255,.1)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="linear-gradient(135deg,rgba(0,245,255,.15),rgba(144,0,255,.15))"; e.currentTarget.style.boxShadow="0 0 30px rgba(0,245,255,.35), inset 0 0 20px rgba(0,245,255,.05)"; }}>
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(100deg,transparent 30%,rgba(255,255,255,.08) 50%,transparent 70%)", animation:"sw 2.8s ease-in-out infinite" }}/>
          <span style={{ position:"relative" }}>[ 📷 SNAP A CARD ]</span>
        </button>

        {/* Divider */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ flex:1, height:1, background:"rgba(0,245,255,.15)" }}/>
          <span style={{ color:"rgba(0,245,255,.4)", fontSize:9, letterSpacing:".2em" }}>OR</span>
          <div style={{ flex:1, height:1, background:"rgba(0,245,255,.15)" }}/>
        </div>

        {/* Bulk button */}
        <button onClick={onBulk} style={btn({
          width:"100%", padding:"15px 18px",
          borderRadius:8,
          background:"rgba(255,0,170,.08)",
          border:"1.5px solid rgba(255,0,170,.4)",
          color:"#ff00aa", fontSize:14, fontWeight:700,
          letterSpacing:".1em",
          display:"flex", alignItems:"center", justifyContent:"center", gap:12,
          textShadow:"0 0 10px #ff00aa44",
        })}
          onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,0,170,.16)"; e.currentTarget.style.boxShadow="0 0 20px rgba(255,0,170,.3)"; }}
          onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,0,170,.08)"; e.currentTarget.style.boxShadow="none"; }}>
          <span>🗂️</span>
          <div style={{ textAlign:"left" }}>
            <div>[ BULK SESSION ]</div>
            <div style={{ fontSize:9, color:"rgba(255,0,170,.6)", fontWeight:400, marginTop:2, letterSpacing:".08em" }}>SCAN UP TO 5 CARDS · LIST ALL AT ONCE</div>
          </div>
          <div style={{ marginLeft:"auto", background:"rgba(255,0,170,.15)", border:"1px solid rgba(255,0,170,.4)", borderRadius:4, padding:"3px 8px", fontSize:9, color:"#ff00aa", fontWeight:900, letterSpacing:".08em" }}>5 MAX</div>
        </button>

        <div style={{ textAlign:"center", color:"rgba(0,245,255,.3)", fontSize:9, letterSpacing:".15em", marginTop:2 }}>
          ■ CONNECTED TO EBAY · LISTINGS GO LIVE INSTANTLY ■
        </div>
      </div>
    </Screen>
  );
}

// ─── CAMERA ───────────────────────────────────────────────────────────────────
function CameraScreen({ onCapture, onBack, isBulk = false, slotNum = 1 }) {
  const cameraRef  = useRef(null);
  const galleryRef = useRef(null);
  const [preview, setPreview]     = useState(null);
  const [imageData, setImageData] = useState(null);
  const [mime, setMime]           = useState("image/jpeg");
  const [side, setSide]           = useState("front");
  const [source, setSource]       = useState(null);

  const readFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = ev => { setPreview(ev.target.result); setImageData(ev.target.result.split(",")[1]); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const clear = () => { setPreview(null); setImageData(null); setSource(null); };

  return (
    <Screen>
      <TopBar onBack={onBack} title={isBulk ? `Scan Card ${slotNum} of 5` : "Snap Your Card"} sub="Take a photo or pick from your gallery"/>
      <div style={{ display:"flex", gap:8, padding:"14px 20px", flexShrink:0 }}>
        {["front","back"].map(s=>(
          <Pill key={s} active={side===s} onClick={()=>{ setSide(s); clear(); }}>
            {s==="front" ? "📷 Front" : "📷 Back (optional)"}
          </Pill>
        ))}
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 20px 12px" }}>
        <div style={{ width:"100%", maxWidth:320, aspectRatio:"2.5/3.5", borderRadius:16, border:`2px dashed ${preview?"transparent":C.gold}`, position:"relative", overflow:"hidden", background:preview?"#000":"rgba(255,215,0,.04)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:preview?"0 0 0 2px rgba(255,215,0,.4)":"none" }}>
          {preview ? (
            <img src={preview} alt="card" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
          ) : (
            <div style={{ textAlign:"center", padding:"0 28px" }}>
              <div style={{ fontSize:52, marginBottom:14 }}>🃏</div>
              <div style={{ color:C.text, fontWeight:700, fontSize:15, marginBottom:6 }}>No photo yet</div>
              <div style={{ color:C.muted, fontSize:12, lineHeight:1.5 }}>Use the buttons below to take a photo or pick from your gallery</div>
              {["tl","tr","bl","br"].map(p=>(
                <div key={p} style={{ position:"absolute", width:22, height:22, borderColor:C.gold, borderStyle:"solid", borderWidth:0, opacity:.45,
                  ...(p==="tl"?{top:12,left:12,borderTopWidth:3,borderLeftWidth:3,borderRadius:"4px 0 0 0"}:
                     p==="tr"?{top:12,right:12,borderTopWidth:3,borderRightWidth:3,borderRadius:"0 4px 0 0"}:
                     p==="bl"?{bottom:12,left:12,borderBottomWidth:3,borderLeftWidth:3,borderRadius:"0 0 0 4px"}:
                              {bottom:12,right:12,borderBottomWidth:3,borderRightWidth:3,borderRadius:"0 0 4px 0"}) }}/>
              ))}
            </div>
          )}
        </div>
        {preview && (
          <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
            <span style={{ fontSize:11, color:C.muted, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"3px 10px" }}>
              {source==="gallery" ? "🖼️ From gallery" : "📷 From camera"}
            </span>
            <button onClick={clear} style={btn({ background:"none", color:C.muted, fontSize:12 })}>Remove ✕</button>
          </div>
        )}
      </div>
      <input ref={cameraRef}  type="file" accept="image/*" capture="environment" onChange={readFile} style={{ display:"none" }}/>
      <input ref={galleryRef} type="file" accept="image/*"                        onChange={readFile} style={{ display:"none" }}/>
      <div style={{ padding:"8px 20px 40px", flexShrink:0, display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>{ setSource("camera"); cameraRef.current?.click(); }}
            style={btn({ flex:1, padding:"15px", borderRadius:14, background:"linear-gradient(135deg,#ffd700,#ff9500)", color:"#000", fontSize:15, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", gap:7, boxShadow:"0 4px 20px rgba(255,180,0,.28)" })}>
            <span>📷</span>{preview ? "Retake" : "Camera"}
          </button>
          <button onClick={()=>{ setSource("gallery"); galleryRef.current?.click(); }}
            style={btn({ flex:1, padding:"15px", borderRadius:14, background:C.surface, border:`1.5px solid ${C.border}`, color:C.text, fontSize:15, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:7 })}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(255,215,0,.35)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; }}>
            <span>🖼️</span> Gallery
          </button>
        </div>
        <button onClick={()=>{ if(imageData) onCapture(imageData, mime, side); }} disabled={!imageData}
          style={btn({ width:"100%", padding:"19px", borderRadius:14, fontSize:16, fontWeight:900, background:imageData?"linear-gradient(135deg,#ffd700,#ff9500)":"rgba(255,255,255,.06)", color:imageData?"#000":"rgba(255,255,255,.2)", cursor:imageData?"pointer":"not-allowed", boxShadow:imageData?"0 4px 24px rgba(255,215,0,.3)":"none" })}>
          {imageData ? `Analyze ${side==="front"?"Front":"Back"} →` : "Take a photo or pick from gallery"}
        </button>
        {imageData && side==="front" && (
          <button onClick={()=>onCapture(imageData, mime, "front")} style={btn({ width:"100%", padding:"13px", borderRadius:14, background:C.surface, border:`1px solid ${C.border}`, color:C.muted, fontSize:14 })}>
            Skip back photo
          </button>
        )}
      </div>
    </Screen>
  );
}

// ─── PROCESSING ───────────────────────────────────────────────────────────────
function ProcessingScreen({ imageBase64, imageMime, onDone, onBack }) {
  const [step, setStep]   = useState(0);
  const [error, setError] = useState(null);
  const steps = ["Compressing image…","Sending to Gemini…","Identifying card…","Building listing…"];

  useEffect(() => {
    let i = 0;
    const ticker = setInterval(() => { i++; if (i < steps.length) setStep(i); }, 1200);
    runExtraction(imageBase64, imageMime)
      .then(data => { clearInterval(ticker); setStep(steps.length); setTimeout(()=>onDone(data), 400); })
      .catch(err  => { clearInterval(ticker); setError(err.message || "Unknown error"); });
    return () => clearInterval(ticker);
  }, []);

  if (error) return (
    <Screen style={{ alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center", padding:"0 36px", maxWidth:380 }}>
        <div style={{ fontSize:52, marginBottom:20 }}>⚠️</div>
        <div style={{ color:C.text, fontWeight:800, fontSize:20, marginBottom:10 }}>Couldn't read the card</div>
        <div style={{ color:C.muted, fontSize:13, lineHeight:1.6, marginBottom:12 }}>Try better lighting, hold the camera steady, or make sure the card fills the frame.</div>
        <div style={{ color:"rgba(255,120,120,.8)", fontSize:11, fontFamily:"monospace", background:"rgba(255,0,0,.06)", border:"1px solid rgba(255,0,0,.15)", padding:"10px 14px", borderRadius:8, marginBottom:28, wordBreak:"break-all", textAlign:"left" }}>
          {error}
        </div>
        <button onClick={onBack} style={btn({ width:"100%", padding:"18px", borderRadius:14, background:"linear-gradient(135deg,#ffd700,#ff9500)", color:"#000", fontSize:16, fontWeight:900 })}>
          Try Again
        </button>
      </div>
    </Screen>
  );

  return (
    <Screen style={{ alignItems:"center", justifyContent:"center" }}>
      <style>{`
        @keyframes pulse2{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.12)}}
        @keyframes scan2{0%{top:0}100%{top:calc(100% - 3px)}}
        @keyframes spin2{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      <div style={{ position:"absolute", top:"50%", left:"50%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(0,245,255,.06),transparent 70%)", animation:"pulse2 2s ease-in-out infinite" }}/>
      <div style={{ position:"relative", zIndex:2, textAlign:"center", padding:"0 40px" }}>
        <div style={{ width:100, height:140, margin:"0 auto 32px", borderRadius:8, border:"2px solid rgba(0,245,255,.4)", position:"relative", overflow:"hidden", background:"rgba(0,245,255,.04)" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"linear-gradient(90deg,transparent,#00f5ff,transparent)", animation:"scan2 1.4s ease-in-out infinite" }}/>
          <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 8px,rgba(0,245,255,.04) 9px)" }}/>
        </div>
        <div style={{ color:"#00f5ff", fontSize:12, fontWeight:700, letterSpacing:".15em", textTransform:"uppercase", marginBottom:20, textShadow:"0 0 12px #00f5ff" }}>Analyzing card</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10, textAlign:"left" }}>
          {steps.map((s,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, opacity:i<=step?1:0.28, transition:"opacity .4s" }}>
              <div style={{ width:18, height:18, borderRadius:"50%", flexShrink:0, background:i<step?"#4ade80":i===step?"rgba(0,245,255,.15)":"rgba(255,255,255,.06)", border:`2px solid ${i<step?"#4ade80":i===step?"#00f5ff":C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, boxShadow:i===step?"0 0 10px #00f5ff":"none" }}>
                {i<step ? "✓" : i===step ? <span style={{ display:"block", animation:"spin2 1s linear infinite" }}>◌</span> : ""}
              </div>
              <span style={{ color:i<=step?C.text:C.muted, fontSize:13, fontFamily:"'Courier New',monospace" }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

// ─── QUESTIONS ────────────────────────────────────────────────────────────────
const GRADING_COS = ["PSA","BGS","SGC","CGC","CSG","HGA","Other"];
const GRADES      = ["10","9.5","9","8.5","8","7.5","7","6","5"];
const BGS_GRADES  = ["10 Black","9.5","9","8.5","8","7.5","7"];
const RAW_CONDS   = ["NM-MT","NM","EX-MT","EX","VG-EX","VG","Good","Poor"];
const SHIPPING    = [
  { id:"pwe",  label:"PWE",  desc:"Plain white envelope",       price:"$1.00" },
  { id:"bmwt", label:"BMWT", desc:"Bubble mailer + top loader", price:"$5.00" },
  { id:"box",  label:"Box",  desc:"Cardboard box",              price:"$12.00" },
  { id:"free", label:"Free", desc:"Free shipping",              price:"$0.00" },
];

function QuestionFlow({ cardData, onDone, onBack }) {
  const suggested = mockPrice(cardData);
  const [answers, setAnswers] = useState({
    isGraded:  cardData.is_graded ?? false,
    gradingCo: cardData.grading_company || "PSA",
    grade:     cardData.grade || "10",
    condition: "NM-MT",
    price:     String(suggested),
    shipping:  "bmwt",
    format:    "BIN",
  });
  const [step, setStep] = useState(0);
  const set = (k,v) => setAnswers(a=>({...a,[k]:v}));

  const steps = ["identity","raw_graded",
    ...(answers.isGraded ? ["grading_co","grade"] : ["condition"]),
    "price","shipping","format"
  ];
  const current  = steps[step];
  const progress = (step/steps.length)*100;

  const H = (t,s) => <div style={{ marginBottom:20 }}><div style={{ color:C.text, fontWeight:800, fontSize:20 }}>{t}</div>{s&&<div style={{ color:C.muted, fontSize:13, marginTop:5 }}>{s}</div>}</div>;

  const renderStep = () => {
    if (current==="identity") return (
      <div>
        {H("Does this look right?","Tap a field to correct it")}
        {[
          { label:"Player",   val:cardData.player_name||"Unknown", conf:cardData.confidence?.player_name||0 },
          { label:"Year",     val:cardData.year||"—",              conf:cardData.confidence?.year||0 },
          { label:"Set",      val:`${cardData.brand||""} ${cardData.set_name||""}`.trim()||"—", conf:cardData.confidence?.set_name||0 },
          { label:"Parallel", val:cardData.parallel||"Base",       conf:cardData.confidence?.parallel||0 },
        ].map(({label,val,conf})=>(
          <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 14px", borderRadius:10, background:C.surface, border:`1px solid ${conf<0.7?"rgba(255,200,0,.22)":C.border}`, marginBottom:8 }}>
            <div><div style={{ color:C.muted, fontSize:11, marginBottom:2 }}>{label}</div><div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{val}</div></div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {conf<0.7&&<span style={{ fontSize:10, color:C.gold, background:"rgba(255,215,0,.1)", padding:"2px 7px", borderRadius:8 }}>Low confidence</span>}
              <div style={{ width:8, height:8, borderRadius:"50%", background:conf>0.85?C.green:conf>0.65?C.gold:C.red }}/>
            </div>
          </div>
        ))}
        {cardData.is_rookie_card&&<div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:10, background:"rgba(74,222,128,.08)", border:"1px solid rgba(74,222,128,.18)", marginTop:8 }}><span>🏆</span><span style={{ color:C.green, fontWeight:700, fontSize:13 }}>Rookie Card detected</span></div>}
      </div>
    );
    if (current==="raw_graded") return (
      <div>{H("Raw or Graded?","Is this card in a grading company slab?")}
        <div style={{ display:"flex", gap:12 }}>
          {[{v:false,icon:"📋",label:"Raw",sub:"Ungraded"},{v:true,icon:"🏅",label:"Graded",sub:"In a slab"}].map(({v,icon,label,sub})=>(
            <div key={String(v)} onClick={()=>set("isGraded",v)} style={{ flex:1, padding:"18px 14px", borderRadius:14, cursor:"pointer", textAlign:"center", background:answers.isGraded===v?"rgba(255,215,0,.08)":C.surface, border:`2px solid ${answers.isGraded===v?"rgba(255,215,0,.4)":C.border}`, transition:"all .2s" }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
              <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{label}</div>
              <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    );
    if (current==="grading_co") return <div>{H("Grading Company")}<div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{GRADING_COS.map(c=><Pill key={c} active={answers.gradingCo===c} onClick={()=>set("gradingCo",c)}>{c}</Pill>)}</div></div>;
    if (current==="grade")      return <div>{H("Grade","What grade did it receive?")}<div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{(answers.gradingCo==="BGS"?BGS_GRADES:GRADES).map(g=><Pill key={g} active={answers.grade===g} onClick={()=>set("grade",g)} color={g==="10"?C.gold:undefined}>{g}</Pill>)}</div></div>;
    if (current==="condition")  return <div>{H("Condition","Raw card condition?")}<div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>{RAW_CONDS.map(c=><Pill key={c} active={answers.condition===c} onClick={()=>set("condition",c)}>{c}</Pill>)}</div></div>;
    if (current==="price") return (
      <div>
        {H("Set Your Price","Based on recent eBay comps")}
        <div style={{ padding:"18px", borderRadius:14, background:"rgba(255,215,0,.06)", border:"1px solid rgba(255,215,0,.2)", marginBottom:16, textAlign:"center" }}>
          <div style={{ color:C.muted, fontSize:12, marginBottom:4 }}>Suggested price</div>
          <div style={{ color:C.gold, fontWeight:900, fontSize:36 }}>${suggested}</div>
          <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>Based on ~6 recent eBay sold comps</div>
        </div>
        <label style={{ color:C.muted, fontSize:12, display:"block", marginBottom:6 }}>Your price</label>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:C.text, fontWeight:700, fontSize:16 }}>$</span>
          <input type="number" value={answers.price} onChange={e=>set("price",e.target.value)} style={{ width:"100%", padding:"14px 14px 14px 28px", borderRadius:12, background:C.surface, border:`1.5px solid ${C.border}`, color:C.text, fontSize:18, fontWeight:700, fontFamily:"'Courier New',monospace", outline:"none", boxSizing:"border-box" }}/>
        </div>
        <button onClick={()=>set("price",String(suggested))} style={btn({ marginTop:10, padding:"8px 14px", borderRadius:10, background:"rgba(255,215,0,.08)", border:"1px solid rgba(255,215,0,.2)", color:C.gold, fontSize:12, fontWeight:700 })}>Use suggested ${suggested}</button>
      </div>
    );
    if (current==="shipping") return (
      <div>{H("Shipping")}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {SHIPPING.map(s=>(
            <div key={s.id} onClick={()=>set("shipping",s.id)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:12, cursor:"pointer", background:answers.shipping===s.id?"rgba(255,215,0,.07)":C.surface, border:`1.5px solid ${answers.shipping===s.id?"rgba(255,215,0,.35)":C.border}`, transition:"all .2s" }}>
              <div style={{ flex:1 }}><div style={{ color:C.text, fontWeight:700 }}>{s.label}</div><div style={{ color:C.muted, fontSize:12 }}>{s.desc}</div></div>
              <div style={{ color:answers.shipping===s.id?C.gold:C.muted, fontWeight:800 }}>{s.price}</div>
              {answers.shipping===s.id&&<div style={{ width:16, height:16, borderRadius:"50%", background:C.gold, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#000", fontWeight:900 }}>✓</div>}
            </div>
          ))}
        </div>
      </div>
    );
    if (current==="format") return (
      <div>{H("Listing Format")}
        <div style={{ display:"flex", gap:12 }}>
          {[{v:"BIN",icon:"💰",label:"Buy It Now",sub:"Fixed price"},{v:"Auction",icon:"⏱️",label:"Auction",sub:"7-day bidding"}].map(({v,icon,label,sub})=>(
            <div key={v} onClick={()=>set("format",v)} style={{ flex:1, padding:"18px 14px", borderRadius:14, cursor:"pointer", textAlign:"center", background:answers.format===v?"rgba(255,215,0,.08)":C.surface, border:`2px solid ${answers.format===v?"rgba(255,215,0,.4)":C.border}`, transition:"all .2s" }}>
              <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
              <div style={{ color:C.text, fontWeight:700, fontSize:14 }}>{label}</div>
              <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    );
    return null;
  };

  return (
    <Screen>
      <TopBar onBack={step===0?onBack:()=>setStep(s=>s-1)} title="Quick Questions" sub={`Step ${step+1} of ${steps.length}`}/>
      <div style={{ height:3, background:"rgba(255,255,255,.07)", flexShrink:0 }}><div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg,${C.gold},#ff9500)`, transition:"width .4s", borderRadius:2 }}/></div>
      <div style={{ flex:1, overflowY:"auto", padding:"24px 20px" }}>{renderStep()}</div>
      <div style={{ padding:"12px 20px 40px", flexShrink:0 }}>
        <button onClick={step<steps.length-1?()=>setStep(s=>s+1):()=>onDone({...cardData,...answers})} style={btn({ width:"100%", padding:"19px", borderRadius:14, background:"linear-gradient(135deg,#ffd700,#ff9500)", color:"#000", fontSize:16, fontWeight:900, boxShadow:"0 4px 24px rgba(255,180,0,.28)" })}>
          {step<steps.length-1?"Next →":"Preview Listing →"}
        </button>
      </div>
    </Screen>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
function PreviewScreen({ cardData, answers, imageUrl, onList, onBack }) {
  const buildTitle = () => [cardData.year,cardData.brand,cardData.set_name,cardData.player_name,cardData.card_number?`#${cardData.card_number}`:null,cardData.parallel,cardData.is_rookie_card?"RC":null,answers.isGraded?`${answers.gradingCo} ${answers.grade}`:answers.condition].filter(Boolean).join(" ").slice(0,80);
  const [title, setTitle]          = useState(buildTitle);
  const [editingTitle, setEditing] = useState(false);
  const ship = SHIPPING.find(s=>s.id===answers.shipping);
  return (
    <Screen>
      <TopBar onBack={onBack} title="Review Listing" sub="Tap the title to edit"/>
      <div style={{ flex:1, overflowY:"auto", padding:"20px" }}>
        {imageUrl&&<div style={{ borderRadius:14, overflow:"hidden", marginBottom:16, aspectRatio:"2.5/3.5", maxWidth:180, margin:"0 auto 16px" }}><img src={imageUrl} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/></div>}
        <div style={{ marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ color:C.muted, fontSize:11, textTransform:"uppercase", letterSpacing:".08em" }}>eBay Title</span>
            <span style={{ color:title.length>80?C.red:title.length>70?C.gold:C.muted, fontSize:11 }}>{title.length}/80</span>
          </div>
          {editingTitle
            ?<textarea value={title} onChange={e=>setTitle(e.target.value.slice(0,80))} onBlur={()=>setEditing(false)} autoFocus style={{ width:"100%", padding:"12px", borderRadius:10, background:C.surface, border:`1.5px solid ${C.gold}`, color:C.text, fontSize:13, fontFamily:"'Courier New',monospace", resize:"none", height:72, outline:"none", boxSizing:"border-box" }}/>
            :<div onClick={()=>setEditing(true)} style={{ padding:"12px 14px", borderRadius:10, background:C.surface, border:`1px solid ${C.border}`, color:C.text, fontSize:13, lineHeight:1.4, cursor:"text" }}>{title}</div>
          }
        </div>
        {[["Player",cardData.player_name||"—"],["Year",cardData.year||"—"],["Set",`${cardData.brand||""} ${cardData.set_name||""}`.trim()||"—"],["Card #",cardData.card_number||"—"],["Parallel",cardData.parallel||"Base"],["Condition",answers.isGraded?`${answers.gradingCo} ${answers.grade}`:answers.condition],["Sport",cardData.sport||"—"],["Team",cardData.team||"—"]].map(([label,val])=>(
          <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
            <span style={{ color:C.muted, fontSize:13 }}>{label}</span>
            <span style={{ color:C.text, fontSize:13, fontWeight:600 }}>{val}</span>
          </div>
        ))}
        <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:12 }}>
          {cardData.is_rookie_card&&<span style={{ fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:12, background:"rgba(74,222,128,.1)", color:C.green, border:"1px solid rgba(74,222,128,.2)" }}>🏆 Rookie Card</span>}
          {cardData.has_autograph&&<span style={{ fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:12, background:"rgba(255,215,0,.1)", color:C.gold, border:"1px solid rgba(255,215,0,.2)" }}>✍️ Auto</span>}
          {cardData.has_patch&&<span style={{ fontSize:12, fontWeight:700, padding:"4px 10px", borderRadius:12, background:"rgba(200,16,46,.1)", color:"#ff6b6b", border:"1px solid rgba(200,16,46,.2)" }}>🟦 Patch</span>}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px", borderRadius:14, background:"rgba(255,215,0,.06)", border:"1px solid rgba(255,215,0,.2)", marginTop:16 }}>
          <div><div style={{ color:C.muted, fontSize:12 }}>{answers.format==="BIN"?"Buy It Now":"Starting Bid"}</div><div style={{ color:C.gold, fontWeight:900, fontSize:28 }}>${parseFloat(answers.price||0).toFixed(2)}</div></div>
          <div style={{ textAlign:"right" }}><div style={{ color:C.muted, fontSize:12 }}>Shipping</div><div style={{ color:C.text, fontWeight:700 }}>{ship?.label} · {ship?.price}</div></div>
        </div>
      </div>
      <div style={{ padding:"12px 20px 40px", flexShrink:0 }}>
        <button onClick={()=>onList({...answers,title})} style={btn({ width:"100%", padding:"21px", borderRadius:14, background:"linear-gradient(135deg,#ffd700,#ff9500,#c8102e)", color:"#000", fontSize:18, fontWeight:900, boxShadow:"0 4px 32px rgba(255,180,0,.32)" })}>
          🚀  List on eBay Now
        </button>
        <button onClick={onBack} style={btn({ width:"100%", padding:"13px", borderRadius:14, background:"none", color:C.muted, fontSize:13, marginTop:8 })}>Edit answers</button>
      </div>
    </Screen>
  );
}

// ─── SUCCESS ──────────────────────────────────────────────────────────────────
function SuccessScreen({ listingData, cardData, onAnother }) {
  const fakeId = useRef(Math.floor(Math.random()*900000000+100000000)).current;
  return (
    <Screen style={{ alignItems:"center", justifyContent:"center" }}>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(74,222,128,.07),transparent 70%)" }}/>
      <div style={{ position:"relative", zIndex:2, textAlign:"center", padding:"0 32px", width:"100%", maxWidth:400 }}>
        <div style={{ width:80, height:80, borderRadius:"50%", background:"linear-gradient(135deg,#4ade80,#22c55e)", margin:"0 auto 24px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, boxShadow:"0 0 50px rgba(74,222,128,.4)" }}>✓</div>
        <div style={{ color:C.text, fontWeight:900, fontSize:28, marginBottom:8 }}>Listed on eBay!</div>
        <div style={{ color:C.muted, fontSize:14, marginBottom:28, lineHeight:1.5 }}>Your listing is now live and searchable</div>
        <div style={{ padding:"18px", borderRadius:14, background:C.surface, border:`1px solid ${C.border}`, marginBottom:16, textAlign:"left" }}>
          <div style={{ color:C.text, fontWeight:700, fontSize:14, marginBottom:4 }}>{cardData.player_name||"Sports Card"}</div>
          <div style={{ color:C.muted, fontSize:11, marginBottom:12 }}>{listingData.title?.slice(0,55)}…</div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <div><div style={{ color:C.muted, fontSize:11 }}>Price</div><div style={{ color:C.gold, fontWeight:900, fontSize:18 }}>${parseFloat(listingData.price||0).toFixed(2)}</div></div>
            <div style={{ textAlign:"right" }}><div style={{ color:C.muted, fontSize:11 }}>Listing ID</div><div style={{ color:C.text, fontWeight:700 }}>#{fakeId}</div></div>
          </div>
        </div>
        <a href={`https://ebay.com/itm/${fakeId}`} target="_blank" rel="noreferrer" style={{ display:"block", padding:"12px", borderRadius:12, background:"rgba(14,98,255,.1)", border:"1px solid rgba(14,98,255,.25)", color:"#6ba3ff", fontSize:13, fontWeight:700, marginBottom:24, textDecoration:"none" }}>
          View on eBay → ebay.com/itm/{fakeId}
        </a>
        <button onClick={onAnother} style={btn({ width:"100%", padding:"19px", borderRadius:14, background:"linear-gradient(135deg,#ffd700,#ff9500)", color:"#000", fontSize:16, fontWeight:900 })}>
          List Another Card 📷
        </button>
      </div>
    </Screen>
  );
}

// ─── BULK ─────────────────────────────────────────────────────────────────────
function BulkFlow({ onBack }) {
  const [slots, setSlots]     = useState(Array(5).fill(null));
  const [active, setActive]   = useState(0);
  const [sub, setSub]         = useState("list");
  const [imgB64, setImgB64]   = useState(null);
  const [imgMime, setImgMime] = useState("image/jpeg");
  const [curCard, setCurCard] = useState(null);
  const filled = slots.filter(Boolean);
  const total  = filled.reduce((s,c)=>s+parseFloat(c.price||0),0);

  if (sub==="camera")     return <CameraScreen onCapture={(b,m)=>{ setImgB64(b); setImgMime(m); setSub("processing"); }} onBack={()=>setSub("list")} isBulk slotNum={active+1}/>;
  if (sub==="processing") return <ProcessingScreen imageBase64={imgB64} imageMime={imgMime} onDone={d=>{ setCurCard(d); setSub("questions"); }} onBack={()=>setSub("list")}/>;
  if (sub==="questions"&&curCard) return <QuestionFlow cardData={curCard} onDone={ans=>{ const n=[...slots]; n[active]={...curCard,...ans,price:ans.price||String(mockPrice(curCard))}; setSlots(n); setSub("list"); if(active<4) setActive(active+1); }} onBack={()=>setSub("list")}/>;

  return (
    <Screen>
      <TopBar onBack={onBack} title="Bulk Session" sub="Scan up to 5 cards · list all at once"/>
      <div style={{ flex:1, overflowY:"auto", padding:"18px 20px" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {slots.map((slot,i)=>(
            <div key={i} onClick={()=>setActive(i)} style={{ display:"flex", alignItems:"center", gap:14, padding:"13px 15px", borderRadius:13, cursor:"pointer", background:active===i?"rgba(255,215,0,.055)":slot?"rgba(255,255,255,.04)":"rgba(255,255,255,.02)", border:`1.5px ${slot||active===i?"solid":"dashed"} ${active===i?"rgba(255,215,0,.35)":slot?"rgba(255,255,255,.1)":"rgba(255,255,255,.09)"}`, transition:"all .2s" }}>
              <div style={{ width:33, height:33, borderRadius:"50%", flexShrink:0, background:slot?"linear-gradient(135deg,#ffd700,#ff9500)":active===i?"rgba(255,215,0,.14)":"rgba(255,255,255,.07)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:slot?"#000":active===i?C.gold:"rgba(255,255,255,.28)", boxShadow:slot?"0 2px 10px rgba(255,215,0,.35)":"none", transition:"all .3s" }}>
                {slot?"✓":i+1}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                {slot
                  ?<><div style={{ color:C.text, fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{slot.player_name||"Card"}</div><div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{slot.year} {slot.brand}{slot.isGraded?` · ${slot.gradingCo} ${slot.grade}`:""}</div></>
                  :<div style={{ color:active===i?"rgba(255,215,0,.65)":"rgba(255,255,255,.22)", fontSize:14 }}>{active===i?`Ready to scan card ${i+1}`:`Card ${i+1}`}</div>
                }
              </div>
              {slot&&<div style={{ textAlign:"right", flexShrink:0 }}><div style={{ color:C.green, fontWeight:800, fontSize:15 }}>${parseFloat(slot.price||0).toFixed(2)}</div><div style={{ color:C.muted, fontSize:10 }}>est.</div></div>}
            </div>
          ))}
        </div>
        {active<=4&&!slots[active]&&(
          <button onClick={()=>setSub("camera")} style={btn({ width:"100%", marginTop:18, padding:"15px", borderRadius:13, background:"rgba(255,215,0,.07)", border:"1.5px dashed rgba(255,215,0,.28)", color:C.gold, fontSize:15, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8 })}>
            📷  Snap Card {active+1}
          </button>
        )}
        {filled.length===5&&<div style={{ marginTop:16, textAlign:"center", color:C.green, fontSize:13, fontWeight:700 }}>✓ All 5 cards scanned</div>}
      </div>
      <div style={{ padding:"14px 20px 40px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
        {filled.length>0&&(
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, padding:"10px 14px", background:C.surface, borderRadius:10 }}>
            <div style={{ color:C.muted, fontSize:12 }}>{filled.length} card{filled.length!==1?"s":""} ready</div>
            <div style={{ color:C.gold, fontWeight:700, fontSize:13 }}>Est. ${total.toFixed(2)}</div>
          </div>
        )}
        <button disabled={!filled.length} style={btn({ width:"100%", padding:"19px", borderRadius:14, background:filled.length?"linear-gradient(135deg,#ffd700,#ff9500,#e05000)":"rgba(255,255,255,.06)", color:filled.length?"#000":"rgba(255,255,255,.2)", fontSize:16, fontWeight:900, cursor:filled.length?"pointer":"not-allowed", boxShadow:filled.length?"0 4px 24px rgba(255,180,0,.3)":"none" })}>
          {filled.length?`🚀 List All ${filled.length} Card${filled.length!==1?"s":""} on eBay →`:"Scan at least 1 card"}
        </button>
      </div>
    </Screen>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]     = useState("landing");
  const [imgB64, setImgB64]     = useState(null);
  const [imgMime, setImgMime]   = useState("image/jpeg");
  const [imgUrl, setImgUrl]     = useState(null);
  const [cardData, setCardData] = useState(null);
  const [answers, setAnswers]   = useState(null);

  const reset = () => { setScreen("landing"); setImgB64(null); setImgUrl(null); setCardData(null); setAnswers(null); };

  if (screen==="landing")    return <LandingScreen onSnap={()=>setScreen("camera")} onBulk={()=>setScreen("bulk")}/>;
  if (screen==="camera")     return <CameraScreen onCapture={(b,m)=>{ setImgB64(b); setImgMime(m); setImgUrl(`data:${m};base64,${b}`); setScreen("processing"); }} onBack={()=>setScreen("landing")}/>;
  if (screen==="processing") return <ProcessingScreen imageBase64={imgB64} imageMime={imgMime} onDone={d=>{ setCardData(d); setScreen("questions"); }} onBack={()=>setScreen("camera")}/>;
  if (screen==="questions")  return <QuestionFlow cardData={cardData||{}} onDone={a=>{ setAnswers(a); setScreen("preview"); }} onBack={()=>setScreen("camera")}/>;
  if (screen==="preview")    return <PreviewScreen cardData={cardData||{}} answers={answers||{}} imageUrl={imgUrl} onList={l=>{ setAnswers(p=>({...p,...l})); setScreen("success"); }} onBack={()=>setScreen("questions")}/>;
  if (screen==="success")    return <SuccessScreen listingData={answers||{}} cardData={cardData||{}} onAnother={reset}/>;
  if (screen==="bulk")       return <BulkFlow onBack={()=>setScreen("landing")}/>;
  return null;
}
