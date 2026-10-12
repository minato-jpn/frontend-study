"""開発用のダミーデータを投入する

    uv run seed.py                 # ローカル (localhost:27017 の MongoDB)
    docker compose exec backend python seed.py

既存の取引と目標を消してから入れ直す。カテゴリは名前と種類で upsert する。
乱数のシードを固定しているので、何度実行しても同じ内容になる。
"""

import argparse
import calendar
import datetime as dt
import random

from db import db, now, to_datetime

# (名前, 種類, 並び順, 有効か)
# 「サブスク」は使わなくなった項目の例。過去の取引だけが残る
CATEGORIES = [
    ("食費", "payment", 10, True),
    ("ガス光熱費", "payment", 20, True),
    ("交際費", "payment", 30, True),
    ("趣味", "payment", 40, True),
    ("日用品", "payment", 50, True),
    ("交通費", "payment", 60, True),
    ("家賃", "payment", 70, True),
    ("サブスク", "payment", 80, False),
    ("給与", "income", 10, True),
    ("副収入", "income", 20, True),
]


def month_starts(start: dt.date, end: dt.date):
    d = start.replace(day=1)
    while d <= end:
        yield d
        d = (d.replace(day=28) + dt.timedelta(days=4)).replace(day=1)


def clamp_day(month: dt.date, day: int) -> dt.date:
    return month.replace(day=min(day, calendar.monthrange(month.year, month.month)[1]))


def round_yen(value: float, unit: int = 10) -> int:
    return int(round(value / unit) * unit)


def generate(start: dt.date, end: dt.date, cat: dict[str, object], rng: random.Random):
    txs: list[dict] = []

    def add(date, kind, amount, category, place=None, memo=None):
        if start <= date <= end:
            txs.append(
                {
                    "date": date,
                    "kind": kind,
                    "amount": amount,
                    "category": category,
                    "place": place,
                    "memo": memo,
                }
            )

    # ---- 毎日の支出 ----
    d = start
    while d <= end:
        weekday = d.weekday()  # 月=0 … 日=6
        holiday = weekday >= 5

        # 食費: 朝・昼はコンビニや定食屋、週末はスーパーでまとめ買い
        if rng.random() < 0.55:
            add(d, "payment", round_yen(rng.uniform(250, 700)), "食費", "コンビニ", rng.choice(["朝食", "飲み物", None]))
        if not holiday and rng.random() < 0.8:
            place = rng.choice(["定食屋", "コンビニ", "社員食堂", "ラーメン屋", "牛丼屋"])
            add(d, "payment", round_yen(rng.uniform(450, 1200)), "食費", place, "昼食")
        if weekday in (2, 5) or (holiday and rng.random() < 0.3):
            add(d, "payment", round_yen(rng.uniform(1500, 5500)), "食費", rng.choice(["スーパー", "業務スーパー", "八百屋"]), rng.choice(["まとめ買い", None]))
        if weekday == 4 and rng.random() < 0.3:
            add(d, "payment", round_yen(rng.uniform(1500, 4000)), "食費", "デリバリー", "夕食")

        # 交際費: 金曜の飲み会、週末のカフェ
        if weekday == 4 and rng.random() < 0.35:
            add(d, "payment", round_yen(rng.uniform(3000, 7000), 100), "交際費", rng.choice(["居酒屋", "焼肉屋", "バー"]), rng.choice(["同僚と飲み会", "友人と飲み", "歓迎会"]))
        if holiday and rng.random() < 0.3:
            add(d, "payment", round_yen(rng.uniform(500, 1500)), "交際費", "カフェ", "友人とお茶")

        # 趣味: 週末に本・ゲーム・映画など
        if holiday and rng.random() < 0.25:
            place, memo, lo, hi = rng.choice(
                [
                    ("書店", "技術書", 2000, 5000),
                    ("書店", "漫画", 500, 1500),
                    ("家電量販店", "ゲームソフト", 4000, 9800),
                    ("映画館", "映画", 1900, 2200),
                    ("スポーツ用品店", "ランニングシューズ", 6000, 15000),
                ]
            )
            add(d, "payment", round_yen(rng.uniform(lo, hi), 100), "趣味", place, memo)

        # 交通費・日用品
        if rng.random() < 0.15:
            add(d, "payment", round_yen(rng.uniform(170, 1200)), "交通費", rng.choice(["電車", "バス", "タクシー"]), None)
        if rng.random() < 0.08:
            add(d, "payment", round_yen(rng.uniform(300, 2500)), "日用品", rng.choice(["ドラッグストア", "100円ショップ", "ホームセンター"]), rng.choice(["洗剤", "ティッシュ", "シャンプー", None]))

        # カテゴリを付け忘れた取引 (未分類)
        if rng.random() < 0.03:
            add(d, "payment", round_yen(rng.uniform(200, 3000)), None, rng.choice(["自動販売機", "コンビニ", None]), rng.choice(["不明", None]))

        d += dt.timedelta(days=1)

    # ---- 毎月の収支 ----
    for i, month in enumerate(month_starts(start, end)):
        # 給与: 25日。4月に昇給、6月・12月は賞与
        salary = 280000 + (10000 if month >= dt.date(2026, 4, 1) else 0)
        add(clamp_day(month, 25), "income", salary, "給与", "勤務先", f"{month.month}月分給与")
        if month.month in (6, 12):
            add(clamp_day(month, 10), "income", round_yen(salary * 2.0, 1000), "給与", "勤務先", "賞与")

        # 副収入: フリマやポイント
        for _ in range(rng.randint(0, 3)):
            add(clamp_day(month, rng.randint(1, 28)), "income", round_yen(rng.uniform(500, 8000), 100), "副収入", rng.choice(["フリマアプリ", "ポイント還元", "アンケート"]), rng.choice(["古本の売上", "不用品の売上", None]))

        # 家賃
        add(clamp_day(month, 27), "payment", 85000, "家賃", "管理会社", f"{month.month % 12 + 1}月分家賃")

        # 光熱費: 夏 (エアコン) と冬 (暖房・お湯) に増える
        season = {1: 1.6, 2: 1.5, 3: 1.2, 7: 1.4, 8: 1.6, 9: 1.2, 12: 1.4}.get(month.month, 1.0)
        add(clamp_day(month, 8), "payment", round_yen(6000 * season * rng.uniform(0.9, 1.15), 1), "ガス光熱費", "電力会社", f"{(month.month - 2) % 12 + 1}月分電気代")
        add(clamp_day(month, 12), "payment", round_yen(3500 * season * rng.uniform(0.9, 1.15), 1), "ガス光熱費", "ガス会社", f"{(month.month - 2) % 12 + 1}月分ガス代")
        if month.month % 2 == 0:
            add(clamp_day(month, 20), "payment", round_yen(rng.uniform(3800, 4600), 1), "ガス光熱費", "水道局", "水道代 (2か月分)")
        add(clamp_day(month, 5), "payment", 4980, "ガス光熱費", "通信会社", "スマホ代")

        # サブスク: 最初の1年だけ使っていた（いまは無効なカテゴリ）
        if i < 12:
            add(clamp_day(month, 1), "payment", 1490, "サブスク", "動画配信サービス", "月額料金")
            add(clamp_day(month, 1), "payment", 980, "サブスク", "音楽配信サービス", "月額料金")

    docs = []
    created_at = now()
    for tx in sorted(txs, key=lambda t: t["date"]):
        docs.append(
            {
                "date": to_datetime(tx["date"]),
                "kind": tx["kind"],
                "amount": tx["amount"],
                "category_id": cat[tx["category"]] if tx["category"] else None,
                "place": tx["place"],
                "memo": tx["memo"],
                "created_at": created_at,
            }
        )
    return docs


def budgets(start: dt.date, cat: dict[str, object]):
    # 途中で目標を見直した例として、半年後から食費と全体の目標を下げる
    revised = (start.replace(day=1) + dt.timedelta(days=190)).replace(day=1)
    rows = [
        (None, "monthly", 230000, start),
        (None, "monthly", 220000, revised),
        ("食費", "monthly", 45000, start),
        ("食費", "monthly", 40000, revised),
        ("食費", "daily", 1500, start),
        ("ガス光熱費", "monthly", 20000, start),
        ("交際費", "monthly", 15000, start),
        ("趣味", "monthly", 15000, start),
        ("日用品", "monthly", 5000, start),
        ("交通費", "monthly", 5000, start),
    ]
    created_at = now()
    return [
        {
            "category_id": cat[name] if name else None,
            "period_type": period_type,
            "amount": amount,
            "start_date": to_datetime(start_date.replace(day=1)),
            "created_at": created_at,
        }
        for name, period_type, amount, start_date in rows
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--months", type=int, default=24, help="今日から何か月さかのぼって作るか (既定: 24)")
    parser.add_argument("--seed", type=int, default=20261011, help="乱数のシード")
    args = parser.parse_args()

    end = dt.date.today()
    start = end.replace(day=1)
    for _ in range(args.months - 1):
        start = (start - dt.timedelta(days=1)).replace(day=1)

    created_at = now()
    for name, kind, sort_order, is_active in CATEGORIES:
        db.categories.update_one(
            {"name": name, "kind": kind},
            {
                "$set": {"sort_order": sort_order, "is_active": is_active},
                "$setOnInsert": {"created_at": created_at},
            },
            upsert=True,
        )
    cat = {doc["name"]: doc["_id"] for doc in db.categories.find({}, {"name": 1})}

    txs = generate(start, end, cat, random.Random(args.seed))
    db.transactions.delete_many({})
    db.transactions.insert_many(txs)

    bs = budgets(start, cat)
    db.budgets.delete_many({})
    db.budgets.insert_many(bs)

    print(f"期間: {start} 〜 {end}")
    print(f"カテゴリ: {db.categories.count_documents({})} 件")
    print(f"取引: {len(txs)} 件")
    print(f"目標: {len(bs)} 件")


if __name__ == "__main__":
    main()
