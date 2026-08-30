import React from "react";
import { Activity, Zap, Cpu } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Point = { icon: LucideIcon; text: string };

const HERO_POINTS: Point[] = [
  { icon: Activity, text: "Full-scale bipedal humanoid platforms engineered at VIT Chennai" },
  { icon: Zap, text: "High-torque cycloidal actuation & custom GaN power stages" },
  { icon: Cpu, text: "1,000 Hz real-time deterministic control & embodied intelligence" },
];

export function HeroPoints() {
  return (
    <ul
      style={{
        listStyle: "none",
        listStyleType: "none",
        margin: "32px 0 52px 0",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "640px",
      }}
    >
      {HERO_POINTS.map(({ icon: Icon, text }) => (
        <li
          key={text}
          style={{
            listStyle: "none",
            listStyleType: "none",
            display: "flex",
            alignItems: "flex-start",
            gap: "16px",
            margin: 0,
            padding: 0,
          }}
        >
          <Icon
            style={{
              marginTop: "3px",
              width: "17px",
              height: "17px",
              flexShrink: 0,
              color: "#71717A",
            }}
            strokeWidth={1.6}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: "var(--font-satoshi, sans-serif)",
              fontSize: "15px",
              lineHeight: "1.6",
              color: "#3F3F46",
              letterSpacing: "-0.01em",
            }}
          >
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default HeroPoints;