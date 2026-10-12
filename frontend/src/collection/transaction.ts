import { BasicIndex, createCollection } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/query-core";
import type { Transaction } from "../dummy/money/const";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
const baseURL = "http://localhost:8000/transactions";
const queryClient = new QueryClient();

const fetchTransactions = async (): Promise<Transaction[]> => {
  const response = await fetch(baseURL);
  return response.json();
};

const createTransaction = async (transaction: Transaction) => {
  // id はサーバー側で採番するので送らない
  const { id: _id, ...body } = transaction;
  await fetch(baseURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

const updateTransaction = async (id: string, changes: Partial<Transaction>) => {
  await fetch(`${baseURL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
};

const deleteTransaction = async (id: string) => {
  await fetch(`${baseURL}/${id}`, {
    method: "DELETE",
  });
};

const transactionCollection = createCollection(
  queryCollectionOptions({
    id: "transaction",
    queryKey: ["transaction"],
    queryFn: fetchTransactions,
    queryClient,
    getKey: (item) => item.id,
    // ハンドラーには変更内容 (transaction.mutations) がまとめて渡される
    onUpdate: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((mutation) => updateTransaction(mutation.original.id, mutation.changes)),
      );
    },
    onInsert: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((mutation) => createTransaction(mutation.modified)));
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((mutation) => deleteTransaction(mutation.original.id)));
    },
  }),
);
// カテゴリとの JOIN (t.categoryId = c.id) で使う
transactionCollection.createIndex((row) => row.categoryId, { indexType: BasicIndex });

export default transactionCollection;
