"""
HTTP-клиент для Remnawave API.
Все методы возвращают Python-объекты (dict/list/None).
На 404 возвращают None, на другие ошибки — бросают HTTPException.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import HTTPException, status

from .config import settings

HEADERS = {
    "Authorization": f"Bearer {settings.REMNAWAVE_API_TOKEN}",
    "Content-Type": "application/json",
}


async def _request(method: str, path: str, **kwargs: Any) -> Any:
    url = settings.REMNAWAVE_BASE_URL.rstrip("/") + path
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.request(method, url, headers=HEADERS, **kwargs)
    if r.status_code == 404:
        return None
    if r.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Remnawave error {r.status_code}: {r.text[:200]}",
        )
    return r.json().get("response")


# --- Пользователи ---

async def get_user_by_telegram_id(telegram_id: int) -> dict | None:
    return await _request("GET", f"/api/users/by-telegram-id/{telegram_id}")


async def create_user(telegram_id: int, username: str, trial_days: int, device_limit: int) -> dict:
    expire_at = (datetime.now(timezone.utc) + timedelta(days=trial_days)).isoformat()
    body = {
        "username": username,
        "expireAt": expire_at,
        "telegramId": telegram_id,
        "trafficLimitBytes": 0,
        "trafficLimitStrategy": "NO_RESET",
        "hwidDeviceLimit": device_limit,
        "status": "ACTIVE",
    }
    result = await _request("POST", "/api/users", json=body)
    if result is None:
        raise HTTPException(status_code=502, detail="Failed to create Remnawave user")
    return result


async def extend_user(remnawave_uuid: str, days: int, current_expire_at: str) -> dict:
    current = datetime.fromisoformat(current_expire_at.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    base = max(current, now)  # продлеваем от текущей даты, если уже истекло
    new_expire = (base + timedelta(days=days)).isoformat()
    result = await _request("PATCH", "/api/users", json={"uuid": remnawave_uuid, "expireAt": new_expire})
    if result is None:
        raise HTTPException(status_code=502, detail="Failed to extend user")
    return result


async def disable_user(remnawave_uuid: str) -> None:
    await _request("POST", f"/api/users/{remnawave_uuid}/actions/disable")


async def enable_user(remnawave_uuid: str) -> None:
    await _request("POST", f"/api/users/{remnawave_uuid}/actions/enable")


# --- Устройства (HWID) ---

async def get_user_devices(remnawave_uuid: str) -> list[dict]:
    result = await _request("GET", f"/api/hwid/devices/{remnawave_uuid}")
    if result is None:
        return []
    return result.get("devices", [])


async def delete_device(remnawave_uuid: str, hwid: str) -> None:
    await _request("POST", "/api/hwid/devices/delete", json={"userUuid": remnawave_uuid, "hwid": hwid})


async def delete_all_devices(remnawave_uuid: str) -> None:
    await _request("POST", "/api/hwid/devices/delete-all", json={"userUuid": remnawave_uuid})


# --- Ноды ---

async def get_nodes() -> list[dict]:
    result = await _request("GET", "/api/nodes")
    if result is None:
        return []
    # response может быть массивом напрямую
    return result if isinstance(result, list) else []
