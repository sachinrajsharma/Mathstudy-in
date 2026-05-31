// scripts/seed-product-seo.js
// Applies the "Part C" buy-intent SEO titles + meta descriptions to products
// (sets meta_title / meta_desc — still editable later in the admin). Idempotent.
//   node scripts/seed-product-seo.js
require('dotenv').config();
const mysql = require('mysql2/promise');

// slug -> [SEO title (<=70), meta description (<=160)]
const SEO = {
  'mathematics-formula-book-for-jee': ['JEE Maths Formula Book PDF — Class 11 & 12 All Formulas', 'All JEE & Class 11–12 maths formulas in one chapter-wise PDF — algebra, calculus, trigonometry, coordinate geometry & more. Instant download. Buy now.'],
  'jee-dpp-trigonometric-functions-equations': ['Trigonometry DPP for JEE Main & Advanced — PDF Download', 'Daily Practice Problems (DPP) on Trigonometric Functions & Equations for JEE — exam-level questions with full solutions. Instant PDF download.'],
  'jee-mains-advance-dpp-complex-numbers': ['Complex Numbers DPP for JEE Main & Advanced — PDF', 'Complex Numbers Daily Practice Problems for JEE Main & Advanced — chapter-focused questions with detailed solutions. Sharpen accuracy. Instant PDF.'],
  'cat-sample-papers-with-solutions-pdf': ['CAT Quant Sample Papers with Solutions — PDF Download', 'Practise CAT Quantitative Aptitude with full sample papers and detailed solutions — exam-pattern questions to boost your percentile. Instant PDF.'],
  'ctet-math-sample-paper-for-paper-i': ['CTET Paper 1 Maths Sample Paper with Answers — PDF', 'CTET Paper I mathematics sample paper with answer key — practise the exact exam pattern for the Central Teacher Eligibility Test. Instant PDF download.'],
  'class-12-mathematics-ncert-solution-book': ['Class 12 Maths NCERT Solutions PDF — All Chapters Solved', 'Step-by-step NCERT solutions for Class 12 Maths — every chapter and exercise fully solved, CBSE-aligned. Score higher in boards. Instant PDF download.'],
  'class-12-mathematics-sample-papers-for-2021-examination-c-b-s-e': ['Class 12 Maths Sample Papers with Solutions — CBSE PDF', 'CBSE Class 12 Maths sample papers with full solutions — board-pattern practice with marking scheme. Walk into the exam confident. Instant PDF download.'],
  'hots-important-questions-mathematics-class-12-cbse': ['Class 12 Maths HOTS & Important Questions — CBSE PDF', 'High-Order Thinking (HOTS) and most-important questions for CBSE Class 12 Maths — target the tricky board questions, with solutions. Instant PDF.'],
  'chapter-wise-test-papers-for-class-12-maths': ['Class 12 Maths Chapter-wise Test Papers — PDF Download', 'Chapter-wise test papers for Class 12 Maths — assess every chapter with exam-style questions and solutions. Perfect for revision. Instant PDF download.'],
  'work-book-class-xii-c-b-s-e-fully-solved': ['Class 12 Maths Workbook (Fully Solved) — CBSE PDF', 'Fully-solved CBSE Class 12 Maths workbook — practice questions with complete step-by-step answers for every chapter. Build mastery. Instant PDF download.'],
  'ncert-exemplar-problems-solutions-mathematics-class-12': ['NCERT Exemplar Class 12 Maths Solutions — PDF Download', 'Detailed solutions to NCERT Exemplar Class 12 Maths — the tougher problems that build real exam strength, fully solved. Instant PDF download.'],
  'objective-type-question-bank-for-mathematics-class-xii-c-b-s-e': ['Class 12 Maths MCQ Question Bank — CBSE PDF Download', 'Objective-type (MCQ) question bank for CBSE Class 12 Maths — hundreds of practice MCQs with answers for competency & case-study questions. Instant PDF.'],
  'math-case-studies-class-12-pdf-book': ['Class 12 Maths Case Study Questions (Solved) — PDF', 'Case-study based questions for CBSE Class 12 Maths with solutions — master the new exam-pattern case studies students find hardest. Instant PDF download.'],
  'case-studies-class-12-probability-with-solutions': ['Class 12 Probability Case Study Questions (Solved) — PDF', 'Probability case-study questions for CBSE Class 12 Maths with full solutions — practise the exact case-based format from the board paper. Instant PDF.'],
  'class-9-number-system-case-studies-with-solutions': ['Class 9 Number System Case Study Questions — Solved PDF', 'Number System case-study questions for CBSE Class 9 Maths with solutions — competency-based practice in the latest exam pattern. Instant PDF download.'],
  'class-9-polynomials-case-studies-with-solutions': ['Class 9 Polynomials Case Study Questions — Solved PDF', 'Polynomials case-study questions for CBSE Class 9 Maths with step-by-step solutions — master the case-based questions worth easy marks. Instant PDF.'],
  'case-studies-class-8-algebraic-expressions-pdf': ['Class 8 Algebraic Expressions Case Studies — Solved PDF', 'Algebraic Expressions case-study questions for Class 8 Maths with solutions — application-based practice that builds exam confidence. Instant PDF download.'],
  'case-studies-class-8-exponents-and-powers-pdf': ['Class 8 Exponents & Powers Case Studies — Solved PDF', 'Exponents and Powers case-study questions for Class 8 Maths with solutions — real-world application practice in CBSE pattern. Instant PDF download.'],
  'case-studies-class-8-rational-numbers-pdf': ['Class 8 Rational Numbers Case Studies — Solved PDF', 'Rational Numbers case-study questions for Class 8 Maths with full solutions — competency-based practice for school and CBSE exams. Instant PDF download.'],
  'case-studies-class-8-square-root-and-cube-roots-pdf': ['Class 8 Squares & Cube Roots Case Studies — Solved PDF', 'Square Roots and Cube Roots case-study questions for Class 8 Maths with solutions — application questions to score full marks. Instant PDF download.'],
  'case-studies-number-system-class-8-e-book': ['Class 8 Number System Case Study Questions — PDF', 'Number System case-study questions for Class 8 Maths with solutions — exam-pattern, application-based practice. Instant PDF e-book download.'],
  'class-7-fractions-and-decimals-case-studies-with-solutions': ['Class 7 Fractions & Decimals Case Studies — Solved PDF', 'Fractions and Decimals case-study questions for Class 7 Maths with solutions — application-based practice in the latest pattern. Instant PDF download.'],
  'class-7-integers-case-studies-with-solutions': ['Class 7 Integers Case Study Questions — Solved PDF', 'Integers case-study questions for Class 7 Maths with full solutions — real-world application practice for school exams. Instant PDF download.'],
  'math-case-studies-class-7': ['Class 7 Maths Case Study Questions (All Chapters) — PDF', 'Chapter-wise case-study questions for Class 7 Maths with solutions — cover every topic in the CBSE competency-based pattern. Instant PDF download.'],
  'best-math-workbook-for-1st-grade-printable-worksheets': ['Grade 1 Maths Workbook — Printable Worksheets PDF', 'A complete printable Grade 1 maths workbook PDF — numbers, addition, subtraction & more, with answers. Perfect for home practice. Instant download.'],
  'addition-worksheets-for-grade-1': ['Grade 1 Addition Worksheets (Printable PDF) — with Answers', 'Printable Grade 1 addition worksheets with answers — colourful, age-appropriate practice for 6–7 year olds, home or classroom. Instant PDF download.'],
  'word-problems-for-grade-1-addition-mixed': ['Grade 1 Word Problems (Addition & Mixed) — Printable PDF', 'First-grade addition and mixed word-problem worksheets with answers — gentle, colourful practice for early learners. Instant printable PDF download.'],
  'mathematics-workbook-class-2-printable-worksheets': ['Class 2 Maths Workbook — Printable Worksheets PDF', 'Printable Class 2 / Grade 2 maths workbook PDF — number sense, addition, subtraction and word problems with answers. Home-ready. Instant download.'],
  'mixed-word-problems-for-grade-2-worksheets': ['Grade 2 Mixed Word Problems Worksheets — PDF', 'Mixed addition & subtraction word-problem worksheets for Grade 2 with answers — varied practice that keeps kids engaged. Instant printable PDF.'],
  'addition-word-problems-for-grade-3': ['Grade 3 Addition Word Problems Worksheets (PDF)', 'Printable Grade 3 addition word-problem worksheets with answers — fun, classroom-ready practice that builds real maths skills. Instant PDF download.'],
  'subtraction-word-problems-for-grade-3': ['Grade 3 Subtraction Word Problems — Printable PDF', 'Grade 3 subtraction word-problem worksheets with answer key — engaging, classroom-ready practice. Instant printable PDF download.'],
  'multiplication-word-problems-for-grade-3-150-problems': ['Grade 3 Multiplication Word Problems (150) — PDF', '150 multiplication word problems for Grade 3 with answer key — plenty of graded practice to master times tables in context. Instant PDF download.'],
  'word-problems-for-grade-3-division': ['Grade 3 Division Word Problems — Printable PDF', 'Division word-problem worksheets for Grade 3 with answer key — build understanding of sharing and grouping. Instant printable PDF download.'],
  'mixed-word-problems-for-grade-3': ['Grade 3 Mixed Word Problems Worksheets — PDF', 'Mixed word-problem worksheets for Grade 3 (add, subtract, multiply, divide) with answers — all-in-one practice. Instant printable PDF download.'],
  '4th-class-word-problems': ['Grade 4 Addition Word Problems Worksheets (PDF)', 'Printable addition word-problem worksheets for Grade 4 / Class 4 with answer key — build problem-solving and exam confidence. Instant PDF download.'],
  'subtraction-word-problems-for-4th-grade': ['Grade 4 Subtraction Word Problems — Printable PDF', 'Subtraction word-problem worksheets for Grade 4 / Class 4 with answers — clear, graded practice that builds confidence. Instant printable PDF.'],
  'multiplication-word-problems-for-4th-grade': ['Grade 4 Multiplication Word Problems — Printable PDF', 'Multiplication word-problem worksheets for Grade 4 / Class 4 with answers — build fluency with real-world questions. Instant printable PDF download.'],
  'division-word-problems-for-4th-grade-100-problems': ['Grade 4 Division Word Problems (100 Qs) — Printable PDF', '100 division word problems for Grade 4 / Class 4 with answer key — graded practice that builds confidence and speed. Instant printable PDF download.'],
  'mixed-word-problems-for-grade-4': ['Grade 4 Mixed Word Problems Worksheets — PDF', 'Mixed-operation word problems for Grade 4 with answer key — realistic practice across all four operations. Instant printable PDF download.'],
  'mathematics-workbook-for-class-4': ['Class 4 Maths Workbook (Printable PDF) — with Answers', 'Complete Class 4 / Grade 4 maths workbook PDF — full practice across topics with an answer key. Ideal for revision at home. Instant download.']
};

(async () => {
  const pool = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '', database: process.env.DB_NAME || 'mathstudy'
  });
  let ok = 0; const missing = [];
  for (const [slug, [title, desc]] of Object.entries(SEO)) {
    const [r] = await pool.query('UPDATE products SET meta_title=?, meta_desc=? WHERE slug=?', [title, desc, slug]);
    if (r.affectedRows > 0) ok++; else missing.push(slug);
  }
  console.log(`Applied SEO to ${ok}/${Object.keys(SEO).length} products.` + (missing.length ? '\nNo product for: ' + missing.join(', ') : ''));
  await pool.end(); process.exit(0);
})().catch((e) => { console.error('Seed failed:', e); process.exit(1); });
