/* ═══════════════════════════════════════
   AML COMPLIANCE TRAINING — MODULE JS
   ═══════════════════════════════════════ */

const MODULE = 'aml';

const LEVEL_LABELS = {
  analyst:    '🔍 Analyst',
  compliance: '⚖️ Compliance Officer',
  management: '🏛️ Senior Management'
};

const SYSTEM_PROMPTS = {
  analyst: `You are an AML training coach for a front-line analyst or relationship manager at a Dutch financial institution. Give practical, direct answers about Anti-Money Laundering obligations under the Wwft and the new AMLR (EU 2024/1624). Focus on: recognising unusual transaction patterns, CDD red flags in client interactions, when and how to escalate to compliance, the tipping-off prohibition, and practical steps when a client behaves suspiciously. Use concrete examples from banking practice. Always answer in English. Be concise and practical — maximum 3–4 paragraphs.`,

  compliance: `You are an AML training coach for a compliance officer at a Dutch financial institution. Give technical, in-depth answers about Anti-Money Laundering obligations under the Wwft and AMLR (EU 2024/1624). Reference articles by name, cite FATF recommendations, DNB/AFM guidelines and FIU-Nederland guidance where relevant. Topics: UTR procedures and deadlines under Wwft Art. 16, CDD tiers and enhanced due diligence for PEPs and high-risk countries (AMLR Art. 35–40), UBO verification obligations, transaction monitoring system requirements (AMLR Art. 59–61), AMLA supervision framework, and DNB/AFM enforcement practice. Always answer in English with correct legal and regulatory terminology.`,

  management: `You are an AML training coach for senior management and board members at a Dutch financial institution. Focus on governance obligations under the Wwft and AMLR, personal liability of directors for systematic AML failures, the institution-wide risk assessment (SIRA), tone-from-the-top and culture obligations, the new AMLA supervisory framework, and what DNB and AFM expect from an adequate AML compliance framework. Give board-level answers — strategic, not operational. Always answer in English.`
};

const SUGGESTED_QS = {
  analyst: [
    'What should I do if a client wants to deposit a large amount of cash in multiple small transactions?',
    'When is a transaction "unusual" enough to escalate to compliance under the Wwft?',
    'Am I allowed to tell a client that I have filed a report with FIU-Nederland?'
  ],
  compliance: [
    'Within what timeframe must I file a UTR with FIU-Nederland under the Wwft?',
    'What enhanced CDD measures apply to PEPs under the AMLR?',
    'How do I document the decision not to file a UTR?'
  ],
  management: [
    'What does a robust SIRA (institution-wide risk assessment) look like under the AMLR?',
    'Am I personally liable if a relationship manager in my bank fails to file a UTR?',
    'How will the new AMLA authority affect our compliance framework from 2028?'
  ]
};

const EXAMPLE_PROMPTS = {
  analyst: `You are an AML compliance trainer creating practice examples for an Analyst at a Dutch financial institution.

Create EXACTLY 4 short practice scenarios. Each scenario should be a realistic situation an analyst might encounter in daily work at a Dutch bank. Focus on: recognising unusual transactions, CDD red flags, structuring patterns, and escalation decisions.

For each example provide:
- A short realistic scenario (3-4 sentences)
- A specific question the trainee must answer (1 sentence)

Return STRICT JSON only, no markdown:
[
  {
    "title": "Short title",
    "scenario": "Description of the situation...",
    "question": "What should you do?"
  }
]`,

  compliance: `You are an AML compliance trainer creating practice examples for a Compliance Officer at a Dutch financial institution.

Create EXACTLY 4 short practice scenarios. Each should test knowledge of AMLR/Wwft procedures, UTR filing decisions, CDD tiering, PEP handling, and regulatory obligations. Reference specific articles where relevant.

For each example provide:
- A short realistic scenario (3-4 sentences)
- A specific question the trainee must answer (1 sentence)

Return STRICT JSON only, no markdown:
[
  {
    "title": "Short title",
    "scenario": "Description of the situation...",
    "question": "What should you do?"
  }
]`,

  management: `You are an AML compliance trainer creating practice examples for Senior Management / Board members at a Dutch financial institution.

Create EXACTLY 4 short practice scenarios. Each should test governance awareness, personal liability understanding, SIRA obligations, tone-from-the-top, and strategic AML decision-making under the AMLR and Wwft.

For each example provide:
- A short realistic scenario (3-4 sentences)
- A specific question the trainee must answer (1 sentence)

Return STRICT JSON only, no markdown:
[
  {
    "title": "Short title",
    "scenario": "Description of the situation...",
    "question": "What should you do?"
  }
]`
};

const STRICTNESS_LABELS = {
  hard: '🔴 Strict — All answers must be complete and precise',
  normal: '🟡 Standard — Core concepts must be correct',
  light: '🟢 Lenient — Accepted unless clearly no effort'
};

const STRICTNESS_INSTRUCTIONS = {
  hard: `Evaluate STRICTLY. The answer must be complete, precise and reference the correct legal framework (AMLR/Wwft articles). Any missing element, vague phrasing or factual error results in "onvoldoende". Only answers that are fully correct and comprehensive receive "goed". Partial answers that cover the main point but miss important details receive "gedeeltelijk".`,

  normal: `Evaluate at a STANDARD level. The answer should demonstrate understanding of the core concepts. Minor omissions or imprecise phrasing are acceptable if the main point is correct. Clearly wrong answers or fundamental misunderstandings result in "onvoldoende". Reasonable answers with the right direction receive "gedeeltelijk". Solid answers covering the key points receive "goed".`,

  light: `Evaluate LENIENTLY. Accept any answer that shows a genuine attempt to engage with the topic and demonstrates basic understanding. Only mark as "onvoldoende" if the answer is completely off-topic, empty, or shows zero effort. Most reasonable attempts should receive "goed" or "gedeeltelijk".`
};

// ─── INIT ──────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const config = await loadConfig();
  if (config && config.aml) {
    const a1Input = document.getElementById('agent1Id');
    const a2Input = document.getElementById('agent2Id');
    if (a1Input && !a1Input.value) a1Input.value = config.aml.agent1 || '';
    if (a2Input && !a2Input.value) a2Input.value = config.aml.agent2 || '';
  }
});

// ─── START TRAINING ────────────────────
async function startTraining() {
  agent1Id = document.getElementById('agent1Id').value.trim();
  agent2Id = document.getElementById('agent2Id').value.trim();

  document.getElementById('topLevel').textContent = LEVEL_LABELS[selectedLevel];

  // Show level-specific theory
  document.querySelectorAll('[id^="theory-"]').forEach(el => el.style.display = 'none');
  document.querySelectorAll(`[id^="theory-${selectedLevel}-"]`).forEach(el => el.style.display = 'block');

  // Setup chat
  setupChatSuggestions();

  // Setup strictness banner
  const banner = document.getElementById('strictnessBanner');
  if (banner) {
    const dotClass = selectedStrictness === 'hard' ? 'dot-hard' : selectedStrictness === 'light' ? 'dot-light' : 'dot-normal';
    banner.innerHTML = `<div class="dot ${dotClass}"></div><span>${STRICTNESS_LABELS[selectedStrictness]}</span>`;
  }

  // Switch screens
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('trainingScreen').classList.add('visible');

  // Load examples
  loadExamples();

  // Load quiz
  loadQuiz();
}

// ─── EXAMPLES ──────────────────────────
async function loadExamples() {
  const container = document.getElementById('examplesContainer');
  container.innerHTML = '<div class="empty-msg"><span class="spinner"></span> Generating practice examples…</div>';

  try {
    const reply = await callClaude(
      [{ role: 'user', content: EXAMPLE_PROMPTS[selectedLevel] }],
      'You are a precise AML compliance trainer. Respond only with the requested JSON array.',
      1200
    );

    const clean = reply.replace(/```json|```/g, '').trim();
    const examples = JSON.parse(clean);

    container.innerHTML = '';
    examples.forEach((ex, i) => {
      const el = document.createElement('div');
      el.className = 'example-case';
      el.id = `example-${i}`;
      el.innerHTML = `
        <div class="example-case-header">
          <div class="example-case-num">${i + 1}</div>
          <div class="example-case-meta">
            <h3>${ex.title}</h3>
            <p>Practice Example</p>
          </div>
        </div>
        <div class="example-case-body">
          <div class="example-scenario">
            <div class="example-scenario-label">Scenario</div>
            <p>${ex.scenario}</p>
          </div>
          <div class="example-question">
            <div class="example-question-label">Question</div>
            <p>${ex.question}</p>
          </div>
          <div class="example-answer-area">
            <textarea class="example-textarea" id="example-answer-${i}" placeholder="Type your answer here…" rows="3"></textarea>
            <button class="btn-evaluate" id="example-btn-${i}" onclick="evaluateExample(${i})">Evaluate Answer</button>
          </div>
          <div class="example-feedback" id="example-fb-${i}"></div>
        </div>`;
      container.appendChild(el);
    });

    // Store examples for evaluation
    window._examples = examples;

  } catch (err) {
    container.innerHTML = `<div class="empty-msg">⚠ Failed to load examples: ${err.message}</div>`;
  }
}

async function evaluateExample(idx) {
  const answer = document.getElementById(`example-answer-${idx}`).value.trim();
  if (!answer) { alert('Please enter an answer first.'); return; }

  const btn = document.getElementById(`example-btn-${idx}`);
  btn.disabled = true;
  btn.textContent = 'Evaluating…';

  const ex = window._examples[idx];

  const prompt = `You are an AML compliance trainer. A trainee (${LEVEL_LABELS[selectedLevel]}) answered a practice example.

Scenario: ${ex.scenario}
Question: ${ex.question}
Trainee answer: ${answer}

Provide detailed learning feedback. This is NOT a pass/fail assessment — it is a learning exercise.

Return JSON only, no markdown:
{
  "quality": "good|partial|poor",
  "goodPoints": "What the trainee did well (be specific, 2-3 sentences)",
  "attentionPoints": "Areas for improvement with explanation (2-3 sentences)",
  "modelAnswer": "The ideal complete answer an AML expert would give, referencing relevant AMLR/Wwft articles where appropriate (3-5 sentences)"
}`;

  try {
    const reply = await callClaude(
      [{ role: 'user', content: prompt }],
      'You are a precise AML compliance trainer. Respond only with the requested JSON.',
      800
    );

    const clean = reply.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const fbEl = document.getElementById(`example-fb-${idx}`);
    fbEl.className = `example-feedback visible ${parsed.quality || 'partial'}`;
    fbEl.innerHTML = `
      <div class="feedback-header">
        <span class="feedback-badge ${parsed.quality || 'partial'}">${
          parsed.quality === 'good' ? '✓ Strong Answer' :
          parsed.quality === 'poor' ? '✗ Needs Work' : '◑ Partial'
        }</span>
      </div>
      <div class="feedback-section good-points">
        <strong>What You Did Well</strong>
        ${parsed.goodPoints}
      </div>
      <div class="feedback-section attention-points">
        <strong>Points of Attention</strong>
        ${parsed.attentionPoints}
      </div>
      <div class="feedback-section model-answer">
        <strong>Model Answer</strong>
        ${parsed.modelAnswer}
      </div>`;

    btn.textContent = 'Evaluated ✓';

    // Check if all examples done
    checkAllExamplesDone();

  } catch (err) {
    const fbEl = document.getElementById(`example-fb-${idx}`);
    fbEl.className = 'example-feedback visible partial';
    fbEl.innerHTML = `<p>⚠ Evaluation error: ${err.message}</p>`;
    btn.disabled = false;
    btn.textContent = 'Try Again';
  }
}

function checkAllExamplesDone() {
  if (!window._examples) return;
  const allDone = window._examples.every((_, i) =>
    document.getElementById(`example-fb-${i}`)?.classList.contains('visible')
  );
  if (allDone) {
    const continueBtn = document.getElementById('examplesContinueBtn');
    if (continueBtn) continueBtn.style.display = 'block';
  }
}

// ─── SCENARIOS ─────────────────────────
function selectScenario(n) {
  activeScenario = n;
  document.querySelectorAll('#scenarioBtn1, #scenarioBtn2').forEach(b => b.classList.remove('selected'));
  document.getElementById(`scenarioBtn${n}`).classList.add('selected');

  const w1 = document.getElementById('widget1Container');
  const w2 = document.getElementById('widget2Container');
  w1.innerHTML = '';
  w2.innerHTML = '';

  if (n === 1) {
    loadAgent('widget1Container', agent1Id);
    w2.style.display = 'none';
    w1.style.display = 'flex';
  } else {
    loadAgent('widget2Container', agent2Id);
    w1.style.display = 'none';
    w2.style.display = 'flex';
  }
}

function loadAgent(containerId, agentId) {
  const container = document.getElementById(containerId);
  if (!agentId) {
    container.innerHTML = '<div class="no-agent-notice">📞 No Agent ID configured for this scenario.</div>';
    return;
  }
  const widget = document.createElement('elevenlabs-convai');
  widget.setAttribute('agent-id', agentId);
  container.appendChild(widget);
}

// ─── CHAT ──────────────────────────────
function setupChatSuggestions() {
  const qs = SUGGESTED_QS[selectedLevel];
  const sqEl = document.getElementById('suggestedQs');
  sqEl.innerHTML = '<div class="card-title" style="margin-bottom:4px">Suggested Questions</div>';
  qs.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'sug-btn';
    btn.textContent = q;
    btn.onclick = () => { document.getElementById('chatInput').value = q; sendChat(); };
    sqEl.appendChild(btn);