"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Customer = { id: number; name: string };

type Shipment = {
  id: number;
  date: string; // YYYY-MM-DD
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

function cleanMoneyToInt(value: string): number {
  const s = (value ?? "").toString().replace(/[^\d-]/g, "");
  const n = Number(s || 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

const emptyForm = (carry?: Partial<Shipment>): Shipment => ({
  id: 0,
  date: carry?.date ?? today(),
  customer_id: carry?.customer_id ?? 0,
  origin: carry?.origin ?? "",
  destination: carry?.destination ?? "",
  item_name: carry?.item_name ?? "",
  vehicle_no: carry?.vehicle_no ?? "",
  driver_name: carry?.driver_name ?? "",
  partner_name: carry?.partner_name ?? "",
  freight_amount: carry?.freight_amount ?? 0,
  toll_amount: carry?.toll_amount ?? 0,
  tax_exempt_amount: carry?.tax_exempt_amount ?? 0,
  note: carry?.note ?? "",
  status: carry?.status ?? "unclosed",
});

export default function ShipmentsPage() {
  const sp = useSearchParams();

  // filters
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [customerId, setCustomerId] = useState<number | "all">("all");
  const [onlyUnclosed, setOnlyUnclosed] = useState(false);

  // data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);

  // selection
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId]
  );

  // editing
  const [form, setForm] = useState<Shipment>(emptyForm());
  const [dirty, setDirty] = useState(false);
  const isClosed = form.status === "closed";

  // --- focus order ---
  const refDate = useRef<HTMLInputElement | null>(null);
  const refCustomer = useRef<HTMLSelectElement | null>(null);
  const refOrigin = useRef<HTMLInputElement | null>(null);
  const refDest = useRef<HTMLInputElement | null>(null);
  const refFreight = useRef<HTMLInputElement | null>(null);
  const refToll = useRef<HTMLInputElement | null>(null);
  const refExempt = useRef<HTMLInputElement | null>(null);
  const refVehicle = useRef<HTMLInputElement | null>(null);
  const refDriver = useRef<HTMLInputElement | null>(null);
  const refPartner = useRef<HTMLInputElement | null>(null);
  const refItem = useRef<HTMLInputElement | null>(null);
  const refNote = useRef<HTMLTextAreaElement | null>(null);

  const focusOrder = [
    () => refDate.current,
    () => refCustomer.current,
    () => refOrigin.current,
    () => refDest.current,
    () => refFreight.current,
    () => refToll.current,
    () => refExempt.current,
    () => refVehicle.current,
    () => refDriver.current,
    () => refPartner.current,
    () => refItem.current,
    () => refNote.current,
  ];

  const focusAt = (idx: number) => {
    const el = focusOrder[idx]?.();
    el?.focus();
    if (el && (el as any).select) (el as any).select();
  };
  const focusNextFrom = (currentEl: any) => {
    const idx = focusOrder.findIndex((fn) => fn() === currentEl);
    if (idx >= 0) focusAt(Math.min(idx + 1, focusOrder.length - 1));
  };
  const focusPrevFrom = (currentEl: any) => {
    const idx = focusOrder.findIndex((fn) => fn() === currentEl);
    if (idx >= 0) focusAt(Math.max(idx - 1, 0));
  };

  const loadCustomers = async () => {
    const res = await fetch("/api/customers", { cache: "no-store" });
    const json = await res.json();
    const list = Array.isArray(json?.data) ? json.data : json; // どっちで返ってきてもOKにする
    setCustomers(Array.isArray(list) ? list : []);
  };

  const refresh = async (keepSelection = true) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("from", from);
      qs.set("to", to);
      if (customerId !== "all") qs.set("customer_id", String(customerId));
      if (onlyUnclosed) qs.set("status", "unclosed");

      const res = await fetch(`/api/shipments?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("failed to load shipments");
      const data = (await res.json()) as Shipment[];
      setRows(Array.isArray(data) ? data : []);

      if (!keepSelection) return;
      if (Array.isArray(data) && data.length > 0) {
        const still = selectedId && data.some((x) => x.id === selectedId);
        if (!still) setSelectedId(data[0].id);
      } else {
        setSelectedId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // ★ URLから来た from/to/customer_id を反映（ドリルダウン用）
  useEffect(() => {
    const qFrom = sp.get("from");
    const qTo = sp.get("to");
    const qCustomer = sp.get("customer_id");
    const qStatus = sp.get("status");

    if (qFrom) setFrom(qFrom);
    if (qTo) setTo(qTo);
    if (qCustomer) setCustomerId(Number(qCustomer));
    if (qStatus === "unclosed") setOnlyUnclosed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  useEffect(() => {
    loadCustomers().catch(console.error);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, customerId, onlyUnclosed]);

  useEffect(() => {
    if (!selected) {
      setForm(emptyForm(customerId === "all" ? undefined : { customer_id: customerId }));
      setDirty(false);
      return;
    }
    setForm({
      ...selected,
      origin: selected.origin ?? "",
      destination: selected.destination ?? "",
      item_name: selected.item_name ?? "",
      vehicle_no: selected.vehicle_no ?? "",
      driver_name: selected.driver_name ?? "",
      partner_name: selected.partner_name ?? "",
      note: selected.note ?? "",
    });
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const onNew = (carry?: Partial<Shipment>) => {
    setSelectedId(null);
    setForm(emptyForm(carry));
    setDirty(false);
    setTimeout(() => focusAt(0), 0);
  };

  const onDuplicate = () => {
    const base = selected;
    if (!base) return;
    onNew({
      date: today(),
      customer_id: base.customer_id,
      origin: base.origin ?? "",
      destination: base.destination ?? "",
      item_name: base.item_name ?? "",
      vehicle_no: base.vehicle_no ?? "",
      driver_name: base.driver_name ?? "",
      partner_name: base.partner_name ?? "",
      freight_amount: base.freight_amount ?? 0,
      toll_amount: base.toll_amount ?? 0,
      tax_exempt_amount: base.tax_exempt_amount ?? 0,
      note: base.note ?? "",
    });
  };

  const validate = () => {
    if (!form.date) return "日付が必要です";
    if (!form.customer_id) return "得意先が必要です";
    if (form.freight_amount < 0 || form.toll_amount < 0 || form.tax_exempt_amount < 0)
      return "金額は0以上にしてください";
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      alert(err);
      return false;
    }

    const payload = {
      ...form,
      origin: form.origin?.trim() ? form.origin.trim() : null,
      destination: form.destination?.trim() ? form.destination.trim() : null,
      item_name: form.item_name?.trim() ? form.item_name.trim() : null,
      vehicle_no: form.vehicle_no?.trim() ? form.vehicle_no.trim() : null,
      driver_name: form.driver_name?.trim() ? form.driver_name.trim() : null,
      partner_name: form.partner_name?.trim() ? form.partner_name.trim() : null,
      note: form.note?.trim() ? form.note.trim() : null,
    };

    const isNew = form.id === 0;
    const res = await fetch("/api/shipments", {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      alert(`保存に失敗しました: ${msg || res.status}`);
      return false;
    }

    const carry = {
      customer_id: form.customer_id,
      origin: form.origin ?? "",
      destination: form.destination ?? "",
      vehicle_no: form.vehicle_no ?? "",
      driver_name: form.driver_name ?? "",
      partner_name: form.partner_name ?? "",
      item_name: form.item_name ?? "",
    };

    await refresh(false);
    setDirty(false);
    onNew(carry);
    return true;
  };

  // Dで複製（入力中は無効）
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select";
      if (isTyping) return;

      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        onDuplicate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Enter移動 / Ctrl+Enter保存
  const onKeyDownMove = async (e: React.KeyboardEvent, currentEl: any) => {
    if (e.key !== "Enter") return;

    const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
    const isTextarea = tag === "textarea";

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (!isClosed) await save();
      return;
    }

    if (isTextarea) return;

    e.preventDefault();
    if (e.shiftKey) focusPrevFrom(currentEl);
    else focusNextFrom(currentEl);
  };

  const total = useMemo(() => {
    const freight = rows.reduce((s, r) => s + Number(r.freight_amount || 0), 0);
    const toll = rows.reduce((s, r) => s + Number(r.toll_amount || 0), 0);
    const exempt = rows.reduce((s, r) => s + Number(r.tax_exempt_amount || 0), 0);
    return { freight, toll, exempt, all: freight + toll + exempt };
  }, [rows]);

  const rowTitle = (r: Shipment) => {
    const route = [r.origin, r.destination].filter(Boolean).join(" → ");
    return route || "(ルート未入力)";
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">明細入力（プレビュー風）</h1>
            <p className="text-sm text-zinc-600">集計から飛んできてもそのまま見れる</p>
          </div>
        </header>

        {/* filters */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-zinc-600">開始日</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-600">終了日</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
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

            <div className="ml-auto flex gap-2">
              <button
                onClick={() => refresh()}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                再読込
              </button>
              <button
                onClick={() => onNew(customerId === "all" ? undefined : { customer_id: customerId })}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              >
                新規追加
              </button>
              <button
                onClick={onDuplicate}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                title="Dキーでも複製できます"
              >
                複製（D）
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[440px_1fr]">
          {/* left list */}
          <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <div className="font-semibold">明細一覧 {loading ? "（読込中…）" : `（${rows.length}件）`}</div>
              <div className="text-xs text-zinc-600">
                合計：{yen(total.all)}（運賃{yen(total.freight)} / 高速{yen(total.toll)} / 非課税{yen(total.exempt)}）
              </div>
            </div>

            <div className="max-h-[640px] overflow-auto">
              {rows.map((r) => {
                const active = r.id === selectedId;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer border-b border-zinc-100 p-3 ${
                      active ? "bg-blue-50" : "bg-white hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm">
                        {r.date} / {r.customer_name ?? `#${r.customer_id}`}
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          r.status === "closed" ? "bg-zinc-100 text-zinc-700" : "bg-emerald-100 text-emerald-900"
                        }`}
                      >
                        {r.status === "closed" ? "締済" : "未締"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-800">{rowTitle(r)}</div>
                    <div className="mt-1 text-xs text-zinc-600">
                      運賃: ¥{yen(r.freight_amount)} / 高速: ¥{yen(r.toll_amount)} / 非課税: ¥{yen(r.tax_exempt_amount)}
                    </div>
                  </div>
                );
              })}
              {rows.length === 0 && (
                <div className="p-4 text-sm text-zinc-600">条件に一致する明細がありません。</div>
              )}
            </div>
          </section>

          {/* right editor + preview table */}
          <section className="space-y-4">
            {/* editor */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">
                  {form.id ? `編集 #${form.id}` : "新規作成"}
                  {isClosed ? "（締済：編集不可）" : dirty ? "（変更あり）" : ""}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => save()}
                    disabled={isClosed}
                    className="rounded-xl bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                    title="Ctrl+Enterでも保存できます"
                  >
                    保存（Ctrl+Enter）
                  </button>
                </div>
              </div>

              {!isClosed && (
                <div className="mt-2 text-xs text-zinc-600">
                  Enter：次へ / Shift+Enter：戻る / Ctrl+Enter：保存 / D：複製
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label>
                  <div className="text-xs text-zinc-600">日付*</div>
                  <input
                    ref={refDate}
                    type="date"
                    value={form.date}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refDate.current)}
                    onChange={(e) => {
                      setForm({ ...form, date: e.target.value });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label>
                  <div className="text-xs text-zinc-600">得意先*</div>
                  <select
                    ref={refCustomer}
                    value={form.customer_id || 0}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refCustomer.current)}
                    onChange={(e) => {
                      setForm({ ...form, customer_id: Number(e.target.value) });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value={0} disabled>
                      選択してください
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="md:col-span-2">
                  <div className="text-xs text-zinc-600">発地</div>
                  <input
                    ref={refOrigin}
                    value={form.origin ?? ""}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refOrigin.current)}
                    onChange={(e) => {
                      setForm({ ...form, origin: e.target.value });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="md:col-span-2">
                  <div className="text-xs text-zinc-600">着地</div>
                  <input
                    ref={refDest}
                    value={form.destination ?? ""}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refDest.current)}
                    onChange={(e) => {
                      setForm({ ...form, destination: e.target.value });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label>
                  <div className="text-xs text-zinc-600">運賃（円）*</div>
                  <input
                    ref={refFreight}
                    type="text"
                    inputMode="numeric"
                    value={String(form.freight_amount)}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refFreight.current)}
                    onChange={(e) => {
                      setForm({ ...form, freight_amount: cleanMoneyToInt(e.target.value) });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label>
                  <div className="text-xs text-zinc-600">高速代（円）</div>
                  <input
                    ref={refToll}
                    type="text"
                    inputMode="numeric"
                    value={String(form.toll_amount)}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refToll.current)}
                    onChange={(e) => {
                      setForm({ ...form, toll_amount: cleanMoneyToInt(e.target.value) });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label>
                  <div className="text-xs text-zinc-600">非課税（円）</div>
                  <input
                    ref={refExempt}
                    type="text"
                    inputMode="numeric"
                    value={String(form.tax_exempt_amount)}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refExempt.current)}
                    onChange={(e) => {
                      setForm({ ...form, tax_exempt_amount: cleanMoneyToInt(e.target.value) });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label>
                  <div className="text-xs text-zinc-600">車番</div>
                  <input
                    ref={refVehicle}
                    value={form.vehicle_no ?? ""}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refVehicle.current)}
                    onChange={(e) => {
                      setForm({ ...form, vehicle_no: e.target.value });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label>
                  <div className="text-xs text-zinc-600">運転手</div>
                  <input
                    ref={refDriver}
                    value={form.driver_name ?? ""}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refDriver.current)}
                    onChange={(e) => {
                      setForm({ ...form, driver_name: e.target.value });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label>
                  <div className="text-xs text-zinc-600">傭車先</div>
                  <input
                    ref={refPartner}
                    value={form.partner_name ?? ""}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refPartner.current)}
                    onChange={(e) => {
                      setForm({ ...form, partner_name: e.target.value });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label>
                  <div className="text-xs text-zinc-600">品名</div>
                  <input
                    ref={refItem}
                    value={form.item_name ?? ""}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refItem.current)}
                    onChange={(e) => {
                      setForm({ ...form, item_name: e.target.value });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="md:col-span-2">
                  <div className="text-xs text-zinc-600">備考</div>
                  <textarea
                    ref={refNote}
                    value={form.note ?? ""}
                    disabled={isClosed}
                    onKeyDown={(e) => onKeyDownMove(e, refNote.current)}
                    onChange={(e) => {
                      setForm({ ...form, note: e.target.value });
                      setDirty(true);
                    }}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                    style={{ minHeight: 90 }}
                    placeholder="備考はEnterで改行（保存はCtrl+Enter）"
                  />
                </label>
              </div>
            </div>

            {/* preview table (請求書プレビュー風) */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="text-lg font-medium">明細（プレビュー）</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    期間：<span className="font-mono text-zinc-900">{from}</span> 〜{" "}
                    <span className="font-mono text-zinc-900">{to}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-zinc-500">合計</div>
                  <div className="text-xl font-semibold">{yen(total.all)} 円</div>
                  <div className="mt-2 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => refresh()}
                      disabled={loading}
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm disabled:opacity-50"
                    >
                      再読み込み
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
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 text-left">日付</th>
                      <th className="px-3 py-2 text-left">得意先</th>
                      <th className="px-3 py-2 text-left">ルート</th>
                      <th className="px-3 py-2 text-right">運賃</th>
                      <th className="px-3 py-2 text-right">高速</th>
                      <th className="px-3 py-2 text-right">非課税</th>
                      <th className="px-3 py-2 text-right">小計</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => {
                      const route = [r.origin, r.destination].filter(Boolean).join(" → ") || "-";
                      const sub = (r.freight_amount || 0) + (r.toll_amount || 0) + (r.tax_exempt_amount || 0);
                      return (
                        <tr key={r.id} className="border-t border-zinc-100">
                          <td className="px-3 py-2 font-mono">{r.date}</td>
                          <td className="px-3 py-2">{r.customer_name ?? `#${r.customer_id}`}</td>
                          <td className="px-3 py-2">{route}</td>
                          <td className="px-3 py-2 text-right font-medium">{yen(r.freight_amount || 0)}</td>
                          <td className="px-3 py-2 text-right">{yen(r.toll_amount || 0)}</td>
                          <td className="px-3 py-2 text-right">{yen(r.tax_exempt_amount || 0)}</td>
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
                        <td className="px-3 py-2 text-right">{yen(total.freight)}</td>
                        <td className="px-3 py-2 text-right">{yen(total.toll)}</td>
                        <td className="px-3 py-2 text-right">{yen(total.exempt)}</td>
                        <td className="px-3 py-2 text-right">{yen(total.all)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                ※ 得意先別集計から飛んできたら、その得意先の明細だけ出ます（ドリルダウン）
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
