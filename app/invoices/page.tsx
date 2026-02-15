"use client";

import React, { useEffect, useMemo, useState } from "react";

type Customer = { id: number; name: string };

type Shipment = {
  id: number;
  date: string;
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
function firstDayOfMonth() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export default function InvoicesPage() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [customerId, setCustomerId] = useState<number | "">("");
  const [onlyUnclosed, setOnlyUnclosed] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows] = useState<Shipment[]>([]);
  const [sum, setSum] = useState({ count: 0, freight: 0, toll: 0, exempt: 0, total: 0 });

  const [loading, setLoading] = useState(false);

  const customerName = useMemo(() => {
    const c = customers.find((x) => x.id === customerId);
    return c?.name ?? "";
  }, [customers, customerId]);

  const loadCustomers = async () => {
    const res = await fetch("/api/customers", { cache: "no-store" });
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    setCustomers(list);
  };

  const preview = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("from", from);
      qs.set("to", to);
      qs.set("customer_id", String(customerId));
      if (onlyUnclosed) qs.set("onlyUnclosed", "1");

      const res = await fetch(`/api/invoices?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "取得に失敗しました");

      setRows(Array.isArray(json.rows) ? json.rows : []);
      setSum(json.sum ?? { count: 0, freight: 0, toll: 0, exempt: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const close = async () => {
    if (!customerId) return;
    if (!confirm("この期間の未締明細を『締済』にします。よろしいですか？")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, customer_id: customerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "締めに失敗しました");

      alert(`締め完了：${json.closedCount}件`);
      await preview();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers().catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">請求書発行</h1>
            <p className="text-sm text-zinc-600">得意先＋期間で集計 → 印刷 → 締め</p>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-zinc-600">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-600">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" />
            </div>
            <div className="min-w-[260px]">
              <label className="block text-xs text-zinc-600">得意先</label>
              <select
                value={customerId === "" ? "" : String(customerId)}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {customers.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
              <input type="checkbox" checked={onlyUnclosed} onChange={(e) => setOnlyUnclosed(e.target.checked)} />
              未締のみ
            </label>

            <button
              onClick={preview}
              disabled={!customerId || loading}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "処理中…" : "プレビュー"}
            </button>

            <button
              onClick={() => window.print()}
              disabled={rows.length === 0}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm disabled:opacity-50"
            >
              印刷
            </button>

            <button
              onClick={close}
              disabled={rows.length === 0 || loading}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900 disabled:opacity-50"
            >
              締める（未締→締済）
            </button>
          </div>
        </section>

        {/* 請求書プレビュー */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xl font-semibold">請求書（プレビュー）</div>
              <div className="mt-1 text-sm text-zinc-600">
                得意先：<span className="font-medium text-zinc-900">{customerName || "未選択"}</span>
              </div>
              <div className="text-sm text-zinc-600">
                期間：<span className="font-mono text-zinc-900">{from}</span> 〜 <span className="font-mono text-zinc-900">{to}</span>
                {onlyUnclosed ? "（未締のみ）" : "（全件）"}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-zinc-500">請求合計</div>
              <div className="text-2xl font-bold">{yen(sum.total)} 円</div>
              <div className="mt-2 text-xs text-zinc-600">
                件数：{sum.count} ／ 運賃：{yen(sum.freight)} ／ 高速：{yen(sum.toll)} ／ 非課税：{yen(sum.exempt)}
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">日付</th>
                  <th className="px-3 py-2 text-left">ルート</th>
                  <th className="px-3 py-2 text-left">品名</th>
                  <th className="px-3 py-2 text-right">運賃</th>
                  <th className="px-3 py-2 text-right">高速</th>
                  <th className="px-3 py-2 text-right">非課税</th>
                  <th className="px-3 py-2 text-right">小計</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2 font-mono">{r.date}</td>
                    <td className="px-3 py-2">{[r.origin, r.destination].filter(Boolean).join(" → ") || "-"}</td>
                    <td className="px-3 py-2">{r.item_name ?? "-"}</td>
                    <td className="px-3 py-2 text-right">{yen(r.freight_amount || 0)}</td>
                    <td className="px-3 py-2 text-right">{yen(r.toll_amount || 0)}</td>
                    <td className="px-3 py-2 text-right">{yen(r.tax_exempt_amount || 0)}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {yen((r.freight_amount || 0) + (r.toll_amount || 0) + (r.tax_exempt_amount || 0))}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-10 text-center text-zinc-500" colSpan={7}>
                      プレビューを押すとここに明細が出ます
                    </td>
                  </tr>
                )}
              </tbody>

              {rows.length > 0 && (
                <tfoot className="bg-zinc-50">
                  <tr className="border-t border-zinc-200 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>合計</td>
                    <td className="px-3 py-2 text-right">{yen(sum.freight)}</td>
                    <td className="px-3 py-2 text-right">{yen(sum.toll)}</td>
                    <td className="px-3 py-2 text-right">{yen(sum.exempt)}</td>
                    <td className="px-3 py-2 text-right">{yen(sum.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            ※ まずは「印刷」で運用OK。次で「PDF出力」「会社情報/振込先」「消費税計算」も足せる。
          </div>
        </section>
      </div>
    </div>
  );
}
