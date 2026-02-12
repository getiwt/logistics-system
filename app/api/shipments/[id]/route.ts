import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = supabaseServer();
    const { error } = await supabase.from("shipments").delete().eq("id", Number(id));
    if (error) return new NextResponse(error.message, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(String(e?.message ?? e), { status: 500 });
  }
}
