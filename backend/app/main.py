from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, balance, devices, me, nodes, plans, referrals, wheel


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Harmony VPN API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [auth.router, me.router, devices.router, nodes.router, plans.router, balance.router, referrals.router, wheel.router]:
    app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
