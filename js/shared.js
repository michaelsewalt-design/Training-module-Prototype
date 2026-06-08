/* ═══════════════════════════════════════
   COMPLIANCE TRAINING — SHARED JS
   ═══════════════════════════════════════ */

// ─── AUTH ──────────────────────────────
function getToken() {
    return sessionStorage.getItem("ct_token");
}

function requireAuth() {
    var token = getToken();
    if (!token) {
        window.location.href = "/login.html";
        return false;
    }
    return true;
}

function logout() {
    sessionStorage.removeItem("ct_token");
    window.location.href = "/login.html";
}

// ─── API CALLS ─────────────────────────
function callClaude(messages, systemPrompt, maxTokens) {
    var token = getToken();
    if (!token) {
        return Promise.reject(new Error("Not authenticated"));
    }

    return fetch("/api/claude", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            messages: messages,
            system: systemPrompt,
            max_tokens: maxTokens || 1024,
            model: "claude-sonnet-4-20250514"
        })
    }).then(function(resp) {
        if (resp.status === 401) {
            sessionStorage.removeItem("ct_token");
            window.location.href = "/login.html";
            throw new Error("Session expired");
        }
        if (!resp.ok) {
            return resp.json().then(function(err) {
                throw new Error(err.error || err.details || "API error: " + resp.status);
            });
        }
        return resp.json();
    }).then(function(data) {
        var text = "";
        if (data.content && data.content[0] && data.content[0].text) {
            text = data.content[0].text;
        }
        return text;
    });
}

function loadConfig() {
    var token = getToken();
    if (!token) return Promise.resolve(null);

    return fetch("/api/config", {
        headers: { "Authorization": "Bearer " + token }
    }).then(function(resp) {
        if (!resp.ok) return null;
        return resp.json();
    }).catch(function() {
        return null;
    });
}

// ─── UI HELPERS ────────────────────────
function toggleAcc(id) {
    document.getElementById(id).classList.toggle("open");
}

function autoResize(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
}

function handleChatKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendChat();
    }
}

function formatText(text) {
    var html = text
        .replace(/\\(.?)\\*/g, "<strong>$1</strong>")
        .replace(/\(.?)\*/g, "<em>$1</em>");

    var paragraphs = html.split("\n\n");
    var result = "";
    for (var i = 0; i < paragraphs.length; i++) {
        result += "<p>" + paragraphs[i].replace(/\n/g, "<br>") + "</p>";
    }
    return result;
}

// ─── SHARED STATE ──────────────────────
var selectedLevel = null;
var selectedStrictness = "normal";
var agent1Id = "";
var agent2Id = "";
var chatHistory = [];
var stepsCompleted = [false, false, false, false, false];
var currentTab = "theory";
var activeScenario = null;
var quizResults = [];

// ─── LEVEL SELECTION ───────────────────
function selectLevel(btn) {
    var buttons = document.querySelectorAll("setupScreen .level-grid .level-btn");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("selected");
    }
    btn.classList.add("selected");
    selectedLevel = btn.getAttribute("data-level");

    // Show strictness card
    var strictCard = document.getElementById("strictnessCard");
    if (strictCard) {
        strictCard.style.display = "block";
    }

    checkStartReady();
}

// ─── STRICTNESS SELECTION ──────────────
function selectStrictness(btn) {
    var buttons = document.querySelectorAll(".strictness-btn");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("selected");
    }
    btn.classList.add("selected");
    selectedStrictness = btn.getAttribute("data-strictness");

    checkStartReady();
}

// ─── START READY CHECK ─────────────────
function checkStartReady() {
    var startBtn = document.getElementById("startBtn");
    if (startBtn) {
        startBtn.disabled = !selectedLevel;
    }
}

// ─── NAVIGATION ────────────────────────
function showTab(name) {
    var tabs = document.querySelectorAll(".tab-content");
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("active");
    }

    var navBtns = document.querySelectorAll(".nav-btn");
    for (var j = 0; j < navBtns.length; j++) {
        navBtns[j].classList.remove("active");
    }

    var steps = document.querySelectorAll(".step");
    for (var k = 0; k < steps.length; k++) {
        steps[k].classList.remove("active");
    }

    var tabEl = document.getElementById("tab-" + name);
    if (tabEl) tabEl.classList.add("active");

    var navEl = document.getElementById("nav-" + name);
    if (navEl) navEl.classList.add("active");

    var stepMap = {
        theory: "step1",
        examples: "step2",
        scenario: "step3",
        chat: "step4",
        quiz: "step5"
    };

    var stepEl = document.getElementById(stepMap[name]);
    if (stepEl) stepEl.classList.add("active");

    currentTab = name;
    window.scrollTo(0, 0);
}

function completeStep(n) {
    stepsCompleted[n - 1] = true;
    var stepEl = document.getElementById("step" + n);
    if (stepEl) stepEl.classList.add("done");

    var circleEl = document.getElementById("sc" + n);
    if (circleEl) circleEl.textContent = "\u2713";
}

function resetTraining() {
    if (!confirm("Restart training? Your progress will be lost.")) return;

    document.getElementById("setupScreen").style.display = "flex";
    document.getElementById("trainingScreen").classList.remove("visible");

    chatHistory = [];
    stepsCompleted = [false, false, false, false, false];
    quizResults = [];

    var steps = document.querySelectorAll(".step");
    for (var i = 0; i < steps.length; i++) {
        steps[i].classList.remove("done");
        steps[i].classList.remove("active");
    }

    for (var j = 1; j <= 5; j++) {
        var sc = document.getElementById("sc" + j);
        if (sc) sc.textContent = j;
    }

    document.getElementById("step1").classList.add("active");
    showTab("theory");
}

// ─── CHAT RENDER ───────────────────────
function renderChat() {
    var el = document.getElementById("chatHistory");
    if (chatHistory.length === 0) {
        el.innerHTML = '<div class="empty-msg">No messages yet. Ask a question or choose a suggestion below.</div>';
        return;
    }

    var html = "";
    for (var i = 0; i < chatHistory.length; i++) {
        var m = chatHistory[i];
        var roleLabel = m.role === "user" ? "You" : "AI Coach";
        html += '<div class="msg ' + m.role + '">';
        html += '<div class="msg-role">' + roleLabel + '</div>';
        html += '<div class="msg-bubble">' + formatText(m.content) + '</div>';
        html += '</div>';
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
}
