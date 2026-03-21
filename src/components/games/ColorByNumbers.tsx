"use client";

import React, { useEffect, useState } from "react";
import styles from "@/app/games/[id]/page.module.css";

// ── Types ──────────────────────────────────────────────────────────────────
interface RectAttrs    { x: number; y: number; width: number; height: number; rx?: number; }
interface CircleAttrs  { cx: number; cy: number; r: number; }
interface EllipseAttrs { cx: number; cy: number; rx: number; ry: number; }
interface PolygonAttrs { points: string; }
type RegionType = "rect" | "circle" | "ellipse" | "polygon";

interface Region {
  id: string;
  type: RegionType;
  attrs: RectAttrs | CircleAttrs | EllipseAttrs | PolygonAttrs;
  colorIdx: number; // 1-based
  label: { x: number; y: number };
}
interface Picture {
  name: string; emoji: string; difficulty: "Easy" | "Hard";
  viewBox: string; palette: string[]; regions: Region[];
}

// ── Picture data ───────────────────────────────────────────────────────────
const HOUSE: Picture = {
  name: "House", emoji: "🏠", difficulty: "Easy",
  viewBox: "0 0 300 280",
  palette: ["#60a5fa","#f8fafc","#fbbf24","#4ade80","#94a3b8","#fef3c7","#ef4444","#bfdbfe","#92400e"],
  regions: [
    { id:"sky",   type:"rect",    attrs:{x:0,y:0,width:300,height:245},     colorIdx:1, label:{x:22,y:22} },
    { id:"cloud", type:"ellipse", attrs:{cx:100,cy:35,rx:48,ry:20},          colorIdx:2, label:{x:100,y:38} },
    { id:"sun",   type:"circle",  attrs:{cx:260,cy:50,r:28},                  colorIdx:3, label:{x:260,y:53} },
    { id:"grass", type:"rect",    attrs:{x:0,y:238,width:300,height:42},     colorIdx:4, label:{x:22,y:258} },
    { id:"chim",  type:"rect",    attrs:{x:192,y:72,width:22,height:64},     colorIdx:5, label:{x:203,y:101} },
    { id:"wall",  type:"rect",    attrs:{x:62,y:128,width:176,height:114},   colorIdx:6, label:{x:98,y:155} },
    { id:"roof",  type:"polygon", attrs:{points:"46,133 150,50 254,133"},     colorIdx:7, label:{x:150,y:105} },
    { id:"winL",  type:"rect",    attrs:{x:76,y:146,width:42,height:30},     colorIdx:8, label:{x:97,y:164} },
    { id:"winR",  type:"rect",    attrs:{x:182,y:146,width:42,height:30},    colorIdx:8, label:{x:203,y:164} },
    { id:"door",  type:"rect",    attrs:{x:118,y:168,width:64,height:74},    colorIdx:9, label:{x:150,y:205} },
  ],
};

const FLOWER: Picture = {
  name: "Flower", emoji: "🌸", difficulty: "Easy",
  viewBox: "0 0 300 300",
  palette: ["#87ceeb","#4ade80","#fbbf24","#15803d","#f472b6"],
  regions: [
    { id:"sky",  type:"rect",    attrs:{x:0,y:0,width:300,height:263},     colorIdx:1, label:{x:22,y:22} },
    { id:"sun",  type:"circle",  attrs:{cx:265,cy:45,r:22},                 colorIdx:3, label:{x:265,y:48} },
    { id:"gnd",  type:"rect",    attrs:{x:0,y:258,width:300,height:42},    colorIdx:2, label:{x:22,y:273} },
    { id:"stem", type:"rect",    attrs:{x:144,y:153,width:12,height:108},  colorIdx:4, label:{x:150,y:205} },
    { id:"llf",  type:"polygon", attrs:{points:"144,192 86,218 118,242"},   colorIdx:2, label:{x:110,y:222} },
    { id:"rlf",  type:"polygon", attrs:{points:"156,192 214,218 182,242"},  colorIdx:2, label:{x:190,y:222} },
    { id:"ptop", type:"ellipse", attrs:{cx:150,cy:116,rx:18,ry:32},         colorIdx:5, label:{x:150,y:105} },
    { id:"prgt", type:"ellipse", attrs:{cx:184,cy:150,rx:32,ry:18},         colorIdx:5, label:{x:202,y:150} },
    { id:"pbot", type:"ellipse", attrs:{cx:150,cy:184,rx:18,ry:32},         colorIdx:5, label:{x:150,y:196} },
    { id:"plft", type:"ellipse", attrs:{cx:116,cy:150,rx:32,ry:18},         colorIdx:5, label:{x:98,y:150} },
    { id:"ctr",  type:"circle",  attrs:{cx:150,cy:150,r:28},                colorIdx:3, label:{x:150,y:153} },
  ],
};

const OWL: Picture = {
  name: "Owl", emoji: "🦉", difficulty: "Hard",
  viewBox: "0 0 300 300",
  palette: ["#1e3a5f","#fbbf24","#92400e","#f8fafc","#0f172a","#78350f","#fef3c7"],
  regions: [
    { id:"sky",   type:"rect",    attrs:{x:0,y:0,width:300,height:300},       colorIdx:1, label:{x:22,y:22} },
    { id:"moon",  type:"circle",  attrs:{cx:260,cy:48,r:24},                   colorIdx:2, label:{x:260,y:51} },
    { id:"body",  type:"ellipse", attrs:{cx:150,cy:200,rx:58,ry:75},           colorIdx:3, label:{x:172,y:212} },
    { id:"wngL",  type:"ellipse", attrs:{cx:83,cy:200,rx:26,ry:50},            colorIdx:6, label:{x:83,y:207} },
    { id:"wngR",  type:"ellipse", attrs:{cx:217,cy:200,rx:26,ry:50},           colorIdx:6, label:{x:217,y:207} },
    { id:"tum",   type:"ellipse", attrs:{cx:150,cy:212,rx:32,ry:42},           colorIdx:7, label:{x:150,y:215} },
    { id:"head",  type:"circle",  attrs:{cx:150,cy:108,r:50},                  colorIdx:3, label:{x:178,y:88} },
    { id:"earL",  type:"polygon", attrs:{points:"112,64 126,42 142,64"},       colorIdx:3, label:{x:127,y:54} },
    { id:"earR",  type:"polygon", attrs:{points:"158,64 174,42 188,64"},       colorIdx:3, label:{x:173,y:54} },
    { id:"eyeL",  type:"circle",  attrs:{cx:126,cy:100,r:18},                  colorIdx:4, label:{x:126,y:103} },
    { id:"eyeR",  type:"circle",  attrs:{cx:174,cy:100,r:18},                  colorIdx:4, label:{x:174,y:103} },
    { id:"pupL",  type:"circle",  attrs:{cx:126,cy:100,r:10},                  colorIdx:5, label:{x:126,y:103} },
    { id:"pupR",  type:"circle",  attrs:{cx:174,cy:100,r:10},                  colorIdx:5, label:{x:174,y:103} },
    { id:"beak",  type:"polygon", attrs:{points:"142,118 150,108 158,118 150,132"}, colorIdx:2, label:{x:150,y:121} },
  ],
};

const FISH: Picture = {
  name: "Fish", emoji: "🐠", difficulty: "Hard",
  viewBox: "0 0 300 300",
  palette: ["#0ea5e9","#d97706","#f97316","#c2410c","#fbbf24","#f8fafc","#0f172a","#22c55e"],
  regions: [
    { id:"sea",    type:"rect",    attrs:{x:0,y:0,width:300,height:256},      colorIdx:1, label:{x:22,y:22} },
    { id:"sand",   type:"rect",    attrs:{x:0,y:250,width:300,height:50},     colorIdx:2, label:{x:22,y:268} },
    { id:"swdL",   type:"rect",    attrs:{x:28,y:180,width:12,height:72},     colorIdx:8, label:{x:34,y:218} },
    { id:"swdR",   type:"rect",    attrs:{x:256,y:195,width:12,height:57},    colorIdx:8, label:{x:262,y:225} },
    { id:"body",   type:"ellipse", attrs:{cx:162,cy:148,rx:70,ry:38},         colorIdx:3, label:{x:152,y:151} },
    { id:"tail",   type:"polygon", attrs:{points:"93,120 65,148 93,176"},      colorIdx:4, label:{x:76,y:148} },
    { id:"finT",   type:"polygon", attrs:{points:"148,116 172,116 160,92"},    colorIdx:5, label:{x:160,y:108} },
    { id:"finB",   type:"polygon", attrs:{points:"148,180 172,180 160,206"},   colorIdx:5, label:{x:160,y:194} },
    { id:"strp1",  type:"ellipse", attrs:{cx:138,cy:148,rx:7,ry:28},          colorIdx:6, label:{x:138,y:151} },
    { id:"strp2",  type:"ellipse", attrs:{cx:160,cy:148,rx:7,ry:28},          colorIdx:6, label:{x:160,y:151} },
    { id:"eye",    type:"circle",  attrs:{cx:206,cy:140,r:13},                 colorIdx:6, label:{x:206,y:143} },
    { id:"pupil",  type:"circle",  attrs:{cx:206,cy:140,r:7},                  colorIdx:7, label:{x:206,y:143} },
    { id:"bbl1",   type:"circle",  attrs:{cx:224,cy:112,r:7},                  colorIdx:1, label:{x:224,y:115} },
    { id:"bbl2",   type:"circle",  attrs:{cx:238,cy:94,r:5},                   colorIdx:1, label:{x:238,y:97} },
  ],
};

const PICTURES: Picture[] = [HOUSE, FLOWER, OWL, FISH];

const KEYFRAMES = `
@keyframes cnPop {
  0%   { filter: brightness(1.6); }
  100% { filter: brightness(1); }
}
`;

// ── SVG Region element ─────────────────────────────────────────────────────
function SvgRegion({ region, fill, animate, onClick }: {
  region: Region; fill: string; animate: boolean; onClick: () => void;
}) {
  const common = {
    fill,
    stroke: "#1e293b",
    strokeWidth: 1.5,
    onClick,
    style: {
      cursor: "pointer",
      transition: "fill 0.28s ease",
      animation: animate ? "cnPop 0.5s ease" : "none",
    } as React.CSSProperties,
  };
  if (region.type === "rect") {
    const a = region.attrs as RectAttrs;
    return <rect {...common} x={a.x} y={a.y} width={a.width} height={a.height} rx={a.rx ?? 0} />;
  }
  if (region.type === "circle") {
    const a = region.attrs as CircleAttrs;
    return <circle {...common} cx={a.cx} cy={a.cy} r={a.r} />;
  }
  if (region.type === "ellipse") {
    const a = region.attrs as EllipseAttrs;
    return <ellipse {...common} cx={a.cx} cy={a.cy} rx={a.rx} ry={a.ry} />;
  }
  const a = region.attrs as PolygonAttrs;
  return <polygon {...common} points={a.points} />;
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ColorByNumbers({ title }: { title: string }) {
  const [picIdx, setPicIdx] = useState(0);
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [pops, setPops] = useState<Set<string>>(new Set());

  const pic = PICTURES[picIdx];
  const filledCount = filled.size;
  const total = pic.regions.length;
  const won = filledCount >= total;

  // Reset when picture changes
  useEffect(() => {
    setFilled(new Set());
    setPops(new Set());
  }, [picIdx]);

  const handleClick = (regionId: string) => {
    if (filled.has(regionId)) return;
    setFilled(prev => { const n = new Set(prev); n.add(regionId); return n; });
    setPops(prev => { const n = new Set(prev); n.add(regionId); return n; });
    setTimeout(() => setPops(prev => { const n = new Set(prev); n.delete(regionId); return n; }), 500);
  };

  const fillAll = () => {
    const all = new Set(pic.regions.map(r => r.id));
    setFilled(all);
    setPops(new Set());
  };

  return (
    <div className={styles.gameInner}>
      <style>{KEYFRAMES}</style>
      <h2 className={styles.gameTitle}>{title}</h2>

      {/* Picture selector */}
      <div className={styles.difficultySelector}>
        {PICTURES.map((p, i) => (
          <button
            key={i}
            className={`${styles.diffBtn} ${picIdx === i ? styles.activeDiff : ""}`}
            onClick={() => setPicIdx(i)}
            style={{ fontSize: "0.75rem" }}
          >
            {p.emoji} {p.name}
          </button>
        ))}
      </div>

      {/* Progress + difficulty badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "2px 4px 4px", fontSize: "0.78rem", color: "#94a3b8" }}>
        <span>Filled: <strong style={{ color: won ? "#4ade80" : "#e2e8f0" }}>{filledCount} / {total}</strong></span>
        <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.7rem", background: pic.difficulty === "Easy" ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)", color: pic.difficulty === "Easy" ? "#4ade80" : "#f87171" }}>
          {pic.difficulty}
        </span>
        <button className={styles.resetBtn} onClick={fillAll} style={{ fontSize: "0.7rem", padding: "2px 10px" }}>Reveal</button>
      </div>

      {/* Win banner */}
      {won && (
        <div style={{ textAlign: "center", padding: "2px 0 4px" }}>
          🎨 <strong style={{ color: "#4ade80" }}>Beautiful! All colored in!</strong>
        </div>
      )}

      {/* SVG canvas */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
        <svg
          viewBox={pic.viewBox}
          style={{ width: "100%", maxWidth: 420, height: "auto", display: "block", borderRadius: 10 }}
        >
          {/* Regions */}
          {pic.regions.map(region => (
            <SvgRegion
              key={region.id}
              region={region}
              fill={filled.has(region.id) ? pic.palette[region.colorIdx - 1] : "#e2e8f0"}
              animate={pops.has(region.id)}
              onClick={() => handleClick(region.id)}
            />
          ))}
          {/* Number labels on unfilled regions */}
          {pic.regions.map(region => !filled.has(region.id) && (
            <text
              key={`lbl-${region.id}`}
              x={region.label.x}
              y={region.label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11"
              fontWeight="700"
              fill="#334155"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {region.colorIdx}
            </text>
          ))}
        </svg>
      </div>

      {/* Color legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", padding: "6px 4px 4px" }}>
        {pic.palette.map((color, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: color, border: "1.5px solid rgba(255,255,255,0.2)", boxShadow: `0 0 6px ${color}66` }} />
            <span style={{ fontSize: "0.6rem", color: "#64748b" }}>{i + 1}</span>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", fontSize: "0.68rem", color: "#475569", padding: "2px 0 6px", margin: 0 }}>
        Tap each numbered region to fill it with the matching color
      </p>
    </div>
  );
}
