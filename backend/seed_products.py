"""無限スクロールの動作確認用に、商品のモックデータを大量に投入する

    uv run seed_products.py                       # 1 万件
    uv run seed_products.py --count 100000000     # 1 億件
    docker compose exec backend python seed_products.py --count 1000000

既存の商品を消してから入れ直す。乱数のシードを固定しているので、何度実行しても同じ内容になる。
全件をメモリに載せず、--batch 件ずつ作っては投入するので件数を増やしてもメモリ使用量は一定。
目安として 1 件あたり 200 バイト前後なので、1 億件だとディスクを 20GB 程度使う。
"""

import argparse
import random
import time

from db import db, now

# (カテゴリ, 商品名, 下限価格, 上限価格)
BASES = [
    ("食品", "お米 5kg", 1800, 4500),
    ("食品", "コーヒー豆 500g", 1200, 3500),
    ("食品", "チョコレート詰め合わせ", 500, 3000),
    ("食品", "インスタントラーメン 5食", 400, 1200),
    ("飲料", "ミネラルウォーター 24本", 1200, 2500),
    ("飲料", "緑茶ティーバッグ 100袋", 600, 1800),
    ("日用品", "トイレットペーパー 12ロール", 500, 1200),
    ("日用品", "シャンプー 詰め替え", 400, 1500),
    ("日用品", "保存容器 10点セット", 800, 2500),
    ("家電", "LED電球 4個セット", 1000, 3000),
    ("家電", "ワイヤレスイヤホン", 2500, 25000),
    ("家電", "電源タップ 6口", 900, 3500),
    ("本", "技術書", 2000, 5500),
    ("本", "家計簿ノート", 500, 1500),
    ("ホビー", "ゲームソフト", 3000, 9800),
    ("ホビー", "ランニングシューズ", 5000, 18000),
]
ADJECTIVES = ["", "【限定】", "【人気】", "【新作】", "【訳あり】", "【まとめ買い】", "【送料無料】"]
VARIANTS = ["", " ブラック", " ホワイト", " Lサイズ", " Mサイズ", " お徳用", " 2個セット", " プレミアム"]


def round_yen(value: float, unit: int = 10) -> int:
    return int(round(value / unit) * unit)


# 画像はプレースホルダー画像の API から取得する。seed を変えると別の画像になる
IMAGE_API = "https://picsum.photos/seed/{seed}/400/400"
IMAGE_VARIATIONS = 1000  # 同じ URL が多いほどブラウザのキャッシュが効く


def image_url(rng: random.Random) -> str:
    return IMAGE_API.format(seed=f"product-{rng.randrange(IMAGE_VARIATIONS)}")


def make_product(rng: random.Random, created_at) -> dict:
    category, name, lo, hi = rng.choice(BASES)
    original_price = round_yen(rng.uniform(lo, hi))
    # 3 割くらいをセール品にする
    if rng.random() < 0.3:
        price = round_yen(original_price * rng.uniform(0.5, 0.9))
    else:
        price, original_price = original_price, None
    return {
        "name": f"{rng.choice(ADJECTIVES)}{name}{rng.choice(VARIANTS)}",
        "category": category,
        "price": price,
        "original_price": original_price,
        "rating": round(rng.uniform(2.5, 5.0), 1),
        "review_count": int(rng.paretovariate(1.2) * 10),
        "image_url": image_url(rng),
        "created_at": created_at,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--count", type=int, default=10_000, help="投入する件数 (既定: 10000)")
    parser.add_argument("--batch", type=int, default=10_000, help="1 回の insert_many で入れる件数")
    parser.add_argument("--seed", type=int, default=20261014, help="乱数のシード")
    args = parser.parse_args()

    rng = random.Random(args.seed)
    created_at = now()
    db.products.drop()
    # カテゴリで絞り込んだときも _id 順のカーソルページングが索引だけで済むようにする
    db.products.create_index([("category", 1), ("_id", 1)])

    started = time.monotonic()
    inserted = 0
    while inserted < args.count:
        size = min(args.batch, args.count - inserted)
        # ordered=False にするとサーバー側でまとめて書き込めるので速い
        db.products.insert_many((make_product(rng, created_at) for _ in range(size)), ordered=False)
        inserted += size
        elapsed = time.monotonic() - started
        print(f"\r商品: {inserted:,} / {args.count:,} 件 ({elapsed:.0f} 秒)", end="", flush=True)
    print()


if __name__ == "__main__":
    main()
