from fastapi import APIRouter, HTTPException, Query
from pymongo import ASCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError

from db import db, now, parse_object_id
from schemas import Category, CategoryCreate, CategoryUpdate, TransactionKind

router = APIRouter(prefix="/categories", tags=["categories"])


def to_category(doc: dict) -> Category:
    return Category(
        id=str(doc["_id"]),
        name=doc["name"],
        kind=doc["kind"],
        sort_order=doc["sort_order"],
        is_active=doc["is_active"],
    )


@router.get("", response_model=list[Category])
def list_categories(
    kind: TransactionKind | None = None,
    include_inactive: bool = Query(default=False, alias="includeInactive"),
):
    query: dict = {}
    if kind is not None:
        query["kind"] = kind
    if not include_inactive:
        query["is_active"] = True
    docs = db.categories.find(query).sort(
        [("kind", ASCENDING), ("sort_order", ASCENDING), ("_id", ASCENDING)]
    )
    return [to_category(doc) for doc in docs]


@router.get("/{category_id}", response_model=Category)
def get_category(category_id: str):
    doc = db.categories.find_one({"_id": parse_object_id(category_id, "カテゴリ")})
    if doc is None:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")
    return to_category(doc)


@router.post("", response_model=Category, status_code=201)
def create_category(body: CategoryCreate):
    doc = {
        "name": body.name,
        "kind": body.kind,
        "sort_order": body.sort_order,
        "is_active": True,
        "created_at": now(),
    }
    try:
        result = db.categories.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="同じ名前・種類のカテゴリが既にあります")
    doc["_id"] = result.inserted_id
    return to_category(doc)


@router.patch("/{category_id}", response_model=Category)
def update_category(category_id: str, body: CategoryUpdate):
    oid = parse_object_id(category_id, "カテゴリ")
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    try:
        if changes:
            doc = db.categories.find_one_and_update(
                {"_id": oid}, {"$set": changes}, return_document=ReturnDocument.AFTER
            )
        else:
            doc = db.categories.find_one({"_id": oid})
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="同じ名前・種類のカテゴリが既にあります")
    if doc is None:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")
    return to_category(doc)


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: str):
    # 過去の取引が参照しているので物理削除はせず is_active = false にする
    result = db.categories.update_one(
        {"_id": parse_object_id(category_id, "カテゴリ")}, {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="カテゴリが見つかりません")
