/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");
const workerUrl = "https://odd-field-01cf.whatdoyouwant0429.workers.dev/";

// System prompt that keeps the chatbot focused on L'Oreal topics only.
const systemPrompt =
  "You are a L'Oreal Beauty Advisor chatbot. Only answer questions related to L'Oreal products, routines, recommendations, and beauty topics (skincare, makeup, haircare, fragrance, and basic ingredient guidance). If a question is unrelated, politely refuse in one short sentence, then redirect the user to a L'Oreal beauty topic you can help with. Do not answer unrelated topics. Keep replies concise, practical, and friendly.";

// Keep conversation history in a messages array for Chat Completions.
const messages = [{ role: "system", content: systemPrompt }];

// Store extra context for more natural multi-turn conversation in the UI.
const conversationMemory = {
  userName: "",
  pastQuestions: [],
};

function detectUserName(text) {
  const namePatterns = [
    /my name is\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /i am\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    /i'm\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "";
}

function updateLatestQuestion(text) {
  latestQuestion.textContent = `Latest question: ${text}`;
}

/* Helper to render a single chat message */
function addMessage(role, text) {
  const messageRow = document.createElement("div");
  const messageEl = document.createElement("div");
  const labelEl = document.createElement("p");
  const contentEl = document.createElement("p");

  const isUser = role === "user";
  messageRow.className = isUser ? "msg-row user" : "msg-row ai";
  messageEl.className = isUser ? "msg user" : "msg ai";
  labelEl.className = "msg-label";
  contentEl.className = "msg-text";

  labelEl.textContent = isUser ? "You" : "Advisor";
  contentEl.textContent = text;

  messageEl.append(labelEl, contentEl);
  messageRow.appendChild(messageEl);
  chatWindow.appendChild(messageRow);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return messageRow;
}

// Initial assistant greeting
addMessage(
  "assistant",
  "Hello! Ask me about L'Oreal products, routines, or recommendations.",
);

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  const name = detectUserName(text);
  if (name) {
    conversationMemory.userName = name;
  }

  conversationMemory.pastQuestions.push(text);
  updateLatestQuestion(text);

  addMessage("user", text);
  messages.push({ role: "user", content: text });

  if (conversationMemory.userName) {
    messages.push({
      role: "system",
      content: `The user's name is ${conversationMemory.userName}. Use it naturally when helpful.`,
    });
  }

  userInput.value = "";

  // Simple typing/loading message while waiting for API response.
  const loadingEl = addMessage("assistant", "Thinking...");

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
    const personalizedReply = conversationMemory.userName
      ? `Hi ${conversationMemory.userName}, ${assistantText}`
      : assistantText;

    loadingEl.remove();
    addMessage("assistant", personalizedReply);
  } catch (error) {
    loadingEl.remove();
    addMessage(
      "assistant",
      "I could not reach the API right now. Please check your Cloudflare Worker URL and try again.",
    );
    console.error(error);
  }
});
