"""Telegram userbot that notifies you when chat partners delete or edit messages.

Run with your own account (Telethon will ask for phone + login code on first run).
Notifications are delivered to NOTIFY_USER_ID via a separate bot (BOT_TOKEN).
"""

from __future__ import annotations

import asyncio
import html
import logging
import os
import sqlite3
import time
from contextlib import closing
from pathlib import Path

from dotenv import load_dotenv
from telethon import TelegramClient, events
from telethon.tl.types import (
    MessageMediaPhoto,
    MessageMediaDocument,
    MessageMediaWebPage,
    PeerChannel,
    PeerChat,
    PeerUser,
)

load_dotenv()

API_ID = int(os.environ["API_ID"])
API_HASH = os.environ["API_HASH"]
BOT_TOKEN = os.environ["BOT_TOKEN"]
NOTIFY_USER_ID = int(os.environ["NOTIFY_USER_ID"])
RETENTION_DAYS = int(os.getenv("RETENTION_DAYS", "7"))

ROOT = Path(__file__).parent
DB_PATH = ROOT / "messages.db"
USER_SESSION = ROOT / "user.session"
BOT_SESSION = ROOT / "bot.session"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("tracker")


def init_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            chat_id     INTEGER NOT NULL,
            message_id  INTEGER NOT NULL,
            sender_id   INTEGER,
            text        TEXT,
            media       TEXT,
            ts          INTEGER NOT NULL,
            PRIMARY KEY (chat_id, message_id)
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ts ON messages(ts)")
    conn.commit()
    return conn


def describe_media(message) -> str | None:
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


async def format_chat(user_client: TelegramClient, chat_id: int) -> str:
    try:
        entity = await user_client.get_entity(chat_id)
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


async def format_sender(user_client: TelegramClient, sender_id: int | None) -> str:
    if sender_id is None:
        return "unknown"
    try:
        entity = await user_client.get_entity(sender_id)
    except Exception:
        return f"id {sender_id}"
    name = " ".join(filter(None, [getattr(entity, "first_name", None), getattr(entity, "last_name", None)]))
    uname = getattr(entity, "username", None)
    if uname:
        return f"{name or uname} (@{uname})"
    return name or f"id {sender_id}"


def esc(text: str | None) -> str:
    if not text:
        return "<i>(empty)</i>"
    return html.escape(text)


async def main() -> None:
    conn = init_db()

    user_client = TelegramClient(str(USER_SESSION), API_ID, API_HASH)
    bot_client = TelegramClient(str(BOT_SESSION), API_ID, API_HASH)

    await user_client.start()
    await bot_client.start(bot_token=BOT_TOKEN)

    me = await user_client.get_me()
    log.info("Logged in as %s (id=%s). Notifying user id=%s", me.first_name, me.id, NOTIFY_USER_ID)

    async def notify(text: str) -> None:
        try:
            await bot_client.send_message(NOTIFY_USER_ID, text, parse_mode="html", link_preview=False)
        except Exception:
            log.exception("Failed to send notification")

    @user_client.on(events.NewMessage(incoming=True, outgoing=True))
    async def on_new(event: events.NewMessage.Event) -> None:
        msg = event.message
        chat_id = peer_id(msg.peer_id)
        with closing(conn.cursor()) as cur:
            cur.execute(
                "INSERT OR REPLACE INTO messages(chat_id, message_id, sender_id, text, media, ts) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    chat_id,
                    msg.id,
                    msg.sender_id,
                    msg.message or "",
                    describe_media(msg),
                    int(time.time()),
                ),
            )
            conn.commit()

    @user_client.on(events.MessageEdited())
    async def on_edit(event: events.MessageEdited.Event) -> None:
        msg = event.message
        chat_id = peer_id(msg.peer_id)
        # Skip our own edits.
        if msg.sender_id == me.id:
            with closing(conn.cursor()) as cur:
                cur.execute(
                    "UPDATE messages SET text=?, media=? WHERE chat_id=? AND message_id=?",
                    (msg.message or "", describe_media(msg), chat_id, msg.id),
                )
                conn.commit()
            return

        with closing(conn.cursor()) as cur:
            cur.execute(
                "SELECT text FROM messages WHERE chat_id=? AND message_id=?",
                (chat_id, msg.id),
            )
            row = cur.fetchone()

        old_text = row[0] if row else None
        new_text = msg.message or ""
        if old_text == new_text:
            return  # caption-only / reaction edits we don't care about

        chat_name = await format_chat(user_client, chat_id)
        sender_name = await format_sender(user_client, msg.sender_id)

        body = (
            f"✏️ <b>Edited</b> in {esc(chat_name)}\n"
            f"From: {esc(sender_name)}\n\n"
            f"<b>Was:</b>\n{esc(old_text) if old_text is not None else '<i>(not in cache)</i>'}\n\n"
            f"<b>Now:</b>\n{esc(new_text)}"
        )
        await notify(body)

        with closing(conn.cursor()) as cur:
            cur.execute(
                "UPDATE messages SET text=?, media=? WHERE chat_id=? AND message_id=?",
                (new_text, describe_media(msg), chat_id, msg.id),
            )
            conn.commit()

    @user_client.on(events.MessageDeleted())
    async def on_delete(event: events.MessageDeleted.Event) -> None:
        # event.chat_id may be None for private chats — we have to look up by message_id.
        chat_id = event.chat_id
        for mid in event.deleted_ids:
            with closing(conn.cursor()) as cur:
                if chat_id is not None:
                    cur.execute(
                        "SELECT chat_id, sender_id, text, media FROM messages "
                        "WHERE chat_id=? AND message_id=?",
                        (peer_id(event.peer) if event.peer else chat_id, mid),
                    )
                else:
                    cur.execute(
                        "SELECT chat_id, sender_id, text, media FROM messages WHERE message_id=?",
                        (mid,),
                    )
                row = cur.fetchone()
            if not row:
                continue
            row_chat_id, sender_id, text, media = row
            if sender_id == me.id:
                continue  # ignore our own deletes

            chat_name = await format_chat(user_client, row_chat_id)
            sender_name = await format_sender(user_client, sender_id)

            body = f"🗑 <b>Deleted</b> in {esc(chat_name)}\nFrom: {esc(sender_name)}\n\n{esc(text)}"
            if media:
                body += f"\n\n<i>[had {esc(media)}]</i>"
            await notify(body)

    async def cleanup_loop() -> None:
        while True:
            cutoff = int(time.time()) - RETENTION_DAYS * 86400
            with closing(conn.cursor()) as cur:
                cur.execute("DELETE FROM messages WHERE ts < ?", (cutoff,))
                conn.commit()
            await asyncio.sleep(3600)

    asyncio.create_task(cleanup_loop())
    log.info("Tracker is running. Press Ctrl+C to stop.")
    await user_client.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(main())
