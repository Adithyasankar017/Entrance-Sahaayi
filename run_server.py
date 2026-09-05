import sys
import os
import uvicorn

sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

if __name__ == "__main__":
    print("Starting Entrance Sahaayi AI Guidance Chatbot Server...")
    print("Open http://127.0.0.1:8000 in your browser.")
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
