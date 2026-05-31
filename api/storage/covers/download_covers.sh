#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# download_covers.sh  —  Downloads all 34 MathStudy.in product cover images
# Run from:  F:\MATHSTUDY\api\storage\covers\
# Usage:     bash download_covers.sh
#
# On Windows (without WSL), use PowerShell instead — see download_covers.ps1
# ─────────────────────────────────────────────────────────────────────────────

BASE="https://mathstudy.in/wp-content/uploads"
DEST="."   # current directory (storage/covers/)

# Format: "actual-server-filename.jpg|local-save-name.jpg"
# When both names are the same, only one field is shown.

declare -a IMAGES=(
  # ── Batch 1 — Class 8 Case Studies ──────────────────────────────────────
  "Case-studies-algebraic-expressions-class-8-math.jpg|Case-studies-algebraic-expressions-class-8-math.jpg"
  "Case-studies-square-and-cube-roots-class-8.jpg|Case-studies-square-and-cube-roots-class-8.jpg"
  "Case-studies-exponents-and-powers-class-8.jpg|Case-studies-exponents-and-powers-class-8.jpg"
  "case-studies-rational-numbers-class-8.jpg|case-studies-rational-numbers-class-8.jpg"
  "Class-8-Number-System-Case-Study.jpg|Class-8-Number-System-Case-Study.jpg"
  # ── Class 7 ─────────────────────────────────────────────────────────────
  "case-studies-class-7-integers.jpg|case-studies-class-7-integers.jpg"
  "Class-7-Fractions-and-Decimals-Case-Studies-With-Solutions.jpg|Class-7-Fractions-and-Decimals-Case-Studies-With-Solutions.jpg"
  "math-case-studies-class-7.jpg|math-case-studies-class-7.jpg"
  # ── Class 9 ─────────────────────────────────────────────────────────────
  "case-studies-number-system-class-9.jpg|case-studies-number-system-class-9.jpg"
  "Class-9-Polynomials-Case-Studies-with-Solutions.jpg|Class-9-Polynomials-Case-Studies-with-Solutions.jpg"
  # ── Class 12 Case Studies ───────────────────────────────────────────────
  "probability-case-study-questions-class-12-1.jpg|probability-case-study-questions-class-12-1.jpg"
  "math-case-studies-class-12-2.jpg|math-case-studies-class-12-2.jpg"
  # ── Grade 4 Word Problems (batch 1) ─────────────────────────────────────
  "Multiplication-Word-Problems-For-4th-Grade.jpg|Multiplication-Word-Problems-For-4th-Grade.jpg"
  "Division.jpg|Division.jpg"
  "Mixed.jpg|Mixed.jpg"
  # ── CTET ────────────────────────────────────────────────────────────────
  "ctet-math-sample-papers.jpg|ctet-math-sample-papers.jpg"
  # ── Batch 2 — Grade 4 (new) ─────────────────────────────────────────────
  "Subtraction-Word-Problems-For-4th-Grade.jpg|Subtraction-Word-Problems-For-4th-Grade.jpg"
  "4th-class-word-problems.jpg|4th-class-word-problems.jpg"
  "MATHEMATICS-WORKBOOK-GRADE-4.jpg|mathematics-workbook-class-4.jpg"
  # ── Grade 3 Word Problems ────────────────────────────────────────────────
  "mixed-word-problems-for-grade-3.jpg|mixed-word-problems-for-grade-3.jpg"
  "Word-Problems-For-Grade-3-Division-1.jpg|word-problems-for-grade-3-division.jpg"
  "Multiplication-word-problem.jpg|multiplication-word-problems-for-grade-3.jpg"
  "Subtraction-Word-Problems-For-Grade-3-cover.jpg|subtraction-word-problems-for-grade-3.jpg"
  "Addition-Word-Problems-For-Grade-3-COVER.jpg|addition-word-problems-for-grade-3.jpg"
  # ── Grade 2 ─────────────────────────────────────────────────────────────
  "word-probelms-grade-2.jpg|mixed-word-problems-for-grade-2.jpg"
  "COVER-Class-2.jpg|mathematics-workbook-class-2.jpg"
  # ── Grade 1 ─────────────────────────────────────────────────────────────
  "Word-Problems-For-Grade-1-Addition.jpg|word-problems-for-grade-1.jpg"
  "addition-worksheets-for-grade-1.jpg|addition-worksheets-for-grade-1.jpg"
  "mathematics-workbook-for-class-1.jpg|best-math-workbook-1st-grade.jpg"
  # ── JEE DPPs ────────────────────────────────────────────────────────────
  "dpp-complex-numbers.jpg|jee-dpp-complex-numbers.jpg"
  "DPP-TRIGONOMETRIC-FUNCTION-AND-EQUATION.jpg|jee-dpp-trigonometry.jpg"
  # ── CAT ─────────────────────────────────────────────────────────────────
  "cat-sample-papers-with-solutions-pdf.jpg|cat-sample-papers.jpg"
  # ── Class 12 CBSE ───────────────────────────────────────────────────────
  "ncert-exemplar-class-12-mathematics-solution.jpg|ncert-exemplar-class-12.jpg"
  "class-12-mathematics-ncert-solution.jpg|class-12-mathematics-ncert-solution.jpg"
)

SUCCESS=0
FAIL=0

for entry in "${IMAGES[@]}"; do
  src="${entry%%|*}"
  dst="${entry##*|}"
  url="${BASE}/${src}"
  echo -n "Downloading ${dst} ... "
  if wget -q --timeout=20 -O "${DEST}/${dst}" "${url}"; then
    echo "OK"
    ((SUCCESS++))
  else
    echo "FAILED  (${url})"
    ((FAIL++))
  fi
done

echo ""
echo "Done: ${SUCCESS} downloaded, ${FAIL} failed."
