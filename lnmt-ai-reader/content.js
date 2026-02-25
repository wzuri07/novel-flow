function getChapterText() {
  const paragraphs = document.querySelectorAll('p');

  return Array.from(paragraphs)
    .map((paragraph) => paragraph.innerText.trim())
    .filter(Boolean)
    .join('\n\n');
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getText') {
    sendResponse({ text: getChapterText() });
  }
});
