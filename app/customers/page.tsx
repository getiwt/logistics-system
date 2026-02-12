import Link from "next/link";

export default function CustomersPage() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>得意先マスター</h1>
        <Link href="/" style={{ textDecoration: "underline" }}>← メニューへ</Link>
      </div>
      <p style={{ marginTop: 12, color: "#555" }}>
        ここは次に作ります（追加・編集・検索）。
      </p>
    </div>
  );
}
