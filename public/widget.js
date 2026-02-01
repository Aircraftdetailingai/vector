(function() {
  'use strict';

  // Get configuration from script tag
  const script = document.currentScript;
  const detailerId = script?.getAttribute('data-detailer-id');
  const position = script?.getAttribute('data-position') || 'bottom-right';
  const primaryColor = script?.getAttribute('data-color') || '#f59e0b';
  const apiBase = script?.getAttribute('data-api') || 'https://app.aircraftdetailing.ai';

  if (!detailerId) {
    console.error('Vector Widget: Missing data-detailer-id attribute');
    return;
  }

  // Styles
  const styles = `
    #vector-widget-container * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #vector-widget-button {
      position: fixed;
      ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999998;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    #vector-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }

    #vector-widget-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    #vector-widget-chat {
      position: fixed;
      ${position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      ${position.includes('bottom') ? 'bottom: 90px;' : 'top: 90px;'}
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
    }

    #vector-widget-chat.open {
      display: flex;
    }

    #vector-widget-header {
      background: ${primaryColor};
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    #vector-widget-header img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      background: white;
    }

    #vector-widget-header-text h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    #vector-widget-header-text p {
      margin: 2px 0 0;
      font-size: 12px;
      opacity: 0.9;
    }

    #vector-widget-close {
      margin-left: auto;
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
    }

    #vector-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .vector-message {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.4;
    }

    .vector-message.bot {
      background: #f3f4f6;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }

    .vector-message.user {
      background: ${primaryColor};
      color: white;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
    }

    #vector-widget-input-area {
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }

    #vector-widget-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
    }

    #vector-widget-input:focus {
      border-color: ${primaryColor};
    }

    #vector-widget-send {
      padding: 10px 20px;
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 24px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    #vector-widget-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .vector-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }

    .vector-typing span {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: vectorTyping 1.4s infinite;
    }

    .vector-typing span:nth-child(2) { animation-delay: 0.2s; }
    .vector-typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes vectorTyping {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }
  `;

  // Create widget HTML
  const container = document.createElement('div');
  container.id = 'vector-widget-container';
  container.innerHTML = `
    <style>${styles}</style>

    <button id="vector-widget-button" aria-label="Get a quote">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
      </svg>
    </button>

    <div id="vector-widget-chat">
      <div id="vector-widget-header">
        <img src="" alt="Logo" id="vector-widget-logo">
        <div id="vector-widget-header-text">
          <h3 id="vector-widget-company">Get a Quote</h3>
          <p>Typically replies in minutes</p>
        </div>
        <button id="vector-widget-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <div id="vector-widget-messages"></div>

      <div id="vector-widget-input-area">
        <input type="text" id="vector-widget-input" placeholder="Type your message..." />
        <button id="vector-widget-send">Send</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Widget state
  let config = null;
  let currentQuestionIndex = 0;
  let answers = {};
  let isOpen = false;
  let isCollectingInfo = true;

  // Elements
  const button = document.getElementById('vector-widget-button');
  const chat = document.getElementById('vector-widget-chat');
  const closeBtn = document.getElementById('vector-widget-close');
  const messagesEl = document.getElementById('vector-widget-messages');
  const inputEl = document.getElementById('vector-widget-input');
  const sendBtn = document.getElementById('vector-widget-send');
  const logoEl = document.getElementById('vector-widget-logo');
  const companyEl = document.getElementById('vector-widget-company');

  // Load config
  async function loadConfig() {
    try {
      const res = await fetch(`${apiBase}/api/lead-intake/widget?id=${detailerId}`);
      config = await res.json();

      if (config.detailer) {
        companyEl.textContent = config.detailer.name || 'Get a Quote';
        if (config.detailer.logo) {
          logoEl.src = config.detailer.logo;
        } else {
          logoEl.style.display = 'none';
        }
      }
    } catch (err) {
      console.error('Vector Widget: Failed to load config', err);
    }
  }

  // Add message to chat
  function addMessage(text, isBot = true) {
    const msg = document.createElement('div');
    msg.className = `vector-message ${isBot ? 'bot' : 'user'}`;
    msg.textContent = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Show typing indicator
  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'vector-message bot vector-typing';
    typing.id = 'vector-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const typing = document.getElementById('vector-typing');
    if (typing) typing.remove();
  }

  // Ask next question
  function askNextQuestion() {
    if (!config?.questions || currentQuestionIndex >= config.questions.length) {
      // All questions answered, submit lead
      submitLead();
      return;
    }

    const q = config.questions[currentQuestionIndex];
    setTimeout(() => {
      hideTyping();
      addMessage(q.question);
      if (q.placeholder) {
        inputEl.placeholder = q.placeholder;
      }
    }, 500);
  }

  // Submit lead
  async function submitLead() {
    hideTyping();
    addMessage("Thank you! I've captured all your information. Someone will be in touch shortly to provide your quote.");
    isCollectingInfo = false;

    try {
      await fetch(`${apiBase}/api/lead-intake/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_from_widget',
          detailer_id: detailerId,
          customer_name: answers.name || 'Website Visitor',
          customer_email: answers.email || null,
          customer_phone: answers.phone || null,
          answers,
          source: 'widget',
        }),
      });
    } catch (err) {
      console.error('Vector Widget: Failed to submit lead', err);
    }
  }

  // Handle user input
  async function handleInput() {
    const text = inputEl.value.trim();
    if (!text) return;

    addMessage(text, false);
    inputEl.value = '';

    if (isCollectingInfo && config?.questions) {
      // Store answer
      const q = config.questions[currentQuestionIndex];
      if (q) {
        answers[q.key] = text;
      }

      currentQuestionIndex++;
      showTyping();
      askNextQuestion();
    } else {
      // Free chat - get AI response
      showTyping();
      try {
        const res = await fetch(`${apiBase}/api/lead-intake/widget`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            detailer_id: detailerId,
            message: text,
            answers,
          }),
        });
        const data = await res.json();
        hideTyping();
        addMessage(data.response || "Thanks for your message!");
      } catch (err) {
        hideTyping();
        addMessage("Thanks for your message! We'll be in touch soon.");
      }
    }
  }

  // Toggle chat
  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      chat.classList.add('open');
      if (!config) {
        loadConfig().then(() => {
          showTyping();
          setTimeout(() => {
            hideTyping();
            addMessage("Hi! I'm here to help you get a quick quote. Let me ask you a few questions.");
            showTyping();
            setTimeout(() => askNextQuestion(), 1000);
          }, 500);
        });
      }
      inputEl.focus();
    } else {
      chat.classList.remove('open');
    }
  }

  // Event listeners
  button.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);
  sendBtn.addEventListener('click', handleInput);
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleInput();
  });

})();
