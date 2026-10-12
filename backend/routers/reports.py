import datetime as dt

from fastapi import APIRouter, HTTPException, Query

from db import db, to_date, to_datetime
from schemas import CategoryTotal, DailyReport, SummaryReport

router = APIRouter(prefix="/reports", tags=["reports"])

DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"]


def date_range_match(from_: dt.date, to: dt.date) -> dict:
    if from_ > to:
        raise HTTPException(status_code=422, detail="from は to 以前の日付にしてください")
    return {"date": {"$gte": to_datetime(from_), "$lte": to_datetime(to)}}


@router.get("/daily", response_model=list[DailyReport])
def daily_report(
    from_: dt.date = Query(alias="from"),
    to: dt.date = Query(),
    opening_balance: int = Query(
        default=0, alias="openingBalance", description="from の開始時点の預金残高"
    ),
):
    """取引のあった日ごとに収入・支出・その日の終わりの残高を返す"""
    rows = db.transactions.aggregate(
        [
            {"$match": date_range_match(from_, to)},
            {"$group": {"_id": {"date": "$date", "kind": "$kind"}, "amount": {"$sum": "$amount"}}},
        ]
    )
    by_date: dict[dt.date, dict[str, int]] = {}
    for row in rows:
        totals = by_date.setdefault(to_date(row["_id"]["date"]), {"income": 0, "payment": 0})
        totals[row["_id"]["kind"]] += row["amount"]

    deposit = opening_balance
    reports: list[DailyReport] = []
    for date in sorted(by_date):
        income, payment = by_date[date]["income"], by_date[date]["payment"]
        deposit += income - payment
        reports.append(
            DailyReport(
                date=date,
                # isoweekday: 月=1 … 日=7 → 日=0 … 土=6
                day=DAYS[date.isoweekday() % 7],
                deposit=deposit,
                income=income,
                payment=payment,
            )
        )
    return reports


@router.get("/summary", response_model=SummaryReport)
def summary_report(from_: dt.date = Query(alias="from"), to: dt.date = Query()):
    """期間内の収入・支出の合計とカテゴリ別の合計を返す"""
    rows = list(
        db.transactions.aggregate(
            [
                {"$match": date_range_match(from_, to)},
                {
                    "$group": {
                        "_id": {"category_id": "$category_id", "kind": "$kind"},
                        "amount": {"$sum": "$amount"},
                    }
                },
            ]
        )
    )
    category_ids = [row["_id"]["category_id"] for row in rows if row["_id"].get("category_id")]
    categories = {doc["_id"]: doc for doc in db.categories.find({"_id": {"$in": category_ids}})}

    by_category: list[tuple[tuple, CategoryTotal]] = []
    for row in rows:
        category_id = row["_id"].get("category_id")
        category = categories.get(category_id) if category_id is not None else None
        total = CategoryTotal(
            category_id=str(category_id) if category_id is not None else None,
            name=category["name"] if category else "未分類",
            kind=row["_id"]["kind"],
            amount=row["amount"],
        )
        # 種類 → カテゴリの並び順 → 未分類は最後
        sort_key = (total.kind, category is None, category["sort_order"] if category else 0)
        by_category.append((sort_key, total))
    by_category.sort(key=lambda pair: pair[0])

    income = sum(t.amount for _, t in by_category if t.kind == "income")
    payment = sum(t.amount for _, t in by_category if t.kind == "payment")
    return SummaryReport(
        from_=from_,
        to=to,
        income=income,
        payment=payment,
        balance=income - payment,
        by_category=[t for _, t in by_category],
    )
