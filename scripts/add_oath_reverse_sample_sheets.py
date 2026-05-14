#!/usr/bin/env python3

from __future__ import annotations

import re
import shutil
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


WORKBOOK_PATH = Path("Docs/OATH_VALUE_REVERSE_TABLE.xlsx")
BACKUP_PATH = Path("Docs/OATH_VALUE_REVERSE_TABLE.xlsx.bak")

SHEETS_TO_ADD = [
    {
        "name": "역산 기준",
        "headers": ["항목", "값", "메모"],
        "rows": [
            ["기준 장비점수", "", "변경 전 공식 장비점수"],
            ["기준 서약포인트", "", "변경 전 oath.setInfo.active.setPoint.current"],
            ["기준 레어 결정 개수", "", "변경 전 레어 결정 개수"],
            ["기준 유니크 결정 개수", "", "변경 전 유니크 결정 개수"],
            ["기준 레전더리 결정 개수", "", "변경 전 레전더리 결정 개수"],
            ["기준 에픽 결정 개수", "", "변경 전 에픽 결정 개수"],
            ["기준 태초 결정 개수", "", "변경 전 태초 결정 개수"],
            ["기준 세트단계", "", "예: 에픽 V"],
            ["기준 세트 최종데미지(%)", "", "알고 있으면 입력, 모르면 비워둠"],
            ["기준 기타 전후비", 1, "세트 외 옵션 변화가 없으면 1"],
        ],
        "widths": [24, 18, 48],
    },
    {
        "name": "세트단계 표본",
        "headers": [
            "표본명",
            "변경 후 장비점수",
            "변경 후 서약포인트",
            "변경 후 세트단계",
            "레어 결정 개수",
            "유니크 결정 개수",
            "레전더리 결정 개수",
            "에픽 결정 개수",
            "태초 결정 개수",
            "기타 전후비",
            "역산 세트 최종데미지(%)",
            "메모",
        ],
        "rows": [
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
            ["", "", "", "", "", "", "", "", "", 1, "", ""],
        ],
        "widths": [16, 18, 18, 18, 16, 18, 20, 16, 16, 14, 24, 36],
    },
]


def col_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def cell_xml(row_index: int, col_index: int, value: object, style: int | None = None) -> str:
    ref = f"{col_name(col_index)}{row_index}"
    style_attr = f' s="{style}"' if style is not None else ""
    if value == "" or value is None:
        return f'<c r="{ref}"{style_attr}/>'
    if isinstance(value, int | float):
        return f'<c r="{ref}"{style_attr}><v>{value}</v></c>'
    return f'<c r="{ref}" t="inlineStr"{style_attr}><is><t>{escape(str(value))}</t></is></c>'


def row_xml(row_index: int, values: list[object], style: int | None = None) -> str:
    cells = "".join(cell_xml(row_index, col_index, value, style) for col_index, value in enumerate(values, 1))
    return f'<row r="{row_index}">{cells}</row>'


def worksheet_xml(headers: list[str], rows: list[list[object]], widths: list[int]) -> str:
    max_col = len(headers)
    max_row = len(rows) + 1
    cols = "".join(
        f'<col min="{index}" max="{index}" width="{width}" customWidth="1"/>'
        for index, width in enumerate(widths, 1)
    )
    sheet_rows = [row_xml(1, headers, 1)]
    sheet_rows.extend(row_xml(index, row) for index, row in enumerate(rows, 2))
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<dimension ref="A1:{col_name(max_col)}{max_row}"/>'
        '<sheetViews><sheetView workbookViewId="0">'
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
        '<selection pane="bottomLeft"/>'
        '</sheetView></sheetViews>'
        f'<cols>{cols}</cols>'
        f'<sheetData>{"".join(sheet_rows)}</sheetData>'
        f'<autoFilter ref="A1:{col_name(max_col)}{max_row}"/>'
        '</worksheet>'
    )


def read_text(entries: dict[str, bytes], name: str) -> str:
    return entries[name].decode("utf-8")


def existing_sheet_names(workbook_xml: str) -> set[str]:
    return set(re.findall(r'<sheet\b[^>]*\bname="([^"]+)"', workbook_xml))


def max_sheet_id(workbook_xml: str) -> int:
    ids = [int(value) for value in re.findall(r'\bsheetId="(\d+)"', workbook_xml)]
    return max(ids, default=0)


def max_relationship_id(rels_xml: str) -> int:
    ids = [int(value) for value in re.findall(r'\bId="rId(\d+)"', rels_xml)]
    return max(ids, default=0)


def max_worksheet_index(entries: dict[str, bytes]) -> int:
    indexes = []
    for name in entries:
        match = re.fullmatch(r"xl/worksheets/sheet(\d+)\.xml", name)
        if match:
            indexes.append(int(match.group(1)))
    return max(indexes, default=0)


def add_before_close_tag(xml: str, close_tag: str, addition: str) -> str:
    index = xml.rfind(close_tag)
    if index == -1:
        raise RuntimeError(f"{close_tag} 태그를 찾지 못했습니다.")
    return xml[:index] + addition + xml[index:]


def add_override(content_types_xml: str, sheet_index: int) -> str:
    part_name = f"/xl/worksheets/sheet{sheet_index}.xml"
    if part_name in content_types_xml:
        return content_types_xml
    addition = (
        f'<Override PartName="{part_name}" '
        'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
    )
    return add_before_close_tag(content_types_xml, "</Types>", addition)


def main() -> None:
    if not WORKBOOK_PATH.exists():
        raise FileNotFoundError(WORKBOOK_PATH)

    with ZipFile(WORKBOOK_PATH, "r") as source:
        entries = {info.filename: source.read(info.filename) for info in source.infolist()}

    workbook_xml = read_text(entries, "xl/workbook.xml")
    rels_xml = read_text(entries, "xl/_rels/workbook.xml.rels")
    content_types_xml = read_text(entries, "[Content_Types].xml")

    existing_names = existing_sheet_names(workbook_xml)
    pending = [sheet for sheet in SHEETS_TO_ADD if sheet["name"] not in existing_names]
    if not pending:
        print("추가할 시트가 없습니다.")
        return

    next_sheet_id = max_sheet_id(workbook_xml) + 1
    next_rel_id = max_relationship_id(rels_xml) + 1
    next_sheet_index = max_worksheet_index(entries) + 1

    for sheet in pending:
        sheet_index = next_sheet_index
        rel_id = f"rId{next_rel_id}"
        sheet_id = next_sheet_id
        sheet_name = sheet["name"]

        entries[f"xl/worksheets/sheet{sheet_index}.xml"] = worksheet_xml(
            sheet["headers"],
            sheet["rows"],
            sheet["widths"],
        ).encode("utf-8")

        workbook_xml = add_before_close_tag(
            workbook_xml,
            "</sheets>",
            f'<sheet name="{escape(sheet_name)}" sheetId="{sheet_id}" r:id="{rel_id}"/>',
        )
        rels_xml = add_before_close_tag(
            rels_xml,
            "</Relationships>",
            (
                f'<Relationship Id="{rel_id}" '
                'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
                f'Target="worksheets/sheet{sheet_index}.xml"/>'
            ),
        )
        content_types_xml = add_override(content_types_xml, sheet_index)

        next_sheet_id += 1
        next_rel_id += 1
        next_sheet_index += 1

    entries["xl/workbook.xml"] = workbook_xml.encode("utf-8")
    entries["xl/_rels/workbook.xml.rels"] = rels_xml.encode("utf-8")
    entries["[Content_Types].xml"] = content_types_xml.encode("utf-8")

    if not BACKUP_PATH.exists():
        shutil.copy2(WORKBOOK_PATH, BACKUP_PATH)

    temp_path = WORKBOOK_PATH.with_suffix(".xlsx.tmp")
    with ZipFile(temp_path, "w", ZIP_DEFLATED) as target:
        for name, payload in entries.items():
            target.writestr(name, payload)
    temp_path.replace(WORKBOOK_PATH)

    print(f"추가된 시트: {', '.join(sheet['name'] for sheet in pending)}")


if __name__ == "__main__":
    main()
