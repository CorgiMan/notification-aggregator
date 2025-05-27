const { google } = require("googleapis");

class GmailIntegration {
    constructor(config) {
        const { client_secret, client_id } = config.credentials.installed;
        this.oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            "http://localhost:3000/auth/gmail/callback",
        );
        this.SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

        // If we have a token, set it up right away
        if (config.token) {
            this.oAuth2Client.setCredentials(config.token);
        }
    }

    // Setup Express routes for Gmail authentication
    setupRoutes(app, onNewTokens) {
        // Gmail auth routes
        app.get("/auth/gmail", async (req, res) => {
            try {
                const authUrl = await this.getAuthUrl();
                res.redirect(authUrl);
            } catch (error) {
                console.error("Error getting auth URL:", error);
                res.status(500).send("Error initiating authentication");
            }
        });

        // Gmail OAuth callback endpoint
        app.get("/auth/gmail/callback", async (req, res) => {
            try {
                const { code } = req.query;
                if (!code) {
                    return res.status(400).send("No authorization code provided");
                }

                // Get tokens using the code
                const newTokens = await this.getTokenFromCode(code);

                // Call the callback with new tokens
                if (onNewTokens) {
                    await onNewTokens("gmail", newTokens);
                }

                // Redirect to main page
                res.redirect("/");
            } catch (error) {
                console.error("Error in Gmail callback:", error);
                res.status(500).send("Authentication failed: " + error.message);
            }
        });
    }

    // Authentication middleware factory
    static createAuthMiddleware(gmailIntegration, enabled = true) {
        return async (req, res, next) => {
            // Skip auth check if Gmail is not enabled or no integration exists
            if (!enabled || !gmailIntegration) {
                return next();
            }

            try {
                // Try to use existing token
                await gmailIntegration.authorize();
                next();
            } catch (error) {
                console.log("Auth check failed:", error.message);
                // If authorization fails, redirect to auth
                res.redirect("/auth/gmail");
            }
        };
    }

    // Create a new instance with updated tokens
    static createWithNewTokens(config, newTokens) {
        const newConfig = {
            ...config,
            token: newTokens,
        };
        return new GmailIntegration(newConfig);
    }

    async authorize() {
        // If we have a valid token, use it
        if (this.oAuth2Client.credentials?.access_token) {
            return this.oAuth2Client;
        }

        // If no valid token, throw error to trigger auth flow
        throw new Error("Authentication required");
    }

    async getAuthUrl() {
        return this.oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: this.SCOPES,
        });
    }

    async getTokenFromCode(code) {
        try {
            const { tokens } = await this.oAuth2Client.getToken(code);
            this.oAuth2Client.setCredentials(tokens);
            return tokens;
        } catch (error) {
            console.error("Error getting tokens from code:", error);
            throw error;
        }
    }

    async fetchNotifications() {
        const auth = await this.authorize();
        const gmail = google.gmail({ version: "v1", auth });

        try {
            const res = await gmail.users.messages.list({
                userId: "me",
                maxResults: 20,
                q: "is:unread in:inbox",
            });

            const notifications = [];
            for (const message of res.data.messages || []) {
                const email = await gmail.users.messages.get({
                    userId: "me",
                    id: message.id,
                });

                const headers = email.data.payload.headers;
                const subject = headers.find((h) => h.name === "Subject")?.value || "(no subject)";
                const from = headers.find((h) => h.name === "From")?.value ||
                    "";
                const date = headers.find((h) => h.name === "Date")?.value ||
                    "";

                notifications.push({
                    id: message.id,
                    title: subject,
                    source: "Gmail",
                    from,
                    date,
                    unread: email.data.labelIds.includes("UNREAD"),
                    link: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
                    content: email.data.snippet || "",
                    raw: {
                        headers: headers,
                        snippet: email.data.snippet,
                        labelIds: email.data.labelIds,
                        threadId: email.data.threadId,
                        internalDate: email.data.internalDate,
                        sizeEstimate: email.data.sizeEstimate,
                        payload: email.data.payload,
                    },
                });
            }
            return notifications;
        } catch (error) {
            console.error("Error fetching Gmail notifications:", error);
            return [];
        }
    }
}

module.exports = GmailIntegration;
