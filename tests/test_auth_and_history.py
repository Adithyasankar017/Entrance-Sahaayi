import os
import sys
import unittest
import tempfile

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from database import DatabaseManager
from rag_engine import RAGSystem

class TestUserAuthAndHistory(unittest.TestCase):

    def setUp(self):
        # Use temporary file database for tests
        self.tmp_db_fd, self.tmp_db_path = tempfile.mkstemp(suffix=".db")
        self.db = DatabaseManager(db_path=self.tmp_db_path)
        self.data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
        self.rag = RAGSystem(data_dir=self.data_dir)

    def tearDown(self):
        try:
            os.close(self.tmp_db_fd)
        except Exception:
            pass
        if os.path.exists(self.tmp_db_path):
            try:
                os.remove(self.tmp_db_path)
            except Exception:
                pass

    def test_user_registration_and_authentication(self):
        # 1. Register User
        user = self.db.register_user(
            email="teststudent@example.com",
            password="securepassword123",
            full_name="Ananya Nair",
            role="Student",
            profile_data={"stream": "PCM", "class12_marks": 88.5}
        )
        self.assertIsNotNone(user["token"])
        self.assertEqual(user["email"], "teststudent@example.com")
        self.assertEqual(user["full_name"], "Ananya Nair")

        # 2. Duplicate Registration should fail
        with self.assertRaises(ValueError):
            self.db.register_user("teststudent@example.com", "pass", "Duplicate", "Student")

        # 3. Authenticate with correct credentials
        auth_user = self.db.authenticate_user("teststudent@example.com", "securepassword123")
        self.assertEqual(auth_user["id"], user["id"])
        self.assertEqual(auth_user["profile"]["stream"], "PCM")

        # 4. Authenticate with wrong password should fail
        with self.assertRaises(ValueError):
            self.db.authenticate_user("teststudent@example.com", "wrongpass")

        # 5. Get user by token
        token_user = self.db.get_user_by_token(auth_user["token"])
        self.assertIsNotNone(token_user)
        self.assertEqual(token_user["email"], "teststudent@example.com")

    def test_user_profile_updates(self):
        user = self.db.register_user("parent@example.com", "pass123", "Rajesh Sharma", "Parent")
        updated_profile = self.db.update_user_profile(user["id"], {"budget": "Govt / Merit", "interests": ["Medicine"]})
        self.assertEqual(updated_profile["budget"], "Govt / Merit")

        fetched_user = self.db.get_user_by_token(user["token"])
        self.assertEqual(fetched_user["profile"]["interests"], ["Medicine"])

    def test_chat_session_history_and_persistence(self):
        user = self.db.register_user("history@example.com", "pass123", "Karthik Kumar", "Student")

        # 1. Create chat session topic
        session = self.db.create_chat_session(
            user_id=user["id"],
            title="KEAM Rank & Syllabus Query",
            persona="Student",
            exam_context="KEAM"
        )
        session_id = session["id"]
        self.assertIsNotNone(session_id)

        # 2. Add user query and bot response
        self.db.add_chat_message(session_id, user["id"], "user", "What is the KEAM rank formula?")
        self.db.add_chat_message(session_id, user["id"], "bot", "KEAM uses 50:50 weightage between entrance score and Class 12 PCM marks.")

        # 3. Retrieve session with messages
        fetched_session = self.db.get_chat_session(session_id, user["id"])
        self.assertIsNotNone(fetched_session)
        self.assertEqual(len(fetched_session["messages"]), 2)
        self.assertEqual(fetched_session["messages"][0]["content"], "What is the KEAM rank formula?")

        # 4. List user sessions
        user_sessions = self.db.get_user_chat_sessions(user["id"])
        self.assertEqual(len(user_sessions), 1)
        self.assertEqual(user_sessions[0]["id"], session_id)

        # 5. Rename session
        success_rename = self.db.rename_chat_session(session_id, user["id"], "KEAM 2026 Guidance")
        self.assertTrue(success_rename)
        updated_session = self.db.get_chat_session(session_id, user["id"])
        self.assertEqual(updated_session["title"], "KEAM 2026 Guidance")

        # 6. Delete session
        success_delete = self.db.delete_chat_session(session_id, user["id"])
        self.assertTrue(success_delete)
        self.assertEqual(len(self.db.get_user_chat_sessions(user["id"])), 0)

    def test_rag_query_with_conversational_history(self):
        history = [
            {"sender": "user", "content": "Tell me about KEAM entrance exam."},
            {"sender": "bot", "content": "KEAM is conducted by CEE Kerala for engineering and pharmacy admissions."}
        ]
        # Multi-turn follow up query
        res = self.rag.query("What is its eligibility criteria?", persona="Student", exam_context="KEAM", history=history)
        self.assertIsNotNone(res["answer"])
        self.assertIn("KEAM", res["answer"])

if __name__ == "__main__":
    unittest.main()
