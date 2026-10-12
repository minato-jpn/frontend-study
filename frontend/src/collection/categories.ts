import { BasicIndex, createCollection } from "@tanstack/react-db";
import { QueryClient } from "@tanstack/query-core";
import type { Category } from "../dummy/money/const";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
const baseURL = "http://localhost:8000/categories";
const queryClient = new QueryClient();

const fetchCategories = async (): Promise<Category[]> => {
  // 無効にしたカテゴリも過去の取引から参照されているので含めて取得する
  const response = await fetch(`${baseURL}?includeInactive=true`);
  return response.json();
};

const createCategory = async (category: Category) => {
  await fetch(baseURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: category.name, kind: category.kind }),
  });
};

const updateCategory = async (id: string, changes: Partial<Category>) => {
  await fetch(`${baseURL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
};

const deleteCategory = async (id: string) => {
  await fetch(`${baseURL}/${id}`, {
    method: "DELETE",
  });
};

const categoryCollection = createCollection(
  queryCollectionOptions({
    id: "category",
    queryKey: ["category"],
    queryFn: fetchCategories,
    queryClient,
    getKey: (item) => item.id,
    // ハンドラーには変更内容 (transaction.mutations) がまとめて渡される
    onUpdate: async ({ transaction }) => {
      await Promise.all(
        transaction.mutations.map((mutation) => updateCategory(mutation.original.id, mutation.changes)),
      );
    },
    onInsert: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((mutation) => createCategory(mutation.modified)));
    },
    onDelete: async ({ transaction }) => {
      await Promise.all(transaction.mutations.map((mutation) => deleteCategory(mutation.original.id)));
    },
  }),
);
// 取引との JOIN (t.categoryId = c.id) で使う
categoryCollection.createIndex((row) => row.id, { indexType: BasicIndex });

export default categoryCollection;
