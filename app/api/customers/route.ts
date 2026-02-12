import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("customers")
      .select("id,name")
      .order("name", { ascending: true });

    if (error) return new NextResponse(error.message, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return new NextResponse(String(e?.message ?? e), { status: 500 });
  }
}
