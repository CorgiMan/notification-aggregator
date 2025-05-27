// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_NOTION_COOKIE") {
        chrome.cookies.get({
            url: "https://www.notion.so",
            name: "token_v2",
        }, (cookie) => {
            sendResponse({ success: true, cookie });
        });
        return true; // Will respond asynchronously
    }
});
