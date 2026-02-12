"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Customer = { id: number; name: string };

type Shipment = {
  id: number;
  date: string; // YYYY-MM-DD
  customer_id: number;
  customer_name?: string;

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
  status: "unclosed",
});

function cleanMoneyToInt(value: string): number {
  // "¥12,000" "12 000" "12,000円" などを許容
  const s = (value ?? "").toString().replace(/[^\d-]/g, "");
  const n = Number(s || 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export default function ShipmentsPage() {
  // filters
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [customerId, setCustomerId] = useState<number | "all">("all");
  const [onlyUnclosed, setOnlyUnclosed] = useState(true);

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
    if (!res.ok) throw new Error("failed to load customers");
    const data = (await res.json()) as Customer[];
    setCustomers(data);
  };

  const refresh = async (keepSelection = true) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("from", from);
      qs.set("to", to);
      if (customerId !== "all") qs.set("customer_id", String(customerId));
      if (onlyUnclosed) qs.set("status", "unclosed");

      const res = await fetch(`/api/shipments?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("failed to load shipments");
      const data = (await res.json()) as Shipment[];
      setRows(data);

      if (!keepSelection) return;

      if (data.length > 0) {
        const still = selectedId && data.some((x) => x.id === selectedId);
        if (!still) setSelectedId(data[0].id);
      } else {
        setSelectedId(null);
      }
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
  }, [selectedId]); // eslint-disable-line

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

  const del = async () => {
    if (!form.id) return;
    if (!confirm("削除しますか？")) return;
    const res = await fetch(`/api/shipments/${form.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("削除に失敗しました");
      return;
    }
    await refresh();
  };

  const rowTitle = (r: Shipment) => {
    const route = [r.origin, r.destination].filter(Boolean).join(" → ");
    return route || "(ルート未入力)";
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

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
        明細入力（最優先：入力速度）
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 160px 240px 160px 1fr",
          gap: 12,
          alignItems: "end",
          marginBottom: 12,
        }}
      >
        <label>
          <div style={{ fontSize: 12, color: "#555" }}>開始日</div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          <div style={{ fontSize: 12, color: "#555" }}>終了日</div>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <label>
          <div style={{ fontSize: 12, color: "#555" }}>得意先</div>
          <select
            value={customerId}
            onChange={(e) =>
              setCustomerId(e.target.value === "all" ? "all" : Number(e.target.value))
            }
            style={{ width: "100%", padding: 8 }}
          >
            <option value="all">すべて</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={onlyUnclosed}
            onChange={(e) => setOnlyUnclosed(e.target.checked)}
          />
          未締のみ
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => refresh()} style={{ padding: "8px 12px" }}>
            再読込
          </button>
          <button
            onClick={() =>
              onNew(customerId === "all" ? undefined : { customer_id: customerId })
            }
            style={{ padding: "8px 12px" }}
          >
            新規追加
          </button>
          <button onClick={onDuplicate} style={{ padding: "8px 12px" }}>
            複製（D）
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "420px 1fr",
          gap: 12,
          minHeight: 560,
        }}
      >
        <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: 10, borderBottom: "1px solid #eee", fontWeight: 700 }}>
            明細一覧 {loading ? "（読込中…）" : `（${rows.length}件）`}
          </div>

          <div style={{ maxHeight: 520, overflow: "auto" }}>
            {rows.map((r) => {
              const active = r.id === selectedId;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{
                    padding: 10,
                    cursor: "pointer",
                    background: active ? "#dbeafe" : "white",
                    borderBottom: "1px solid #f1f1f1",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 700 }}>
                      {r.date} / {r.customer_name ?? `#${r.customer_id}`}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: r.status === "closed" ? "#eee" : "#dcfce7",
                      }}
                    >
                      {r.status === "closed" ? "締済" : "未締"}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#333", marginTop: 4 }}>
                    {rowTitle(r)}
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>
                    運賃: ¥{yen(r.freight_amount)} / 高速: ¥{yen(r.toll_amount)} / 非課税:
                    ¥{yen(r.tax_exempt_amount)}
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div style={{ padding: 12, color: "#666" }}>
                条件に一致する明細がありません。
              </div>
            )}
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 700 }}>
              {form.id ? `編集 #${form.id}` : "新規作成"}
              {isClosed ? "（締済：編集不可）" : ""}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => save()}
                disabled={isClosed}
                style={{ padding: "8px 12px" }}
                title="Ctrl+Enterでも保存できます"
              >
                保存（Ctrl+Enter）
              </button>
              <button
                onClick={del}
                disabled={!form.id || isClosed}
                style={{ padding: "8px 12px" }}
              >
                削除
              </button>
            </div>
          </div>

          {!isClosed && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
              Enter：次へ / Shift+Enter：戻る / Ctrl+Enter：保存 / D：複製
              {dirty ? " 　※変更あり" : ""}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr",
              gap: 10,
              marginTop: 12,
            }}
          >
            <label>
              <div style={{ fontSize: 12, color: "#555" }}>日付*</div>
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
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, color: "#555" }}>得意先*</div>
              <select
                ref={refCustomer}
                value={form.customer_id || ""}
                disabled={isClosed}
                onKeyDown={(e) => onKeyDownMove(e, refCustomer.current)}
                onChange={(e) => {
                  setForm({ ...form, customer_id: Number(e.target.value) });
                  setDirty(true);
                }}
                style={{ width: "100%", padding: 8 }}
              >
                <option value="" disabled>
                  選択してください
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: "#555" }}>発地</div>
              <input
                ref={refOrigin}
                value={form.origin ?? ""}
                disabled={isClosed}
                onKeyDown={(e) => onKeyDownMove(e, refOrigin.current)}
                onChange={(e) => {
                  setForm({ ...form, origin: e.target.value });
                  setDirty(true);
                }}
                style={{ width: "100%", padding: 8 }}
                placeholder="例）東大阪市"
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: "#555" }}>着地</div>
              <input
                ref={refDest}
                value={form.destination ?? ""}
                disabled={isClosed}
                onKeyDown={(e) => onKeyDownMove(e, refDest.current)}
                onChange={(e) => {
                  setForm({ ...form, destination: e.target.value });
                  setDirty(true);
                }}
                style={{ width: "100%", padding: 8 }}
                placeholder="例）大阪市港区"
              />
            </label>

            <label>
              <div style={{ fontSize: 12, color: "#555" }}>運賃（円）*</div>
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
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, color: "#555" }}>高速代（円）</div>
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
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, color: "#555" }}>非課税（円）</div>
              <input
                ref={refExempt}
                type="text"
                inputMode="numeric"
                value={String(form.tax_exempt_amount)}
                disabled={isClosed}
                onKeyDown={(e) => onKeyDownMove(e, refExempt.current)}
                onChange={(e) => {
                  setForm({
                    ...form,
                    tax_exempt_amount: cleanMoneyToInt(e.target.value),
                  });
                  setDirty(true);
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, color: "#555" }}>車番</div>
              <input
                ref={refVehicle}
                value={form.vehicle_no ?? ""}
                disabled={isClosed}
                onKeyDown={(e) => onKeyDownMove(e, refVehicle.current)}
                onChange={(e) => {
                  setForm({ ...form, vehicle_no: e.target.value });
                  setDirty(true);
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, color: "#555" }}>運転手</div>
              <input
                ref={refDriver}
                value={form.driver_name ?? ""}
                disabled={isClosed}
                onKeyDown={(e) => onKeyDownMove(e, refDriver.current)}
                onChange={(e) => {
                  setForm({ ...form, driver_name: e.target.value });
                  setDirty(true);
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, color: "#555" }}>傭車先</div>
              <input
                ref={refPartner}
                value={form.partner_name ?? ""}
                disabled={isClosed}
                onKeyDown={(e) => onKeyDownMove(e, refPartner.current)}
                onChange={(e) => {
                  setForm({ ...form, partner_name: e.target.value });
                  setDirty(true);
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label>
              <div style={{ fontSize: 12, color: "#555" }}>品名</div>
              <input
                ref={refItem}
                value={form.item_name ?? ""}
                disabled={isClosed}
                onKeyDown={(e) => onKeyDownMove(e, refItem.current)}
                onChange={(e) => {
                  setForm({ ...form, item_name: e.target.value });
                  setDirty(true);
                }}
                style={{ width: "100%", padding: 8 }}
              />
            </label>

            <label style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontSize: 12, color: "#555" }}>備考</div>
              <textarea
                ref={refNote}
                value={form.note ?? ""}
                disabled={isClosed}
                onKeyDown={(e) => onKeyDownMove(e, refNote.current)}
                onChange={(e) => {
                  setForm({ ...form, note: e.target.value });
                  setDirty(true);
                }}
                style={{ width: "100%", padding: 8, minHeight: 90 }}
                placeholder="備考はEnterで改行（保存はCtrl+Enter）"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
