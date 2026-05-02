import requests
import os

url = "https://api.openai.com/v1/chat/completions"

API_KEY = os.getenv("OPENAI_API_KEY")

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

data = {
    "model": "gpt-4o-mini",
    "messages": [
        {"role": "user", "content": "Объясни, что такое геометрия"}
    ]
}

response = requests.post(url, headers=headers, json=data)
result = response.json()

if "choices" in result:
    print(result["choices"][0]["message"]["content"])
else:
    print("Error:", result)