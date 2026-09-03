from fastapi import FastAPI, Query
from pydantic import BaseModel
from app.services.chat_service import chat_with_ai
from app.services.search_service import search_all
from app.services.prediction_service import (
    get_prediction_readiness,
    get_prediction_dashboard
)
from fastapi.middleware.cors import CORSMiddleware
from database import test_connection
from app.services.statistics_service import (
    get_overview_statistics,
    get_monthly_billing_trend,
    get_billing_insight,
    get_statistics_dashboard
)
app = FastAPI(
    title="Đức Vũ Tower AI Service",
    version="1.0.0"
)
class ChatRequest(BaseModel):
    message: str
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "success": True,
        "message": "Đức Vũ Tower AI Service"
    }


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "Duc Vu Tower AI",
        "status": "running"
    }


@app.get("/health/database")
def health_database():
    return test_connection()

@app.get("/ai/statistics/overview")
def ai_statistics_overview():
    return get_overview_statistics()


@app.get("/ai/statistics/billing-trend")
def ai_statistics_billing_trend():
    return get_monthly_billing_trend()

@app.get("/ai/statistics/insight")
def ai_statistics_insight():
    return get_billing_insight()

@app.get("/ai/statistics/dashboard")
def ai_statistics_dashboard():
    return get_statistics_dashboard()

@app.get("/ai/search")
def ai_search(q: str = Query(..., min_length=1)):
    return search_all(q)

@app.post("/ai/chat")
def ai_chat(request: ChatRequest):
    return chat_with_ai(request.message)

@app.get("/ai/prediction/readiness")
def ai_prediction_readiness():
    return get_prediction_readiness()

@app.get("/ai/prediction/dashboard")
def ai_prediction_dashboard():
    return get_prediction_dashboard()