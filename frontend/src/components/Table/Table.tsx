import type { ReactTable } from "@tanstack/react-table";
import type { TransactionRow } from "./VirturalTable";
import features from "./feature/feature";
export const Table = ({ table }: { table: ReactTable<typeof features, TransactionRow> }) => {
  return (
    <>
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={
                    header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined
                  }
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {table.getFooterGroups().map((footerGroup) => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map((footer) => (
                <td key={footer.id}>
                  <table.FlexRender footer={footer} />
                </td>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
      <Pagination table={table} />
    </>
  );
};

const PAGE_SIZES = [10, 20, 50, 100];

const Pagination = ({ table }: { table: ReactTable<typeof features, TransactionRow> }) => {
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = table.getPageCount();
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
        {"<<"}
      </button>
      <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
        {"<"}
      </button>
      <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
        {">"}
      </button>
      <button onClick={() => table.lastPage()} disabled={!table.getCanLastPage()}>
        {">>"}
      </button>
      <span>
        <input
          type="number"
          min={1}
          max={Math.max(pageCount, 1)}
          value={pageIndex + 1}
          onChange={(e) => {
            const page = Number(e.target.value);
            if (Number.isInteger(page) && page >= 1 && page <= pageCount) {
              table.setPageIndex(page - 1);
            }
          }}
          style={{ width: "5em" }}
        />{" "}
        / {pageCount} ページ（全 {table.getRowCount().toLocaleString()} 件）
      </span>
      <select value={pageSize} onChange={(e) => table.setPageSize(Number(e.target.value))}>
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size} 件ずつ
          </option>
        ))}
      </select>
    </div>
  );
};
