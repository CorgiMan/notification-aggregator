const { Octokit } = require("octokit");

class GitHubIntegration {
    constructor(config) {
        this.octokit = new Octokit({ auth: config.token });
    }

    async fetchNotifications() {
        try {
            const response = await this.octokit.rest.activity
                .listNotificationsForAuthenticatedUser({
                    per_page: 20,
                    all: false,
                });

            return response.data.map((notification) => ({
                id: notification.id,
                title: notification.subject.title,
                source: "GitHub",
                from: notification.repository.full_name,
                date: notification.updated_at,
                unread: notification.unread,
                link: this.getNotificationUrl(notification),
                type: notification.subject.type,
                raw: notification,
            }));
        } catch (error) {
            console.error("Error fetching GitHub notifications:", error);
            return [];
        }
    }

    getNotificationUrl(notification) {
        // Convert API URL to web URL
        if (
            notification.subject.type === "Issue" ||
            notification.subject.type === "PullRequest"
        ) {
            return notification.subject.url
                .replace("api.github.com/repos", "github.com")
                .replace("/pulls/", "/pull/");
        }
        return `https://github.com/${notification.repository.full_name}`;
    }
}

module.exports = GitHubIntegration;
