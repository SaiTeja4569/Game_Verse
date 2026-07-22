import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase(
    { auth: ["user"] },
    async (req, ctx) => {
      try {
        const { user_id } = await req.json();

        if (!user_id) {
          return Response.json(
            { error: "Missing user_id" },
            { status: 400 }
          );
        }

        // Logged in user
        const {
          data: { user },
          error: userError,
        } = await ctx.supabase.auth.getUser();

        if (userError || !user) {
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        // Check admin permission
        const { data: profile, error: profileError } =
          await ctx.supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", user.id)
            .single();

        if (profileError || !profile?.is_admin) {
          return Response.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        }

        // Prevent deleting yourself
        if (user.id === user_id) {
          return Response.json(
            { error: "You cannot delete your own account." },
            { status: 400 }
          );
        }

        // Delete auth user
        const { error } =
          await ctx.supabaseAdmin.auth.admin.deleteUser(user_id);

        if (error) {
          return Response.json(
            { error: error.message },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          message: "User deleted successfully.",
        });
      } catch (err) {
        return Response.json(
          {
            error:
              err instanceof Error ? err.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }
  ),
};