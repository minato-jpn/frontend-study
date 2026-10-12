import { useState } from "react";
import { useTable } from "@tanstack/react-table";
import Table from "./components/Table";
import features from "./components/Table/feature/feature";
import columns from "./components/Table/columns/Transaction";
import { categories } from "./dummy/money/const";
import { VirtualTable } from "./components/Table/VirturalTable";
import { PlainTable } from "./components/Table/PlainTable";
import { useTransactionList } from "./hooks/transaction/useTransactionList";
function App() {
  // The scrollable element for your list
  const { transactions: transactions, isLoading } = useTransactionList();
  // 全件を一度に描画するので重い。比較したいときだけ表示する
  const [showPlainTable, setShowPlainTable] = useState(false);
  const table = useTable({
    features: features,
    columns: columns,
    data: transactions,
  });

  const categoryColumn = table.getColumn("category");
  const amountColumn = table.getColumn("amount");

  return (
    <div style={{padding:32}}>
      <select
        value={(categoryColumn?.getFilterValue() as string) ?? ""}
        onChange={(e) => categoryColumn?.setFilterValue(e.target.value || undefined)}
      >
        <option value="">すべてのカテゴリ</option>
        {categories &&
          categories.map((category) => (
            <option key={category.id} id={`${category.id}`} value={`${category.name}`}>
              {category.name}
            </option>
          ))}
      </select>
      <input
        placeholder="金額の指定"
        value={amountColumn?.getFilterValue() as number}
        onChange={(e) => amountColumn?.setFilterValue(e.target.value || undefined)}
      />{" "}
      <Table table={table} />
      <h2 style={{margin:32}}>仮想化あり</h2>
      <VirtualTable items={transactions} />
      <h2 style={{margin:32}}>仮想化なし（全 {transactions.length.toLocaleString()} 件を一度に描画）</h2>
      <button onClick={() => setShowPlainTable((show) => !show)}>
        {showPlainTable ? "隠す" : "表示する"}
      </button>
      {showPlainTable && <PlainTable items={transactions} />}
    </div>
  );
}

export default App;
