const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const integrationManager = require("./integrations/index.js");

// Global state
let app;
let config;
let tokens;

// Function to save tokens and reinitialize integration
async function saveTokensAndRefresh(service, newTokens) {
    // Save tokens to file
    tokens[service] = newTokens;
    fs.writeFileSync("tokens.json", JSON.stringify(tokens, null, 4));

    // Reinitialize the specific integration with new tokens
    if (service === "gmail") {
        await integrationManager.reinitializeGmail(config, newTokens);
    }
}

function setupConfig() {
    // Load config and tokens
    config = JSON.parse(fs.readFileSync("config.json"));
    try {
        tokens = JSON.parse(fs.readFileSync("tokens.json"));
    } catch (error) {
        // If tokens.json doesn't exist, create it
        tokens = {};
        fs.writeFileSync("tokens.json", JSON.stringify({}, null, 4));
    }
}

function setupExpress() {
    app = express();

    // Add middleware
    app.use(express.json()); // For parsing application/json
    app.use(express.static(path.join(__dirname, "public")));

    // Enable CORS for the extension
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }
        next();
    });

    app.get(
        "/",
        integrationManager.getGmailAuthMiddleware(config.integrations.gmail?.enabled),
        async (req, res) => {
            // Ensure we have fresh notifications
            const notifications = await integrationManager.fetchAllNotifications();

            const notificationList = notifications.map((notification) => `
        <div class="notification ${notification.unread ? "unread" : ""}">
            <div class="source-badge ${notification.source.toLowerCase()}">${notification.source}</div>
            <h3><a href="${notification.link}" target="_blank">${notification.title}</a></h3>
            <p>From: ${notification.from}</p>
            <p>Date: ${notification.date}</p>
            ${notification.content ? `<p class="notification-content">${notification.content}</p>` : ""}
            ${notification.type ? `<span class="type-badge">${notification.type}</span>` : ""}
            ${notification.unread ? '<span class="unread-badge">Unread</span>' : ""}
            <details class="debug-info">
                <summary>Debug Info</summary>
                <pre>${JSON.stringify(notification, null, 2)}</pre>
            </details>
        </div>
    `).join("");

            // Read the index.html file
            let html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

            // Insert the notifications
            html = html.replace(
                "<!-- Notifications will be inserted here -->",
                notificationList,
            );

            res.send(html);
        },
    );

    app.post("/receive-cookie", (req, res) => {
        try {
            const { token_v2 } = req.body;
            if (!token_v2) {
                return res.status(400).json({ error: "No token provided" });
            }

            console.log("Received Notion token", token_v2);

            // Update config and tokens
            config.integrations.notion.token = token_v2;
            tokens.notion = token_v2;

            // Save the updated config and tokens
            fs.writeFileSync("config.json", JSON.stringify(config, null, 4));
            fs.writeFileSync("tokens.json", JSON.stringify(tokens, null, 4));

            // Reinitialize integrations
            integrationManager.setupIntegrations(config, tokens, app, saveTokensAndRefresh);

            res.json({ success: true });
        } catch (error) {
            console.error("Error processing token:", error);
            res.status(500).json({ error: "Failed to process token" });
        }
    });
}

// Main setup function
async function setup() {
    setupConfig();
    setupExpress();
    integrationManager.setupIntegrations(config, tokens, app, saveTokensAndRefresh);
}

// Start server and fetch notifications
async function startServer() {
    try {
        await setup();
        await integrationManager.fetchAllNotifications();

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Error starting server:", error);
    }
}

startServer();
