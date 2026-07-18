import unittest

from server.data_store import load_job_base_stats, resolve_job_base_stat_row


class JobBaseStatResolverTest(unittest.TestCase):
    def test_male_crusader_alias(self):
        row = resolve_job_base_stat_row("프리스트(남)", "眞 크루세이더")

        self.assertEqual(row.get("힘"), 630)
        self.assertEqual(row.get("지능"), 618)

    def test_female_crusader_alias(self):
        row = resolve_job_base_stat_row("프리스트(여)", "眞 크루세이더")

        self.assertEqual(row.get("힘"), 630)
        self.assertEqual(row.get("지능"), 818)

    def test_regular_job_keeps_exact_lookup(self):
        expected = load_job_base_stats().get("眞 버서커")

        self.assertIs(resolve_job_base_stat_row("귀검사(남)", "眞 버서커"), expected)

    def test_unknown_job_keeps_empty_result(self):
        self.assertEqual(resolve_job_base_stat_row("알 수 없음", "眞 알 수 없음"), {})


if __name__ == "__main__":
    unittest.main()
