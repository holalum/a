"""Multi-user Telegram message tracker service.

Users talk to a single control bot. The bot walks each user through MTProto
login (phone -> code -> optional 2FA), stores the resulting StringSession, and
spawns a per-user Telethon listener that reports edits/deletions back to the
user via the same bot.

SECURITY WARNING: a saved StringSession grants full access to a user's
Telegram account. Run only on infrastructure you trust and treat service.db
like a secret-key store.
"""

from __future__ import annotations

import asyncio
import html
import logging
import os
import sqlite3
import time
from contextlib import closing
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from telethon import TelegramClient, events
from telethon.errors import (
    FloodWaitError,
    PhoneCodeExpiredError,
    PhoneCodeInvalidError,
    PhoneNumberInvalidError,
    SessionPasswordNeededError,
)
from telethon.sessions import StringSession
from telethon.tl.types import (
    MessageMediaDocument,
    MessageMediaPhoto,
    MessageMediaWebPage,
    PeerChannel,
    PeerChat,
    PeerUser,
)

load_dotenv()

API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
BOT_TOKEN = os.environ["BOT_TOKEN"]
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "7"))

ROOT = Path(__file__).parent
DB_PATH = ROOT / "service.db"
BOT_SESSION = ROOT / "service-bot.session"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("service")


# --------------------------------------------------------------------------- #
# storage                                                                     #
# --------------------------------------------------------------------------- #

def init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, isolation_level=None, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            tg_user_id  INTEGER PRIMARY KEY,
            session     TEXT    NOT NULL,
            phone       TEXT,
            created_at  INTEGER NOT NULL,
            enabled     INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS messages (
            owner_id    INTEGER NOT NULL,
            chat_id     INTEGER NOT NULL,
            message_id  INTEGER NOT NULL,
            sender_id   INTEGER,
            text        TEXT,
            media       TEXT,
            ts          INTEGER NOT NULL,
            PRIMARY KEY (owner_id, chat_id, message_id)
        );
        CREATE INDEX IF NOT EXISTS idx_msg_owner_ts ON messages(owner_id, ts);
        CREATE INDEX IF NOT EXISTS idx_msg_owner_mid ON messages(owner_id, message_id);
        """
    )
    return conn


# --------------------------------------------------------------------------- #
# helpers                                                                     #
# --------------------------------------------------------------------------- #

def describe_media(message) -> Optional[str]:
    m = message.media
    if m is None:
        return None
    if isinstance(m, MessageMediaPhoto):
        return "photo"
    if isinstance(m, MessageMediaDocument):
        doc = m.document
        if doc and doc.mime_type:
            return f"document ({doc.mime_type})"
        return "document"
    if isinstance(m, MessageMediaWebPage):
        return None
    return type(m).__name__


def peer_id(peer) -> int:
    if isinstance(peer, PeerUser):
        return peer.user_id
    if isinstance(peer, PeerChat):
        return -peer.chat_id
    if isinstance(peer, PeerChannel):
        return int(f"-100{peer.channel_id}")
    return int(peer)


def esc(text: Optional[str]) -> str:
    if not text:
        return "<i>(empty)</i>"
    return html.escape(text)


async def format_chat(client: TelegramClient, chat_id: int) -> str:
    try:
        entity = await client.get_entity(chat_id)
    except Exception:
        return f"chat {chat_id}"
    title = getattr(entity, "title", None)
    if title:
        return f"«{title}»"
    name = " ".join(filter(None, [getattr(entity, "first_name", None), getattr(entity, "last_name", None)]))
    uname = getattr(entity, "username", None)
    if uname:
        return f"{name or uname} (@{uname})"
    return name or f"user {chat_id}"


async def format_sender(client: TelegramClient, sender_id: Optional[int]) -> str:
    if sender_id is None:
        return "unknown"
    try:
        entity = await client.get_entity(sender_id)
    except Exception:
        return f"id {sender_id}"
    name = " ".join(filter(None, [getattr(entity, "first_name", None), getattr(entity, "last_name", None)]))
    uname = getattr(entity, "username", None)
    if uname:
        return f"{name or uname} (@{uname})"
    return name or f"id {sender_id}"


# --------------------------------------------------------------------------- #
# per-user listener                                                           #
# --------------------------------------------------------------------------- #

@dataclass
class Listener:
    tg_user_id: int
    client: TelegramClient
    task: asyncio.Task
    own_id: int


async def start_listener(
    tg_user_id: int,
    session_str: str,
    conn: sqlite3.Connection,
    bot: TelegramClient,
) -> Listener:
    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()
    if not await client.is_user_authorized():
        raise RuntimeError("session no longer authorized")
    me = await client.get_me()

    async def notify(text: str) -> None:
        try:
            await bot.send_message(tg_user_id, text, parse_mode="html", link_preview=False)
        except Exception:
            log.exception("notify failed for %s", tg_user_id)

    @client.on(events.NewMessage(incoming=True, outgoing=True))
    async def on_new(event):
        msg = event.message
        chat_id = peer_id(msg.peer_id)
        conn.execute(
            "INSERT OR REPLACE INTO messages(owner_id, chat_id, message_id, sender_id, text, media, ts) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (tg_user_id, chat_id, msg.id, msg.sender_id, msg.message or "", describe_media(msg), int(time.time())),
        )

    @client.on(events.MessageEdited())
    async def on_edit(event):
        msg = event.message
        chat_id = peer_id(msg.peer_id)
        new_text = msg.message or ""

        if msg.sender_id == me.id:
            conn.execute(
                "UPDATE messages SET text=?, media=? WHERE owner_id=? AND chat_id=? AND message_id=?",
                (new_text, describe_media(msg), tg_user_id, chat_id, msg.id),
            )
            return

        with closing(conn.cursor()) as cur:
            cur.execute(
                "SELECT text FROM messages WHERE owner_id=? AND chat_id=? AND message_id=?",
                (tg_user_id, chat_id, msg.id),
            )
            row = cur.fetchone()
        old_text = row[0] if row else None
        if old_text == new_text:
            return

        chat_name = await format_chat(client, chat_id)
        sender_name = await format_sender(client, msg.sender_id)
        body = (
            f"✏️ <b>Edited</b> in {esc(chat_name)}\n"
            f"From: {esc(sender_name)}\n\n"
            f"<b>Was:</b>\n{esc(old_text) if old_text is not None else '<i>(not in cache)</i>'}\n\n"
            f"<b>Now:</b>\n{esc(new_text)}"
        )
        await notify(body)

        conn.execute(
            "UPDATE messages SET text=?, media=? WHERE owner_id=? AND chat_id=? AND message_id=?",
            (new_text, describe_media(msg), tg_user_id, chat_id, msg.id),
        )

    @client.on(events.MessageDeleted())
    async def on_delete(event):
        explicit_chat = peer_id(event.peer) if event.peer else None
        for mid in event.deleted_ids:
            with closing(conn.cursor()) as cur:
                if explicit_chat is not None:
                    cur.execute(
                        "SELECT chat_id, sender_id, text, media FROM messages "
                        "WHERE owner_id=? AND chat_id=? AND message_id=?",
                        (tg_user_id, explicit_chat, mid),
                    )
                else:
                    cur.execute(
                        "SELECT chat_id, sender_id, text, media FROM messages "
                        "WHERE owner_id=? AND message_id=?",
                        (tg_user_id, mid),
                    )
                rows = cur.fetchall()
            for row in rows:
                row_chat_id, sender_id, text, media = row
                if sender_id == me.id:
                    continue
                chat_name = await format_chat(client, row_chat_id)
                sender_name = await format_sender(client, sender_id)
                body = f"🗑 <b>Deleted</b> in {esc(chat_name)}\nFrom: {esc(sender_name)}\n\n{esc(text)}"
                if media:
                    body += f"\n\n<i>[had {esc(media)}]</i>"
                await notify(body)

    async def run():
        try:
            await client.run_until_disconnected()
        except Exception:
            log.exception("listener for %s crashed", tg_user_id)

    task = asyncio.create_task(run(), name=f"listener-{tg_user_id}")
    log.info("listener started for tg_user_id=%s (account id=%s)", tg_user_id, me.id)
    return Listener(tg_user_id=tg_user_id, client=client, task=task, own_id=me.id)


# --------------------------------------------------------------------------- #
# control bot                                                                 #
# --------------------------------------------------------------------------- #

class Service:
    def __init__(self, conn: sqlite3.Connection, bot: TelegramClient) -> None:
        self.conn = conn
        self.bot = bot
        self.listeners: dict[int, Listener] = {}
        # pending[user_id] -> {step, client, phone, phone_code_hash}
        self.pending: dict[int, dict] = {}

    async def start_all(self) -> None:
        with closing(self.conn.cursor()) as cur:
            cur.execute("SELECT tg_user_id, session FROM users WHERE enabled=1")
            rows = cur.fetchall()
        for uid, session in rows:
            try:
                listener = await start_listener(uid, session, self.conn, self.bot)
                self.listeners[uid] = listener
            except Exception:
                log.exception("failed to start listener for %s", uid)

    async def stop_listener(self, uid: int) -> None:
        listener = self.listeners.pop(uid, None)
        if not listener:
            return
        await listener.client.disconnect()
        listener.task.cancel()

    async def handle(self, event) -> None:
        uid = event.sender_id
        text = (event.raw_text or "").strip()

        if text.startswith("/start"):
            await self._send_help(event)
            return
        if text.startswith("/help"):
            await self._send_help(event)
            return
        if text.startswith("/status"):
            await self._send_status(event)
            return
        if text.startswith("/logout"):
            await self._logout(event)
            return
        if text.startswith("/login"):
            await self._begin_login(event)
            return
        if text.startswith("/cancel"):
            self.pending.pop(uid, None)
            await event.reply("Login cancelled.")
            return

        # In-flow input.
        state = self.pending.get(uid)
        if state:
            await self._advance_login(event, state)
            return

        await event.reply("Type /login to connect your account, or /help.")

    async def _send_help(self, event) -> None:
        await event.reply(
            "<b>Telegram message tracker</b>\n\n"
            "I notify you whenever someone <b>edits</b> or <b>deletes</b> a "
            "message in your chats.\n\n"
            "<b>How</b>: I log into your Telegram account via MTProto and watch "
            "for those events. This means you'll have to share a login code "
            "with me — and you're trusting this server with full access to "
            "your account. Only continue if you trust the operator.\n\n"
            "<b>Commands</b>\n"
            "/login — connect your account\n"
            "/status — check connection\n"
            "/logout — disconnect and wipe my session for you\n"
            "/cancel — abort an in-progress login",
            parse_mode="html",
        )

    async def _send_status(self, event) -> None:
        uid = event.sender_id
        if uid in self.listeners:
            await event.reply("✅ Connected. Tracking your account.")
        else:
            await event.reply("❌ Not connected. Use /login.")

    async def _logout(self, event) -> None:
        uid = event.sender_id
        await self.stop_listener(uid)
        self.conn.execute("DELETE FROM users WHERE tg_user_id=?", (uid,))
        self.conn.execute("DELETE FROM messages WHERE owner_id=?", (uid,))
        self.pending.pop(uid, None)
        await event.reply("Logged out. Session forgotten.")

    async def _begin_login(self, event) -> None:
        uid = event.sender_id
        if uid in self.listeners:
            await event.reply("You're already connected. Use /logout first if you want to re-link.")
            return
        client = TelegramClient(StringSession(), API_ID, API_HASH)
        await client.connect()
        self.pending[uid] = {"step": "phone", "client": client}
        await event.reply(
            "Send your phone number in international format, e.g. <code>+15551234567</code>.\n"
            "Use /cancel to abort.",
            parse_mode="html",
        )

    async def _advance_login(self, event, state: dict) -> None:
        uid = event.sender_id
        text = event.raw_text.strip()
        step = state["step"]
        client: TelegramClient = state["client"]

        if step == "phone":
            phone = text.replace(" ", "")
            try:
                sent = await client.send_code_request(phone)
            except PhoneNumberInvalidError:
                await event.reply("Phone number looks invalid. Try again or /cancel.")
                return
            except FloodWaitError as e:
                await event.reply(f"Telegram says wait {e.seconds}s. /cancel and try later.")
                return
            state.update(step="code", phone=phone, phone_code_hash=sent.phone_code_hash)
            await event.reply(
                "Code sent. Reply with it — but <b>insert spaces between digits</b> "
                "(e.g. <code>1 2 3 4 5</code>), otherwise Telegram will invalidate the code "
                "for security reasons.",
                parse_mode="html",
            )
            return

        if step == "code":
            code = "".join(ch for ch in text if ch.isdigit())
            try:
                await client.sign_in(state["phone"], code, phone_code_hash=state["phone_code_hash"])
            except SessionPasswordNeededError:
                state["step"] = "password"
                await event.reply("Two-step verification password needed. Send it now.")
                return
            except PhoneCodeInvalidError:
                await event.reply("Wrong code. Try again or /cancel.")
                return
            except PhoneCodeExpiredError:
                await event.reply("Code expired. /login again.")
                self.pending.pop(uid, None)
                return
            except Exception as e:
                log.exception("sign_in failed for %s", uid)
                await event.reply(f"Login failed: {type(e).__name__}. /cancel and retry.")
                return
            await self._finish_login(event, state)
            return

        if step == "password":
            try:
                await client.sign_in(password=text)
            except Exception as e:
                log.exception("password login failed for %s", uid)
                await event.reply(f"Password rejected: {type(e).__name__}. Try again or /cancel.")
                return
            await self._finish_login(event, state)
            return

    async def _finish_login(self, event, state: dict) -> None:
        uid = event.sender_id
        client: TelegramClient = state["client"]
        session_str = client.session.save()
        await client.disconnect()
        self.pending.pop(uid, None)

        self.conn.execute(
            "INSERT OR REPLACE INTO users(tg_user_id, session, phone, created_at, enabled) "
            "VALUES (?, ?, ?, ?, 1)",
            (uid, session_str, state.get("phone"), int(time.time())),
        )
        try:
            listener = await start_listener(uid, session_str, self.conn, self.bot)
        except Exception:
            log.exception("post-login listener start failed for %s", uid)
            await event.reply("Login succeeded but starting the listener failed. Check server logs.")
            return
        self.listeners[uid] = listener
        await event.reply("✅ Connected. I'll DM you on edits/deletions. /logout anytime.")


# --------------------------------------------------------------------------- #
# entry                                                                       #
# --------------------------------------------------------------------------- #

async def main() -> None:
    conn = init_db()
    bot = TelegramClient(str(BOT_SESSION), API_ID, API_HASH)
    await bot.start(bot_token=BOT_TOKEN)
    me = await bot.get_me()
    log.info("Control bot online as @%s", me.username)

    service = Service(conn, bot)
    await service.start_all()

    @bot.on(events.NewMessage(incoming=True))
    async def on_msg(event):
        if not event.is_private:
            return
        try:
            await service.handle(event)
        except Exception:
            log.exception("handler crashed")
            try:
                await event.reply("Internal error, sorry. Try /cancel and retry.")
            except Exception:
                pass

    async def cleanup_loop():
        while True:
            cutoff = int(time.time()) - RETENTION_DAYS * 86400
            conn.execute("DELETE FROM messages WHERE ts < ?", (cutoff,))
            await asyncio.sleep(3600)

    asyncio.create_task(cleanup_loop())
    await bot.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(main())
