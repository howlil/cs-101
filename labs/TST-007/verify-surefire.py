#!/usr/bin/env python3
"""Assert actual JUnit 5 Surefire results; do not count source-level @Test annotations."""
from pathlib import Path
import xml.etree.ElementTree as ET

lab = Path(__file__).resolve().parent
reports = sorted((lab / "target" / "surefire-reports").glob("TEST-*.xml"))
if not reports:
    raise SystemExit("TST-007: no Maven Surefire XML report; tests did not execute")
totals = {"tests": 0, "failures": 0, "errors": 0, "skipped": 0}
for report in reports:
    suite = ET.parse(report).getroot()
    for key in totals:
        totals[key] += int(suite.attrib.get(key, "0"))
if totals != {"tests": 20, "failures": 0, "errors": 0, "skipped": 0}:
    raise SystemExit(f"TST-007 unexpected Surefire results: {totals}")
pom = (lab / "pom.xml").read_text(encoding="utf-8")
if "spring" in pom.lower():
    raise SystemExit("TST-007 must not introduce Spring context dependencies")
print("tst007-junit20=verified")
print("tst007-no-spring-context=verified")
