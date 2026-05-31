# download_covers.ps1  —  Downloads all 34 MathStudy.in product cover images
# Run from PowerShell in:  F:\MATHSTUDY\api\storage\covers\
# Usage:  .\download_covers.ps1

$base = "https://mathstudy.in/wp-content/uploads"
$dest = $PSScriptRoot   # same folder as this script

# Each entry:  @{ Src = "actual-filename-on-server.jpg"; Dst = "local-save-name.jpg" }
# When Src and Dst are the same, the server filename matches what we want locally.

$images = @(
    # ── Batch 1 — Class 8 Case Studies ──────────────────────────────────
    @{ Src = "Case-studies-algebraic-expressions-class-8-math.jpg";          Dst = "Case-studies-algebraic-expressions-class-8-math.jpg" },
    @{ Src = "Case-studies-square-and-cube-roots-class-8.jpg";               Dst = "Case-studies-square-and-cube-roots-class-8.jpg" },
    @{ Src = "Case-studies-exponents-and-powers-class-8.jpg";                Dst = "Case-studies-exponents-and-powers-class-8.jpg" },
    @{ Src = "case-studies-rational-numbers-class-8.jpg";                    Dst = "case-studies-rational-numbers-class-8.jpg" },
    @{ Src = "Class-8-Number-System-Case-Study.jpg";                         Dst = "Class-8-Number-System-Case-Study.jpg" },
    # ── Class 7 Case Studies ─────────────────────────────────────────────
    @{ Src = "case-studies-class-7-integers.jpg";                            Dst = "case-studies-class-7-integers.jpg" },
    @{ Src = "Class-7-Fractions-and-Decimals-Case-Studies-With-Solutions.jpg"; Dst = "Class-7-Fractions-and-Decimals-Case-Studies-With-Solutions.jpg" },
    @{ Src = "math-case-studies-class-7.jpg";                                Dst = "math-case-studies-class-7.jpg" },
    # ── Class 9 Case Studies ─────────────────────────────────────────────
    @{ Src = "case-studies-number-system-class-9.jpg";                       Dst = "case-studies-number-system-class-9.jpg" },
    @{ Src = "Class-9-Polynomials-Case-Studies-with-Solutions.jpg";          Dst = "Class-9-Polynomials-Case-Studies-with-Solutions.jpg" },
    # ── Class 12 Case Studies ────────────────────────────────────────────
    @{ Src = "probability-case-study-questions-class-12-1.jpg";              Dst = "probability-case-study-questions-class-12-1.jpg" },
    @{ Src = "math-case-studies-class-12-2.jpg";                             Dst = "math-case-studies-class-12-2.jpg" },
    # ── Grade 4 Word Problems (batch 1) ──────────────────────────────────
    @{ Src = "Multiplication-Word-Problems-For-4th-Grade.jpg";               Dst = "Multiplication-Word-Problems-For-4th-Grade.jpg" },
    @{ Src = "Division.jpg";                                                  Dst = "Division.jpg" },
    @{ Src = "Mixed.jpg";                                                     Dst = "Mixed.jpg" },
    # ── CTET ─────────────────────────────────────────────────────────────
    @{ Src = "ctet-math-sample-papers.jpg";                                  Dst = "ctet-math-sample-papers.jpg" },
    # ── Batch 2 — Grade 4 (new) ──────────────────────────────────────────
    @{ Src = "Subtraction-Word-Problems-For-4th-Grade.jpg";                  Dst = "Subtraction-Word-Problems-For-4th-Grade.jpg" },
    @{ Src = "4th-class-word-problems.jpg";                                  Dst = "4th-class-word-problems.jpg" },
    @{ Src = "MATHEMATICS-WORKBOOK-GRADE-4.jpg";                             Dst = "mathematics-workbook-class-4.jpg" },
    # ── Grade 3 Word Problems ────────────────────────────────────────────
    @{ Src = "mixed-word-problems-for-grade-3.jpg";                          Dst = "mixed-word-problems-for-grade-3.jpg" },
    @{ Src = "Word-Problems-For-Grade-3-Division-1.jpg";                     Dst = "word-problems-for-grade-3-division.jpg" },
    @{ Src = "Multiplication-word-problem.jpg";                              Dst = "multiplication-word-problems-for-grade-3.jpg" },
    @{ Src = "Subtraction-Word-Problems-For-Grade-3-cover.jpg";              Dst = "subtraction-word-problems-for-grade-3.jpg" },
    @{ Src = "Addition-Word-Problems-For-Grade-3-COVER.jpg";                 Dst = "addition-word-problems-for-grade-3.jpg" },
    # ── Grade 2 ──────────────────────────────────────────────────────────
    @{ Src = "word-probelms-grade-2.jpg";                                    Dst = "mixed-word-problems-for-grade-2.jpg" },
    @{ Src = "COVER-Class-2.jpg";                                            Dst = "mathematics-workbook-class-2.jpg" },
    # ── Grade 1 ──────────────────────────────────────────────────────────
    @{ Src = "Word-Problems-For-Grade-1-Addition.jpg";                       Dst = "word-problems-for-grade-1.jpg" },
    @{ Src = "addition-worksheets-for-grade-1.jpg";                          Dst = "addition-worksheets-for-grade-1.jpg" },
    @{ Src = "mathematics-workbook-for-class-1.jpg";                         Dst = "best-math-workbook-1st-grade.jpg" },
    # ── JEE DPPs ─────────────────────────────────────────────────────────
    @{ Src = "dpp-complex-numbers.jpg";                                      Dst = "jee-dpp-complex-numbers.jpg" },
    @{ Src = "DPP-TRIGONOMETRIC-FUNCTION-AND-EQUATION.jpg";                  Dst = "jee-dpp-trigonometry.jpg" },
    # ── CAT ──────────────────────────────────────────────────────────────
    @{ Src = "cat-sample-papers-with-solutions-pdf.jpg";                     Dst = "cat-sample-papers.jpg" },
    # ── Class 12 CBSE ────────────────────────────────────────────────────
    @{ Src = "ncert-exemplar-class-12-mathematics-solution.jpg";             Dst = "ncert-exemplar-class-12.jpg" },
    @{ Src = "class-12-mathematics-ncert-solution.jpg";                      Dst = "class-12-mathematics-ncert-solution.jpg" }
)

$success = 0
$fail    = 0

foreach ($img in $images) {
    $url     = "$base/$($img.Src)"
    $outFile = Join-Path $dest $img.Dst
    Write-Host -NoNewline "Downloading $($img.Dst) ... "
    try {
        Invoke-WebRequest -Uri $url -OutFile $outFile -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
        Write-Host "OK" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "FAILED  ($url)" -ForegroundColor Red
        $fail++
    }
}

Write-Host ""
Write-Host "Done: $success downloaded, $fail failed." -ForegroundColor Cyan
