#!/usr/bin/env python3
"""
Build a formatted component-matrix workbook from a JSON description.

    python3 build_xlsx.py matrix.json -o component-matrix.xlsx

Sheets produced: Summary, Components, Properties, Variants, Consolidation,
Coverage, Open Questions.

Expected JSON shape (every key optional except `components`):

{
  "project": "Acme Corporate Site",
  "cms_target": "agnostic",
  "basis": "Sample of 8 pages - redesign",
  "assumptions": ["No design system provided"],
  "container_decision": "Theme and spacing live on the Section container.",
  "sources": [
    {"url": "https://acme.com/", "status": "fetched", "notes": ""}
  ],
  "components": [
    {
      "id": "C01",
      "name": "Hero",
      "layer": "Content",
      "purpose": "Page-opening statement with optional media and CTAs",
      "complexity": "M",
      "instances": 12,
      "reuse": 12,
      "dead_field_ratio": 0.18,
      "consolidates": ["Page header", "Campaign banner"],
      "observed_on": ["https://acme.com/", "https://acme.com/about"],
      "notes": "fullBleed layout requires media",
      "properties": [
        {
          "name": "title", "label": "Title", "group": "Content",
          "type": "text", "required": "Yes", "default": "",
          "validation": "Max 60 chars; longest observed 47",
          "localizable": "Yes", "notes": "Renders at the configured heading level"
        }
      ],
      "variants": [
        {"name": "Full-bleed campaign hero",
         "values": "layout=fullBleed, theme=dark",
         "seen_on": "https://acme.com/"}
      ]
    }
  ],
  "consolidation": [
    {"candidates": "Hero, Page Header, Campaign Banner",
     "decision": "Merge",
     "test": "Content model identical; 2 presentation props",
     "result": "C01 Hero - dead-field ratio 18%"}
  ],
  "coverage": [
    {"url": "https://acme.com/", "status": "Fetched",
     "components": ["C01", "C03", "C07"], "notes": ""}
  ],
  "open_questions": [
    {"question": "Are card grids author-picked or query-driven?",
     "blocks": "C07 spec", "owner": "Content team"}
  ]
}

`required` accepts "Yes" / "No" / "Conditional" or a boolean.
`dead_field_ratio` accepts a 0-1 float or a percentage string.
"""

import argparse
import json
import sys

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

HEADER_FILL = PatternFill("solid", fgColor="1F2937")
HEADER_FONT = Font(color="FFFFFF", bold=True, size=11)
TITLE_FONT = Font(bold=True, size=14)
WRAP = Alignment(vertical="top", wrap_text=True)
TOP = Alignment(vertical="top")
THIN = Side(style="thin", color="D1D5DB")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

LAYER_FILLS = {
    "structural": "E0E7FF",
    "chrome": "FEF3C7",
    "content": "DCFCE7",
    "collection": "DBEAFE",
    "integration": "FCE7F3",
    "utility": "F3F4F6",
}


def as_text(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (list, tuple)):
        return ", ".join(as_text(v) for v in value)
    return str(value)


def as_ratio(value):
    if value is None or value == "":
        return ""
    if isinstance(value, str):
        return value
    return f"{value * 100:.0f}%" if value <= 1 else f"{value:.0f}%"


def write_sheet(wb, title, headers, rows, widths, table_name=None):
    ws = wb.create_sheet(title)
    ws.append(headers)
    for cell in ws[1]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 26

    for row in rows:
        ws.append([as_text(v) for v in row])

    for idx, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(idx)].width = width

    for row in ws.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = WRAP
            cell.border = BORDER

    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions

    if table_name and ws.max_row > 1:
        try:
            table = Table(displayName=table_name, ref=ws.dimensions)
            table.tableStyleInfo = TableStyleInfo(
                name="TableStyleLight9", showRowStripes=True
            )
            # auto_filter and Table conflict; the table brings its own filter
            ws.auto_filter.ref = None
            ws.add_table(table)
        except ValueError:
            ws.auto_filter.ref = ws.dimensions
    return ws


def build_summary(wb, data):
    ws = wb.create_sheet("Summary")
    components = data.get("components", [])
    layers = {}
    for c in components:
        layers[c.get("layer", "Unclassified")] = layers.get(c.get("layer", "Unclassified"), 0) + 1

    merges = [d for d in data.get("consolidation", []) if "merge" in as_text(d.get("decision")).lower()]
    rejects = [d for d in data.get("consolidation", []) if "reject" in as_text(d.get("decision")).lower()]
    prop_count = sum(len(c.get("properties", [])) for c in components)

    ws["A1"] = f"Component Matrix — {data.get('project', 'Untitled')}"
    ws["A1"].font = TITLE_FONT

    rows = [
        ("Target CMS", data.get("cms_target", "CMS-agnostic")),
        ("Basis", data.get("basis", "")),
        ("Sources analysed", len(data.get("sources", []))),
        ("", ""),
        ("Components specified", len(components)),
        ("Total properties", prop_count),
        ("Mean properties per component", round(prop_count / len(components), 1) if components else 0),
        ("Merges applied", len(merges)),
        ("Merges rejected", len(rejects)),
        ("Open questions", len(data.get("open_questions", []))),
        ("", ""),
    ]
    for layer, count in sorted(layers.items()):
        rows.append((f"Layer — {layer}", count))
    if data.get("container_decision"):
        rows.extend([("", ""), ("Presentation model", data["container_decision"])])
    for i, assumption in enumerate(data.get("assumptions", []), start=1):
        rows.append((f"Assumption {i}", assumption))

    for label, value in rows:
        ws.append([label, as_text(value)])

    for row in ws.iter_rows(min_row=3):
        row[0].font = Font(bold=True)
        for cell in row:
            cell.alignment = WRAP
    ws.column_dimensions["A"].width = 34
    ws.column_dimensions["B"].width = 80
    return ws


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("matrix_json")
    parser.add_argument("-o", "--output", default="component-matrix.xlsx")
    args = parser.parse_args()

    with open(args.matrix_json, encoding="utf-8") as fh:
        data = json.load(fh)

    components = data.get("components", [])
    if not components:
        sys.exit("No components found in the JSON — nothing to write.")

    wb = Workbook()
    wb.remove(wb.active)

    build_summary(wb, data)

    ws = write_sheet(
        wb,
        "Components",
        ["ID", "Component", "Layer", "Purpose", "Props", "Variants",
         "Instances", "Complexity", "Dead fields", "Consolidates", "Observed on", "Notes"],
        [
            [
                c.get("id"), c.get("name"), c.get("layer"), c.get("purpose"),
                len(c.get("properties", [])), len(c.get("variants", [])),
                c.get("instances", c.get("reuse", "")), c.get("complexity"),
                as_ratio(c.get("dead_field_ratio")), c.get("consolidates"),
                c.get("observed_on"), c.get("notes"),
            ]
            for c in components
        ],
        [8, 22, 14, 40, 8, 9, 11, 12, 12, 28, 40, 40],
        table_name="Components",
    )
    for row in ws.iter_rows(min_row=2, min_col=3, max_col=3):
        fill = LAYER_FILLS.get(as_text(row[0].value).strip().lower())
        if fill:
            row[0].fill = PatternFill("solid", fgColor=fill)

    write_sheet(
        wb,
        "Properties",
        ["Component", "Property", "Label", "Group", "Type", "Required",
         "Default", "Validation", "Localizable", "Notes"],
        [
            [
                f"{c.get('id', '')} {c.get('name', '')}".strip(),
                p.get("name"), p.get("label"), p.get("group"), p.get("type"),
                p.get("required"), p.get("default"), p.get("validation"),
                p.get("localizable"), p.get("notes"),
            ]
            for c in components
            for p in c.get("properties", [])
        ],
        [22, 20, 22, 16, 16, 12, 14, 46, 12, 44],
        table_name="Properties",
    )

    variant_rows = [
        [f"{c.get('id', '')} {c.get('name', '')}".strip(), v.get("name"),
         v.get("values"), v.get("seen_on")]
        for c in components
        for v in c.get("variants", [])
    ]
    if variant_rows:
        write_sheet(wb, "Variants",
                    ["Component", "Variant", "Property values", "Seen on"],
                    variant_rows, [22, 30, 40, 44], table_name="Variants")

    consolidation = data.get("consolidation", [])
    if consolidation:
        write_sheet(wb, "Consolidation",
                    ["Candidates", "Decision", "Deciding test", "Result"],
                    [[d.get("candidates"), d.get("decision"), d.get("test"), d.get("result")]
                     for d in consolidation],
                    [36, 14, 46, 44], table_name="Consolidation")

    coverage = data.get("coverage", [])
    if coverage:
        write_sheet(wb, "Coverage",
                    ["URL", "Status", "Components", "Notes"],
                    [[c.get("url"), c.get("status"), c.get("components"), c.get("notes")]
                     for c in coverage],
                    [50, 16, 44, 40], table_name="Coverage")

    questions = data.get("open_questions", [])
    if questions:
        normalised = [
            q if isinstance(q, dict) else {"question": q}
            for q in questions
        ]
        write_sheet(wb, "Open Questions",
                    ["#", "Question", "Blocks", "Owner"],
                    [[i, q.get("question"), q.get("blocks"), q.get("owner")]
                     for i, q in enumerate(normalised, start=1)],
                    [6, 60, 30, 24], table_name="OpenQuestions")

    wb.save(args.output)
    print(f"Wrote {args.output} — {len(components)} components, "
          f"{sum(len(c.get('properties', [])) for c in components)} properties.")


if __name__ == "__main__":
    main()
