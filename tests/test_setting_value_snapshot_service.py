import unittest
from unittest.mock import patch

from server import setting_value_snapshot_service as service


class SettingValueSnapshotServiceTest(unittest.TestCase):
    def test_incomplete_loadout_is_not_saved(self):
        with patch.object(service, "save_setting_value_snapshot") as save_snapshot:
            with self.assertRaises(service.SettingValueFinalizeUnavailable):
                service.finalize_character_setting_value(
                    {"settingValueInputs": {"schemaVersion": 1, "status": "incomplete"}},
                    {"cards": [{}]},
                    {"groups": [{}]},
                    {"groups": [{}]},
                    {"groups": [{}]},
                )
        save_snapshot.assert_not_called()

    def test_finalize_uses_supplied_payloads_and_saves_latest_snapshot(self):
        loadout = {
            "serverId": "cain",
            "characterId": "character-1",
            "characterName": "테스트",
            "fame": 12345,
            "damageBaseline": {
                "jobName": "귀검사(남)",
                "jobGrowName": "眞 웨펀마스터",
                "statName": "힘",
            },
            "bufferBaseline": None,
            "title": {
                "itemId": "title-item",
                "itemName": "테스트 칭호",
                "itemRarity": "레전더리",
                "iconUrl": "https://example.com/title.png",
            },
            "aura": {
                "itemId": "aura-item",
                "itemName": "테스트 오라",
                "itemRarity": "레전더리",
                "iconUrl": "https://example.com/aura.png",
            },
            "creature": {
                "itemId": "creature-item",
                "itemName": "테스트 크리쳐",
                "itemRarity": "레전더리",
                "iconUrl": "https://example.com/creature.png",
            },
            "enchants": [{
                "slot": "무기",
                "effects": {"finalDamage": 3, "elementAll": 15},
                "reinforceSkill": [],
            }],
            "equipmentUpgrades": [{
                "slot": "무기",
                "slotId": "WEAPON",
                "itemId": "weapon",
                "itemName": "무기",
                "itemRarity": "에픽",
                "reinforce": 13,
                "isAmplified": False,
                "precisionPercent": 100,
                "tuneLevel": 1,
            }],
            "oathUpgrades": {
                "itemId": "oath-body",
                "itemName": "황금의 서약",
                "itemRarity": "에픽",
                "setName": "황금향",
                "setOptionName": "찬란한 황금향",
                "setRarityName": "에픽 III",
                "setPoint": 2550,
                "crystals": [{
                    "itemId": "oath-1",
                    "itemName": "서약 결정",
                    "itemRarity": "에픽",
                    "tuneLevel": 2,
                }],
            },
            "settingValueInputs": {
                "schemaVersion": 1,
                "status": "ready",
                "blackFangRows": [],
                "uniqueEquipmentRows": [{"itemId": "weapon"}],
                "directPrices": {},
                "platinumPriceByName": {},
            },
        }
        catalogs = (
            {"cards": [{}]},
            {"groups": [{}]},
            {"groups": [{}]},
            {"groups": [{}]},
        )
        calculated = {
            "label": "세팅 추정 가치",
            "totalGold": 123,
            "breakdown": [],
            "details": [
                {
                    "key": "amplification",
                    "label": "증폭 기대값",
                    "gold": 123,
                    "items": [{"label": "무기 +11 증폭", "gold": 123}],
                },
                {
                    "key": "enchant",
                    "label": "마법부여",
                    "gold": 0,
                    "items": [{
                        "slot": "무기",
                        "effectText": "최종 데미지 +3% / 모든 속성 강화 +15",
                        "tier": "종결",
                        "isEnd": True,
                    }],
                },
            ],
        }

        with (
            patch.object(service, "build_character_setting_value", return_value=calculated) as build_value,
            patch.object(
                service,
                "get_cached_official_equipment_score",
                return_value={"equipmentScore": 456, "buffScore": None},
            ),
            patch.object(service, "save_setting_value_snapshot", return_value=True) as save_snapshot,
        ):
            result = service.finalize_character_setting_value(loadout, *catalogs)

        self.assertEqual(result["role"], "dealer")
        self.assertEqual(result["equipmentScore"], 456)
        self.assertEqual(result["settingValue"]["totalGold"], 123)
        self.assertEqual(result["settingValue"]["details"][0]["items"][0]["gold"], 123)
        self.assertEqual(result["equipment"][0]["reinforce"], 13)
        self.assertTrue(result["equipment"][0]["isRelic"])
        self.assertEqual(result["equipment"][0]["precisionPercent"], 100)
        self.assertEqual(result["statName"], "힘")
        self.assertEqual(result["equipment"][0]["enchant"]["effects"]["finalDamage"], 3)
        self.assertEqual(result["equipment"][0]["enchant"]["tier"], "종결")
        self.assertTrue(result["equipment"][0]["enchant"]["isEnd"])
        self.assertEqual(
            result["equipment"][0]["enchant"]["effectText"],
            "최종 데미지 +3% / 모든 속성 강화 +15",
        )
        self.assertEqual(result["oath"][0]["kind"], "oath")
        self.assertEqual(result["oath"][0]["itemId"], "oath-body")
        self.assertEqual(result["oath"][0]["setPoint"], 2550)
        self.assertEqual(result["oath"][1]["kind"], "crystal")
        self.assertEqual(result["oath"][1]["itemId"], "oath-1")
        self.assertEqual(result["oath"][1]["tuneLevel"], 2)
        self.assertEqual(result["title"]["itemId"], "title-item")
        self.assertEqual(result["aura"]["itemId"], "aura-item")
        self.assertEqual(result["creature"]["itemId"], "creature-item")
        build_value.assert_called_once()
        save_snapshot.assert_called_once()
        saved_snapshot = save_snapshot.call_args.args[0]
        self.assertNotIn("details", saved_snapshot["settingValue"])
        self.assertEqual(saved_snapshot["settingValue"]["totalGold"], 123)

    def test_empty_price_catalog_is_not_saved(self):
        loadout = {
            "settingValueInputs": {"schemaVersion": 1, "status": "ready"},
        }
        with patch.object(service, "save_setting_value_snapshot") as save_snapshot:
            with self.assertRaises(service.SettingValueFinalizeUnavailable):
                service.finalize_character_setting_value(
                    loadout,
                    {"cards": []},
                    {"groups": [{}]},
                    {"groups": [{}]},
                    {"groups": [{}]},
                )
        save_snapshot.assert_not_called()


if __name__ == "__main__":
    unittest.main()
