// コンテナ初回起動時に MONGO_INITDB_DATABASE (household_account_book) に対して実行される

// 収入・支出の項目（食費・ガス光熱費・交際費・趣味・給与 など）
// ユーザーが自由に追加できる。使わなくなった項目は削除せず is_active = false にする
// （過去の取引が参照しているため）
db.createCollection("categories", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "kind", "sort_order", "is_active", "created_at"],
      properties: {
        name:       { bsonType: "string" },
        kind:       { enum: ["income", "payment"] },
        sort_order: { bsonType: "int" },
        is_active:  { bsonType: "bool" },
        created_at: { bsonType: "date" },
      },
    },
  },
});
db.categories.createIndex({ name: 1, kind: 1 }, { unique: true });

// 家計簿の取引（収入・支出）
// date は日付のみを表す。UTC の 0 時として保存する
// category_id と kind の整合性（収入項目に支出を紐づけない等）は外部キーが無いのでアプリ側で検証する
db.createCollection("transactions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["date", "kind", "amount", "created_at"],
      properties: {
        date:        { bsonType: "date" },
        kind:        { enum: ["income", "payment"] },
        amount:      { bsonType: ["int", "long"], minimum: 0 },
        category_id: { bsonType: ["objectId", "null"] }, // null は未分類
        place:       { bsonType: ["string", "null"] },   // どこで使ったか / どこから入ったか（店名・場所など）
        memo:        { bsonType: ["string", "null"] },
        created_at:  { bsonType: "date" },
      },
    },
  },
});
db.transactions.createIndex({ date: 1 });
db.transactions.createIndex({ category_id: 1, date: 1 });

// 目標値（予算）
// period_type で日毎・月毎を切り替える。category_id が null のときは全体の目標。
// 目標額を途中で変えたいときは新しい start_date でドキュメントを追加し、
// ある日付に有効な目標は「start_date <= 対象日 で最も新しいもの」とする。
// カテゴリは削除せず is_active = false にする運用のため、カスケード削除は持たない
db.createCollection("budgets", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["period_type", "amount", "start_date", "created_at"],
      properties: {
        category_id: { bsonType: ["objectId", "null"] },
        period_type: { enum: ["daily", "monthly"] },
        amount:      { bsonType: ["int", "long"], minimum: 0 },
        start_date:  { bsonType: "date" },
        created_at:  { bsonType: "date" },
      },
    },
  },
});
// 一意インデックスでは null 同士も同じ値として扱われる（NULLS NOT DISTINCT 相当）
db.budgets.createIndex({ category_id: 1, period_type: 1, start_date: 1 }, { unique: true });

// 初期項目
const now = new Date();
[
  { name: "食費",       kind: "payment", sort_order: 10 },
  { name: "ガス光熱費", kind: "payment", sort_order: 20 },
  { name: "交際費",     kind: "payment", sort_order: 30 },
  { name: "趣味",       kind: "payment", sort_order: 40 },
  { name: "給与",       kind: "income",  sort_order: 10 },
  { name: "副収入",     kind: "income",  sort_order: 20 },
].forEach(({ name, kind, sort_order }) => {
  db.categories.updateOne(
    { name, kind },
    { $setOnInsert: { sort_order: NumberInt(sort_order), is_active: true, created_at: now } },
    { upsert: true },
  );
});
