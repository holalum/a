# Telegram message tracker — public service

A control bot anyone can DM. The bot walks each user through a Telegram login,
keeps a per-user MTProto session, and notifies the user whenever someone
**edits** or **deletes** a message in their chats.

## ⚠️ Security model — read this before deploying

To see deletions/edits in a user's private chats, the Telegram **Bot API is
not enough** — Telegram does not deliver deletion events to bots, and bots
don't see DMs between other users. The only way is to run an MTProto client
**as the user**. So every user that signs up gives this server a
`StringSession` that is functionally equivalent to a full account password.

- The server can read **all** of their messages, send messages as them, join
  channels, change profile, etc.
- A leak of `service.db` is a mass account takeover.
- Users should only sign up with operators they personally trust. State this
  clearly in your bot's `/start` text (the default `/help` already does).
- Consider encrypting `service.db` at rest (e.g. with SQLCipher) and running
  behind a host you fully control. This repo intentionally keeps things
  minimal — encryption is left to the operator.

If that risk is unacceptable for your use case, this project is the wrong
shape and you should self-host the single-user version per user instead.

## How it works

1. User DMs the bot, sends `/login`.
2. Bot collects phone → SMS code → optional 2FA password.
3. On success, the resulting `StringSession` is stored in `service.db` and a
   per-user Telethon listener task starts inside the same process.
4. Each listener caches every incoming/outgoing message of its user, and on
   `MessageEdited` / `MessageDeleted` events from the other side, the control
   bot DMs the user with a `✏️ Edited` / `🗑 Deleted` summary.
5. `/logout` disconnects the listener and wipes the user's session and
   cached messages.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill API_ID, API_HASH, BOT_TOKEN
python service.py
```

Required env vars (`.env`):

- `API_ID`, `API_HASH` — from <https://my.telegram.org/apps>.
- `BOT_TOKEN` — from [@BotFather](https://t.me/BotFather). This is the bot
  users will talk to.
- `RETENTION_DAYS` (optional, default 7) — how long cached message text is
  kept per user, for resolving deletions.

## Commands users see

- `/start`, `/help` — explanation and warning.
- `/login` — start the phone → code → 2FA flow.
- `/status` — am I connected?
- `/logout` — wipe session + cache for this user.
- `/cancel` — abort an in-progress login.

## Operational notes

- The Telegram login code must be entered **with spaces between digits**
  (`1 2 3 4 5`). Sending a bare numeric code in a Telegram chat causes
  Telegram itself to invalidate the code as a security measure. The bot
  reminds the user of this when asking for the code.
- All listeners run as `asyncio` tasks in the same process. For hundreds of
  users this is fine; beyond that you'll want to shard.
- `service.db` uses WAL. Back it up while the service is running is OK, but
  again: it contains login-equivalent secrets.
- A deletion can only be reported if the listener was running when the
  original message arrived and the cache row hasn't aged out.

## Files

- `service.py` — entire service.
- `service.db` — SQLite store: `users`, `messages`. **Sensitive**, in
  `.gitignore`.
- `service-bot.session` — Telethon bot session file.
