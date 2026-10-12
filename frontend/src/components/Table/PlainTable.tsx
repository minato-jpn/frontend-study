import type { TransactionRow } from "./VirturalTable";

// 仮想化との比較用。渡された行をすべて一度に <tr> として描画する
export const PlainTable = ({ items }: { items: TransactionRow[] }) => {
  return (
    <div style={{ height: 400, overflow: "auto", border: "1px solid var(--border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ position: "sticky", top: 0, background: "var(--bg)" }}>
          <tr>
            <th>日付</th>
            <th>カテゴリ</th>
            <th>入出金</th>
            <th style={{ textAlign: "right" }}>金額</th>
            <th>場所</th>
            <th>メモ</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td>{new Date(row.date).toLocaleDateString("ja-JP")}</td>
              <td>{row.categoryName ?? "未分類"}</td>
              <td>{row.kind === "income" ? "収入" : "支出"}</td>
              <td style={{ textAlign: "right", color: row.kind === "income" ? "green" : undefined }}>
                {row.kind === "income" ? "+" : "-"}¥{row.amount.toLocaleString()}
              </td>
              <td>{row.place ?? ""}</td>
              <td>{row.memo ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
