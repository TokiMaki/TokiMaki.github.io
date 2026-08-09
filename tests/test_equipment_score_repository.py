import unittest

from server.repositories.equipment_score_repository import decode_official_point


class EquipmentScoreRepositoryTest(unittest.TestCase):
    def test_decodes_seven_digit_official_equipment_score(self):
        self.assertEqual(
            decode_official_point(
                "BgoKDg4KNjYEHFZSKw4HQwtzcHJycXZzaC54EDciFAhyTG9yejEtbn5ndA==",
                "QUJDREVG",
                "R0hJSktM",
            ),
            1_015_356,
        )


if __name__ == "__main__":
    unittest.main()
