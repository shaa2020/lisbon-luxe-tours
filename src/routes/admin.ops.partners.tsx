import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { ResourceManager } from "@/components/admin/ops/ResourceManager";
import { PARTNER_TYPES } from "@/lib/ops/types";

export const Route = createFileRoute("/admin/ops/partners")({ component: Page });

function Page() {
  return (
    <AdminShell requires="ops.manage">
      <OpsPage
        title="Partners"
        description="Hotels, agencies and creators who send you bookings, with their commission."
      >
        <ResourceManager
          table="ops_partners"
          queryKey={["ops", "partners"]}
          orderBy="company"
          titleKey="company"
          badgeKey="status"
          subtitleKeys={["partner_type", "contact_person", "commission_percent"]}
          addLabel="Add partner"
          defaults={{
            company: "",
            partner_type: "Hotel",
            contact_person: "",
            email: "",
            whatsapp: "",
            commission_percent: 10,
            status: "Active",
            notes: "",
          }}
          fields={[
            { key: "company", label: "Company" },
            { key: "partner_type", label: "Type", type: "select", options: PARTNER_TYPES },
            { key: "contact_person", label: "Contact person" },
            { key: "email", label: "Email" },
            { key: "whatsapp", label: "WhatsApp" },
            { key: "commission_percent", label: "Commission %", type: "number" },
            { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] },
            { key: "notes", label: "Notes", type: "textarea", wide: true },
          ]}
        />
      </OpsPage>
    </AdminShell>
  );
}
