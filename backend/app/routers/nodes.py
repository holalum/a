"""
GET /nodes — список серверов из Remnawave
"""
from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..models import User
from ..remnawave import get_nodes
from ..schemas import NodeResponse

router = APIRouter(prefix="/nodes", tags=["nodes"])

# ISO → флаг-эмодзи
def _flag(code: str) -> str:
    code = (code or "").upper()[:2]
    if len(code) != 2:
        return "🌍"
    return chr(0x1F1E6 + ord(code[0]) - 65) + chr(0x1F1E6 + ord(code[1]) - 65)


@router.get("", response_model=list[NodeResponse])
async def list_nodes(_: User = Depends(get_current_user)):
    nodes = await get_nodes()
    return [
        NodeResponse(
            uuid=n["uuid"],
            name=n.get("name", ""),
            country_code=n.get("countryCode", ""),
            flag=_flag(n.get("countryCode", "")),
            is_connected=n.get("isConnected", False),
            is_disabled=n.get("isDisabled", False),
            users_online=n.get("usersOnline", 0),
        )
        for n in nodes
        if not n.get("isDisabled")
    ]
