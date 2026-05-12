# Telegram message tracker

A Telegram **userbot** that watches your own chats and sends you a DM whenever
the other side **deletes** or **edits** a message. Notifications are delivered
by a separate bot you create via [@BotFather](https://t.me/BotFather).

## Why a userbot and not a normal bot?

The Bot API does not expose deletion events at all, and a bot cannot read
private chats between other users. To see deletions across *your* chats you
have to act as a second client of your own account, which is what this script
does via the MTProto API (Telethon).

For personal use this is fine; do not use it to spy on anyone else.

## Setup

1. Get `API_ID` and `API_HASH` at <https://my.telegram.org/apps>.
2. Create a bot via [@BotFather](https://t.me/BotFather), copy its token.
3. Find out your numeric Telegram user id (e.g. via [@userinfobot](https://t.me/userinfobot)).
4. Start a chat with your new bot and send it any message (otherwise it can't
   DM you — Telegram blocks bot-initiated DMs).
5. Copy `.env.example` to `.env` and fill it in.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # then edit it
python tracker.py
```

On first launch Telethon will prompt for your phone number and the login code
Telegram sends you. After that, `user.session` and `bot.session` files are
reused.

## What it tracks

- **All chats**: 1:1, groups, channels.
- New incoming and outgoing messages are cached in `messages.db` (SQLite).
- On `MessageEdited` (not your own): sends a `✏️ Edited` notification with
  before/after.
- On `MessageDeleted` (not your own): sends a `🗑 Deleted` notification with
  the cached text and a note if there was media.
- Cache entries older than `RETENTION_DAYS` (default 7) are pruned hourly.

## Limits

- A deletion can only be reported if the message was seen by the userbot *and*
  is still in the cache. Messages older than `RETENTION_DAYS`, or messages
  received while the script wasn't running, can't be recovered.
- Telegram itself doesn't tell clients *which* message was deleted in some
  cases — only the message id. The script resolves it via the local cache.
- Media isn't re-downloaded; only the media type is logged.
