import unittest
import os
import json
from backend.live_news_service import (
    clean_html, 
    normalize_text, 
    detect_category, 
    detect_urgency, 
    generate_parent_tip,
    format_date_str,
    load_news_file,
    get_sync_metadata
)

class TestLiveNewsEngine(unittest.TestCase):
    def test_clean_html(self):
        raw = "<p>KEAM <b>registration</b> is open &amp; active.</p>"
        cleaned = clean_html(raw)
        self.assertEqual(cleaned, "KEAM registration is open & active.")

    def test_normalize_text(self):
        t1 = "KEAM 2026: Final Rank List Released!"
        t2 = "keam 2026 final rank list released"
        self.assertEqual(normalize_text(t1), normalize_text(t2))

    def test_detect_category(self):
        self.assertEqual(detect_category("JEE Main Application Window", "register online"), "Registration")
        self.assertEqual(detect_category("NEET-UG Admit Card Released", "download hall ticket"), "Admit Card")
        self.assertEqual(detect_category("KEAM 2026 Seat Allotment Phase 1", "counseling process"), "Counseling")
        self.assertEqual(detect_category("CUET Scorecard and Rank", "check merit list"), "Results")
        self.assertEqual(detect_category("NEET Exam Date and Shift Timings", "schedule announced"), "Exam Date")

    def test_detect_urgency(self):
        self.assertTrue(detect_urgency("Last Date to Apply for JEE Main Ends Today", ""))
        self.assertTrue(detect_urgency("Urgent: NEET 2026 Syllabus Released", ""))
        self.assertFalse(detect_urgency("General Information on Central Universities", "Study options in DU"))

    def test_generate_parent_tip(self):
        tip_keam = generate_parent_tip("KEAM", "Registration")
        self.assertIn("Akshaya", tip_keam)
        tip_jee = generate_parent_tip("JEE Main", "Registration")
        self.assertIn("Aadhaar", tip_jee)

    def test_format_date_str(self):
        rfc = "Fri, 13 Nov 2026 08:30:00 GMT"
        formatted = format_date_str(rfc)
        self.assertEqual(formatted, "Nov 13, 2026")

    def test_news_file_and_meta(self):
        news = load_news_file()
        self.assertIsInstance(news, list)
        self.assertGreater(len(news), 0)
        meta = get_sync_metadata()
        self.assertTrue(meta.get("auto_sync_active"))

if __name__ == "__main__":
    unittest.main()

