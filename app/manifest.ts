import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ITN GOLD LOAN",
    short_name: "ITN Gold Loan",
    description:
      "Instant gold loan support in Thrissur with live-rate valuation, EMI estimation, and same-day disbursal.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f0e0",
    theme_color: "#d6a756",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
