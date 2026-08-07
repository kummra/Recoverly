import type { MetadataRoute } from "next";

/**
 * Installable-app metadata. Matters most on low-end Android in India: once
 * installed the app opens from the home screen, launches standalone, and the
 * shell keeps working on a poor connection.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recoverly — Anti-Alcohol Recovery",
    short_name: "Recoverly",
    description:
      "A compassionate, private companion to help you reduce or quit alcohol — tracking, gentle insights, an AI support coach and real crisis helplines.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1419",
    theme_color: "#0f1419",
    categories: ["health", "lifestyle", "medical"],
    lang: "en-IN",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ],
    shortcuts: [
      {
        // The reason someone opens this app in a hurry.
        name: "I'm struggling right now",
        short_name: "Craving SOS",
        description: "Open the urge-surfing support flow",
        url: "/dashboard?sos=1"
      },
      {
        name: "Support & helplines",
        short_name: "Helplines",
        description: "Crisis helplines and how to find professional help",
        url: "/support"
      }
    ]
  };
}
