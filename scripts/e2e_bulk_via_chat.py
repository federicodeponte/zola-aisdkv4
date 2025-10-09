import asyncio
import os
import random
import string
from pathlib import Path

import aiohttp

BASE_URL = "http://localhost:3002"
BYPASS_TOKEN = os.environ.get("TEST_AUTH_BYPASS_TOKEN", "test-local-bypass-2025")
USER_ID = os.environ.get("BULK_TEST_USER_ID", "1cf85305-a2e1-4229-807d-a1f7ad04f827")
MODEL = "gemini-2.5-flash"
SUPABASE_PROJECT_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE")

CSV_ROWS = 1000
PROMPT_TEMPLATE = "Find the privacy policy URL for {{company}}"
STRESS_BUCKET_PREFIX = "chat-attachments/stress"

async def upload_csv(session: aiohttp.ClientSession, local_path: Path) -> str:
    key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    remote_path = f"{STRESS_BUCKET_PREFIX}/bulk-e2e-{key}.csv"
    upload_url = f"{SUPABASE_PROJECT_URL}/storage/v1/object/{remote_path}"

    async with session.post(
        upload_url,
        data=local_path.read_bytes(),
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
            "apikey": SUPABASE_SERVICE_ROLE,
            "Content-Type": "text/csv",
        },
    ) as resp:
        if resp.status >= 400:
            raise RuntimeError(f"Upload failed: {resp.status} {await resp.text()}")

    public_url = (
        f"{SUPABASE_PROJECT_URL}/storage/v1/object/public/{remote_path}"
    )
    return public_url

async def create_chat(session: aiohttp.ClientSession) -> str:
    payload = {
        "userId": USER_ID,
        "title": "End to End Bulk QA",
        "model": MODEL,
        "isAuthenticated": True,
    }
    async with session.post(
        f"{BASE_URL}/api/create-chat",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "x-test-auth-token": BYPASS_TOKEN,
        },
    ) as resp:
        if resp.status >= 400:
            raise RuntimeError(f"create-chat failed: {resp.status} {await resp.text()}")
        data = await resp.json()
        return data["chat"]["id"]

async def stream_chat(session: aiohttp.ClientSession, messages):
    payload = {
        "messages": messages,
        "chatId": messages[0].get("chatId"),
        "userId": USER_ID,
        "model": MODEL,
        "isAuthenticated": True,
        "systemPrompt": "",
        "message_group_id": None,
    }

    async with session.post(
        f"{BASE_URL}/api/chat",
        json=payload,
        headers={
            "Content-Type": "application/json",
            "x-test-auth-token": BYPASS_TOKEN,
        },
    ) as resp:
        if resp.status >= 400:
            raise RuntimeError(f"chat failed: {resp.status} {await resp.text()}")

        stage_types = set()
        download_url = None

        async for line in resp.content:
            decoded = line.decode().strip()
            if not decoded.startswith("data: "):
                continue
            payload = decoded[6:]
            if payload == "[DONE]" or not payload:
                continue
            try:
                data = aiohttp.helpers.json.loads(payload)
            except Exception:
                continue
            stage = data.get("stage")
            if stage:
                stage_types.add(stage.get("type"))
                if stage.get("downloadUrl"):
                    download_url = stage["downloadUrl"]
        return stage_types, download_url

async def download_preview(session: aiohttp.ClientSession, url: str) -> str:
    async with session.get(url) as resp:
        if resp.status >= 400:
            raise RuntimeError(f"Download failed: {resp.status} {await resp.text()}")
        text = await resp.text()
        return '\n'.join(text.splitlines()[:5])

async def main():
    # Generate CSV locally
    local_csv = Path("public/bulk-e2e-chat.csv")
    rows = ["company,website"] + [
        f"ChatCo {i},https://chat{i}.example.com" for i in range(CSV_ROWS)
    ]
    local_csv.write_text("\n".join(rows))

    async with aiohttp.ClientSession() as session:
        csv_url = await upload_csv(session, local_csv)
        chat_id = await create_chat(session)

        # Plan via chat
        plan_message = {
            "role": "user",
            "content": (
                f"Please plan a bulk process for the attached CSV using the prompt "
                f"template \"{PROMPT_TEMPLATE}\"."
            ),
            "experimental_attachments": [
                {
                    "name": local_csv.name,
                    "contentType": "text/csv",
                    "url": csv_url,
                }
            ],
            "chatId": chat_id,
        }

        plan_stages, _ = await stream_chat(session, [plan_message])
        if "plan" not in plan_stages:
            raise RuntimeError(f"Plan stage missing: {plan_stages}")

        # Confirmation + execution
        confirm_message = {
            "role": "user",
            "content": "Confirmed. Please run the bulk process now.",
            "chatId": chat_id,
        }
        exec_stages, download_url = await stream_chat(session, [confirm_message])
        if "complete" not in exec_stages:
            raise RuntimeError(f"Execution did not complete: {exec_stages}")
        if not download_url:
            raise RuntimeError("Download URL missing")

        preview = await download_preview(session, download_url)
        print("Download URL:", download_url)
        print("Preview of result:")
        print(preview)

if __name__ == "__main__":
    asyncio.run(main())
