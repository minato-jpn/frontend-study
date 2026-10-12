# API の入出力の型
# フロントエンド (TypeScript) に合わせて JSON のキーは camelCase、id は 24 桁の16進文字列、日付は "YYYY-MM-DD"
import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

TransactionKind = Literal["income", "payment"]
PeriodType = Literal["daily", "monthly"]
DayOfWeek = Literal["sun", "mon", "tue", "wed", "thu", "fri", "sat"]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---- categories ----


class Category(CamelModel):
    id: str
    name: str
    kind: TransactionKind
    sort_order: int
    is_active: bool


class CategoryCreate(CamelModel):
    name: str = Field(min_length=1)
    kind: TransactionKind
    sort_order: int = 0


class CategoryUpdate(CamelModel):
    # kind は既存の取引との整合性が崩れるので変更不可
    name: str | None = Field(default=None, min_length=1)
    sort_order: int | None = None
    is_active: bool | None = None


# ---- transactions ----


class Transaction(CamelModel):
    id: str
    date: dt.date
    kind: TransactionKind
    amount: int
    category_id: str | None  # null は未分類
    place: str | None  # どこで使ったか / どこから入ったか
    memo: str | None


class TransactionCreate(CamelModel):
    date: dt.date
    kind: TransactionKind
    amount: int = Field(ge=0)
    category_id: str | None = None
    place: str | None = None
    memo: str | None = None


class TransactionUpdate(CamelModel):
    # 送ったキーだけ更新する。categoryId / place / memo は null を送ると空にできる
    date: dt.date | None = None
    kind: TransactionKind | None = None
    amount: int | None = Field(default=None, ge=0)
    category_id: str | None = None
    place: str | None = None
    memo: str | None = None


# ---- budgets ----


class Budget(CamelModel):
    id: str
    category_id: str | None  # null は全体の目標
    period_type: PeriodType
    amount: int
    start_date: dt.date


class BudgetCreate(CamelModel):
    category_id: str | None = None
    period_type: PeriodType
    amount: int = Field(ge=0)
    start_date: dt.date


# ---- reports ----


class DailyReport(CamelModel):
    date: dt.date
    day: DayOfWeek
    deposit: int  # その日の終わり時点の預金残高
    income: int
    payment: int


class CategoryTotal(CamelModel):
    category_id: str | None  # null は未分類
    name: str  # 未分類のときは "未分類"
    kind: TransactionKind
    amount: int


class SummaryReport(CamelModel):
    from_: dt.date = Field(alias="from")
    to: dt.date
    income: int
    payment: int
    balance: int  # income - payment
    by_category: list[CategoryTotal]
