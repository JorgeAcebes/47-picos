import React from "react";
import { Telescope, PawPrint, Plane, Rocket, Star, Camera, Heart, User, Tent, Mountain, Compass, Building, TreePine, Home, Dumbbell, Waves, Sun, Utensils, Map, Castle, Store, BookOpen } from "lucide-react";

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
    case "telescope": return <Telescope size={size} />;
    case "paw": return <PawPrint size={size} />;
    case "plane": return <Plane size={size} />;
    case "rocket": return <Rocket size={size} />;
    case "camera": return <Camera size={size} />;
    case "heart": return <Heart size={size} />;
    case "user": return <User size={size} />;
    case "tent": return <Tent size={size} />;
    case "mountain": return <Mountain size={size} />;
    case "compass": return <Compass size={size} />;
    case "building": return <Building size={size} />;
    case "tree": return <TreePine size={size} />;
    case "home": return <Home size={size} />;
    case "dumbbell": return <Dumbbell size={size} />;
    case "waves": return <Waves size={size} />;
    case "sun": return <Sun size={size} />;
    case "utensils": return <Utensils size={size} />;
    case "map": return <Map size={size} />;
    case "castle": return <Castle size={size} />;
    case "store": return <Store size={size} />;
    case "book": return <BookOpen size={size} />;
    default: return <Star size={size} />;
  }
}
