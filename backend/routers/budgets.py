import datetime as dt

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError

from db import db, now, parse_object_id, to_date, to_datetime
from schemas import Budget, BudgetCreate, PeriodType

router = APIRouter(prefix="/budgets", tags=["budgets"])


def to_budget(doc: dict) -> Budget:
    category_id = doc.get("category_id")
    return Budget(
        id=str(doc["_id"]),
        category_id=str(category_id) if category_id is not None else None,
        period_type=doc["period_type"],
        amount=doc["amount"],
        start_date=to_date(doc["start_date"]),
    )


def category_filter(category_id: str | None) -> dict:
    # "none" は全体の目標 (category_id = null)
    if category_id is None:
        return {}
    if category_id == "none":
        return {"category_id": None}
    return {"category_id": parse_object_id(category_id, "カテゴリ")}


@router.get("", response_model=list[Budget])
def list_budgets(
    category_id: str | None = Query(
        default=None, alias="categoryId", description='"none" を指定すると全体の目標のみ'
    ),
    period_type: PeriodType | None = Query(default=None, alias="periodType"),
):
    """目標額の履歴をすべて返す"""
    query = category_filter(category_id)
    if period_type is not None:
        query["period_type"] = period_type
    docs = db.budgets.find(query).sort([("start_date", ASCENDING), ("_id", ASCENDING)])
    return [to_budget(doc) for doc in docs]


@router.get("/effective", response_model=list[Budget])
def list_effective_budgets(
    date: dt.date = Query(description="この日に有効な目標を返す"),
    period_type: PeriodType | None = Query(default=None, alias="periodType"),
):
    """カテゴリ × 期間種別ごとに「start_date <= date で最も新しい」目標を返す"""
    match: dict = {"start_date": {"$lte": to_datetime(date)}}
    if period_type is not None:
        match["period_type"] = period_type
    docs = db.budgets.aggregate(
        [
            {"$match": match},
            {"$sort": {"start_date": DESCENDING}},
            {
                "$group": {
                    "_id": {"category_id": "$category_id", "period_type": "$period_type"},
                    "doc": {"$first": "$$ROOT"},
                }
            },
            {"$replaceRoot": {"newRoot": "$doc"}},
            {"$sort": {"period_type": ASCENDING, "category_id": ASCENDING}},
        ]
    )
    return [to_budget(doc) for doc in docs]


@router.post("", response_model=Budget, status_code=201)
def create_budget(body: BudgetCreate):
    category_oid: ObjectId | None = None
    if body.category_id is not None:
        category_oid = parse_object_id(body.category_id, "カテゴリ")
        if db.categories.find_one({"_id": category_oid}) is None:
            raise HTTPException(status_code=422, detail="categoryId のカテゴリが存在しません")
    doc = {
        "category_id": category_oid,
        "period_type": body.period_type,
        "amount": body.amount,
        "start_date": to_datetime(body.start_date),
        "created_at": now(),
    }
    try:
        result = db.budgets.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409, detail="同じカテゴリ・期間種別・開始日の目標が既にあります"
        )
    doc["_id"] = result.inserted_id
    return to_budget(doc)


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: str):
    result = db.budgets.delete_one({"_id": parse_object_id(budget_id, "目標")})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="目標が見つかりません")
