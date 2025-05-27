// Helper function for consistent logging
function log(message, type = "log", data = null) {
    const prefix = "[NOTION-EXTRACTOR] 🔧";
    if (data) {
        console[type](prefix, message, data);
    } else {
        console[type](prefix, message);
    }
}

// Function to send token to our server
async function sendTokenToServer(token) {
    log(`Attempting to send token to server: ${token.substring(0, 5)}...`);
    try {
        const response = await fetch("http://localhost:3000/receive-cookie", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ token_v2: token }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        log("Successfully sent token to server");
        const responseData = await response.json();
        log("Server response:", "info", responseData);
    } catch (error) {
        log("Failed to send token to server:", "error", error);
    }
}

// Get cookie from background script and send to server
async function getAndSendToken() {
    log("Getting Notion cookie...");
    try {
        // Request cookie from background script
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "GET_NOTION_COOKIE" }, resolve);
        });

        log("Response from background:", "info", response);

        if (response?.success && response?.cookie?.value) {
            log("Found cookie value, sending to server...");
            await sendTokenToServer(response.cookie.value);
        } else {
            log("No cookie value found", "warn");
        }
    } catch (error) {
        log("Failed to get cookie:", "error", error);
    }
}

// Run when the page loads
log("Content script loaded and running", "info");
getAndSendToken();

// Debounce function to prevent too frequent updates
let timeout;
function debounce(func, wait) {
    clearTimeout(timeout);
    timeout = setTimeout(func, wait);
}

// Observe page changes
const observer = new MutationObserver(() => {
    log("Page changed, debouncing token refresh...");
    debounce(getAndSendToken, 60000);
});

// Start observing the document body for changes
observer.observe(document.body, {
    childList: true,
    subtree: true,
});
