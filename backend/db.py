import os
from datetime import UTC, date, datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from pymongo import MongoClient

MONGODB_URL = os.environ.get(
    "MONGODB_URL",
    "mongodb://household:household@localhost:27017/household_account_book?authSource=admin",
)

client = MongoClient(MONGODB_URL, tz_aware=True)
db = client.get_default_database()


def parse_object_id(value: str, label: str = "id") -> ObjectId:
    """24 桁の16進文字列を ObjectId に変換する。不正な値は 404 として扱う"""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail=f"{label}が見つかりません")


def to_datetime(d: date) -> datetime:
    """日付のみの値は UTC の 0 時として保存する（スキーマのコメント参照）"""
    return datetime(d.year, d.month, d.day, tzinfo=UTC)


def to_date(dt: datetime) -> date:
    return dt.astimezone(UTC).date()


def now() -> datetime:
    return datetime.now(UTC)
