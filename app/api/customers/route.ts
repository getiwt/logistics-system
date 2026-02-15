import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type CustomerInput = {
  code?: string;
  name: string;
  kana?: string;
  phone?: string;
  email?: string;
  postal?: string;
  address1?: string;
  address2?: string;
  note?: string;
  is_active?: boolean;
};

export async function GET() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const body = (await req.json()) as CustomerInput;

  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "得意先名は必須です" }, { status: 400 });
  }

  // code未入力なら自動採番（C000001みたいに）
  let code = body.code?.trim() || "";
  if (!code) {
    const { data: latest } = await supabase
      .from("customers")
      .select("code")
      .not("code", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const maxNum =
      (latest ?? [])
        .map((r) => (r.code ?? "").match(/^C(\d{6})$/)?.[1])
        .filter(Boolean)
        .map((s) => Number(s))
        .reduce((a, b) => Math.max(a, b), 0) || 0;

    code = `C${String(maxNum + 1).padStart(6, "0")}`;
  }

  const payload = {
    code,
    name: body.name.trim(),
    kana: body.kana?.trim() || null,
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    postal: body.postal?.trim() || null,
    address1: body.address1?.trim() || null,
    address2: body.address2?.trim() || null,
    note: body.note?.trim() || null,
    is_active: body.is_active ?? true,
  };

  const { data, error } = await supabase.from("customers").insert(payload).select("*").single();

  if (error) {
    // code重複など
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
