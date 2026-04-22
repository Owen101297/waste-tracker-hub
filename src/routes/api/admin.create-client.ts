import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  full_name: z.string().min(1).max(200),
  institution_name: z.string().min(1).max(200),
  address: z.string().max(300).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  responsible_person: z.string().max(200).optional().nullable(),
});

export const Route = createFileRoute("/api/admin/create-client")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization");
          if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
          const token = auth.slice(7);

          // Verify caller is admin
          const userClient = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
          );
          const { data: userData, error: uErr } = await userClient.auth.getUser();
          if (uErr || !userData.user) return new Response("Unauthorized", { status: 401 });
          const { data: roleRow } = await supabaseAdmin
            .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
          if (!roleRow) return new Response("Forbidden", { status: 403 });

          const parsed = Body.safeParse(await request.json());
          if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
          const data = parsed.data;

          // Create user (auto-confirmed)
          const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
            email: data.email,
            password: data.password,
            email_confirm: true,
            user_metadata: { full_name: data.full_name },
          });
          if (cErr || !created.user) return Response.json({ error: cErr?.message ?? "create failed" }, { status: 400 });

          // Assign client role
          await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "client" });

          // Create institution linked
          const { error: iErr } = await supabaseAdmin.from("institutions").insert({
            user_id: created.user.id,
            name: data.institution_name,
            address: data.address,
            phone: data.phone,
            responsible_person: data.responsible_person,
          });
          if (iErr) return Response.json({ error: iErr.message }, { status: 400 });

          return Response.json({ ok: true });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});