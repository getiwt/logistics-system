"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Shipment = {
  id: number;
  date: string;
  customer_id: number;
  customer_name?: string | null;

  origin: string | null;
  destination: string | null;
  item_name: string | null;

  freight_amount: number;
  toll_amount: number;
  tax_exempt_amount: number;

  vehicle_no: string | null;
  driver_name: string | null;
  note: string | null;

  status: "unclosed" | "closed" | string;
};

const yen = (n: number) =>
  new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(n);

function cleanMoneyToInt(value: string): number {
  const s = (value ?? "").toString().replace(/[^\d-]/g, "");
  const n = Number(s || 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export default function InvoicePreviewPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const customerId = sp.get("customer_id") ?? "";
  const status = sp.get("status") ?? "";

  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- edit modal ---
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      if (customerId) qs.set("customer_id", customerId);
      if (status) qs.set("status", status);

      const res = await fetch(`/api/shipments?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          (json && (json.error || json.message)) || JSON.stringify(json) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const list = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      setRows(list);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, customerId, status]);

  const customerName = useMemo(() => {
    return rows[0]?.customer_name ?? (customerId ? `得意先#${customerId}` : "（未選択）");
  }, [rows, customerId]);

  const totals = useMemo(() => {
    const count = rows.length;
    const freight = rows.reduce((s, r) => s + Number(r.freight_amount || 0), 0);
    const toll = rows.reduce((s, r) => s + Number(r.toll_amount || 0), 0);
    const exempt = rows.reduce((s, r) => s + Number(r.tax_exempt_amount || 0), 0);
    const total = freight + toll + exempt;
    return { count, freight, toll, exempt, total };
  }, [rows]);

  const openEdit = (r: Shipment) => {
    if (r.status === "closed") {
      alert("締済みのため編集できません");
      return;
    }
    setEditing({
      ...r,
      origin: r.origin ?? "",
      destination: r.destination ?? "",
      item_name: r.item_name ?? "",
      vehicle_no: r.vehicle_no ?? "",
      driver_name: r.driver_name ?? "",
      note: r.note ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        id: editing.id,
        date: editing.date,
        customer_id: editing.customer_id,
        origin: editing.origin?.trim() ? editing.origin.trim() : null,
        destination: editing.destination?.trim() ? editing.destination.trim() : null,
        item_name: editing.item_name?.trim() ? editing.item_name.trim() : null,
        vehicle_no: editing.vehicle_no?.trim() ? editing.vehicle_no.trim() : null,
        driver_name: editing.driver_name?.trim() ? editing.driver_name.trim() : null,
        partner_name: null, // 今回は請求書プレビューでは触らない
        freight_amount: Number(editing.freight_amount || 0),
        toll_amount: Number(editing.toll_amount || 0),
        tax_exempt_amount: Number(editing.tax_exempt_amount || 0),
        note: editing.note?.trim() ? editing.note.trim() : null,
        status: editing.status ?? "unclosed",
      };

      const res = await fetch("/api/shipments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `HTTP ${res.status}`);
      }

      setEditing(null);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">請求書（プレビュー）</h1>
            <div className="mt-2 text-sm text-zinc-700">
              得意先：<span className="font-semibold text-zinc-900">{customerName}</span>
            </div>
            <div className="mt-1 text-sm text-zinc-700">
              期間：<span className="font-mono text-zinc-900">{from}</span> 〜{" "}
              <span className="font-mono text-zinc-900">{to}</span>
              {status === "unclosed" ? "（未締のみ）" : ""}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              ※ 行をクリックすると編集できます（締済は編集不可）
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-zinc-600">請求合計</div>
            <div className="text-4xl font-bold">{yen(totals.total)} 円</div>
            <div className="mt-2 text-sm text-zinc-700">
              件数：{totals.count} ／ 運賃：{yen(totals.freight)} ／ 高速：{yen(totals.toll)} ／ 非課税：
              {yen(totals.exempt)}
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={rows.length === 0}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-50"
              >
                印刷
              </button>
            </div>
          </div>
        </header>

        {err && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            エラー：{err}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="overflow-hidden rounded-xl border border-zinc-200">
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
                {rows.map((r) => {
                  const route = [r.origin, r.destination].filter(Boolean).join(" → ") || "-";
                  const sub =
                    Number(r.freight_amount || 0) +
                    Number(r.toll_amount || 0) +
                    Number(r.tax_exempt_amount || 0);

                  const canEdit = r.status !== "closed";

                  return (
                    <tr
                      key={r.id}
                      className={`border-t border-zinc-100 ${canEdit ? "cursor-pointer hover:bg-blue-50" : "opacity-60"}`}
                      onClick={() => canEdit && openEdit(r)}
                      title={canEdit ? "クリックで編集" : "締済のため編集不可"}
                    >
                      <td className="px-3 py-2 font-mono">{r.date}</td>
                      <td className="px-3 py-2">{route}</td>
                      <td className="px-3 py-2">{r.item_name ?? "-"}</td>
                      <td className="px-3 py-2 text-right">{yen(Number(r.freight_amount || 0))}</td>
                      <td className="px-3 py-2 text-right">{yen(Number(r.toll_amount || 0))}</td>
                      <td className="px-3 py-2 text-right">{yen(Number(r.tax_exempt_amount || 0))}</td>
                      <td className="px-3 py-2 text-right font-semibold">{yen(sub)}</td>
                    </tr>
                  );
                })}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td className="px-3 py-10 text-center text-zinc-500" colSpan={7}>
                      該当データなし
                    </td>
                  </tr>
                )}
              </tbody>

              {rows.length > 0 && (
                <tfoot className="bg-zinc-50">
                  <tr className="border-t border-zinc-200 font-semibold">
                    <td className="px-3 py-2" colSpan={3}>
                      合計
                    </td>
                    <td className="px-3 py-2 text-right">{yen(totals.freight)}</td>
                    <td className="px-3 py-2 text-right">{yen(totals.toll)}</td>
                    <td className="px-3 py-2 text-right">{yen(totals.exempt)}</td>
                    <td className="px-3 py-2 text-right">{yen(totals.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>

        {/* ---- modal ---- */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-200 p-4">
                <div className="font-semibold">明細の編集（#{editing.id}）</div>
                <button
                  className="rounded-lg border border-zinc-200 px-3 py-1 text-sm"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  閉じる
                </button>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2">
                <Field label="日付">
                  <input
                    type="date"
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="品名">
                  <input
                    value={editing.item_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, item_name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="発地" className="sm:col-span-2">
                  <input
                    value={editing.origin ?? ""}
                    onChange={(e) => setEditing({ ...editing, origin: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="着地" className="sm:col-span-2">
                  <input
                    value={editing.destination ?? ""}
                    onChange={(e) => setEditing({ ...editing, destination: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="運賃（円）">
                  <input
                    inputMode="numeric"
                    value={String(editing.freight_amount ?? 0)}
                    onChange={(e) =>
                      setEditing({ ...editing, freight_amount: cleanMoneyToInt(e.target.value) })
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="高速（円）">
                  <input
                    inputMode="numeric"
                    value={String(editing.toll_amount ?? 0)}
                    onChange={(e) =>
                      setEditing({ ...editing, toll_amount: cleanMoneyToInt(e.target.value) })
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="非課税（円）">
                  <input
                    inputMode="numeric"
                    value={String(editing.tax_exempt_amount ?? 0)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        tax_exempt_amount: cleanMoneyToInt(e.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="車番">
                  <input
                    value={editing.vehicle_no ?? ""}
                    onChange={(e) => setEditing({ ...editing, vehicle_no: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="運転手">
                  <input
                    value={editing.driver_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, driver_name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>

                <Field label="備考" className="sm:col-span-2">
                  <textarea
                    value={editing.note ?? ""}
                    onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                    className="h-24 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-zinc-200 p-4">
                <button
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-sm"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  キャンセル
                </button>
                <button
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={saveEdit}
                  disabled={saving}
                >
                  {saving ? "保存中…" : "保存する"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-xs text-zinc-600">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
