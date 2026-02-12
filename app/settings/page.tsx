import Link from "next/link";

export default function SettingsPage() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>設定</h1>
        <Link href="/" style={{ textDecoration: "underline" }}>← メニューへ</Link>
      </div>
      <p style={{ marginTop: 12, color: "#555" }}>
        ここは後で作ります（課税設定など）。
      </p>
    </div>
  );
}
