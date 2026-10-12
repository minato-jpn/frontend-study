import { createColumnHelper } from "@tanstack/react-table";
import features from "../../feature/feature";
import type { Transaction } from "../../../../dummy/money/const";
import { categories } from "../../../../dummy/money/const";
const columnHelper = createColumnHelper<typeof features, Transaction>();
const categoryIDMap = new Map(categories.map((category) => [category.id, category.name]));
const TransactionColumns = columnHelper.columns([
  columnHelper.accessor("date", {
    header: "日付",
    sortFn: "datetime",
    enableColumnFilter: false,
    cell: (info) => new Date(info.getValue()).toLocaleDateString("ja-JP"),
  }),
  columnHelper.accessor((row) => categoryIDMap.get(row.categoryId) ?? "未分類", {
    id: "category",
    header: "カテゴリ",
    sortFn: "text",
    enableMultiSort: true,
    enableColumnFilter: true,
    filterFn: "includesString",
  }),
  columnHelper.accessor("amount", {
    header: "金額",
    sortFn: "alphanumeric",
    enableMultiSort: true,
    enableColumnFilter: true,
    aggregationFn: "sum",
    footer: ({ column, table }) =>
      `合計 ¥ ${column
        .getAggregationValue<number>({
          rows: table.getRowModel().rows,
        })
        .toLocaleString()}`,
    filterFn: "greaterThan",
  }),
  columnHelper.display({
    id: "action",
    header: "操作",
    cell: () => (
      <div>
        <button>削除</button>
        <button>編集</button>
      </div>
    ),
  }),
]);

export default TransactionColumns;
