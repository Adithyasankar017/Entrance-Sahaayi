import unittest
from backend.app import get_exam_news, create_exam_news, delete_exam_news, NewsRequest

class TestDirectEndpoints(unittest.TestCase):
    def test_news_endpoint_flow(self):
        # 1. Fetch news
        res = get_exam_news()
        self.assertIn("news", res)
        self.assertIn("sync_meta", res)
        self.assertGreater(res["total"], 0)

        # 2. Filter by exam
        res_keam = get_exam_news(exam="KEAM")
        self.assertTrue(all(n.get("exam", "").lower() in ["keam", "all"] for n in res_keam["news"]))

        # 3. Create manual announcement
        req = NewsRequest(
            title="Direct Test Circular",
            exam="KEAM",
            category="Registration",
            date="Nov 13, 2026",
            summary="Unit test manual broadcast",
            urgent=True
        )
        create_res = create_exam_news(req, x_admin_key="admin123")
        created_id = create_res["news"]["id"]
        self.assertEqual(create_res["news"]["source"], "admin_manual")
        self.assertFalse(create_res["news"]["auto_synced"])

        # 4. Delete manual announcement
        del_res = delete_exam_news(created_id, x_admin_key="admin123")
        self.assertIn("removed", del_res["message"].lower())

if __name__ == "__main__":
    unittest.main()

