import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().max(200).optional().nullable(),
  message: z.string().trim().min(1).max(2000),
  source: z.string().trim().max(60).optional().nullable(),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { notifyOwner } = await import("./email/owner-notify.server");

    const { data: row, error } = await supabaseAdmin
      .from("contact_messages")
      .insert({
        name: data.name,
        email: data.email.toLowerCase(),
        subject: data.subject || "Website enquiry",
        message: data.message,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await notifyOwner(supabaseAdmin as never, {
      subject: `New enquiry from ${data.name}`,
      heading: "New website enquiry",
      intro: data.message,
      replyTo: data.email,
      label: "owner_alert",
      idempotencyKey: `contact-${row?.id ?? Date.now()}`,
      rows: [
        { label: "Name", value: data.name },
        { label: "Email", value: data.email },
        { label: "Details", value: data.subject || "Website enquiry" },
        { label: "Source", value: data.source || "Contact page" },
      ],
      ctaLabel: "Open messages",
      ctaUrl: "https://tuktuk24lisbon.com/admin/messages",
    });

    return { ok: true as const };
  });
