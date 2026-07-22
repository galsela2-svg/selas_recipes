import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "מתכונים — ספר המתכונים שלנו",
    short_name: "מתכונים",
    description: "ספר מתכונים משותף עם סנכרון בענן ורשימת קניות.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    lang: "he",
    dir: "rtl",
    background_color: "#0b0c0e",
    theme_color: "#0b0c0e",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
