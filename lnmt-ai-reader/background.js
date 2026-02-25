chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) {
    return;
  }

  if (tab.url.includes('lnmtl.com')) {
    await chrome.sidePanel.open({ tabId: tab.id });
    return;
  }

  await chrome.sidePanel.open({ tabId: tab.id });
});
