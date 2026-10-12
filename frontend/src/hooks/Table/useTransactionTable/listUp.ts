import { useTable } from "@tanstack/react-table";
import columns from "../../../components/Table/columns/Transaction";
import features from "../../../components/Table/feature/feature";
import { transactions } from "../../../dummy/money/const";
export const useTransactionTableHook = () =>
  useTable({
    features: features,
    columns: columns,
    data: transactions,
  });
