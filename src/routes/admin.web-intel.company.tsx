import { createFileRoute } from "@tanstack/react-router";
import { CompanyResearchPage } from "@/components/admin/webintel/CompanyResearchPage";

export const Route = createFileRoute("/admin/web-intel/company")({
  component: () => <CompanyResearchPage kind="company" />,
  head: () => ({
    meta: [{ title: "Company research · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});
