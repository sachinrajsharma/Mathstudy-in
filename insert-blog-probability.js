/**
 * Insert: Probability Case Study Class 12 blog post into MySQL
 * Run: node insert-blog-probability.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const DB = {
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mathstudy',
};

// ── Slug ─────────────────────────────────────────────────────────────────────
const slug = 'probability-case-study-class-12-with-solutions';

// ── Meta ─────────────────────────────────────────────────────────────────────
const title     = 'Probability Case Study Class 12 with Solutions — How to Crack the 4-Mark Question (2026)';
const metaTitle = 'Probability Case Study Class 12 with Solutions 2026 | MathStudy';
const metaDesc  = 'Solved probability case studies for CBSE Class 12 — Bayes\' theorem, total probability, distributions. Step-by-step answers for 4-mark exam questions.';
const category  = 'CBSE';
const author    = 'Vidara Editorial Team';
const coverImage = '';   // add URL if you have one

// ── Excerpt ───────────────────────────────────────────────────────────────────
const excerpt = 'Five fully solved probability case studies for CBSE Class 12 Board 2026 — covering Bayes\' theorem, total probability, and probability distributions with a 4-step method that works on any question.';

// ── Full HTML Content ─────────────────────────────────────────────────────────
const content = `
<p>Every year, the CBSE Class 12 Mathematics paper carries a 4-mark case study question on probability. The question looks intimidating — a paragraph of real-world context, followed by four sub-parts — but the actual maths rarely goes beyond three core ideas: <strong>total probability, Bayes' theorem, and probability distributions</strong>. Once you see the pattern, the case study becomes one of the most predictable scoring opportunities in the entire paper.</p>

<p>I've seen students from schools in Jaipur, Bhopal, and Chandigarh drop marks here not because they don't know the theory, but because they freeze at the paragraph and never identify which formula to apply. This guide fixes that — with five fully worked case studies and a 4-step decoding method you can use in the exam hall.</p>

<h2>What the CBSE Examiner Actually Wants</h2>

<p>The <a href="https://www.cbse.gov.in" target="_blank" rel="noopener noreferrer">Central Board of Secondary Education</a> introduced case-based questions in the 2021 restructuring of the Class 12 Mathematics paper (as per <a href="https://www.cbse.gov.in/cbsenew/documents/Circular-Class-XII-Maths-2021.pdf" target="_blank" rel="noopener noreferrer">CBSE Circular 2021</a>). For probability specifically, the <a href="https://ncert.nic.in/textbook.php?lemh2=13" target="_blank" rel="noopener noreferrer">NCERT Class 12 Mathematics Chapter 13</a> is the only source you need — the board does not go outside it.</p>

<p>The case study paragraph sets a real-world scenario (factories, insurance, medical testing, surveys). You are then asked 4–5 sub-questions worth 1 mark each. The sub-questions almost always follow this pattern:</p>

<ul>
  <li><strong>Sub-part (i)</strong> — a direct probability from the given data (P(A), P(B|A), etc.)</li>
  <li><strong>Sub-part (ii)</strong> — total probability: find P(event) across multiple scenarios</li>
  <li><strong>Sub-part (iii)</strong> — Bayes' theorem: find P(cause | effect)</li>
  <li><strong>Sub-part (iv)</strong> — expected value or variance of a random variable, or a straightforward conditional probability</li>
</ul>

<h2>The 4-Step Decoding Method</h2>

<p>Use these steps on every probability case study before you write a single number:</p>

<ol>
  <li><strong>Identify the partitions.</strong> Find the exhaustive, mutually exclusive events — these are almost always given as percentages or fractions in the paragraph (machines, age groups, categories of people).</li>
  <li><strong>Extract the conditional probabilities.</strong> Look for phrases like "defective rate", "probability of passing", "chances of failure". These are your \(P(E \mid H_i)\) values.</li>
  <li><strong>Decide the direction of inference.</strong> If the question asks "what is the probability the event happens?" → use Total Probability. If it asks "given the event happened, which cause was responsible?" → use Bayes' theorem.</li>
  <li><strong>Write the formula first, substitute second.</strong> Never substitute and then write the formula — examiners award method marks separately.</li>
</ol>

<h2>Case Study 1 — Factory Machines &amp; Defective Items (Total Probability + Bayes)</h2>

<p>A factory has three machines M₁, M₂ and M₃ producing ball bearings. Machine M₁ produces 50% of the total output, M₂ produces 30%, and M₃ produces the remaining 20%. The defective rates are 2%, 3% and 5% respectively. One ball bearing is drawn at random from a day's production.</p>

<p><strong>(i) What is the probability the ball bearing is defective?</strong></p>

<p>Let \(D\) = event that the ball bearing is defective.</p>

\[P(D) = P(D \mid M_1)\,P(M_1) + P(D \mid M_2)\,P(M_2) + P(D \mid M_3)\,P(M_3)\]

\[P(D) = (0.02)(0.50) + (0.03)(0.30) + (0.05)(0.20)\]

\[P(D) = 0.010 + 0.009 + 0.010 = \boxed{0.029}\]

<p><strong>(ii) Given the ball bearing is defective, what is the probability it came from M₂?</strong></p>

<p>Using Bayes' theorem:</p>

\[P(M_2 \mid D) = \frac{P(D \mid M_2)\,P(M_2)}{P(D)} = \frac{(0.03)(0.30)}{0.029} = \frac{0.009}{0.029} = \frac{9}{29}\]

<p><strong>Examiner tip:</strong> Leave fractions unreduced unless the answer is obviously a terminating decimal — \(\frac{9}{29}\) is the clean final form here.</p>

<h2>Case Study 2 — Medical Testing (Bayes' Theorem with a Trap)</h2>

<p>A disease affects 1% of a city's population. A diagnostic test gives a positive result for 90% of infected patients and incorrectly gives a positive result for 5% of uninfected patients.</p>

<p><strong>(i) Find the probability that a randomly chosen person tests positive.</strong></p>

<p>Let \(I\) = infected, \(I'\) = not infected, \(T^+\) = tests positive.</p>

\[P(T^+) = P(T^+ \mid I)\,P(I) + P(T^+ \mid I')\,P(I')\]

\[= (0.90)(0.01) + (0.05)(0.99) = 0.009 + 0.0495 = 0.0585\]

<p><strong>(ii) A person tests positive. What is the probability they are actually infected?</strong></p>

\[P(I \mid T^+) = \frac{P(T^+ \mid I)\,P(I)}{P(T^+)} = \frac{(0.90)(0.01)}{0.0585} = \frac{0.009}{0.0585} = \frac{9}{58.5} = \frac{6}{39} = \frac{2}{13}\]

<p>Simplify carefully: \(\frac{0.009}{0.0585} = \frac{9}{58.5} = \frac{18}{117} = \frac{6}{39} = \frac{2}{13} \approx 0.154\).</p>

<p>This is the counterintuitive result — only about 15% of people who test positive actually have the disease. This is why screening programmes use confirmatory tests. The question often asks you to comment on this, so keep the fraction exact for full marks.</p>

<h2>Case Study 3 — Insurance Categories (Three Partitions)</h2>

<p>An insurance company classifies its clients as Low Risk (L), Medium Risk (M) and High Risk (H) in the ratio 3 : 2 : 5. The probability that a Low Risk client makes a claim in a year is 0.04, for Medium Risk it is 0.12, and for High Risk it is 0.35.</p>

<p><strong>(i) Find \(P(M)\), \(P(L)\), \(P(H)\) from the ratio 3 : 2 : 5.</strong></p>

\[P(L) = \frac{3}{10},\quad P(M) = \frac{2}{10} = \frac{1}{5},\quad P(H) = \frac{5}{10} = \frac{1}{2}\]

<p><strong>(ii) What is the probability a randomly chosen client makes a claim?</strong></p>

\[P(C) = (0.04)\!\left(\frac{3}{10}\right) + (0.12)\!\left(\frac{1}{5}\right) + (0.35)\!\left(\frac{1}{2}\right)\]

\[= 0.012 + 0.024 + 0.175 = \boxed{0.211}\]

<p><strong>(iii) A client makes a claim. What is the probability they are High Risk?</strong></p>

\[P(H \mid C) = \frac{(0.35)(0.5)}{0.211} = \frac{0.175}{0.211} = \frac{175}{211}\]

<p>This does not simplify to a neat fraction — that is fine. Write both the fraction and the decimal (≈ 0.829). CBSE mark schemes accept either form.</p>

<h2>Case Study 4 — Probability Distribution (Random Variable)</h2>

<p>A bag contains 3 red and 4 white balls. Two balls are drawn at random without replacement. Let \(X\) be the number of red balls drawn.</p>

<p><strong>(i) Write the probability distribution of \(X\).</strong></p>

<p>Total balls = 7. \(X\) can take values 0, 1, 2.</p>

\[P(X = 0) = \frac{\binom{4}{2}}{\binom{7}{2}} = \frac{6}{21} = \frac{2}{7}\]

\[P(X = 1) = \frac{\binom{3}{1}\binom{4}{1}}{\binom{7}{2}} = \frac{12}{21} = \frac{4}{7}\]

\[P(X = 2) = \frac{\binom{3}{2}}{\binom{7}{2}} = \frac{3}{21} = \frac{1}{7}\]

<p>Always verify: \(\frac{2}{7} + \frac{4}{7} + \frac{1}{7} = 1\). ✓</p>

<p><strong>(ii) Find the mean \(E(X)\).</strong></p>

\[E(X) = 0 \cdot \frac{2}{7} + 1 \cdot \frac{4}{7} + 2 \cdot \frac{1}{7} = 0 + \frac{4}{7} + \frac{2}{7} = \frac{6}{7}\]

<p><strong>(iii) Find the variance \(\text{Var}(X)\).</strong></p>

\[E(X^2) = 0^2 \cdot \frac{2}{7} + 1^2 \cdot \frac{4}{7} + 2^2 \cdot \frac{1}{7} = 0 + \frac{4}{7} + \frac{4}{7} = \frac{8}{7}\]

\[\text{Var}(X) = E(X^2) - [E(X)]^2 = \frac{8}{7} - \left(\frac{6}{7}\right)^2 = \frac{8}{7} - \frac{36}{49} = \frac{56}{49} - \frac{36}{49} = \frac{20}{49}\]

<h2>Case Study 5 — Two Dice (Expected Value)</h2>

<p>Two fair dice are thrown simultaneously. Let \(X\) denote the absolute difference of the two outcomes.</p>

<p><strong>Build the distribution of \(X\).</strong></p>

<p>Sample space has \(6 \times 6 = 36\) equally likely outcomes. \(X\) takes values 0, 1, 2, 3, 4, 5.</p>

<table>
  <thead><tr><th>\(X\)</th><th>Pairs (count)</th><th>\(P(X)\)</th></tr></thead>
  <tbody>
    <tr><td>0</td><td>(1,1),(2,2),(3,3),(4,4),(5,5),(6,6) — 6 pairs</td><td>\(\frac{6}{36} = \frac{1}{6}\)</td></tr>
    <tr><td>1</td><td>10 pairs</td><td>\(\frac{10}{36} = \frac{5}{18}\)</td></tr>
    <tr><td>2</td><td>8 pairs</td><td>\(\frac{8}{36} = \frac{2}{9}\)</td></tr>
    <tr><td>3</td><td>6 pairs</td><td>\(\frac{6}{36} = \frac{1}{6}\)</td></tr>
    <tr><td>4</td><td>4 pairs</td><td>\(\frac{4}{36} = \frac{1}{9}\)</td></tr>
    <tr><td>5</td><td>2 pairs</td><td>\(\frac{2}{36} = \frac{1}{18}\)</td></tr>
  </tbody>
</table>

\[E(X) = 0 \cdot \frac{1}{6} + 1 \cdot \frac{5}{18} + 2 \cdot \frac{2}{9} + 3 \cdot \frac{1}{6} + 4 \cdot \frac{1}{9} + 5 \cdot \frac{1}{18}\]

\[= 0 + \frac{5}{18} + \frac{4}{9} + \frac{3}{6} + \frac{4}{9} + \frac{5}{18} = \frac{5+8+9+8+5}{18} = \frac{35}{18} \approx 1.94\]

<h2>3 Exam Traps That Cost Students Marks Every Year</h2>

<p><strong>Trap 1 — Mixing up which event is in the numerator of Bayes' formula.</strong> Bayes' theorem finds P(cause | effect). The cause goes in the numerator, the effect is the given condition. Flipping them is the single most common error.</p>

<p><strong>Trap 2 — Forgetting to check the total probability sums to 1.</strong> Before computing E(X) or Var(X), always verify \(\sum P(x_i) = 1\). A missing combination (especially when using the complement) is where marks disappear.</p>

<p><strong>Trap 3 — Using replacement when the problem says "without replacement" (or vice versa).</strong> "Without replacement" means you use combinations \(\binom{n}{r}\) for the denominator. "With replacement" means the denominator is a power (\(n^r\)). Read the problem twice.</p>

<h2>How to Practice in the Last 30 Days Before Boards</h2>

<p>The <a href="https://cbseacademic.nic.in/SQP_CLASSXII_2026.html" target="_blank" rel="noopener noreferrer">CBSE Sample Question Paper 2025–26</a> for Class 12 Mathematics is the best resource to practice current-format case studies — it shows exactly the paragraph length, sub-question split, and difficulty level the board uses. Do the probability case study from it three times: once open-book, once timed (12 minutes), and once to check your working against the CBSE marking scheme.</p>

<p>For additional solved examples, <a href="https://ncert.nic.in/textbook.php?lemh2=13" target="_blank" rel="noopener noreferrer">NCERT Chapter 13 (Probability)</a> has twelve fully worked examples and fifty-three exercises. Prioritise Examples 12–18 (they cover the Bayes' theorem scenarios the board loves most) and Exercises 13.3 and 13.5.</p>

<p>For case study question sets specifically, our <a href="/shop">CBSE Class 12 Maths Case Study Workbook</a> has 40 probability case studies with detailed step-by-step solutions, along with chapter-wise questions for all high-weightage topics.</p>

<h2>Quick Reference: Formulas You Must Know Cold</h2>

<table>
  <thead><tr><th>Formula</th><th>When to use</th></tr></thead>
  <tbody>
    <tr>
      <td>\(P(B) = \displaystyle\sum_{i=1}^{n} P(B \mid A_i)\,P(A_i)\)</td>
      <td>Find P of an event across multiple causes</td>
    </tr>
    <tr>
      <td>\(P(A_j \mid B) = \dfrac{P(B \mid A_j)\,P(A_j)}{\displaystyle\sum_i P(B \mid A_i)\,P(A_i)}\)</td>
      <td>Find P of a cause given the effect (Bayes)</td>
    </tr>
    <tr>
      <td>\(E(X) = \displaystyle\sum x_i\,P(x_i)\)</td>
      <td>Mean of random variable</td>
    </tr>
    <tr>
      <td>\(\text{Var}(X) = E(X^2) - [E(X)]^2\)</td>
      <td>Variance (compute \(E(X^2)\) first)</td>
    </tr>
    <tr>
      <td>\(P(A \mid B) = \dfrac{P(A \cap B)}{P(B)}\)</td>
      <td>Conditional probability (direct)</td>
    </tr>
  </tbody>
</table>

<h2>Frequently Asked Questions</h2>

<h3>Is Bayes' theorem directly asked in CBSE 2026 or only in case studies?</h3>
<p>Bayes' theorem appears almost exclusively in case study questions and occasionally in a standalone 2-mark question. Since 2021, the board has not asked a pure Bayes' theorem question outside the case study format. Focus your revision on applying it within a paragraph-based context rather than memorising it in isolation.</p>

<h3>How many sub-parts does a Class 12 probability case study have?</h3>
<p>Current CBSE format (2024–2026 papers) gives 4 sub-parts worth 1 mark each, totalling 4 marks. The paragraph is typically 60–100 words. You are sometimes given a choice between two sub-parts (iv) — if so, read both before committing, since one is almost always easier.</p>

<h3>What if my total probability does not sum to 1?</h3>
<p>Stop and recheck your fractions before proceeding. The most common cause is a missing partition (e.g., the problem says three machines produce 40%, 35%, and the rest — you must compute "the rest" explicitly as 25%). Do not proceed to Bayes' theorem with an incorrect \(P(D)\); every subsequent answer will be wrong.</p>

<h3>Do I need to show the probability distribution as a table?</h3>
<p>Yes — CBSE marking schemes explicitly award 1 mark for drawing the distribution table correctly. Even if you compute \(E(X)\) correctly without the table, you will lose the table mark. Write the table, then compute mean and variance from it.</p>

<h3>Which NCERT examples most closely match the board's case study style?</h3>
<p>Examples 13 and 14 in NCERT Chapter 13 (the factory-machine and insurance problems) are structurally identical to what CBSE sets. Example 17 (the biased coin problem) tests the same Bayes' theorem application with a slightly different setup. If you can reproduce those solutions without looking, you are ready for the case study question.</p>
`;

// ── Insert ────────────────────────────────────────────────────────────────────
async function run() {
  const conn = await mysql.createConnection(DB);
  try {
    // Check if slug already exists
    const [rows] = await conn.execute('SELECT id FROM blogs WHERE slug = ?', [slug]);
    if (rows.length > 0) {
      console.log('Post with this slug already exists (id=' + rows[0].id + '). Updating...');
      await conn.execute(
        `UPDATE blogs SET title=?, content=?, excerpt=?, cover_image=?, category=?,
         meta_title=?, meta_desc=?, status='published', author=?, updated_at=NOW()
         WHERE slug=?`,
        [title, content, excerpt, coverImage, category, metaTitle, metaDesc, author, slug]
      );
      console.log('Updated successfully.');
    } else {
      const [result] = await conn.execute(
        `INSERT INTO blogs (title, slug, content, excerpt, cover_image, category,
         meta_title, meta_desc, status, author, views, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, 0, NOW(), NOW())`,
        [title, slug, content, excerpt, coverImage, category, metaTitle, metaDesc, author]
      );
      console.log('Inserted successfully. New post id:', result.insertId);
    }
    console.log('Done! View at: http://localhost:3001/blog/' + slug);
  } finally {
    await conn.end();
  }
}

run().catch(err => {
  console.error('DB error:', err.message);
  console.error('Make sure MySQL is running and the blogs table exists in database:', DB.database);
  process.exit(1);
});
