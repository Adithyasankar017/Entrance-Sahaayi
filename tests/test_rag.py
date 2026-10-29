import os
import sys
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from pdf_parser import DocumentParser
from rag_engine import RAGSystem

class TestEntranceSahaayiV2(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
        cls.rag = RAGSystem(data_dir=cls.data_dir)

    def test_faqs_loaded(self):
        self.assertGreater(len(self.rag.faqs), 0, "FAQs should be loaded from data/faqs.json")

    def test_faq_short_circuit_query(self):
        res = self.rag.query("What is the minimum eligibility criteria for JEE Main?", persona="Student")
        self.assertTrue(res["is_faq_short_circuit"], "Query should trigger FAQ short-circuit")

    def test_strict_grounding_notice_for_unrelated_query(self):
        res = self.rag.query("What is the recipe for chocolate cake?", persona="Student")
        self.assertIn("Strict Grounding Notice", res["answer"], "Unrelated query should trigger strict grounding warning notice")
        self.assertEqual(len(res["sources"]), 0)

    def test_exam_context_filtered_query(self):
        res = self.rag.query("How is rank calculated?", persona="Parent", exam_context="KEAM")
        self.assertIn("KEAM", res["answer"])
        self.assertIn("Parent Guidance Briefing [KEAM]", res["answer"])

    def test_student_profile_analyzer(self):
        analysis = self.rag.analyze_student_profile(
            stream="PCM",
            class12_marks=86.5,
            physics=88.0,
            math=90.0,
            bio=0.0,
            interests=["Artificial Intelligence", "Software Engineering"],
            budget="Govt / Merit"
        )
        self.assertIn("student_summary", analysis)
        self.assertGreater(len(analysis["recommendations"]), 0)
        jee_rec = next(r for r in analysis["recommendations"] if "JEE" in r["exam"])
        self.assertIn("Eligible", jee_rec["eligibility_verdict"])

    def test_parse_and_analyze_marksheet(self):
        doc_path = os.path.join(self.data_dir, "documents", "JEE_Main_Information_Brochure.txt")
        if os.path.exists(doc_path):
            result = self.rag.parse_and_analyze_marksheet(doc_path, interests=["AI", "Engineering"])
            self.assertIn("recommendations", result)
            self.assertIn("detected_percentage", result)

    def test_conversational_greeting_with_exam_context(self):
        res = self.rag.query("hello", persona="Student", exam_context="NEET-UG")
        self.assertEqual(len(res["sources"]), 0, "Greetings should not retrieve brochure citations")
        self.assertIn("NEET-UG", res["answer"])
        self.assertIn("How can I help you", res["answer"])

    def test_conversational_identity_query(self):
        res = self.rag.query("who are you", persona="Student")
        self.assertEqual(len(res["sources"]), 0)
        self.assertIn("Sree", res["answer"])

    def test_hey_sree_wake_word_query(self):
        res = self.rag.query("Hey Sree", persona="Student")
        self.assertEqual(len(res["sources"]), 0)
        self.assertIn("Sree", res["answer"])

if __name__ == "__main__":
    unittest.main()
