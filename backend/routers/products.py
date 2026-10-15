from collections import OrderedDict

import httpx
from fastapi import APIRouter, HTTPException, Query, Response
from pymongo import ASCENDING

from db import db, parse_object_id
from schemas import Product, ProductPage

router = APIRouter(prefix="/products", tags=["products"])

# 画像の取得元への接続を使い回す。終了時に main.py の lifespan で閉じる
image_client = httpx.AsyncClient(follow_redirects=True, timeout=10)

# 画像の中身・枚数・大きさは分からない前提で扱う。
# 取得元からの取得は 1 枚 0.4 秒ほどかかるので、取ってきた画像をメモリに置いておく。
# 商品 ID ではなく取得元の URL ごとに持つので、同じ画像を使う商品どうしで共有できる。
# 全体の上限を超えたら長く使われていないものから捨てる
IMAGE_CACHE_MAX_BYTES = 64 * 1024 * 1024
# 大きな画像を置くと少数でキャッシュが埋まり、他の画像が追い出されるので、置くのは小さいものだけにする
IMAGE_CACHE_MAX_ITEM_BYTES = 1024 * 1024
# 極端に大きな画像を丸ごとメモリに読み込まないよう、これを超えたら取得を打ち切る
IMAGE_MAX_BYTES = 10 * 1024 * 1024
image_cache: OrderedDict[str, tuple[bytes, str]] = OrderedDict()
image_cache_bytes = 0


class ImageTooLargeError(Exception):
    pass


async def download_image(url: str) -> tuple[bytes, str]:
    async with image_client.stream("GET", url) as upstream:
        upstream.raise_for_status()
        # Content-Length が分かるときは、読み始める前に判定する
        if int(upstream.headers.get("content-length", 0)) > IMAGE_MAX_BYTES:
            raise ImageTooLargeError
        chunks = []
        size = 0
        async for chunk in upstream.aiter_bytes():
            size += len(chunk)
            if size > IMAGE_MAX_BYTES:
                raise ImageTooLargeError
            chunks.append(chunk)
        return b"".join(chunks), upstream.headers.get("content-type", "image/jpeg")


async def fetch_image(url: str) -> tuple[bytes, str]:
    global image_cache_bytes
    if url in image_cache:
        image_cache.move_to_end(url)
        return image_cache[url]
    image = await download_image(url)
    if len(image[0]) <= IMAGE_CACHE_MAX_ITEM_BYTES:
        image_cache[url] = image
        image_cache_bytes += len(image[0])
        while image_cache_bytes > IMAGE_CACHE_MAX_BYTES:
            _, (content, _) = image_cache.popitem(last=False)
            image_cache_bytes -= len(content)
    return image


def to_product(doc: dict) -> Product:
    return Product(
        id=str(doc["_id"]),
        name=doc["name"],
        category=doc["category"],
        price=doc["price"],
        original_price=doc.get("original_price"),
        rating=doc["rating"],
        review_count=doc["review_count"],
    )


@router.get("", response_model=ProductPage)
def list_products(
    limit: int = Query(default=50, ge=1, le=1000),
    after: str | None = Query(default=None, description="前のページの nextCursor"),
    category: str | None = None,
):
    # 件数が多いので skip ではなく _id のカーソルでページングする（何ページ目でも速度が落ちない）
    query: dict = {}
    if after is not None:
        query["_id"] = {"$gt": parse_object_id(after, "カーソル")}
    if category is not None:
        query["category"] = category
    # 1 件多く取って、次のページがあるかを判定する
    docs = list(db.products.find(query).sort("_id", ASCENDING).limit(limit + 1))
    has_next = len(docs) > limit
    docs = docs[:limit]
    return ProductPage(
        items=[to_product(doc) for doc in docs],
        next_cursor=str(docs[-1]["_id"]) if has_next else None,
    )


@router.get("/count")
def count_products():
    # count_documents は全件を数えるので、メタデータから概算の件数を返す
    return {"count": db.products.estimated_document_count()}


@router.get("/{product_id}", response_model=Product)
def get_product(product_id: str):
    doc = db.products.find_one({"_id": parse_object_id(product_id, "商品")})
    if doc is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    return to_product(doc)


@router.get(
    "/{product_id}/image",
    response_class=Response,
    responses={200: {"content": {"image/*": {}}, "description": "商品画像"}},
)
async def get_product_image(product_id: str):
    # DB には画像の URL だけを持ち、画像そのものは取得元から取ってきて返す
    doc = db.products.find_one({"_id": parse_object_id(product_id, "商品")}, {"image_url": 1})
    if doc is None:
        raise HTTPException(status_code=404, detail="商品が見つかりません")
    try:
        content, media_type = await fetch_image(doc["image_url"])
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="画像の取得に失敗しました")
    except ImageTooLargeError:
        raise HTTPException(status_code=502, detail="画像が大きすぎます")
    return Response(
        content=content,
        media_type=media_type,
        # 同じ商品の画像は変わらないので、ブラウザに 1 日キャッシュさせる
        headers={"Cache-Control": "public, max-age=86400"},
    )
