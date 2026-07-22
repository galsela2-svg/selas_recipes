"use client";

import { useState } from "react";

const COLORS = ["#e8823a", "#5ac98a", "#e05a5a", "#eab308", "#60a5fa", "#f472b6"];
const PIECE_COUNT = 60;

type Piece = {
  left: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  rounded: boolean;
};

function randomPieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    left: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 0.4,
    duration: 2 + Math.random() * 1.5,
    rounded: Math.random() > 0.5,
  }));
}

/** Fire-once, pointer-events-none confetti burst covering the viewport. */
export function Confetti() {
  const [pieces] = useState<Piece[]>(randomPieces);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.rounded ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
