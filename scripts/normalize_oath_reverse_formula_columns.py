#!/usr/bin/env python3

from __future__ import annotations

import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


WORKBOOK_PATH = Path("Docs/OATH_VALUE_REVERSE_TABLE.xlsx")
BACKUP_PATH = Path("Docs/OATH_VALUE_REVERSE_TABLE.xlsx.columns.bak")

NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
Q = f"{{{NS_MAIN}}}"

ET.register_namespace("", NS_MAIN)
ET.register_namespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
ET.register_namespace("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006")
ET.register_namespace("x14ac", "http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac")
ET.register_namespace("xr", "http://schemas.microsoft.com/office/spreadsheetml/2014/revision")
ET.register_namespace("xr2", "http://schemas.microsoft.com/office/spreadsheetml/2015/revision2")
ET.register_namespace("xr3", "http://schemas.microsoft.com/office/spreadsheetml/2016/revision3")

HEADERS = {
    "J1": "단계 증가량(%)",
    "K1": "누적 증가량(%)",
    "L1": "결정배율",
    "M1": "서약등급배율",
    "N1": "가호최종뎀배율",
    "O1": "보정점수",
}


def col_index(ref: str) -> int:
    col = "".join(ch for ch in ref if ch.isalpha())
    index = 0
    for ch in col:
        index = index * 26 + ord(ch) - 64
    return index


def get_cell(row: ET.Element, ref: str) -> ET.Element | None:
    for cell in row.findall(f"{Q}c"):
        if cell.attrib.get("r") == ref:
            return cell
    return None


def remove_cell(row: ET.Element, ref: str) -> None:
    cell = get_cell(row, ref)
    if cell is not None:
        row.remove(cell)


def sort_row(row: ET.Element) -> None:
    cells = list(row.findall(f"{Q}c"))
    for cell in cells:
        row.remove(cell)
    for cell in sorted(cells, key=lambda cell: col_index(cell.attrib.get("r", "A1"))):
        row.append(cell)


def set_inline(row: ET.Element, ref: str, value: str, style: str | None = None) -> None:
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


def set_formula(row: ET.Element, ref: str, formula: str, cached: str | None = None) -> None:
    cell = get_cell(row, ref)
    if cell is None:
        cell = ET.SubElement(row, f"{Q}c", {"r": ref})
    cell.attrib.pop("t", None)
    for child in list(cell):
        cell.remove(child)
    f_node = ET.SubElement(cell, f"{Q}f")
    f_node.text = formula
    if cached is not None:
        v_node = ET.SubElement(cell, f"{Q}v")
        v_node.text = cached


def cached_from(row: ET.Element, ref: str) -> str | None:
    cell = get_cell(row, ref)
    if cell is None:
        return None
    value = cell.find(f"{Q}v")
    return value.text if value is not None else None


def main() -> None:
    with ZipFile(WORKBOOK_PATH, "r") as source:
        entries = {info.filename: source.read(info.filename) for info in source.infolist()}

    root = ET.fromstring(entries["xl/worksheets/sheet1.xml"])
    rows = {
        int(row.attrib["r"]): row
        for row in root.findall(f".//{Q}row")
        if row.attrib.get("r")
    }
    header = rows[1]
    header_style = get_cell(header, "J1").attrib.get("s") if get_cell(header, "J1") is not None else None
    for ref, value in HEADERS.items():
        set_inline(header, ref, value, header_style)
    remove_cell(header, "P1")
    sort_row(header)

    for row_index in range(2, 23):
        row = rows.get(row_index)
        if row is None:
            continue
        old = {ref: cached_from(row, f"{ref}{row_index}") for ref in "KLMNOP"}
        step_formula = "0" if row_index == 2 else f"(O{row_index}/O{row_index - 1}-1)*100"
        set_formula(row, f"J{row_index}", step_formula, old["K"])
        set_formula(row, f"K{row_index}", f"(O{row_index}/$O$2-1)*100", old["L"])
        set_formula(
            row,
            f"L{row_index}",
            f"POWER(1.13,N(E{row_index}))*POWER(1.17,N(F{row_index}))*POWER(1.2,N(G{row_index}))*POWER(1.23,N(H{row_index}))*POWER(1.26,N(I{row_index}))",
            old["M"],
        )
        set_formula(
            row,
            f"M{row_index}",
            f'SWITCH(D{row_index},"유니크",1.38,"레전더리",1.44,"에픽",1.5,"태초",1.57,1)',
            old["N"],
        )
        set_formula(
            row,
            f"N{row_index}",
            (
                f'1+(SWITCH(TRUE,C{row_index}>=2550,62+INT((C{row_index}-2550)/25)*0.5,'
                f'C{row_index}>=2100,50+INT((C{row_index}-2100)/25)*0.5,'
                f'C{row_index}>=1650,39+INT((C{row_index}-1650)/25)*0.5,'
                f'C{row_index}>=1200,28+INT((C{row_index}-1200)/25)*0.5,'
                f'C{row_index}>=750,17+INT((C{row_index}-750)/25)*0.5,0))/100'
            ),
            old["O"],
        )
        set_formula(row, f"O{row_index}", f"B{row_index}/L{row_index}/M{row_index}/N{row_index}", old["P"])
        remove_cell(row, f"P{row_index}")
        sort_row(row)

    dimension = root.find(f"{Q}dimension")
    if dimension is not None:
        dimension.attrib["ref"] = "A1:O27"

    entries["xl/worksheets/sheet1.xml"] = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    if not BACKUP_PATH.exists():
        shutil.copy2(WORKBOOK_PATH, BACKUP_PATH)

    temp_path = WORKBOOK_PATH.with_suffix(".xlsx.columns.tmp")
    with ZipFile(temp_path, "w", ZIP_DEFLATED) as target:
        for name, payload in entries.items():
            target.writestr(name, payload)
    temp_path.replace(WORKBOOK_PATH)
    print("서약 세트 단계 수식 컬럼을 J~O로 정리했습니다.")


if __name__ == "__main__":
    main()
