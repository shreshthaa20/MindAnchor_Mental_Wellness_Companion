import os
import requests

url = "http://127.0.0.1:8000/chat"
api_key = os.environ.get("RAG_SERVICE_API_KEY")
if not api_key:
    raise RuntimeError("RAG_SERVICE_API_KEY must be set")
payload = {
    "user_id": 1,
    "chat_type": "companion",
    "messages": [
        {"role": "user", "content": "Hello, how are you today?"},
        {"role": "user", "content": "Can you hear me?"}
    ]
}

print("Testing /chat endpoint...")
try:
    response = requests.post(
        url,
        json=payload,
        headers={"X-Internal-API-Key": api_key},
    )
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Failed to test /chat endpoint:", e)
