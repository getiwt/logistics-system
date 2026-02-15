"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

// （以下 type / util はそのまま）
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

/** ✅ これがエクスポート（Suspenseで包むだけ） */
export default function ShipmentsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 p-6">読み込み中…</div>}>
      <ShipmentsPageInner />
    </Suspense>
  );
}

/** ✅ useSearchParams を使うのは Inner 側 */
function ShipmentsPageInner() {
  const sp = useSearchParams();

  // --- ここから下は、あなたの元の ShipmentsPage の中身をそのまま ---
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
    const list = Array.isArray(json?.data) ? json.data : json;
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

  // ✅ ここから下の return は、あなたの元コードのままでOK
  return (
    /* 以降、あなたの return をそのまま貼り付け */
    <div className="min-h-screen bg-zinc-50 p-6">
      {/* ...省略（あなたの元のJSXそのまま） */}
      {/* ここは変更不要 */}
    </div>
  );
}
