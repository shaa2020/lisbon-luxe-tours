import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const subscribeInput = z.object({
  email: z.string().email().min(3).max(200),
});

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subscribeInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { error } = await supabaseAdmin.from("subscribers").insert({ email });

    if (error) {
      // Unique violation — email already subscribed.
      if (error.code === "23505") {
        return { ok: true, message: "You're already on the list." };
      }
      throw new Error(error.message);
    }

    return { ok: true, message: "Subscribed. Welcome to the loop." };
  });
