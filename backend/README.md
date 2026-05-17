# Harmony VPN — бэкенд

Прослойка между Telegram Mini App и панелью Remnawave.
Стек: **Python 3.11+ / FastAPI / PostgreSQL (SQLAlchemy async)**.

## Что делает бэкенд

1. **Проверяет Telegram `initData`** — HMAC-подпись по `BOT_TOKEN`. Без этого
   любой может выдать себя за другого пользователя.
2. **Проксирует запросы в Remnawave** — токен панели хранится только здесь,
   на фронт не попадает.
3. **Ведёт собственную БД** для того, чего нет в Remnawave:
   баланс, транзакции, рефералы, промокоды, кулдаун и история колеса фортуны.

```
Mini App (фронт)  ──JWT──▶  FastAPI backend  ──API token──▶  Remnawave
                                   │
                                   └──▶  PostgreSQL (баланс, рефералы, колесо)
```

## Запуск (после того как код будет написан)

```bash
cd backend
cp .env.example .env          # заполнить значения
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head          # миграции БД
uvicorn app.main:app --reload
```

## Что нужно от тебя, чтобы написать код

### 1. Документация Remnawave API
- Swagger / OpenAPI: обычно `https://<панель>/openapi.json` или `/docs`
- Либо ссылка на офиц. доку API Remnawave

### 2. Как авторизуется Remnawave API
- Тип токена: Bearer-токен / API-key в заголовке / cookie?
- Где он берётся в панели

### 3. Какие операции нужны от панели (подтвердить список)
- Получить пользователя по Telegram ID (или создать, если нет)
- Получить статус подписки: тариф, дата окончания, активна ли
- Получить ссылку на подписку (subscription URL / ключ)
- Продлить / выдать подписку на N дней
- Список нод (серверов): город, страна, нагрузка
- Список устройств/подключений пользователя, отзыв устройства

Если чего-то в Remnawave нет — скажи, заменим логику.

## Заполни `.env`

Скопируй `.env.example` → `.env` и впиши:
`BOT_TOKEN`, `BOT_USERNAME`, `REMNAWAVE_BASE_URL`, `REMNAWAVE_API_TOKEN`,
`DATABASE_URL`, `SECRET_KEY`, `CORS_ORIGINS`.
