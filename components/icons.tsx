import React from "react";
import { Telescope, PawPrint, Plane, Rocket, Star, Camera, Heart, User, Tent, Mountain, Compass, Building } from "lucide-react";

export function getIconComponent(name: string, size: number = 14) {
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
    default: return <Star size={size} />;
  }
}
