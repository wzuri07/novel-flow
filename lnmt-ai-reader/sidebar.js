const outputEl = document.getElementById('output');
const statusEl = document.getElementById('status');
const apiKeyEl = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const improveBtn = document.getElementById('improveBtn');

async function getStoredApiKey() {
  const result = await chrome.storage.local.get('openAiApiKey');
  return result.openAiApiKey || '';
}

async function saveApiKey() {
  const apiKey = apiKeyEl.value.trim();

  if (!apiKey) {
    statusEl.textContent = 'Enter an API key before saving.';
    return;
  }

  await chrome.storage.local.set({ openAiApiKey: apiKey });
  statusEl.textContent = 'API key saved locally in this browser profile.';
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

async function getChapterText(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: 'getText' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response?.text) {
        reject(new Error('No chapter text found on this page.'));
        return;
      }

      resolve(response.text);
    });
  });
}

async function improveText(text, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Rewrite the following text to improve grammar, clarity, and natural English while preserving original meaning and names.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.4
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No rewritten text returned.';
}

saveKeyBtn.addEventListener('click', saveApiKey);

improveBtn.addEventListener('click', async () => {
  try {
    statusEl.textContent = 'Reading chapter text...';
    outputEl.textContent = '';

    const apiKey = (await getStoredApiKey()) || apiKeyEl.value.trim();
    if (!apiKey) {
      statusEl.textContent = 'Add and save an OpenAI API key first.';
      return;
    }

    const tab = await getActiveTab();
    if (!tab?.id) {
      statusEl.textContent = 'No active tab found.';
      return;
    }

    const originalText = await getChapterText(tab.id);
    statusEl.textContent = 'Improving text with AI...';

    const improved = await improveText(originalText, apiKey);
    outputEl.textContent = improved;
    statusEl.textContent = 'Done.';
  } catch (error) {
    statusEl.textContent = error instanceof Error ? error.message : 'Unknown error.';
  }
});

(async () => {
  const key = await getStoredApiKey();
  if (key) {
    apiKeyEl.value = key;
    statusEl.textContent = 'Loaded saved API key.';
  }
})();
