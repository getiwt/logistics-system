import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const supabase = supabaseServer();
  const { searchParams } = new URL(req.url);

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const customer_id = searchParams.get("customer_id"); // uuid or number string (どっちでもOK)
  const onlyUnclosed = searchParams.get("onlyUnclosed") === "1";

  if (!from || !to || !customer_id) {
    return NextResponse.json({ error: "from/to/customer_id は必須です" }, { status: 400 });
  }

  let q = supabase
    .from("shipments")
    .select("*")
    .gte("date", from)
    .lte("date", to)
    .eq("customer_id", customer_id)
    .order("date", { ascending: true });

  if (onlyUnclosed) q = q.eq("status", "unclosed");

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const sum = rows.reduce(
    (acc: any, r: any) => {
      acc.count += 1;
      acc.freight += Number(r.freight_amount || 0);
      acc.toll += Number(r.toll_amount || 0);
      acc.exempt += Number(r.tax_exempt_amount || 0);
      return acc;
    },
    { count: 0, freight: 0, toll: 0, exempt: 0 }
  );
  sum.total = sum.freight + sum.toll + sum.exempt;

  return NextResponse.json({ rows, sum });
}

export async function POST(req: Request) {
  // 締め処理：指定期間＋得意先の未締を締済にする
  const supabase = supabaseServer();
  const body = await req.json().catch(() => ({}));

  const { from, to, customer_id } = body ?? {};
  if (!from || !to || !customer_id) {
    return NextResponse.json({ error: "from/to/customer_id は必須です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("shipments")
    .update({ status: "closed" })
    .gte("date", from)
    .lte("date", to)
    .eq("customer_id", customer_id)
    .eq("status", "unclosed")
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ closedCount: (data ?? []).length });
}
