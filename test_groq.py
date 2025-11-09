import os
from groq import Groq
import dotenv

def run_chat_completion() -> str:
    dotenv.load_dotenv()

    api_key = os.getenv("groq_api_key") or os.getenv("GROQ_API_KEY")

    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "system",
                "content": "You are a concise assistant helping test the Groq API.",
            },
            {
                "role": "user",
                "content": "Give me a one-sentence productivity tip.",
            },
        ],
        max_tokens=128,
        temperature=0.5,
    )

    return completion.choices[0].message.content.strip()

response_text = run_chat_completion()
print("Groq response:\n")
print(response_text)