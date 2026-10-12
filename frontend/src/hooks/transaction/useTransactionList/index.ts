import { useLiveQuery } from "@tanstack/react-db";
import { transactionHistoryCollection } from "../../../collection/Live/liveCollection";

export const useTransactionList = () => {
  const { data: transactions, isLoading } = useLiveQuery(transactionHistoryCollection);
  return {
    transactions,
    isLoading,
  };
};
