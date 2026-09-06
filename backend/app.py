import sys
import os
import json
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from rag_engine import RAGSystem

app = FastAPI(
    title="Entrance Sahaayi API",
    description="AI-Based Career Guidance Chatbot with Strict RAG Grounding & Marksheet Analyzer",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(BASE_DIR), "data")
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

rag = RAGSystem(data_dir=DATA_DIR)
ADMIN_PASSCODE = "admin123"

class ChatRequest(BaseModel):
    query: str
    persona: Optional[str] = "Student"
    exam_context: Optional[str] = None
    language: Optional[str] = "en-IN"

class ProfileRequest(BaseModel):
    stream: str
    class12_marks: float
    physics: Optional[float] = 0.0
    math: Optional[float] = 0.0
    bio: Optional[float] = 0.0
    interests: Optional[List[str]] = []
    budget: Optional[str] = "Govt / Merit"

class FAQRequest(BaseModel):
    question: str
    answer: str
    category: Optional[str] = "General"
    target: Optional[str] = "Both"

class VideoRequest(BaseModel):
    title: str
    exam: str
    stream: str
    video_url: Optional[str] = "/static/videos/placeholder.mp4"
    duration: Optional[str] = "10 mins"
    summary: str
    tags: Optional[List[str]] = []

VIDEO_EXTENSIONS = {".mp4", ".webm", ".ogg", ".mov"}

def verify_admin(x_admin_key: Optional[str] = Header(None)):
    if x_admin_key != ADMIN_PASSCODE:
        raise HTTPException(status_code=403, detail="Admin authorization passcode required for Knowledge Base modification.")

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app_name": "Entrance Sahaayi v2.0",
        "vector_stats": rag.get_stats()
    }

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    result = rag.query(
        user_query=req.query,
        persona=req.persona,
        exam_context=req.exam_context,
        language=req.language or "en-IN"
    )
    return result

@app.post("/api/analyze-profile")
def analyze_profile(req: ProfileRequest):
    return rag.analyze_student_profile(
        stream=req.stream,
        class12_marks=req.class12_marks,
        physics=req.physics or 0.0,
        math=req.math or 0.0,
        bio=req.bio or 0.0,
        interests=req.interests or [],
        budget=req.budget or "Govt / Merit"
    )

@app.post("/api/upload-marksheet")
async def upload_marksheet(file: UploadFile = File(...), interests: Optional[str] = Form(""), budget: Optional[str] = Form("Govt / Merit")):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Only PDF, TXT, or MD marksheets are supported.")

    temp_dir = os.path.join(DATA_DIR, "temp_marksheets")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename)
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        interests_list = [i.strip() for i in interests.split(",") if i.strip()]
        result = rag.parse_and_analyze_marksheet(temp_path, interests=interests_list, budget=budget)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return result
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to analyze marksheet file: {str(e)}")

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), x_admin_key: Optional[str] = Header(None)):
    verify_admin(x_admin_key)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Only PDF, TXT, or MD files are supported.")

    save_path = os.path.join(rag.documents_dir, file.filename)
    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        chunks_added = rag.add_document(save_path)
        return {
            "message": f"Brochure '{file.filename}' ingested into vector knowledge base by Admin!",
            "chunks_created": chunks_added,
            "total_chunks_in_db": len(rag.chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@app.get("/api/documents")
def list_documents():
    return rag.get_stats()

@app.get("/api/faqs")
def get_faqs():
    return rag.faqs

@app.post("/api/faqs")
def add_faq(req: FAQRequest, x_admin_key: Optional[str] = Header(None)):
    verify_admin(x_admin_key)
    new_faq = rag.add_faq(
        question=req.question,
        answer=req.answer,
        category=req.category,
        target=req.target
    )
    return {"message": "FAQ added by Admin!", "faq": new_faq}

@app.get("/api/videos")
def get_videos():
    return rag.videos

@app.post("/api/upload-video")
async def upload_video(
    file: UploadFile = File(...),
    title: str = Form(...),
    exam: str = Form(...),
    stream: str = Form(...),
    duration: str = Form(""),
    summary: str = Form(""),
    tags: str = Form(""),
    x_admin_key: Optional[str] = Header(None)
):
    verify_admin(x_admin_key)
    if not file.filename:
        raise HTTPException(status_code=400, detail="No video selected.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in VIDEO_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only MP4, WebM, OGG, or MOV videos are supported.")

    videos_dir = os.path.join(FRONTEND_DIR, "videos")
    os.makedirs(videos_dir, exist_ok=True)
    safe_filename = os.path.basename(file.filename)
    save_path = os.path.join(videos_dir, safe_filename)
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    new_video = {
        "id": f"vid_{len(rag.videos) + 1}",
        "title": title,
        "exam": exam,
        "stream": stream,
        "video_url": f"/static/videos/{safe_filename}",
        "duration": duration,
        "summary": summary,
        "tags": [tag.strip() for tag in tags.split(",") if tag.strip()]
    }
    rag.videos.append(new_video)
    with open(rag.videos_file, "w", encoding="utf-8") as f:
        json.dump(rag.videos, f, indent=2)
    return {"message": f"Video '{safe_filename}' uploaded by Admin!", "video": new_video}

@app.post("/api/videos")
def add_video(req: VideoRequest, x_admin_key: Optional[str] = Header(None)):
    verify_admin(x_admin_key)
    new_video = {
        "id": f"vid_{len(rag.videos) + 1}",
        "title": req.title,
        "exam": req.exam,
        "stream": req.stream,
        "video_url": req.video_url or "/static/videos/placeholder.mp4",
        "duration": req.duration,
        "summary": req.summary,
        "tags": req.tags or []
    }
    rag.videos.append(new_video)
    with open(rag.videos_file, "w", encoding="utf-8") as f:
        json.dump(rag.videos, f, indent=2)
    return {"message": "Video added by Admin!", "video": new_video}

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    def read_root():
        index_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"message": "Entrance Sahaayi API running."}
