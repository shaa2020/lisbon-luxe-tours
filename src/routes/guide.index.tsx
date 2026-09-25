import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/guide/")({
  head: () => ({
    meta: [
      { title: "TukTuk24 Guide" },
      { name: "description", content: "Tuk Tuk 24 guide app." },
      { property: "og:title", content: "TukTuk24 Guide" },
      { property: "og:description", content: "Tuk Tuk 24 guide app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GuideHome,
});

/** Installed app opens here; jump to the guide's saved private link. */
function GuideHome() {
  const nav = useNavigate();
  const [none, setNone] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem("t24_guide_token");
    if (t && /^[a-f0-9]{32,64}$/.test(t)) nav({ to: "/guide/$token", params: { token: t }, replace: true });
    else setNone(true);
  }, [nav]);
  return (
    <main className="mx-auto max-w-md p-6 text-sm">
      {none ? "Open the private link the office sent you on WhatsApp to set up the guide app." : "Opening…"}
    </main>
  );
}
