"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = {
  id: number; // uuidなら string に変更
  name: string;
  phone?: string | null;
  address?: string | null;
  is_active?: boolean;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers", { cache: "no-store" });
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      setRows(list);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const t = q.toLowerCase();
    return rows.filter(
      (r) =>
        (r.name ?? "").toLowerCase().includes(t) ||
        (r.phone ?? "").toLowerCase().includes(t) ||
        (r.address ?? "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const addCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("得意先名は必須です");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "登録に失敗しました");

      setMsg("登録しました");
      setName("");
      setPhone("");
      setAddress("");
      await load();
    } catch (err: any) {
      alert(err.message ?? "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">得意先マスター</h1>
          <p className="text-sm text-zinc-600">得意先の登録・検索</p>
        </header>

        {msg && (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {msg}
          </div>
        )}

        {/* 登録フォーム */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">新規登録</h2>
          <form onSubmit={addCustomer} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs text-zinc-600">得意先名 *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
                placeholder="例）山田運送"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-600">電話</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-zinc-600">住所</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                disabled={loading}
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? "登録中…" : "登録"}
              </button>
            </div>
          </form>
        </section>

        {/* 一覧 */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">一覧</h2>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded border border-zinc-200 px-3 py-2 text-sm"
              placeholder="検索"
            />
          </div>

          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">得意先名</th>
                <th className="px-3 py-2 text-left">電話</th>
                <th className="px-3 py-2 text-left">住所</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.phone ?? "-"}</td>
                  <td className="px-3 py-2">{r.address ?? "-"}</td>
                </tr>
              ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-zinc-500">
                    データなし
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
