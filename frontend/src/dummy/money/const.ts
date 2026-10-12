// DB (MongoDB) の categories / transactions コレクションに合わせたダミーデータ
// id は ObjectId を API で 24 桁の16進文字列にしたもの

export type TransactionKind = "income" | "payment";

export type Category = {
  id: string;
  name: string;
  kind: TransactionKind;
};

export type Transaction = {
  id: string;
  date: string; // "YYYY-MM-DD"
  kind: TransactionKind;
  amount: number;
  categoryId: string | null; // null は未分類
  place: string | null; // どこで使ったか / どこから入ったか
  memo: string | null;
};
export type TransactionRow = {
  id: string;
  date: string; // "YYYY-MM-DD"
  kind: TransactionKind;
  amount: number;
  categoryId: string | null; // null は未分類
  categoryName: string | null; // null は未分類
  place: string | null; // どこで使ったか / どこから入ったか
  memo: string | null;
};

export const categories: Category[] = [
  { id: "6703a1f0c2b4e5d6f7a8b901", name: "食費", kind: "payment" },
  { id: "6703a1f0c2b4e5d6f7a8b902", name: "ガス光熱費", kind: "payment" },
  { id: "6703a1f0c2b4e5d6f7a8b903", name: "交際費", kind: "payment" },
  { id: "6703a1f0c2b4e5d6f7a8b904", name: "趣味", kind: "payment" },
  { id: "6703a1f0c2b4e5d6f7a8b905", name: "給与", kind: "income" },
  { id: "6703a1f0c2b4e5d6f7a8b906", name: "副収入", kind: "income" },
];

// 2026-10-04(日) 〜 2026-10-10(土) の1週間分の取引履歴
export const transactions: Transaction[] = [
  {
    id: "6703a2f0c2b4e5d6f7a8c001",
    date: "2026-10-04",
    kind: "payment",
    amount: 3200,
    categoryId: "6703a1f0c2b4e5d6f7a8b901",
    place: "スーパー",
    memo: "1週間分の買い出し",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c002",
    date: "2026-10-04",
    kind: "payment",
    amount: 5000,
    categoryId: "6703a1f0c2b4e5d6f7a8b904",
    place: "書店",
    memo: "技術書",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c003",
    date: "2026-10-05",
    kind: "payment",
    amount: 450,
    categoryId: "6703a1f0c2b4e5d6f7a8b901",
    place: "コンビニ",
    memo: "朝食",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c004",
    date: "2026-10-05",
    kind: "payment",
    amount: 900,
    categoryId: "6703a1f0c2b4e5d6f7a8b901",
    place: "定食屋",
    memo: "昼食",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c005",
    date: "2026-10-06",
    kind: "income",
    amount: 3500,
    categoryId: "6703a1f0c2b4e5d6f7a8b906",
    place: "フリマアプリ",
    memo: "古本の売上",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c006",
    date: "2026-10-06",
    kind: "payment",
    amount: 1980,
    categoryId: "6703a1f0c2b4e5d6f7a8b901",
    place: "スーパー",
    memo: null,
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c007",
    date: "2026-10-06",
    kind: "payment",
    amount: 800,
    categoryId: "6703a1f0c2b4e5d6f7a8b903",
    place: "カフェ",
    memo: "友人とお茶",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c008",
    date: "2026-10-07",
    kind: "payment",
    amount: 960,
    categoryId: "6703a1f0c2b4e5d6f7a8b901",
    place: "コンビニ",
    memo: "昼食",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c009",
    date: "2026-10-08",
    kind: "payment",
    amount: 4520,
    categoryId: "6703a1f0c2b4e5d6f7a8b902",
    place: "ガス会社",
    memo: "9月分ガス代",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c010",
    date: "2026-10-09",
    kind: "income",
    amount: 280000,
    categoryId: "6703a1f0c2b4e5d6f7a8b905",
    place: "勤務先",
    memo: "10月分給与",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c011",
    date: "2026-10-09",
    kind: "payment",
    amount: 5500,
    categoryId: "6703a1f0c2b4e5d6f7a8b903",
    place: "居酒屋",
    memo: "同僚と飲み会",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c012",
    date: "2026-10-09",
    kind: "payment",
    amount: 800,
    categoryId: "6703a1f0c2b4e5d6f7a8b901",
    place: "コンビニ",
    memo: null,
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c013",
    date: "2026-10-10",
    kind: "payment",
    amount: 9800,
    categoryId: "6703a1f0c2b4e5d6f7a8b904",
    place: "家電量販店",
    memo: "ゲームソフト",
  },
  {
    id: "6703a2f0c2b4e5d6f7a8c014",
    date: "2026-10-10",
    kind: "payment",
    amount: 2680,
    categoryId: "6703a1f0c2b4e5d6f7a8b901",
    place: "スーパー",
    memo: null,
  },
];

// 2026-10-04 開始時点の預金残高
export const openingBalance = 1000000;

export type DailyReport = {
  date: string;
  day: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
  deposit: number; // その日の終わり時点の預金残高
  income: number;
  payment: number;
};

const days: DailyReport["day"][] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// 取引履歴から日毎の収入・支出・残高を集計する
export const toDailyReport = (txs: Transaction[], opening: number): DailyReport[] => {
  const byDate = new Map<string, { income: number; payment: number }>();
  for (const tx of txs) {
    const totals = byDate.get(tx.date) ?? { income: 0, payment: 0 };
    totals[tx.kind] += tx.amount;
    byDate.set(tx.date, totals);
  }

  let deposit = opening;
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { income, payment }]) => {
      deposit += income - payment;
      return {
        date,
        day: days[new Date(date).getUTCDay()],
        deposit,
        income,
        payment,
      };
    });
};

export const weeklyReport: DailyReport[] = toDailyReport(transactions, openingBalance);
