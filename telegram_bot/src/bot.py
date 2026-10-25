import httpx
from telegram.request import HTTPXRequest
"""A beginner-friendly starting point for a Telegram bot."""

import logging
import os

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)


# Read settings from a local .env file during development.
# On hosted systems, environment variables can be set directly instead.
load_dotenv()

# Keep the real bot token outside the source code.
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

OWNER_ID = 1021054486

def is_owner(update: Update) -> bool:
    user = update.effective_user
    return user is not None and user.id == OWNER_ID



async def start(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Reply when someone sends the /start command."""
    if update.effective_message is not None:
        if update.effective_chat is not None and update.effective_chat.type == "private" and not is_owner(update):
            return
        await update.effective_message.reply_text(
            "Hello! Your Telegram bot is running. Send /help to see what it can do."
        )


async def help_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Explain the starter bot's available commands."""
    if update.effective_message is not None:
        if update.effective_chat is not None and update.effective_chat.type == "private" and not is_owner(update):
            return
        await update.effective_message.reply_text(
            "Available commands:\n"
            "/start — check that the bot is running\n"
            "/help — show this message\n\n"
            "You can also send a text message. This starter will notice it "
            "without saving or printing its contents."
        )


async def receive_text(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Notice a text message without recording the message itself."""
    if update.effective_message is None:
        return

    chat = update.effective_chat
    if chat is not None and chat.type == "private" and not is_owner(update):
        return

    # Do not answer ordinary group messages; group AI replies are not enabled.
    logging.info("Received a text message.")



async def post_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    """Generate a marketing draft with Gemini without publishing it."""
    message = update.effective_message
    if message is None:
        return

    if not is_owner(update):
        return

    if not GEMINI_API_KEY:
        await message.reply_text("مفتاح Gemini غير موجود في إعدادات المشروع.")
        return

    topic = " ".join(context.args).strip()
    if not topic:
        await message.reply_text(
            "اكتب فكرة المنشور بعد الأمر، مثل:\n"
            "/post جهاز تنقية هواء 3 في 1"
        )
        return

    await message.reply_text("جاري إعداد مسودة تسويقية...")

    try:
        from google import genai

        client = genai.Client(api_key=GEMINI_API_KEY)
        response = await __import__("asyncio").to_thread(
            client.models.generate_content,
            model="gemini-3.5-flash-lite",
            contents=(
                "اكتب مسودة منشور تسويقي عربية جذابة وواضحة للمنتج التالي. "
                "لا تخترع أسعارًا أو مواصفات غير مذكورة. "
                "أضف دعوة مناسبة للتواصل، ولا تدّعِ أن المنشور نُشر.\n"
                f"المنتج أو الفكرة: {topic}"
            ),
        )
        draft = (response.text or "").strip()
        if not draft:
            draft = "لم يصل نص من Gemini. حاول مرة أخرى."
        await message.reply_text("مسودة للمراجعة — لم يتم النشر:\n\n" + draft)
    except Exception:
        logging.exception("Gemini draft generation failed.")
        await message.reply_text(
            "تعذر إنشاء المسودة حاليًا. تحقق من اتصال Gemini ثم حاول مجددًا."
        )


def main() -> None:
    """Check settings, create the bot, and begin listening for Telegram updates."""
    if not BOT_TOKEN or BOT_TOKEN == "replace_this_with_your_bot_token":
        raise SystemExit(
            "Missing Telegram bot token. Copy .env.example to .env and "
            "add your token to TELEGRAM_BOT_TOKEN."
        )

    # Show simple status messages in the terminal while the bot is running.
    logging.basicConfig(
        format="%(asctime)s - %(levelname)s - %(message)s",
        level=logging.INFO,
    )

    # Application manages the connection to Telegram and delivers new updates
    # (such as messages and channel posts) to the handlers below.
    application = Application.builder().token(BOT_TOKEN).request(HTTPXRequest(httpx_kwargs={"verify": "/etc/ssl/certs/ca-certificates.crt"})).build()

    # Commands begin with a slash. The text handler skips commands so they
    # are handled only by their matching CommandHandler.
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))

    application.add_handler(CommandHandler("post", post_command))
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, receive_text)
    )

    logging.info("Bot is running. Press Ctrl+C to stop it.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
