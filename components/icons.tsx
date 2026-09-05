import React from "react";
import {
  // Nature & Outdoors
  Mountain, TreePine, Waves, Sun, PawPrint,
  // Travel, Navigation & Exploration
  Plane, Rocket, Compass, Map, Tent, Telescope,
  // Places & Architecture
  Home, Building, Landmark, Store,
  // Lifestyle & Activities
  Camera, Dumbbell, Utensils, BookOpen, Trophy,
  // UI, People & Symbols
  User, Heart, CircleDot, Star
} from "lucide-react";

export function getIconComponent(name: string, size: number = 18) {
  if (!name) return <Star size={size} />;

  const emojiRegex = /\p{Extended_Pictographic}/u;
  if (emojiRegex.test(name)) {
    return (
      <span
        style={{
          fontSize: size,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {name}
      </span>
    );
  }

  switch (name) {
    // Naturaleza y Exteriores
    case "mountain": return <Mountain size={size} />;
    case "tree": return <TreePine size={size} />;
    case "waves": return <Waves size={size} />;
    case "sun": return <Sun size={size} />;
    case "paw": return <PawPrint size={size} />;

    // Viajes, Exploración y Navegación
    case "plane": return <Plane size={size} />;
    case "rocket": return <Rocket size={size} />;
    case "compass": return <Compass size={size} />;
    case "map": return <Map size={size} />;
    case "tent": return <Tent size={size} />;
    case "telescope": return <Telescope size={size} />;

    // Lugares y Arquitectura
    case "home": return <Home size={size} />;
    case "building": return <Building size={size} />;
    case "landmark": return <Landmark size={size} />;
    case "store": return <Store size={size} />;

    // Estilo de Vida y Actividades
    case "camera": return <Camera size={size} />;
    case "dumbbell": return <Dumbbell size={size} />;
    case "utensils": return <Utensils size={size} />;
    case "book": return <BookOpen size={size} />;
    case "trophy": return <Trophy size={size} />;

    // UI, Personas y Símbolos
    case "user": return <User size={size} />;
    case "heart": return <Heart size={size} />;
    case "circle-dot": return <CircleDot size={size} />;

    default: return <Star size={size} />;
  }
}

export function IconLogo({ className, style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path className="logo-mountain-1" d="M12 52 L36 12 L48 32.75 Z" fill="url(#logoGradGreen)" />
      <path className="logo-mountain-2" d="M24 60 L44 26 L60 52 Z" fill="url(#logoGradPurple)" />
      <defs>
        <linearGradient id="logoGradGreen" x1="12" y1="12" x2="48" y2="52">
          <stop stopColor="#5c9b7d" />
          <stop offset="1" stopColor="#245f52" />
        </linearGradient>
        <linearGradient id="logoGradPurple" x1="24" y1="26" x2="60" y2="60">
          <stop stopColor="#9570c7" />
          <stop offset="1" stopColor="#5b3a8c" />
        </linearGradient>
      </defs>
    </svg>
  );
}
