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
from database import DatabaseManager

app = FastAPI(
    title="Entrance Sahaayi API",
    description="AI-Based Career Guidance Chatbot with Strict RAG Grounding & User Profile Session History",
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
db = DatabaseManager()
ADMIN_PASSCODE = "admin123"

# -------------------------------------------------------------
# Request & Response Models
# -------------------------------------------------------------
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "Student"
    profile: Optional[Dict[str, Any]] = {}

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateProfileRequest(BaseModel):
    stream: Optional[str] = None
    class12_marks: Optional[float] = None
    physics: Optional[float] = None
    math: Optional[float] = None
    bio: Optional[float] = None
    interests: Optional[List[str]] = None
    budget: Optional[str] = None

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Topic"
    persona: Optional[str] = "Student"
    exam_context: Optional[str] = None
    language: Optional[str] = "en-IN"

class RenameSessionRequest(BaseModel):
    title: str

class ChatRequest(BaseModel):
    query: str
    persona: Optional[str] = "Student"
    exam_context: Optional[str] = None
    language: Optional[str] = "en-IN"
    session_id: Optional[str] = None

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

# -------------------------------------------------------------
# Auth & Security Helpers
# -------------------------------------------------------------
def verify_admin(x_admin_key: Optional[str] = Header(None)):
    if x_admin_key != ADMIN_PASSCODE:
        raise HTTPException(status_code=403, detail="Admin authorization passcode required for Knowledge Base modification.")

def get_current_user(x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    token = x_user_token if isinstance(x_user_token, str) else None
    if not token and authorization and isinstance(authorization, str) and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
    if not token or not isinstance(token, str):
        return None
    return db.get_user_by_token(token)

def require_current_user(x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = get_current_user(x_user_token=x_user_token, authorization=authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required. Please log in.")
    return user

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "app_name": "Entrance Sahaayi v2.0",
        "vector_stats": rag.get_stats()
    }

# -------------------------------------------------------------
# User Profile & Authentication Endpoints
# -------------------------------------------------------------
@app.post("/api/auth/register")
def register_user(req: RegisterRequest):
    try:
        user = db.register_user(
            email=req.email,
            password=req.password,
            full_name=req.full_name,
            role=req.role or "Student",
            profile_data=req.profile
        )
        return {"message": "Account created successfully!", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/api/auth/login")
def login_user(req: LoginRequest):
    try:
        user = db.authenticate_user(email=req.email, password=req.password)
        return {"message": "Logged in successfully!", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.get("/api/auth/me")
def get_me(user: Dict[str, Any] = Depends(require_current_user) if 'Depends' in globals() else None, x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)):
    current_user = get_current_user(x_user_token=x_user_token, authorization=authorization)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return {"user": current_user}

@app.put("/api/auth/profile")
def update_profile(req: UpdateProfileRequest, x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)):
    current_user = get_current_user(x_user_token=x_user_token, authorization=authorization)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    
    update_data = {k: v for k, v in req.dict().items() if v is not None}
    updated_profile = db.update_user_profile(current_user["id"], update_data)
    return {"message": "Profile updated successfully!", "profile": updated_profile}

# -------------------------------------------------------------
# ChatGPT / Gemini Style Chat Sessions & History Endpoints
# -------------------------------------------------------------
@app.get("/api/chat/sessions")
def list_user_sessions(x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)):
    current_user = get_current_user(x_user_token=x_user_token, authorization=authorization)
    if not current_user:
        return {"sessions": []}
    sessions = db.get_user_chat_sessions(current_user["id"])
    return {"sessions": sessions}

@app.post("/api/chat/sessions")
def create_session(req: CreateSessionRequest, x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)):
    current_user = get_current_user(x_user_token=x_user_token, authorization=authorization)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to save chat history.")
    
    session = db.create_chat_session(
        user_id=current_user["id"],
        title=req.title or "New Topic",
        persona=req.persona or current_user["role"],
        exam_context=req.exam_context,
        language=req.language or "en-IN"
    )
    return {"session": session}

@app.get("/api/chat/sessions/{session_id}")
def get_session_details(session_id: str, x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)):
    current_user = get_current_user(x_user_token=x_user_token, authorization=authorization)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    
    session = db.get_chat_session(session_id, current_user["id"])
    if not session:
        raise HTTPException(status_code=404, detail="Topic session not found.")
    return {"session": session}

@app.put("/api/chat/sessions/{session_id}")
def rename_session(session_id: str, req: RenameSessionRequest, x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)):
    current_user = get_current_user(x_user_token=x_user_token, authorization=authorization)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    
    success = db.rename_chat_session(session_id, current_user["id"], req.title)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to rename session.")
    return {"message": "Session renamed successfully!"}

@app.delete("/api/chat/sessions/{session_id}")
def delete_session(session_id: str, x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)):
    current_user = get_current_user(x_user_token=x_user_token, authorization=authorization)
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    
    success = db.delete_chat_session(session_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"message": "Session deleted successfully!"}

# -------------------------------------------------------------
# Main Chat Endpoint with History & Grounding Integration
# -------------------------------------------------------------
@app.post("/api/chat")
def chat_endpoint(req: ChatRequest, x_user_token: Optional[str] = Header(None), authorization: Optional[str] = Header(None)):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    current_user = get_current_user(x_user_token=x_user_token, authorization=authorization)
    session_id = req.session_id
    history = []
    
    # If user is logged in, handle conversation session & history
    if current_user:
        if session_id:
            session_data = db.get_chat_session(session_id, current_user["id"])
            if session_data:
                history = session_data.get("messages", [])
        else:
            # Auto-create session if user is logged in but hasn't specified one
            new_title = req.query[:35] + "..." if len(req.query) > 35 else req.query
            new_sess = db.create_chat_session(
                user_id=current_user["id"],
                title=new_title,
                persona=req.persona or current_user["role"],
                exam_context=req.exam_context,
                language=req.language or "en-IN"
            )
            session_id = new_sess["id"]
    
    # RAG Query Execution with conversational history
    result = rag.query(
        user_query=req.query,
        persona=req.persona or (current_user["role"] if current_user else "Student"),
        exam_context=req.exam_context,
        language=req.language or "en-IN",
        history=history
    )
    
    # Persist user question and bot answer to database if logged in
    if current_user and session_id:
        db.add_chat_message(
            session_id=session_id,
            user_id=current_user["id"],
            sender="user",
            content=req.query
        )
        db.add_chat_message(
            session_id=session_id,
            user_id=current_user["id"],
            sender="bot",
            content=result["answer"],
            sources=result.get("sources", []),
            confidence=result.get("confidence", 0.0),
            is_faq=result.get("is_faq_short_circuit", False)
        )
        # Fetch updated session data (with title if auto-updated)
        updated_session = db.get_chat_session(session_id, current_user["id"])
        result["session_id"] = session_id
        if updated_session:
            result["session_title"] = updated_session["title"]
            
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
