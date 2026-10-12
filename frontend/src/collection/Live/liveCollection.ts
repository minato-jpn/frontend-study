import { createLiveQueryCollection } from "@tanstack/react-db";
import categoryCollection from "../categories";
import transactionCollection from "../transaction";
import { eq } from "@tanstack/react-db";
export const transactionHistoryCollection = createLiveQueryCollection({
  id: "transaction-rows",
  query: (q) =>
    q
      .from({ t: transactionCollection })
      .leftJoin({ c: categoryCollection }, ({ t, c }) => eq(t.categoryId, c.id))
      .select(({ t, c }) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        categoryId: t.categoryId,
        categoryName: c?.name,
        kind: t.kind,
        place: t.place,
        memo: t.memo,
      })),
  getKey: (row) => row.id,
});
