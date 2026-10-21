# Telegram Bot Starter

A small Python bot starter for learning how a Telegram bot receives messages.
This first version does not use an AI service or manage channel content yet.

## What this project does

- `/start` sends a welcome message.
- `/help` explains the available commands.
- Other text messages are received and noted in the terminal. Their text is
  not printed or saved.

## What you need

- Python 3.10 or newer
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Set it up

Open a terminal in this folder, then create a private Python environment:

```bash
python -m venv .venv
```

Activate it:

- macOS or Linux: `source .venv/bin/activate`
- Windows PowerShell: `.venv\Scripts\Activate.ps1`

Install the project dependencies:

```bash
python -m pip install -r requirements.txt
```

For local development, copy `.env.example` to a new file named `.env`, then put
your token after `TELEGRAM_BOT_TOKEN=`. Keep `.env` private. It is excluded
from Git.

If you run the bot in Replit, add `TELEGRAM_BOT_TOKEN` under the project's
**Secrets** instead of putting the real token in a file. The bot reads it from
the same environment variable either way.

## Start the bot

```bash
python src/bot.py
```

Leave the terminal open while the bot is running. In Telegram, open your bot
and send `/start`, then send a regular text message. The welcome reply appears
in Telegram; for other text messages, the terminal reports that one arrived
without displaying its contents.

For a later group or channel test, the bot must be added to that chat. Telegram
group privacy settings can limit which group messages it receives, and a bot
usually needs admin access to read channel posts.

Stop the bot by pressing `Ctrl+C` in the terminal.

## Keep your token safe

- Never paste the real token into Python code or `.env.example`.
- Never share `.env` or upload it to Git.
- If you accidentally share the token, use BotFather to revoke it and create a
  replacement.

## Folder guide

- `src/bot.py` — starts the bot and defines its beginner-level message handlers.
- `.env.example` — safe template showing which environment variable is needed.
- `requirements.txt` — the Python libraries this starter needs.
