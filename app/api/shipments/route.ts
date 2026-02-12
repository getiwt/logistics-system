import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const customerId = url.searchParams.get("customer_id");
    const status = url.searchParams.get("status"); // 'unclosed' など

    const supabase = supabaseServer();

    let q = supabase
      .from("shipments")
      .select("id,date,customer_id,origin,destination,item_name,vehicle_no,driver_name,partner_name,freight_amount,toll_amount,tax_exempt_amount,note,status, customers(name)")
      .order("date", { ascending: false })
      .order("id", { ascending: false });

    if (from) q = q.gte("date", from);
    if (to) q = q.lte("date", to);
    if (customerId) q = q.eq("customer_id", Number(customerId));
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return new NextResponse(error.message, { status: 500 });

    const rows = (data ?? []).map((r: any) => ({
      ...r,
      customer_name: r.customers?.name ?? null,
      customers: undefined,
    }));

    return NextResponse.json(rows);
  } catch (e: any) {
    return new NextResponse(String(e?.message ?? e), { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from("shipments")
      .insert({
        date: body.date,
        customer_id: body.customer_id,
        origin: body.origin,
        destination: body.destination,
        item_name: body.item_name,
        vehicle_no: body.vehicle_no,
        driver_name: body.driver_name,
        partner_name: body.partner_name,
        freight_amount: body.freight_amount ?? 0,
        toll_amount: body.toll_amount ?? 0,
        tax_exempt_amount: body.tax_exempt_amount ?? 0,
        note: body.note,
        status: body.status ?? "unclosed",
      })
      .select("id")
      .single();

    if (error) return new NextResponse(error.message, { status: 500 });
    return NextResponse.json({ id: data?.id });
  } catch (e: any) {
    return new NextResponse(String(e?.message ?? e), { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const supabase = supabaseServer();

    if (!body.id) return new NextResponse("id is required", { status: 400 });

    const { error } = await supabase
      .from("shipments")
      .update({
        date: body.date,
        customer_id: body.customer_id,
        origin: body.origin,
        destination: body.destination,
        item_name: body.item_name,
        vehicle_no: body.vehicle_no,
        driver_name: body.driver_name,
        partner_name: body.partner_name,
        freight_amount: body.freight_amount ?? 0,
        toll_amount: body.toll_amount ?? 0,
        tax_exempt_amount: body.tax_exempt_amount ?? 0,
        note: body.note,
        status: body.status ?? "unclosed",
      })
      .eq("id", body.id);

    if (error) return new NextResponse(error.message, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(String(e?.message ?? e), { status: 500 });
  }
}
