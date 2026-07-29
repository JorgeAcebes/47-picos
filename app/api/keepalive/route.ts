import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = url && key ? createClient(url, key) : null;

export async function GET(req: Request) {
    const auth = req.headers.get("Authorization");

    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (!supabase) {
        return Response.json(
            { ok: false, error: "Supabase not configured" },
            { status: 500 }
        );
    }

    const { error } = await supabase
        .from("ascents")
        .select("id")
        .limit(1);

    if (error) {
        return Response.json(
            { ok: false, error: error.message },
            { status: 500 }
        );
    }

    return Response.json({
        ok: true,
        timestamp: new Date().toISOString(),
    });
}