import { createFileRoute } from "@tanstack/react-router";
import { InsightResearchPage } from "@/components/admin/webintel/InsightResearchPage";

export const Route = createFileRoute("/admin/web-intel/seo")({
  component: () => <InsightResearchPage kind="seo" />,
  head: () => ({
    meta: [{ title: "SEO research · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});
