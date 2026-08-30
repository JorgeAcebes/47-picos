import React from "react";
import { Telescope, PawPrint, Plane, Rocket, Star, Camera, Heart, User } from "lucide-react";

export function getIconComponent(name: string) {
  switch (name) {
    case "telescope": return <Telescope size={14} />;
    case "paw": return <PawPrint size={14} />;
    case "plane": return <Plane size={14} />;
    case "rocket": return <Rocket size={14} />;
    case "camera": return <Camera size={14} />;
    case "heart": return <Heart size={14} />;
    case "user": return <User size={14} />;
    default: return <Star size={14} />;
  }
}
