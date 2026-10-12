import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { Transaction } from "../../dummy/money/const";

// live query で categoryName を結合した行
export type TransactionRow = Transaction & { categoryName?: string };

const ROW_HEIGHT = 40;
// 日付 / カテゴリ / 入出金 / 金額 / 場所 / メモ
const GRID_COLUMNS = "7em 8em 4em 8em 1fr 1fr";

const rowStyle = {
  display: "grid",
  gridTemplateColumns: GRID_COLUMNS,
  gap: 8,
  alignItems: "center",
  padding: "0 8px",
  borderBottom: "1px solid var(--border)",
} as const;

const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;

export const VirtualTable = ({ items }: { items: TransactionRow[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });
  return (
    <div ref={parentRef} style={{ height: 400, overflow: "auto", border: "1px solid var(--border)" }}>
      <div
        style={{
          ...rowStyle,
          position: "sticky",
          top: 0,
          zIndex: 1,
          height: ROW_HEIGHT,
          background: "var(--bg)",
          fontWeight: "bold",
        }}
      >
        <span>日付</span>
        <span>カテゴリ</span>
        <span>入出金</span>
        <span style={{ textAlign: "right" }}>金額</span>
        <span>場所</span>
        <span>メモ</span>
      </div>
      {/* 全行分の高さを確保し、見えている行だけを translateY で配置する */}
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((item) => {
          const row = items[item.index];
          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{
                ...rowStyle,
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                boxSizing: "border-box",
                minHeight: ROW_HEIGHT,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <span>{new Date(row.date).toLocaleDateString("ja-JP")}</span>
              <span style={ellipsis}>{row.categoryName ?? "未分類"}</span>
              <span>{row.kind === "income" ? "収入" : "支出"}</span>
              <span style={{ textAlign: "right", color: row.kind === "income" ? "green" : undefined }}>
                {row.kind === "income" ? "+" : "-"}¥{row.amount.toLocaleString()}
              </span>
              <span style={ellipsis}>{row.place ?? ""}</span>
              <span style={ellipsis}>{row.memo ?? ""}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
