import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { ResourceManager } from "@/components/admin/ops/ResourceManager";
import { VEHICLE_STATUSES, VEHICLE_TYPES } from "@/lib/ops/types";

export const Route = createFileRoute("/admin/ops/vehicles")({ component: Page });

function Page() {
  return (
    <AdminShell requires="ops.manage">
      <OpsPage title="Vehicles" description="Your fleet and its availability.">
        <ResourceManager
          table="ops_vehicles"
          queryKey={["ops", "vehicles"]}
          orderBy="name"
          titleKey="name"
          badgeKey="status"
          subtitleKeys={["vehicle_type", "capacity"]}
          addLabel="Add vehicle"
          defaults={{
            name: "",
            vehicle_type: "Private Tuk Tuk",
            capacity: 6,
            status: "Available",
            notes: "",
          }}
          fields={[
            { key: "name", label: "Vehicle name / plate" },
            { key: "vehicle_type", label: "Type", type: "select", options: VEHICLE_TYPES },
            { key: "capacity", label: "Capacity", type: "number" },
            { key: "status", label: "Status", type: "select", options: VEHICLE_STATUSES },
            { key: "notes", label: "Notes", type: "textarea", wide: true },
          ]}
        />
      </OpsPage>
    </AdminShell>
  );
}
