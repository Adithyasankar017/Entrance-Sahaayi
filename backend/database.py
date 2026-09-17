import sqlite3
import os
import hashlib
import secrets
import json
import uuid
from typing import Optional, List, Dict, Any

class DatabaseManager:
    """
    SQLite Database Manager for Entrance Sahaayi.
    Handles user accounts, authentication tokens, profile data,
    chat sessions (topics), and conversation message history.
    """
    def __init__(self, db_path: str = None):
        if db_path is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            db_path = os.path.join(base_dir, "database.db")
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def close(self):
        """No-op for connection per call design or cleanup."""
        pass

    def init_db(self):
        """Creates required SQLite tables if they do not exist."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'Student',
                    profile_json TEXT,
                    token TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Chat sessions (topics) table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    persona TEXT DEFAULT 'Student',
                    exam_context TEXT,
                    language TEXT DEFAULT 'en-IN',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)

            # Chat messages table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    content TEXT NOT NULL,
                    sources_json TEXT,
                    confidence REAL DEFAULT 0.0,
                    is_faq INTEGER DEFAULT 0,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
                );
            """)
            conn.commit()

    # -------------------------------------------------------------
    # Password Hashing Utilities
    # -------------------------------------------------------------
    def _hash_password(self, password: str, salt: Optional[str] = None) -> tuple[str, str]:
        if not salt:
            salt = secrets.token_hex(16)
        pwd_bytes = password.encode('utf-8')
        salt_bytes = salt.encode('utf-8')
        hashed = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt_bytes, 100000).hex()
        return hashed, salt

    # -------------------------------------------------------------
    # User Authentication & Profile Methods
    # -------------------------------------------------------------
    def register_user(self, email: str, password: str, full_name: str, role: str = "Student", profile_data: Optional[Dict] = None) -> Dict[str, Any]:
        email = email.strip().lower()
        if not email or not password or not full_name:
            raise ValueError("Email, password, and full name are required.")

        hashed, salt = self._hash_password(password)
        token = secrets.token_hex(32)
        profile_json = json.dumps(profile_data or {})

        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO users (email, password_hash, salt, full_name, role, profile_json, token)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (email, hashed, salt, full_name.strip(), role, profile_json, token))
                user_id = cursor.lastrowid
                conn.commit()
            except sqlite3.IntegrityError:
                raise ValueError("An account with this email already exists.")

        return {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "role": role,
            "profile": profile_data or {},
            "token": token
        }

    def authenticate_user(self, email: str, password: str) -> Dict[str, Any]:
        email = email.strip().lower()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("Invalid email or password.")

            stored_hash = row["password_hash"]
            salt = row["salt"]
            input_hash, _ = self._hash_password(password, salt)

            if input_hash != stored_hash:
                raise ValueError("Invalid email or password.")

            # Generate fresh token
            new_token = secrets.token_hex(32)
            cursor.execute("UPDATE users SET token = ? WHERE id = ?", (new_token, row["id"]))
            conn.commit()

            profile = json.loads(row["profile_json"]) if row["profile_json"] else {}
            return {
                "id": row["id"],
                "email": row["email"],
                "full_name": row["full_name"],
                "role": row["role"],
                "profile": profile,
                "token": new_token
            }

    def get_user_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        if not token:
            return None
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE token = ?", (token,))
            row = cursor.fetchone()
            if not row:
                return None
            profile = json.loads(row["profile_json"]) if row["profile_json"] else {}
            return {
                "id": row["id"],
                "email": row["email"],
                "full_name": row["full_name"],
                "role": row["role"],
                "profile": profile,
                "token": row["token"]
            }

    def update_user_profile(self, user_id: int, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT profile_json FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if not row:
                raise ValueError("User not found.")

            existing_profile = json.loads(row["profile_json"]) if row["profile_json"] else {}
            existing_profile.update(profile_data)
            updated_json = json.dumps(existing_profile)

            cursor.execute("UPDATE users SET profile_json = ? WHERE id = ?", (updated_json, user_id))
            conn.commit()
            return existing_profile

    # -------------------------------------------------------------
    # Chat Session & History Methods (ChatGPT / Gemini style)
    # -------------------------------------------------------------
    def create_chat_session(self, user_id: int, title: str, persona: str = "Student", exam_context: Optional[str] = None, language: str = "en-IN") -> Dict[str, Any]:
        session_id = str(uuid.uuid4())
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO chat_sessions (id, user_id, title, persona, exam_context, language)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (session_id, user_id, title, persona, exam_context, language))
            conn.commit()

        return {
            "id": session_id,
            "user_id": user_id,
            "title": title,
            "persona": persona,
            "exam_context": exam_context,
            "language": language,
            "messages": []
        }

    def get_user_chat_sessions(self, user_id: int) -> List[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.*, 
                       (SELECT content FROM chat_messages WHERE session_id = s.id ORDER BY timestamp DESC LIMIT 1) as last_message,
                       (SELECT COUNT(*) FROM chat_messages WHERE session_id = s.id) as message_count
                FROM chat_sessions s
                WHERE s.user_id = ?
                ORDER BY s.updated_at DESC
            """, (user_id,))
            rows = cursor.fetchall()
            result = []
            for r in rows:
                result.append({
                    "id": r["id"],
                    "user_id": r["user_id"],
                    "title": r["title"],
                    "persona": r["persona"],
                    "exam_context": r["exam_context"],
                    "language": r["language"],
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"],
                    "last_message": r["last_message"],
                    "message_count": r["message_count"]
                })
            return result

    def get_chat_session(self, session_id: str, user_id: int) -> Optional[Dict[str, Any]]:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
            session = cursor.fetchone()
            if not session:
                return None

            cursor.execute("""
                SELECT * FROM chat_messages 
                WHERE session_id = ? 
                ORDER BY id ASC
            """, (session_id,))
            msg_rows = cursor.fetchall()

            messages = []
            for m in msg_rows:
                messages.append({
                    "id": m["id"],
                    "sender": m["sender"],
                    "content": m["content"],
                    "sources": json.loads(m["sources_json"]) if m["sources_json"] else [],
                    "confidence": m["confidence"],
                    "is_faq": bool(m["is_faq"]),
                    "timestamp": m["timestamp"]
                })

            return {
                "id": session["id"],
                "user_id": session["user_id"],
                "title": session["title"],
                "persona": session["persona"],
                "exam_context": session["exam_context"],
                "language": session["language"],
                "created_at": session["created_at"],
                "updated_at": session["updated_at"],
                "messages": messages
            }

    def add_chat_message(self, session_id: str, user_id: int, sender: str, content: str, sources: Optional[List] = None, confidence: float = 0.0, is_faq: bool = False) -> Dict[str, Any]:
        sources_json = json.dumps(sources or [])
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Verify session ownership
            cursor.execute("SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
            session = cursor.fetchone()
            if not session:
                raise ValueError("Chat session not found or unauthorized.")

            cursor.execute("""
                INSERT INTO chat_messages (session_id, sender, content, sources_json, confidence, is_faq)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (session_id, sender, content, sources_json, confidence, 1 if is_faq else 0))
            msg_id = cursor.lastrowid

            # If this is the first message and title is generic, auto-generate title from query
            if session["title"] in ["New Topic", "Chat Session"] and sender == "user":
                new_title = content[:35] + "..." if len(content) > 35 else content
                cursor.execute("""
                    UPDATE chat_sessions 
                    SET title = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, (new_title, session_id))
            else:
                cursor.execute("""
                    UPDATE chat_sessions 
                    SET updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                """, (session_id,))

            conn.commit()

            return {
                "id": msg_id,
                "session_id": session_id,
                "sender": sender,
                "content": content,
                "sources": sources or [],
                "confidence": confidence,
                "is_faq": is_faq
            }

    def rename_chat_session(self, session_id: str, user_id: int, new_title: str) -> bool:
        new_title = new_title.strip()
        if not new_title:
            return False
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE chat_sessions 
                SET title = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND user_id = ?
            """, (new_title, session_id, user_id))
            conn.commit()
            return cursor.rowcount > 0

    def delete_chat_session(self, session_id: str, user_id: int) -> bool:
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM chat_sessions WHERE id = ? AND user_id = ?", (session_id, user_id))
            conn.commit()
            return cursor.rowcount > 0
