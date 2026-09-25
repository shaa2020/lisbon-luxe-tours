import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { ResourceManager } from "@/components/admin/ops/ResourceManager";
import { GuideLinks } from "@/components/admin/ops/GuideLinks";
import { STAFF_ROLES, STAFF_STATUSES } from "@/lib/ops/types";

export const Route = createFileRoute("/admin/ops/team")({ component: Page });

function Page() {
  return (
    <AdminShell requires="ops.manage">
      <OpsPage title="Guides & drivers" description="Your team and who can be assigned to jobs.">
        <GuideLinks />
        <ResourceManager
          table="ops_staff"
          queryKey={["ops", "staff"]}
          orderBy="name"
          titleKey="name"
          badgeKey="status"
          subtitleKeys={["role", "whatsapp", "languages"]}
          addLabel="Add team member"
          defaults={{
            name: "",
            role: "Driver & Guide",
            status: "Active",
            phone: "",
            whatsapp: "",
            languages: [],
            notes: "",
          }}
          fields={[
            { key: "name", label: "Name" },
            { key: "role", label: "Role", type: "select", options: STAFF_ROLES },
            { key: "status", label: "Status", type: "select", options: STAFF_STATUSES },
            { key: "phone", label: "Phone" },
            { key: "whatsapp", label: "WhatsApp" },
            { key: "languages", label: "Languages (comma separated)", type: "tags" },
            { key: "photo_url", label: "Photo URL (shown to guests)" },
            { key: "bio", label: "Short bio (shown to guests)", type: "textarea", wide: true },
            { key: "notes", label: "Notes", type: "textarea", wide: true },
          ]}
        />
      </OpsPage>
    </AdminShell>
  );
}
