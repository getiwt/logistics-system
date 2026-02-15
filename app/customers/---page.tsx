"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  code: string | null;
  name: string;
  kana: string | null;
  phone: string | null;
  email: string | null;
  postal: string | null;
  address1: string | null;
  address2: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
};

type FormState = {
  code: string;
  name: string;
  kana: string;
  phone: string;
  email: string;
  postal: string;
  address1: string;
  address2: string;
  note: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  code: "",
  name: "",
  kana: "",
  phone: "",
  email: "",
  postal: "",
  address1: "",
  address2: "",
  note: "",
  is_active: true,
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "ng"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/customers", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "取得に失敗しました");
      setRows(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setMsg({ type: "ng", text: e.message ?? "取得に失敗しました" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => {
      const s = `${r.code ?? ""} ${r.name ?? ""} ${r.kana ?? ""} ${r.phone ?? ""} ${r.address1 ?? ""}`.toLowerCase();
      return s.includes(t);
    });
  }, [rows, q]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "登録に失敗しました");

      setMsg({ type: "ok", text: `登録しました（${json.data.code}）` });
      setForm(emptyForm);
      await load();
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
            <h1 className="text-2xl font-semibold">得意先マスター</h1>
            <p className="text-sm text-zinc-600">得意先の追加・一覧（検索）</p>
          </div>

          <div className="w-full max-w-sm">
            <label className="block text-xs text-zinc-600">検索（得意先名 / コード / 電話など）</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
              placeholder="例：C000012 / 山田 / 06-xxxx..."
            />
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
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-medium">新規追加</h2>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="得意先コード（空で自動採番）">
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="例：C000001"
                  />
                </Field>

                <Field label="得意先名（必須）">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="例：山田運送株式会社"
                    required
                  />
                </Field>

                <Field label="カナ">
                  <input
                    value={form.kana}
                    onChange={(e) => setForm({ ...form, kana: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="ヤマダウンソウ"
                  />
                </Field>

                <Field label="電話">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="06-xxxx-xxxx"
                  />
                </Field>

                <Field label="メール">
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    placeholder="example@company.co.jp"
                  />
                </Field>

                <Field label="郵便番号">
                  <input
                    value={form.postal}
                    onChange={(e) => setForm({ ...form, postal: e.t
