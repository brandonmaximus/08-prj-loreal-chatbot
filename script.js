/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const workerUrl = "https://YOUR-WORKER-SUBDOMAIN.workers.dev";

// System prompt that keeps the chatbot focused on L'Oreal topics only.
const systemPrompt =
  "You are a L'Oreal Beauty Advisor chatbot. Only answer questions related to L'Oreal products, routines, recommendations, and beauty topics (skincare, makeup, haircare, fragrance, and basic ingredient guidance). If a question is unrelated, politely refuse in one short sentence, then redirect the user to a L'Oreal beauty topic you can help with. Do not answer unrelated topics. Keep replies concise, practical, and friendly.";

// Keep conversation history in a messages array for Chat Completions.
const messages = [{ role: "system", content: systemPrompt }];

/* Helper to render a single chat message */
function addMessage(role, text) {
  const messageEl = document.createElement("div");

  // Reuse existing CSS classes: .msg.user and .msg.ai
  messageEl.className = role === "user" ? "msg user" : "msg ai";

  const label = role === "user" ? "You" : "Advisor";
  messageEl.textContent = `${label}: ${text}`;

  chatWindow.appendChild(messageEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Initial assistant greeting
addMessage(
  "assistant",
  "Hello! Ask me about L'Oreal products, routines, or recommendations."
);

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  addMessage("user", text);
  messages.push({ role: "user", content: text });
  userInput.value = "";

  // Simple typing/loading message while waiting for API response.
  const loadingEl = document.createElement("div");
  loadingEl.className = "msg ai";
  loadingEl.textContent = "Advisor: Thinking...";
  chatWindow.appendChild(loadingEl);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Send chat messages to your Cloudflare Worker instead of calling OpenAI directly.
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const assistantText = data.choices[0].message.content;

    // Save and display the assistant reply.
    messages.push({ role: "assistant", content: assistantText });
    loadingEl.remove();
    addMessage("assistant", assistantText);
  } catch (error) {
    loadingEl.remove();
    addMessage(
      "assistant",
      "I could not reach the API right now. Please check your Cloudflare Worker URL and try again."
    );
    console.error(error);
  }
});
