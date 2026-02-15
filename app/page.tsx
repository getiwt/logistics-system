import Link from "next/link";

const Card = ({
  title,
  desc,
  href,
  badge,
}: {
  title: string;
  desc: string;
  href: string;
  badge?: string;
}) => {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-zinc-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-lg font-semibold text-zinc-900">{title}</div>
        {badge ? (
          <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-sm leading-6 text-zinc-600">{desc}</div>
      <div className="mt-4 text-sm font-medium text-zinc-900">開く →</div>
    </Link>
  );
};

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">運輸管理システム</h1>
          <p className="mt-1 text-sm text-zinc-600">
            よく使う画面にすぐ入れるようにしました（まずは日々入力が最優先）
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card
            title="明細入力"
            desc="日々の入力・検索・修正。Enter移動/Ctrl+Enter保存。"
            href="/shipments"
            badge="最優先"
          />

          <Card
            title="得意先マスター"
            desc="得意先の追加・編集（後で作る/今は仮ページでもOK）"
            href="/customers"
          />

	 <Card
  	    title="得意先別集計"
            desc="期間内の明細を得意先ごとに合計表示"
            href="/reports/customer-summary"
	 />

          <Card
            title="請求書発行"
            desc="月次集計・締め・請求書PDF（後で実装）"
            href="/invoices"
            badge="準備中"
          />


          <Card
            title="設定"
            desc="消費税/課税区分（高速代は課税）など（後で実装）"
            href="/settings"
            badge="準備中"
          />

        </div>




        <footer className="mt-8 text-xs text-zinc-500">
          ※ まだページが無いメニューは 404 になります。次で「customers/invoices/settings」の箱を作ります。
        </footer>
      </div>
    </div>
  );
}
