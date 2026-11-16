import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShiftPilot",
    short_name: "ShiftPilot",
    description: "Shifts, attendance and staffing operations.",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: "#F5F7FB",
    theme_color: "#10243A",
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
