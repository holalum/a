from fastapi import APIRouter, Depends, HTTPException

from ..deps import get_current_user
from ..models import User
from ..remnawave import delete_device, get_user_devices
from ..schemas import DeviceResponse

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("", response_model=list[DeviceResponse])
async def list_devices(user: User = Depends(get_current_user)):
    if not user.remnawave_uuid:
        return []
    devices = await get_user_devices(user.remnawave_uuid)
    return [
        DeviceResponse(
            hwid=d.get("hwid", ""),
            platform=d.get("platform"),
            device_model=d.get("deviceModel"),
            os_version=d.get("osVersion"),
        )
        for d in devices
    ]


@router.delete("/{hwid}", status_code=204)
async def remove_device(hwid: str, user: User = Depends(get_current_user)):
    if not user.remnawave_uuid:
        raise HTTPException(status_code=404, detail="no remnawave user")
    await delete_device(user.remnawave_uuid, hwid)