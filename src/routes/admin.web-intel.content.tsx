import { createFileRoute } from "@tanstack/react-router";
import { InsightResearchPage } from "@/components/admin/webintel/InsightResearchPage";

export const Route = createFileRoute("/admin/web-intel/content")({
  component: () => <InsightResearchPage kind="content" />,
  head: () => ({
    meta: [{ title: "Content research · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});
