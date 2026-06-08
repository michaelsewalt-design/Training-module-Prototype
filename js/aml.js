/* ═══════════════════════════════════════
   AML COMPLIANCE TRAINING — MODULE JS
   ═══════════════════════════════════════ */

var AML_LEVEL_LABELS = {
    analyst: "Analyst",
    compliance: "Compliance Officer",
    management: "Senior Management"
};

var AML_SYSTEM_PROMPTS = {
    analyst: "You are an AML training coach for a front-line analyst at a Dutch financial institution. Give practical, direct answers about Anti-Money Laundering obligations under the Wwft and the new AMLR (EU 2024/1624). Focus on: recognising unusual transaction patterns, CDD red flags, when and how to escalate to compliance, the tipping-off prohibition, and practical steps when a client behaves suspiciously. Use concrete examples. Always answer in English. Maximum 3-4 paragraphs.",

    compliance: "You are an AML training coach for a compliance officer at a Dutch financial institution. Give technical, in-depth answers about the Wwft and AMLR (EU 2024/1624). Reference articles by name, cite FATF recommendations, DNB/AFM guidelines and FIU-Nederland guidance. Topics: UTR procedures under Wwft Art. 16, CDD tiers, enhanced due diligence for PEPs and high-risk countries (AMLR Art. 35-40), UBO verification, transaction monitoring (AMLR Art. 59-61), AMLA framework, DNB/AFM enforcement. Always answer in English.",

    management: "You are an AML training coach for senior management and board members at a Dutch financial institution. Focus on governance under the Wwft and AMLR, personal liability for systematic AML failures, the SIRA, tone-from-the-top, the AMLA framework, and what DNB/AFM expect from an adequate AML compliance framework. Strategic answers, not operational. Always answer in English."
};

var AML_SUGGESTED_QS = {
    analyst: [
        "What should I do if a client wants to deposit cash in multiple small transactions?",
        "When is a transaction unusual enough to escalate under the Wwft?",
        "Am I allowed to tell a client that I filed a report with FIU-Nederland?"
    ],
    compliance: [
        "Within what timeframe must I file a UTR with FIU-Nederland?",
        "What enhanced CDD measures apply to PEPs under the AMLR?",
        "How do I document the decision not to file a UTR?"
    ],
    management: [
        "What does a robust SIRA look like under the AMLR?",
        "Am I personally liable if a relationship manager fails to file a UTR?",
        "How will AMLA affect our compliance framework from 2028?"
    ]
};

var AML_STRICTNESS_LABELS = {
    hard: "Strict — All answers must be complete and precise",
    normal: "Standard — Core concepts must be correct",
    light: "Lenient — Accepted unless clearly no effort"
};

var AML_STRICTNESS_INSTRUCTIONS = {
    hard: "Evaluate STRICTLY. The answer must be complete, precise and reference the correct AMLR/Wwft articles. Any missing element or factual error results in onvoldoende. Only fully correct and comprehensive answers receive goed.",
    normal: "Evaluate at STANDARD level. The answer should demonstrate understanding of core concepts. Minor omissions are acceptable if the main point is correct. Clearly wrong answers result in onvoldoende. Solid answers receive goed.",
    light: "Evaluate LENIENTLY. Accept any answer that shows genuine attempt to engage with the topic. Only mark as onvoldoende if completely off-topic or zero effort. Most reasonable attempts receive goed or gedeeltelijk."
};

// ─── INIT ──────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
    if (!requireAuth()) return;

    loadConfig().then(function(config) {
        if (config && config.aml) {
            var a1 = document.getElementById("agent1Id");
            var a2 = document.getElementById("agent2Id");
            if (a1 && !a1.value && config.aml.agent1) a1.value = config.aml.agent1;
            if (a2 && !a2.value && config.aml.agent2) a2.value = config.aml.agent2;
        }
    });

    checkStartReady();
});

// ─── START TRAINING ────────────────────
function startTraining() {
    agent1Id = document.getElementById("agent1Id").value.trim();
    agent2Id = document.getElementById("agent2Id").value.trim();

    document.getElementById("topLevel").textContent = AML_LEVEL_LABELS[selectedLevel] || selectedLevel;

    // Show level-specific theory
    var allTheory = document.querySelectorAll("[id^='theory-']");
    for (var i = 0; i < allTheory.length; i++) {
        allTheory[i].style.display = "none";
    }
    var levelTheory = document.querySelectorAll("[id^='theory-" + selectedLevel + "-']");
    for (var j = 0; j < levelTheory.length; j++) {
        levelTheory[j].style.display = "block";
    }

    // Setup chat suggestions
    setupChatSuggestions();

    // Setup strictness banner
    var banner = document.getElementById("strictnessBanner");
    if (banner) {
        var dotClass = selectedStrictness === "hard" ? "dot-hard" : selectedStrictness === "light" ? "dot-light" : "dot-normal";
        banner.innerHTML = '<div class="dot ' + dotClass + '"></div><span>' + AML_STRICTNESS_LABELS[selectedStrictness] + '</span>';
    }

    // Switch screens
    document.getElementById("setupScreen").style.display = "none";
    document.getElementById("trainingScreen").classList.add("visible");

    // Load examples and quiz
    loadExamples();
    loadQuiz();
}

// ─── EXAMPLES ──────────────────────────
function loadExamples() {
    var container = document.getElementById("examplesContainer");
    container.innerHTML = '<div class="empty-msg"><span class="spinner"></span> Generating practice examples...</div>';

    var prompt = "You are an AML compliance trainer creating practice examples for a " + AML_LEVEL_LABELS[selectedLevel] + " at a Dutch financial institution.\n\nCreate EXACTLY 4 short practice scenarios. Each should be realistic for daily work. Focus on CDD, transaction monitoring, structuring, UTR decisions, PEPs.\n\nReturn STRICT JSON only, no markdown:\n[\n  {\n    \"title\": \"Short title\",\n    \"scenario\": \"3-4 sentence situation\",\n    \"question\": \"Specific question to answer\"\n  }\n]";

    callClaude(
        [{ role: "user", content: prompt }],
        "You are a precise AML compliance trainer. Respond only with the requested JSON array.",
        1200
    ).then(function(reply) {
        var clean = reply.replace(/json|/g, "").trim();
        var examples = JSON.parse(clean);
        window