const GmailIntegration = require("./gmail.js");
const GitHubIntegration = require("./github.js");
const MockIntegration = require("./mock.js");
const SlackIntegration = require("./slack.js");
const NotionIntegration = require("./notion.js");

class IntegrationManager {
    constructor() {
        this.integrations = [];
        this.gmailIntegration = null;
        this.notifications = [];
    }

    setupIntegrations(config, tokens, app, onNewTokens) {
        this.integrations = [];

        // Initialize enabled integrations
        if (config.integrations.gmail?.enabled) {
            const gmailConfig = {
                ...config.integrations.gmail,
                token: tokens.gmail,
            };
            this.gmailIntegration = new GmailIntegration(gmailConfig);
            this.integrations.push(this.gmailIntegration);

            // Setup Gmail routes if enabled
            if (app) {
                this.gmailIntegration.setupRoutes(app, onNewTokens);
            }
        }

        if (config.integrations.github?.enabled) {
            this.integrations.push(new GitHubIntegration(config.integrations.github));
        }

        if (config.integrations.slack?.enabled) {
            const slackConfig = config.integrations.slack;
            if (tokens.slack) slackConfig.token = tokens.slack;
            this.integrations.push(new SlackIntegration(slackConfig));
        }

        if (config.integrations.notion?.enabled) {
            const notionConfig = config.integrations.notion;
            if (tokens.notion) notionConfig.token = tokens.notion;
            this.integrations.push(new NotionIntegration(notionConfig));
        }

        if (config.integrations.mock?.enabled) {
            this.integrations.push(new MockIntegration());
        }
    }

    async fetchAllNotifications() {
        try {
            this.notifications = [];
            for (const integration of this.integrations) {
                try {
                    const newNotifications = await integration.fetchNotifications();
                    this.notifications.push(...newNotifications);
                } catch (error) {
                    console.error(
                        `Error fetching notifications for ${integration.constructor.name}:`,
                        error,
                    );
                }
            }

            // Sort by date, newest first
            this.notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
            return this.notifications;
        } catch (error) {
            console.error("Error in fetchAllNotifications:", error);
            return [];
        }
    }

    getGmailAuthMiddleware(enabled) {
        return GmailIntegration.createAuthMiddleware(this.gmailIntegration, enabled);
    }

    async reinitializeGmail(config, newTokens) {
        // Remove existing Gmail integration
        const index = this.integrations.findIndex((i) => i instanceof GmailIntegration);
        if (index !== -1) {
            this.integrations.splice(index, 1);
        }

        // Create new Gmail integration with fresh tokens
        this.gmailIntegration = GmailIntegration.createWithNewTokens(config.integrations.gmail, newTokens);
        this.integrations.push(this.gmailIntegration);

        // Fetch new notifications
        await this.fetchAllNotifications();
    }
}

module.exports = new IntegrationManager();
