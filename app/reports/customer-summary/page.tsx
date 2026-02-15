"use client";

import React, { useEffect, useMemo, useState } from "react";

type Customer = { id: number; name: string };

type Shipment = {
  id: number;
  date: string; // YYYY-MM-DD
  customer_id: number;
  customer_name?: string | null;

  freight_amount: number;
  toll_amount: number;
  tax_exempt_amount: number;

  status: "unclosed" | "closed" | string;
};

type SummaryRow = {
  customer_id: number;
  customer_name: string;
  count: number;
  freight: number;
  toll: number;
  exempt: number;
  total: number;
};

const yen = (n: number) =>
  new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);

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

export default function CustomerSummaryPage() {
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [onlyUnclosed, setOnlyUnclosed] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadCustomers = async () => {
    const res = await fetch("/api/customers", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
    setCustomers(list);
  };

  const loadShipments = async () => {
    setErr(null);

    const qs = new URLSearchParams();
    qs.set("from", from);
    qs.set("to", to);
    if (onlyUnclosed) qs.set("status", "unclosed");

    const res = await fetch(`/api/shipments?${qs.toString()}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg =
        (json && (json.error || json.message)) || JSON.stringify(json) || `HTTP ${res.status}`;
      setErr(msg);
      setRows([]);
      return;
    }

    // ✅ 配列直返し / {data:[...]} 両対応
    const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
    setRows(list);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCustomers(), loadShipments()]);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadShipments().catch((e) => setErr(e?.message ?? String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, onlyUnclosed]);

  const customerNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of customers) m.set(c.id, c.name);
    return m;
  }, [customers]);

  const summary = useMemo<SummaryRow[]>(() => {
    const m = new Map<number, SummaryRow>();

    for (const r of rows) {
      const id = r.customer_id ?? 0;
      const name =
        r.customer_name ||
        customerNameById.get(id) ||
        (id ? `得意先#${id}` : "（未選択）");

      const cur =
        m.get(id) ||
        ({
          customer_id: id,
          customer_name: name,
          count: 0,
          freight: 0,
          toll: 0,
          exempt: 0,
          total: 0,
        } as SummaryRow);

      cur.count += 1;
      cur.freight += Number(r.freight_amount || 0);
      cur.toll += Number(r.toll_amount || 0);
      cur.exempt += Number(r.tax_exempt_amount || 0);
      cur.total = cur.freight + cur.toll + cur.exempt;

      m.set(id, cur);
    }

    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [rows, customerNameById]);

  const grand = useMemo(() => {
    return summary.reduce(
      (acc, s) => {
        acc.count += s.count;
        acc.freight += s.freight;
        acc.toll += s.toll;
        acc.exempt += s.exempt;
        acc.total += s.total;
        return acc;
      },
      { count: 0, freight: 0, toll: 0, exempt: 0, total: 0 }
    );
  }, [summary]);

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">得意先別集計</h1>
            <p className="text-sm text-zinc-600">期間内の明細を得意先ごとに合計</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-zinc-600">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-600">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
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
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "読込中…" : "再集計"}
            </button>
          </div>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            エラー：{err}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div className="text-sm text-zinc-600">
              期間：<span className="font-mono text-zinc-900">{from}</span> 〜{" "}
              <span className="font-mono text-zinc-900">{to}</span>
              {onlyUnclosed ? "（未締のみ）" : "（全件）"}
            </div>

            <div className="text-right">
              <div className="text-xs text-zinc-500">総合計</div>
              <div className="text-xl font-semibold">{yen(grand.total)} 円</div>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">得意先</th>
                  <th className="px-3 py-2 text-right">件数</th>
                  <th className="px-3 py-2 text-right">運賃</th>
                  <th className="px-3 py-2 text-right">高速</th>
                  <th className="px-3 py-2 text-right">非課税</th>
                  <th className="px-3 py-2 text-right">合計</th>
                </tr>
              </thead>

              <tbody>
                {summary.map((s) => (
                  <tr
                    key={s.customer_id}
                    className="border-t border-zinc-100 cursor-pointer hover:bg-blue-50"
                    onClick={() => {
                      const qs = new URLSearchParams();
                      qs.set("from", from);
                      qs.set("to", to);
                      qs.set("customer_id", String(s.customer_id));
                      if (onlyUnclosed) qs.set("status", "unclosed");
                      window.location.href = `/invoices/preview?${qs.toString()}`;
                    }}
                    title="クリックで請求書プレビュー"
                  >
                    <td className="px-3 py-2 text-blue-700 underline">{s.customer_name}</td>
                    <td className="px-3 py-2 text-right">{s.count}</td>
                    <td className="px-3 py-2 text-right">{yen(s.freight)}</td>
                    <td className="px-3 py-2 text-right">{yen(s.toll)}</td>
                    <td className="px-3 py-2 text-right">{yen(s.exempt)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{yen(s.total)}</td>
                  </tr>
                ))}

                {summary.length === 0 && (
                  <tr>
                    <td className="px-3 py-8 text-center text-zinc-500" colSpan={6}>
                      該当データなし
                    </td>
                  </tr>
                )}
              </tbody>

              {summary.length > 0 && (
                <tfoot className="bg-zinc-50">
                  <tr className="border-t border-zinc-200 font-semibold">
                    <td className="px-3 py-2">合計</td>
                    <td className="px-3 py-2 text-right">{grand.count}</td>
                    <td className="px-3 py-2 text-right">{yen(grand.freight)}</td>
                    <td className="px-3 py-2 text-right">{yen(grand.toll)}</td>
                    <td className="px-3 py-2 text-right">{yen(grand.exempt)}</td>
                    <td className="px-3 py-2 text-right">{yen(grand.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            ※ 得意先行クリック → 請求書（プレビュー）へ
          </p>
        </section>
      </div>
    </div>
  );
}
