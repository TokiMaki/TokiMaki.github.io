#!/usr/bin/env python3

from __future__ import annotations

from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


OUT_PATH = Path("Docs/OATH_VALUE_REVERSE_TABLE.xlsx")


SET_STAGE_HEADERS = [
    "세트단계",
    "최종데미지증가(%)",
    "setPoint.current",
    "setPoint.min",
    "setPoint.max",
    "표본 캐릭터",
    "세트명",
    "메모",
]

SET_STAGE_ROWS = [
    ["레어 I", "", "", "", "", "", "", ""],
    ["레어 II", "", "", "", "", "", "", ""],
    ["레어 III", "", "", "", "", "", "", ""],
    ["레어 IV", "", "", "", "", "", "", ""],
    ["레어 V", "", "", "", "", "", "", ""],
    ["유니크 I", "", "", "", "", "", "", ""],
    ["유니크 II", "", "", "", "", "", "", ""],
    ["유니크 III", "", "", "", "", "", "", ""],
    ["유니크 IV", "", "", "", "", "", "", ""],
    ["유니크 V", "", "", "", "", "", "", ""],
    ["레전더리 I", "", "", "", "", "", "", ""],
    ["레전더리 II", "", "", "", "", "", "", ""],
    ["레전더리 III", "", "", "", "", "", "", ""],
    ["레전더리 IV", "", "", "", "", "", "", ""],
    ["레전더리 V", "", "", "", "", "", "", ""],
    ["에픽 I", "", "", "", "", "", "", ""],
    ["에픽 II", "", "", "", "", "", "", ""],
    ["에픽 III", "", "", "", "", "", "", ""],
    ["에픽 IV", "", "", "", "", "", "", ""],
    ["에픽 V", 391.1, 2440, 2440, 2550, "마키로그", "운명의 행운 서약", "API 확인값"],
    ["태초 I", "", "", "", "", "", "", ""],
    ["태초 II", "", "", "", "", "", "", ""],
    ["태초 III", "", "", "", "", "", "", ""],
    ["태초 IV", "", "", "", "", "", "", ""],
    ["태초 V", "", "", "", "", "", "", ""],
]

BLESSING_HEADERS = [
    "가호 단계/이름",
    "최종데미지증가(%)",
    "스킬쿨타임감소(%)",
    "버프력",
    "스킬범위(%)",
    "명성",
    "표본 캐릭터",
    "메모",
]

BLESSING_ROWS = [
    ["", 56.5, 18.5, 9120, 15, 4560, "마키로그", "API 확인값"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
]

RULE_ROWS = [
    ["입력 규칙"],
    ["퍼센트 값은 % 기호 없이 숫자만 입력한다."],
    ["공식 API 값이 391.1%라면 391.1로 입력한다."],
    ["같은 세트단계에서 세트명이 달라도 값이 같으면 표본 캐릭터/세트명만 추가 기록한다."],
    ["세트단계별 값이 확정되면 장비점수 계산에서는 세트 설명문을 해석하지 않고 이 표의 최종데미지증가 값을 사용한다."],
    [""],
    ["서약의 가호 포인트 보정 규칙"],
    ["같은 등급 구간 안에서 서약포인트 +25마다 최종데미지증가 +0.5%, 버프력 +70, 명성 +35를 더한다."],
    ["구간 내 단계 수 = floor((현재 서약포인트 - 해당 등급 구간 시작 포인트) / 25)"],
    ["최종데미지증가 = 등급 시작 최종데미지증가 + 구간 내 단계 수 * 0.5"],
    ["버프력 = 등급 시작 버프력 + 구간 내 단계 수 * 70"],
    ["명성 = 등급 시작 명성 + 구간 내 단계 수 * 35"],
    ["구간이 바뀌면 이전 구간 보정을 누적하지 않고 새 등급 시작값에서 다시 계산한다."],
    ["예: 2100점이 다음 구간 시작점이면 최종데미지 50, 버프력 8210, 명성 4105를 그대로 사용한다."],
    [""],
    ["API 위치"],
    ["서약 세트 단계: oath.setInfo.setRarityName + oath.setInfo.active.status"],
    ["서약 세트 포인트: oath.setInfo.active.setPoint"],
    ["서약의 가호: oath.blessing.status"],
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


def worksheet_xml(
    headers: list[str],
    rows: list[list[object]],
    widths: list[int],
    freeze: bool = True,
    autofilter: bool = True,
) -> str:
    max_col = len(headers)
    max_row = len(rows) + 1
    dimension = f"A1:{col_name(max_col)}{max_row}"
    cols = "".join(
        f'<col min="{index}" max="{index}" width="{width}" customWidth="1"/>'
        for index, width in enumerate(widths, 1)
    )
    views = (
        '<sheetViews><sheetView workbookViewId="0">'
        '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
        '<selection pane="bottomLeft"/>'
        '</sheetView></sheetViews>'
        if freeze
        else '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
    )
    body = [row_xml(1, headers, 1)]
    body.extend(row_xml(index, row) for index, row in enumerate(rows, 2))
    auto = f'<autoFilter ref="A1:{col_name(max_col)}{max_row}"/>' if autofilter else ""
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<dimension ref="{dimension}"/>'
        f'{views}'
        f'<cols>{cols}</cols>'
        f'<sheetData>{"".join(body)}</sheetData>'
        f'{auto}'
        '</worksheet>'
    )


def rules_sheet_xml() -> str:
    body = []
    for index, row in enumerate(RULE_ROWS, 1):
        style = 1 if row and row[0] in {"입력 규칙", "API 위치"} else None
        body.append(row_xml(index, row, style))
    max_row = len(RULE_ROWS)
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f'<dimension ref="A1:A{max_row}"/>'
        '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
        '<cols><col min="1" max="1" width="90" customWidth="1"/></cols>'
        f'<sheetData>{"".join(body)}</sheetData>'
        '</worksheet>'
    )


def write_workbook() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUT_PATH, "w", ZIP_DEFLATED) as xlsx:
        xlsx.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>
""",
        )
        xlsx.writestr(
            "_rels/.rels",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>
""",
        )
        xlsx.writestr(
            "xl/workbook.xml",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="서약 세트 단계" sheetId="1" r:id="rId1"/>
    <sheet name="서약의 가호" sheetId="2" r:id="rId2"/>
    <sheet name="입력 규칙" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>
""",
        )
        xlsx.writestr(
            "xl/_rels/workbook.xml.rels",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
""",
        )
        xlsx.writestr(
            "xl/styles.xml",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF2FF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>
""",
        )
        xlsx.writestr(
            "xl/worksheets/sheet1.xml",
            worksheet_xml(SET_STAGE_HEADERS, SET_STAGE_ROWS, [16, 18, 18, 14, 14, 16, 26, 24]),
        )
        xlsx.writestr(
            "xl/worksheets/sheet2.xml",
            worksheet_xml(BLESSING_HEADERS, BLESSING_ROWS, [18, 18, 18, 12, 12, 10, 16, 24]),
        )
        xlsx.writestr("xl/worksheets/sheet3.xml", rules_sheet_xml())


if __name__ == "__main__":
    write_workbook()
    print(OUT_PATH)
