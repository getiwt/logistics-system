"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Customer = { id: number; name: string };

type Shipment = {
  id: number;
  date: string;
  customer_id: number;
  customer_name?: string | null;
  origin: string | null;
  destination: string | null;
  item_name: string | null;
  vehicle_no: string | null;
  driver_name: string | null;
  partner_name: string | null;
  freight_amount: number;
  toll_amount: number;
  tax_exempt_amount: number;
  note: string | null;
  status: "unclosed" | "closed";
};

const yen = (n: number) => new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);

const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function DispatchClient() {
  const [date, setDate] = useState(today());
  const [onlyUnclosed, setOnlyUnclosed] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<number | "all">("all");

  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCustomers = async () => {
    const res = await fetch("/api/customers", { cache: "no-store" });
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : json;
    setCustomers(Array.isArray(list) ? list : []);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("from", date);
      qs.set("to", date);
      if (customerId !== "all") qs.set("customer_id", String(customerId));
      if (onlyUnclosed) qs.set("status", "unclosed");

      const res = await fetch(`/api/shipments?${qs.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as Shipment[];
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers().catch(console.error);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, customerId, onlyUnclosed]);

  const total = useMemo(() => {
    const freight = rows.reduce((s, r) => s + (r.freight_amount || 0), 0);
    const toll = rows.reduce((s, r) => s + (r.toll_amount || 0), 0);
    const exempt = rows.reduce((s, r) => s + (r.tax_exempt_amount || 0), 0);
    return { all: freight + toll + exempt, freight, toll, exempt };
  }, [rows]);

  // 未割当：車番も運転手も空
  const unassigned = useMemo(
    () =>
      rows.filter((r) => !String(r.vehicle_no ?? "").trim() && !String(r.driver_name ?? "").trim()),
    [rows]
  );

  // 車番ごとにグループ（車番が空は “未定”）
  const byVehicle = useMemo(() => {
    const map = new Map<string, Shipment[]>();
    for (const r of rows) {
      const key = String(r.vehicle_no ?? "").trim() || "未定";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    // 日付内なので、ID順に軽く揃える
    for (const [k, list] of map) {
      list.sort((a, b) => a.id - b.id);
      map.set(k, list);
    }
    return [...map.entries()];
  }, [rows]);

  const rowTitle = (r: Shipment) => {
    const route = [r.origin, r.destination].filter(Boolean).join(" → ");
    return route || "(ルート未入力)";
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50">
            🏠 TOP
          </Link>
          <Link href="/shipments" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50">
            明細へ
          </Link>

          <div className="ml-auto text-sm text-zinc-700">
            合計：<span className="font-semibold">{yen(total.all)}</span> 円
            <span className="ml-2 text-xs text-zinc-500">
              (運賃 {yen(total.freight)} / 高速 {yen(total.toll)} / 非課税 {yen(total.exempt)})
            </span>
          </div>
        </div>

        {/* filters */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-zinc-600">配車日</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div className="min-w-[280px]">
              <label className="block text-xs text-zinc-600">得意先</label>
              <select
                value={customerId === "all" ? "all" : String(customerId)}
                onChange={(e) => setCustomerId(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="all">すべて</option>
                {customers.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={onlyUnclosed}
                onChange={(e) => setOnlyUnclosed(e.target.checked)}
              />
              未締のみ
            </label>

            <button
              onClick={() => refresh()}
              disabled={loading}
              className="ml-auto rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-50"
            >
              再読込
            </button>
          </div>
        </section>

        {/* board */}
        <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
          {/* left: unassigned */}
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 px-4 py-3">
              <div className="font-semibold">未割当（車番/運転手 空）</div>
              <div className="text-xs text-zinc-600">{unassigned.length} 件</div>
            </div>

            <div className="max-h-[680px] overflow-auto">
              {unassigned.map((r) => (
                <div key={r.id} className="border-b border-zinc-100 p-3">
                  <div className="text-sm font-semibold">
                    #{r.id} / {r.customer_name ?? `#${r.customer_id}`}
                  </div>
                  <div className="mt-1 text-sm text-zinc-800">{rowTitle(r)}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    運賃 ¥{yen(r.freight_amount)} / 高速 ¥{yen(r.toll_amount)} / 非課税 ¥{yen(r.tax_exempt_amount)}
                  </div>
                </div>
              ))}
              {unassigned.length === 0 && (
                <div className="p-4 text-sm text-zinc-600">未割当はありません。</div>
              )}
            </div>
          </section>

          {/* right: vehicle lanes */}
          <section className="space-y-4">
            <div className="text-sm text-zinc-600">
              右側は「車番レーン」。まずは分類表示だけ。次で“割当操作”を付ける。
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {byVehicle.map(([vehicle, list]) => (
                <div key={vehicle} className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                    <div className="font-semibold">車番：{vehicle}</div>
                    <div className="text-xs text-zinc-600">{list.length} 件</div>
                  </div>

                  <div className="max-h-[320px] overflow-auto">
                    {list.map((r) => (
                      <div key={r.id} className="border-b border-zinc-100 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold">
                            #{r.id} / {r.customer_name ?? `#${r.customer_id}`}
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${
                            r.status === "closed"
                              ? "bg-zinc-100 text-zinc-700"
                              : "bg-emerald-100 text-emerald-900"
                          }`}>
                            {r.status === "closed" ? "締済" : "未締"}
                          </span>
                        </div>

                        <div className="mt-1 text-sm text-zinc-800">{rowTitle(r)}</div>
                        <div className="mt-1 text-xs text-zinc-600">
                          運転手：{r.driver_name ?? "-"} / 傭車先：{r.partner_name ?? "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
