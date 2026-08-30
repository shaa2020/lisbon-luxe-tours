import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { ResourceManager } from "@/components/admin/ops/ResourceManager";

export const Route = createFileRoute("/admin/ops/customers")({ component: Page });

function Page() {
  return (
    <AdminShell requires="ops.manage">
      <OpsPage title="Customers" description="Everyone who has ever booked or enquired.">
        <ResourceManager
          table="ops_customers"
          queryKey={["ops", "customers"]}
          orderBy="name"
          titleKey="name"
          subtitleKeys={["whatsapp", "email", "country"]}
          addLabel="Add customer"
          defaults={{ name: "", whatsapp: "", email: "", country: "", notes: "" }}
          fields={[
            { key: "name", label: "Full name" },
            { key: "whatsapp", label: "WhatsApp" },
            { key: "email", label: "Email" },
            { key: "country", label: "Country" },
            { key: "notes", label: "Notes", type: "textarea", wide: true },
          ]}
        />
      </OpsPage>
    </AdminShell>
  );
}
