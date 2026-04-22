import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  full_name: z.string().min(1).max(200),
});

// One-time bootstrap: only works if no admin exists yet.
export const Route = createFileRoute("/api/admin/bootstrap")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { count } = await supabaseAdmin
            .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
          if ((count ?? 0) > 0) return new Response("Admin already exists", { status: 403 });

          const parsed = Body.safeParse(await request.json());
          if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
          const data = parsed.data;

          const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true,
            user_metadata: { full_name: data.full_name },
          });
          if (cErr || !created.user) return Response.json({ error: cErr?.message ?? "create failed" }, { status: 400 });

          await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
          return Response.json({ ok: true });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});