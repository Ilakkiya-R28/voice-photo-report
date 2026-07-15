import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GuardianEye — See it. Say it. Solved." },
      { name: "description", content: "Hyperlocal civic issue reporting with AI vision & voice. Report potholes, leaks, garbage, and more using a photo or your voice." },
      { property: "og:title", content: "GuardianEye — See it. Say it. Solved." },
      { property: "og:description", content: "Hyperlocal civic issue reporting with AI vision & voice. Report potholes, leaks, garbage, and more using a photo or your voice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/guardianeye.html"
      title="GuardianEye"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0 }}
    />
  );
}
