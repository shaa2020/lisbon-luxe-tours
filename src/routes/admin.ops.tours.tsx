import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { ResourceManager } from "@/components/admin/ops/ResourceManager";
import { VEHICLE_TYPES } from "@/lib/ops/types";

export const Route = createFileRoute("/admin/ops/tours")({ component: Page });

function Page() {
  return (
    <AdminShell>
      <OpsPage
        title="Tour catalogue"
        description="Operational tour products used when dispatching jobs. Separate from the public website tours."
      >
        <ResourceManager
          table="ops_tours"
          queryKey={["ops", "tours"]}
          orderBy="name"
          titleKey="name"
          subtitleKeys={["vehicle_type", "duration_hours", "base_price"]}
          addLabel="Add tour"
          defaults={{
            name: "",
            vehicle_type: "Private Tuk Tuk",
            duration_hours: 2,
            base_price: 0,
            max_guests: 6,
            pickup_available: true,
            active: true,
            short_description: "",
            full_description: "",
            included: [],
            excluded: [],
            image_url: "",
          }}
          fields={[
            { key: "name", label: "Tour name" },
            { key: "vehicle_type", label: "Vehicle type", type: "select", options: VEHICLE_TYPES },
            { key: "duration_hours", label: "Duration (hours)", type: "number" },
            { key: "base_price", label: "Base price", type: "number" },
            { key: "max_guests", label: "Max guests", type: "number" },
            { key: "image_url", label: "Image URL" },
            { key: "short_description", label: "Short description", type: "textarea", wide: true },
            { key: "full_description", label: "Full description", type: "textarea", wide: true },
            { key: "included", label: "Included (comma separated)", type: "tags", wide: true },
            { key: "excluded", label: "Not included (comma separated)", type: "tags", wide: true },
            { key: "pickup_available", label: "Hotel pickup available", type: "boolean" },
            { key: "active", label: "Active", type: "boolean" },
          ]}
        />
      </OpsPage>
    </AdminShell>
  );
}
