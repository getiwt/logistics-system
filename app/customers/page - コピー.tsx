"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  code: string | null;
  name: string;
};

type ShipmentRow = {
  id: string;
  ship_date: string; // YYYY-MM-DD
  customer_id: string | null;
  origin: string | null;
  destination: string | null;
  fare: number;
  vehicle_no: string | null;
  driver: string | null;
  note: string | null;
  created_at: string;
  customers?: { id: string; name: string; code: string | null } | null;
};

type FormState = {
  ship_date: string;
  customer_id: string; // "" or uuid
  origin: string;
  destination: string;
  fare: string; // input
  vehicle_no: string;
  driver: string;
  note: string;
};

function todayJst(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const emptyForm: FormState = {
  ship_date: todayJst(),
  customer_id: "",
  origin: "",
  destination: "",
  fare: "0",
  vehicle_no: "",
  driver: "",
  note: "",
};

export default function ShipmentsPage() {
const [customers, setCustomers] = useState<Customer[]>([]);


  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "ng"; text: string } | null>(null);

  const [from, setFrom] = useState<string>(todayJst());
  const [to, setTo] = useState<string>(todayJst());

async function loadCustomers() {
  const res = await fetch("/api/customers", { cache: "no-store" });
  const json = await res.json();
  setCustomers(Array.isArray(json.data) ? json.data : []);
}



  async function loadShipments() {
    const url = `/api/shipments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? "明細の取得に失敗しました");
    setRows(Array.isArray(json.data) ? json.data : []);
  }

  async function loadAll() {
    setLoading(true);
    setMsg(null);
    try {
      await Promise.all([loadCustomers(), loadShipments()]);
    } catch (e: any) {
      setMsg({ type: "ng", text: e.message ?? "取得に失敗しました" });
    } finally {
      setLoading(false);
    }
  }

useEffect(() => {
  loadCustomers();
}, []);


  useEffect(() => {
    // 期間変えたら再読み込み
    loadShipments().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const totalFare = useMemo(() => {
    return rows.reduce((sum, r) => sum + Number(r.fare || 0), 0);
  }, [rows]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const payload = {
        ship_date: form.ship_date,
        customer_id: form.customer_id || null,
        origin: form.origin,
        destination: form.destination,
        fare: Number(form.fare || 0),
        vehicle_no: form.vehicle_no,
        driver: form.driver,
        note: form.note,
      };

      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "登録に失敗しました");

      setMsg({ type: "ok", text: "登録しました" });
      setForm({ ...emptyForm, ship_date: form.ship_date }); // 日付だけ維持
      await loadShipments();
    } catch (e: any) {
      setMsg({ type: "ng", text: e.message ?? "登録に失敗しました" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">明細入力</h1>
            <p className="text-sm text-zinc-600">日別の運賃・発地・着地などを入力</p>
          </div>

          <div className="flex gap-3">
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
          </div>
        </header>

        {msg && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              msg.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 入力 */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-medium">新規入力</h2>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="日付（必須）">
                  <input
                    type="date"
                    value={form.ship_date}
                    onChange={(e) => setForm({ ...form, ship_date: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    required
                  />
                </Field>

                <Field label="得意先">
                  <select
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  >
                    <option value="">（未選択）</option>
{Array.isArray(customers) &&
  customers.map((c) => (
    <option key={c.id} value={c.id}>
      {c.name}
    </option>
  ))}


                  </select>
                </Field>

                <Field label="発地">
                  <input
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="例：東大阪"
                  />
                </Field>

                <Field label="着地">
                  <input
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="例：神戸"
                  />
                </Field>

                <Field label="運賃（円）">
                  <input
                    inputMode="numeric"
                    value={form.fare}
                    onChange={(e) => setForm({ ...form, fare: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="例：25000"
                  />
                </Field>

                <Field label="車番">
                  <input
                    value={form.vehicle_no}
                    onChange={(e) => setForm({ ...form, vehicle_no: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="例：大阪 100 あ 12-34"
                  />
                </Field>

                <Field label="運転手">
                  <input
                    value={form.driver}
                    onChange={(e) => setForm({ ...form, driver: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="例：山田"
                  />
                </Field>

                <Field label="備考" className="sm:col-span-2">
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="h-24 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="メモ"
                  />
                </Field>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={loadAll}
                  disabled={loading}
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-50"
                >
                  再読み込み
                </button>

                <button
                  disabled={loading}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? "処理中..." : "登録する"}
                </button>
              </div>
            </form>
          </section>

          {/* 一覧 */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium">一覧</h2>
                <p className="text-xs text-zinc-500">
                  期間：{from} 〜 {to}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">合計運賃</div>
                <div className="text-lg font-semibold">{Math.round(totalFare).toLocaleString()} 円</div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">日付</th>
                    <th className="px-3 py-2 text-left">得意先</th>
                    <th className="px-3 py-2 text-left">発地</th>
                    <th className="px-3 py-2 text-left">着地</th>
                    <th className="px-3 py-2 text-right">運賃</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2">{r.ship_date}</td>
                      <td className="px-3 py-2">{r.customers?.name ?? "-"}</td>
                      <td className="px-3 py-2">{r.origin ?? "-"}</td>
                      <td className="px-3 py-2">{r.destination ?? "-"}</td>
                      <td className="px-3 py-2 text-right">{Number(r.fare || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-6 text-center text-zinc-500" colSpan={5}>
                        該当データなし
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              ※ 次は「編集」「削除（無効化）」「CSV出力」「請求書発行」へ進める
            </p>
          </section>
        </div>
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
      <label className="block text-xs text-zinc-600">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
