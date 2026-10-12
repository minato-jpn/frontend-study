import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db import client, db
from routers import budgets, categories, reports, transactions

# フロントエンド (Vite) の開発サーバーからのアクセスを許可する。カンマ区切りで複数指定できる
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

app = FastAPI(title="HouseHoldAccountBook API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(reports.router)


@app.get("/health/db")
def health_db():
    db.command("ping")
    version = client.server_info()["version"]
    return {"status": "ok", "mongodb": version}
