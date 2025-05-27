const { WebClient } = require("@slack/web-api");

class SlackIntegration {
    constructor(config) {
        this.client = new WebClient(config.token);
        this.config = config;
    }

    async fetchNotifications() {
        try {
            // Fetch unread messages from channels and DMs
            const conversations = await this.client.conversations.list({
                types: "public_channel,private_channel,im",
                exclude_archived: true,
            });

            let notifications = [];

            for (const channel of conversations.channels) {
                // Get unread messages count
                const history = await this.client.conversations.history({
                    channel: channel.id,
                    limit: 10, // Fetch last 10 messages
                });

                const messages = history.messages || [];

                for (const message of messages) {
                    // Get user info for the message sender
                    const userInfo = await this.client.users.info({
                        user: message.user,
                    });

                    notifications.push({
                        title: channel.name ? `#${channel.name}` : "Direct Message",
                        from: userInfo.user.real_name || userInfo.user.name,
                        date: new Date(message.ts * 1000).toISOString(),
                        link: message.permalink || "", // You might need to construct this
                        source: "Slack",
                        type: channel.is_channel ? "Channel" : "Direct Message",
                        unread: !message.is_read, // This might need adjustment based on Slack's API
                        content: message.text,
                    });
                }
            }

            // Sort by date, newest first
            notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
            return notifications;
        } catch (error) {
            console.error("Error fetching Slack notifications:", error);
            return [];
        }
    }

    setupRoutes(app, onNewTokens) {
        // Add any necessary routes for Slack OAuth if needed
    }
}

module.exports = SlackIntegration;
