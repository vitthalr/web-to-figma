// Web to Figma — Chrome Extension
// Uses Chrome Debugger API (CDP) to inject Figma's capture script, bypassing CSP/Trusted Types

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture') {
    handleCapture(message.tabId, message.captureId)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => {
        console.error('[WebToFigma] Error:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

async function handleCapture(tabId, captureId) {
  const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit`;
  const debugTarget = { tabId };

  // Step 1: Attach debugger
  await chrome.debugger.attach(debugTarget, '1.3');

  try {
    // Step 2: Fetch the Figma capture script (runs in service worker, no CSP)
    const response = await fetch('https://mcp.figma.com/mcp/html-to-design/capture.js');
    const captureScript = await response.text();

    // Step 3: Execute via CDP Runtime.evaluate — bypasses all CSP/Trusted Types
    await chrome.debugger.sendCommand(debugTarget, 'Runtime.evaluate', {
      expression: captureScript,
      awaitPromise: false
    });

    // Step 4: Wait for the script to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Trigger the capture
    await chrome.debugger.sendCommand(debugTarget, 'Runtime.evaluate', {
      expression: `
        window.figma.captureForDesign({
          captureId: '${captureId}',
          endpoint: '${endpoint}',
          selector: 'body'
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    return { captureId };
  } finally {
    // Step 6: Detach debugger
    try { await chrome.debugger.detach(debugTarget); } catch (e) {}
  }
}
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3 + i,
          method: 'tools/call',
          params: {
            name: 'generate_figma_design',
            arguments: { captureId: captureId }
          }
        })
      });

      const result = await response.json();
      const resultText = JSON.stringify(result);

      if (resultText.includes('completed') || resultText.includes('node-id')) {
        // Extract Figma URL
        const urlMatch = resultText.match(/(https:\/\/www\.figma\.com\/design\/[^\s"]+)/);
        return {
          status: 'completed',
          figmaUrl: urlMatch ? urlMatch[1] : `https://www.figma.com/design/${await getFileKey()}`,
          captureId
        };
      }

      console.log(`[FigmaCapture] Poll ${i + 1}: still processing...`);
    } catch (e) {
      console.error(`[FigmaCapture] Poll ${i + 1} error:`, e);
    }
  }

  return { status: 'timeout', captureId, message: 'Capture may still be processing. Check your Figma file.' };
}

async function getFileKey() {
  const settings = await chrome.storage.local.get(['figmaFileKey']);
  return settings.figmaFileKey || '';
}
