#!/usr/bin/env python3

from __future__ import annotations

import math
import re
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


WORKBOOK_PATH = Path("Docs/OATH_VALUE_REVERSE_TABLE.xlsx")
BACKUP_PATH = Path("Docs/OATH_VALUE_REVERSE_TABLE.xlsx.formula.bak")

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
ET.register_namespace("", NS_MAIN)
ET.register_namespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
ET.register_namespace("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006")
ET.register_namespace("x14ac", "http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac")
ET.register_namespace("xr", "http://schemas.microsoft.com/office/spreadsheetml/2014/revision")
ET.register_namespace("xr2", "http://schemas.microsoft.com/office/spreadsheetml/2015/revision2")
ET.register_namespace("xr3", "http://schemas.microsoft.com/office/spreadsheetml/2016/revision3")

Q = f"{{{NS_MAIN}}}"

HEADERS = {
    "K1": "단계 증가량(%)",
    "L1": "누적 증가량(%)",
    "M1": "결정배율",
    "N1": "서약등급배율",
    "O1": "가호최종뎀배율",
    "P1": "보정점수",
}

CRYSTAL_VALUES = (13, 17, 20, 23, 26)
GRADE_FINAL_DAMAGE = {
    "유니크": 38,
    "레전더리": 44,
    "에픽": 50,
    "태초": 57,
}
BLESSING_STARTS = (
    ("태초", 2550, 62),
    ("에픽", 2100, 50),
    ("레전더리", 1650, 39),
    ("유니크", 1200, 28),
    ("레어", 750, 17),
)


def col_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def cell_col_index(ref: str) -> int:
    col = "".join(ch for ch in ref if ch.isalpha())
    index = 0
    for ch in col:
        index = index * 26 + ord(ch) - 64
    return index


def row_index_from_ref(ref: str) -> int:
    return int("".join(ch for ch in ref if ch.isdigit()))


def get_cell(row: ET.Element, ref: str) -> ET.Element | None:
    for cell in row.findall(f"{Q}c"):
        if cell.attrib.get("r") == ref:
            return cell
    return None


def sort_row_cells(row: ET.Element) -> None:
    cells = list(row.findall(f"{Q}c"))
    for cell in cells:
        row.remove(cell)
    cells.sort(key=lambda cell: cell_col_index(cell.attrib.get("r", "A1")))
    for cell in cells:
        row.append(cell)


def set_inline_string(row: ET.Element, ref: str, value: str, style: str | None = None) -> None:
    cell = get_cell(row, ref)
    if cell is None:
        cell = ET.SubElement(row, f"{Q}c", {"r": ref})
    cell.attrib["t"] = "inlineStr"
    if style is not None:
        cell.attrib["s"] = style
    for child in list(cell):
        cell.remove(child)
    inline = ET.SubElement(cell, f"{Q}is")
    text = ET.SubElement(inline, f"{Q}t")
    text.text = value


def set_formula(row: ET.Element, ref: str, formula: str, cached_value: float | int | None) -> None:
    cell = get_cell(row, ref)
    if cell is None:
        cell = ET.SubElement(row, f"{Q}c", {"r": ref})
    cell.attrib.pop("t", None)
    for child in list(cell):
        cell.remove(child)
    f_node = ET.SubElement(cell, f"{Q}f")
    f_node.text = formula
    if cached_value is not None:
        v_node = ET.SubElement(cell, f"{Q}v")
        v_node.text = f"{cached_value:.12g}" if isinstance(cached_value, float) else str(cached_value)


def read_shared_strings(entries: dict[str, bytes]) -> list[str]:
    if "xl/sharedStrings.xml" not in entries:
        return []
    root = ET.fromstring(entries["xl/sharedStrings.xml"])
    values = []
    for si in root.findall(f"{Q}si"):
        texts = [node.text or "" for node in si.iter(f"{Q}t")]
        values.append("".join(texts))
    return values


def cell_value(cell: ET.Element | None, shared_strings: list[str]) -> object:
    if cell is None:
        return ""
    if cell.attrib.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{Q}t"))
    value_node = cell.find(f"{Q}v")
    if value_node is None:
        return ""
    raw = value_node.text or ""
    if cell.attrib.get("t") == "s":
        return shared_strings[int(raw)] if raw else ""
    try:
        number = float(raw)
    except ValueError:
        return raw
    return int(number) if number.is_integer() else number


def numeric(value: object) -> float:
    return 0.0 if value in ("", None) else float(value)


def grade_multiplier(grade: object) -> float:
    return 1 + GRADE_FINAL_DAMAGE.get(str(grade), 0) / 100


def blessing_final_damage(point: object) -> float:
    current_point = numeric(point)
    for _, start, value in BLESSING_STARTS:
        if current_point >= start:
            return value + math.floor((current_point - start) / 25) * 0.5
    return 0.0


def crystal_multiplier(counts: list[object]) -> float:
    multiplier = 1.0
    for count, value in zip(counts, CRYSTAL_VALUES):
        multiplier *= (1 + value / 100) ** numeric(count)
    return multiplier


def update_dimension(root: ET.Element) -> None:
    dimension = root.find(f"{Q}dimension")
    if dimension is not None:
        dimension.attrib["ref"] = "A1:P27"


def add_columns(root: ET.Element) -> None:
    cols = root.find(f"{Q}cols")
    if cols is None:
        sheet_data = root.find(f"{Q}sheetData")
        cols = ET.Element(f"{Q}cols")
        if sheet_data is None:
            root.append(cols)
        else:
            root.insert(list(root).index(sheet_data), cols)
    if not any(col.attrib.get("min") == "11" and col.attrib.get("max") == "16" for col in cols.findall(f"{Q}col")):
        cols.append(ET.Element(f"{Q}col", {"min": "11", "max": "16", "width": "18", "customWidth": "1"}))


def update_formulas() -> None:
    if not WORKBOOK_PATH.exists():
        raise FileNotFoundError(WORKBOOK_PATH)

    with ZipFile(WORKBOOK_PATH, "r") as source:
        entries = {info.filename: source.read(info.filename) for info in source.infolist()}

    shared_strings = read_shared_strings(entries)
    root = ET.fromstring(entries["xl/worksheets/sheet1.xml"])
    sheet_data = root.find(f"{Q}sheetData")
    if sheet_data is None:
        raise RuntimeError("sheetData를 찾지 못했습니다.")

    update_dimension(root)
    add_columns(root)

    rows_by_index = {
        int(row.attrib["r"]): row
        for row in sheet_data.findall(f"{Q}row")
        if row.attrib.get("r")
    }
    header_row = rows_by_index.get(1)
    if header_row is None:
        raise RuntimeError("헤더 행을 찾지 못했습니다.")

    header_style = get_cell(header_row, "J1").attrib.get("s") if get_cell(header_row, "J1") is not None else None
    for ref, value in HEADERS.items():
        set_inline_string(header_row, ref, value, header_style)
    sort_row_cells(header_row)

    adjusted_scores: dict[int, float] = {}
    for row_index in range(2, 23):
        row = rows_by_index.get(row_index)
        if row is None:
            continue
        score = numeric(cell_value(get_cell(row, f"B{row_index}"), shared_strings))
        if score <= 0:
            continue
        point = cell_value(get_cell(row, f"C{row_index}"), shared_strings)
        grade = cell_value(get_cell(row, f"D{row_index}"), shared_strings)
        counts = [cell_value(get_cell(row, f"{col}{row_index}"), shared_strings) for col in "EFGHI"]

        crystal = crystal_multiplier(counts)
        grade_mult = grade_multiplier(grade)
        blessing_mult = 1 + blessing_final_damage(point) / 100
        adjusted = score / crystal / grade_mult / blessing_mult
        adjusted_scores[row_index] = adjusted

        set_formula(
            row,
            f"M{row_index}",
            f"POWER(1.13,N(E{row_index}))*POWER(1.17,N(F{row_index}))*POWER(1.2,N(G{row_index}))*POWER(1.23,N(H{row_index}))*POWER(1.26,N(I{row_index}))",
            crystal,
        )
        set_formula(
            row,
            f"N{row_index}",
            f'SWITCH(D{row_index},"유니크",1.38,"레전더리",1.44,"에픽",1.5,"태초",1.57,1)',
            grade_mult,
        )
        set_formula(
            row,
            f"O{row_index}",
            (
                f'1+(SWITCH(TRUE,C{row_index}>=2550,62+INT((C{row_index}-2550)/25)*0.5,'
                f'C{row_index}>=2100,50+INT((C{row_index}-2100)/25)*0.5,'
                f'C{row_index}>=1650,39+INT((C{row_index}-1650)/25)*0.5,'
                f'C{row_index}>=1200,28+INT((C{row_index}-1200)/25)*0.5,'
                f'C{row_index}>=750,17+INT((C{row_index}-750)/25)*0.5,0))/100'
            ),
            blessing_mult,
        )
        set_formula(row, f"P{row_index}", f"B{row_index}/M{row_index}/N{row_index}/O{row_index}", adjusted)

        if row_index == 2:
            step_value = 0
            step_formula = "0"
        else:
            previous = adjusted_scores.get(row_index - 1)
            step_value = ((adjusted / previous) - 1) * 100 if previous else None
            step_formula = f"(P{row_index}/P{row_index - 1}-1)*100"
        cumulative_value = ((adjusted / adjusted_scores[2]) - 1) * 100 if 2 in adjusted_scores else None
        set_formula(row, f"K{row_index}", step_formula, step_value)
        set_formula(row, f"L{row_index}", f"(P{row_index}/$P$2-1)*100", cumulative_value)
        sort_row_cells(row)

    entries["xl/worksheets/sheet1.xml"] = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    if not BACKUP_PATH.exists():
        shutil.copy2(WORKBOOK_PATH, BACKUP_PATH)

    temp_path = WORKBOOK_PATH.with_suffix(".xlsx.formula.tmp")
    with ZipFile(temp_path, "w", ZIP_DEFLATED) as target:
        for name, payload in entries.items():
            target.writestr(name, payload)
    temp_path.replace(WORKBOOK_PATH)

    print("서약 세트 단계 시트에 단계 증가량/누적 증가량 수식을 추가했습니다.")


if __name__ == "__main__":
    update_formulas()
