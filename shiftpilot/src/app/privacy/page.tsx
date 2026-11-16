import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand";

export const metadata: Metadata = { title: "Privacy notice" };

/**
 * Platform privacy notice. The staffing agency operating this deployment is
 * the data controller; its legal details and retention periods must be
 * reviewed by a qualified professional before go-live (see GDPR.md).
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <BrandMark className="size-7" />
        <span className="font-semibold">ShiftPilot</span>
      </Link>
      <article className="space-y-6 text-sm leading-6 text-foreground [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
        <h1 className="text-2xl font-semibold">Privacy notice</h1>
        <p>
          ShiftPilot is operated by the staffing agency that invited you. That agency is the controller of your personal data and
          decides why and how it is processed. Contact your agency for its legal name, contact details and data protection contact.
        </p>
        <h2>What we process</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account data: name, email address, phone number and language preference.</li>
          <li>Workers: professional profile, skills, certificates, availability, assignments, attendance and hours.</li>
          <li>Identity and work eligibility are recorded as verification statuses. ShiftPilot does not store BSN numbers.</li>
          <li>Client users: business contact details and the actions taken in the client portal.</li>
          <li>Security logs: sign-in events and an audit trail of changes.</li>
        </ul>
        <h2>Location</h2>
        <p>
          Location is only recorded at check-in and check-out, and only if your agency has enabled location verification and shown
          you its notice. ShiftPilot never tracks location continuously or in the background.
        </p>
        <h2>Who can see your data</h2>
        <p>
          Access is restricted by role. Clients see only the professional information relevant to their assignments and never see
          wage rates, private documents or internal notes. Every access rule is enforced by the database itself.
        </p>
        <h2>Your rights</h2>
        <p>
          You can ask your agency for access to, correction, export or deletion of your data, or object to processing. Some records
          (for example payroll and invoice records) must be kept for legally required periods.
        </p>
        <h2>Storage and security</h2>
        <p>
          Data is stored in the European Union where the hosting configuration allows, encrypted in transit, and protected by
          role-based access control and audit logging.
        </p>
      </article>
    </main>
  );
}
