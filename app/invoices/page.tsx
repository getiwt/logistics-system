import Link from "next/link";

export default function InvoicesPage() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>請求書発行</h1>
        <Link href="/" style={{ textDecoration: "underline" }}>← メニューへ</Link>
      </div>
      <p style={{ marginTop: 12, color: "#555" }}>
        ここは後で作ります（月次集計 → PDF発行）。高速代は課税で計算します。
      </p>
    </div>
  );
}
