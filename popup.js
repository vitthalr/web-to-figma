const captureBtn = document.getElementById('captureBtn');
const captureIdInput = document.getElementById('captureId');
const statusEl = document.getElementById('status');

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = 'status show ' + type;
}

captureBtn.addEventListener('click', async () => {
  const captureId = captureIdInput.value.trim();
  if (!captureId) {
    showStatus('Please paste a capture ID from Copilot', 'error');
    return;
  }

  captureBtn.disabled = true;
  showStatus('Capturing... Accept the debugger prompt.', 'info');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const response = await chrome.runtime.sendMessage({
      action: 'capture',
      tabId: tab.id,
      captureId: captureId
    });

    if (response.success) {
      showStatus('Capture sent to Figma! Tell Copilot to check status.', 'success');
    } else {
      showStatus('Error: ' + response.error, 'error');
    }
  } catch (err) {
    showStatus('Error: ' + err.message, 'error');
  } finally {
    captureBtn.disabled = false;
  }
});
