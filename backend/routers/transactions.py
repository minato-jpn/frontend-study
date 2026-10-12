import datetime as dt

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pymongo import ASCENDING, ReturnDocument

from db import db, now, parse_object_id, to_date, to_datetime
from schemas import Transaction, TransactionCreate, TransactionKind, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


def to_transaction(doc: dict) -> Transaction:
    category_id = doc.get("category_id")
    return Transaction(
        id=str(doc["_id"]),
        date=to_date(doc["date"]),
        kind=doc["kind"],
        amount=doc["amount"],
        category_id=str(category_id) if category_id is not None else None,
        place=doc.get("place"),
        memo=doc.get("memo"),
    )


def resolve_category(category_id: str | None, kind: str) -> ObjectId | None:
    """category_id と kind の整合性を確認する（外部キーが無いのでアプリ側で検証）"""
    if category_id is None:
        return None
    try:
        oid = ObjectId(category_id)
    except Exception:
        raise HTTPException(status_code=422, detail="categoryId が不正です")
    category = db.categories.find_one({"_id": oid})
    if category is None:
        raise HTTPException(status_code=422, detail="categoryId のカテゴリが存在しません")
    if category["kind"] != kind:
        raise HTTPException(status_code=422, detail="カテゴリの種類 (kind) が取引と一致しません")
    return oid


@router.get("", response_model=list[Transaction])
def list_transactions(
    from_: dt.date | None = Query(default=None, alias="from", description="この日以降 (含む)"),
    to: dt.date | None = Query(default=None, description="この日以前 (含む)"),
    kind: TransactionKind | None = None,
    category_id: str | None = Query(
        default=None, alias="categoryId", description='"none" を指定すると未分類のみ'
    ),
):
    query: dict = {}
    date_range: dict = {}
    if from_ is not None:
        date_range["$gte"] = to_datetime(from_)
    if to is not None:
        date_range["$lte"] = to_datetime(to)
    if date_range:
        query["date"] = date_range
    if kind is not None:
        query["kind"] = kind
    if category_id == "none":
        query["category_id"] = None
    elif category_id is not None:
        query["category_id"] = parse_object_id(category_id, "カテゴリ")
    docs = db.transactions.find(query).sort([("date", ASCENDING), ("_id", ASCENDING)])
    return [to_transaction(doc) for doc in docs]


@router.get("/{transaction_id}", response_model=Transaction)
def get_transaction(transaction_id: str):
    doc = db.transactions.find_one({"_id": parse_object_id(transaction_id, "取引")})
    if doc is None:
        raise HTTPException(status_code=404, detail="取引が見つかりません")
    return to_transaction(doc)


@router.post("", response_model=Transaction, status_code=201)
def create_transaction(body: TransactionCreate):
    doc = {
        "date": to_datetime(body.date),
        "kind": body.kind,
        "amount": body.amount,
        "category_id": resolve_category(body.category_id, body.kind),
        "place": body.place,
        "memo": body.memo,
        "created_at": now(),
    }
    result = db.transactions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return to_transaction(doc)


@router.patch("/{transaction_id}", response_model=Transaction)
def update_transaction(transaction_id: str, body: TransactionUpdate):
    oid = parse_object_id(transaction_id, "取引")
    current = db.transactions.find_one({"_id": oid})
    if current is None:
        raise HTTPException(status_code=404, detail="取引が見つかりません")

    sent = body.model_fields_set
    changes: dict = {}
    for field in ("kind", "amount", "date"):
        if field in sent and getattr(body, field) is None:
            raise HTTPException(status_code=422, detail=f"{field} に null は指定できません")
    if body.date is not None:
        changes["date"] = to_datetime(body.date)
    if body.kind is not None:
        changes["kind"] = body.kind
    if body.amount is not None:
        changes["amount"] = body.amount
    for field in ("place", "memo"):
        if field in sent:
            changes[field] = getattr(body, field)

    # kind かカテゴリが変わるときは、更新後の組み合わせで整合性を確認する
    kind = changes.get("kind", current["kind"])
    if "category_id" in sent:
        changes["category_id"] = resolve_category(body.category_id, kind)
    elif "kind" in changes and current.get("category_id") is not None:
        resolve_category(str(current["category_id"]), kind)

    if not changes:
        return to_transaction(current)
    doc = db.transactions.find_one_and_update(
        {"_id": oid}, {"$set": changes}, return_document=ReturnDocument.AFTER
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="取引が見つかりません")
    return to_transaction(doc)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: str):
    result = db.transactions.delete_one({"_id": parse_object_id(transaction_id, "取引")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="取引が見つかりません")
