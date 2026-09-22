import { createFileRoute } from "@tanstack/react-router";
import { CompanyResearchPage } from "@/components/admin/webintel/CompanyResearchPage";

export const Route = createFileRoute("/admin/web-intel/competitor")({
  component: () => <CompanyResearchPage kind="competitor" />,
  head: () => ({
    meta: [{ title: "Competitor research · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});
