class MockIntegration {
    constructor() {
        this.notificationTypes = [
            "Task Update",
            "Meeting Reminder",
            "System Alert",
            "Project Milestone",
            "Team Message",
        ];

        this.mockUsers = [
            "Alice Smith",
            "Bob Johnson",
            "Carol Williams",
            "David Brown",
            "Eve Davis",
        ];
    }

    async fetchNotifications() {
        // Generate 5-10 random notifications
        const count = Math.floor(Math.random() * 6) + 5;
        const notifications = [];

        for (let i = 0; i < count; i++) {
            notifications.push(this.generateNotification());
        }

        return notifications;
    }

    generateNotification() {
        const type = this.getRandomItem(this.notificationTypes);
        const from = this.getRandomItem(this.mockUsers);
        const date = this.getRandomDate();
        const unread = Math.random() > 0.5;

        return {
            id: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: this.generateTitle(type),
            source: "Mock",
            from,
            date: date.toISOString(),
            unread,
            link: "#",
            type,
        };
    }

    generateTitle(type) {
        switch (type) {
            case "Task Update":
                return `Task ${Math.floor(Math.random() * 100)}: ${
                    this.getRandomItem([
                        "Update documentation",
                        "Fix bug in login flow",
                        "Implement new feature",
                        "Review pull request",
                        "Update dependencies",
                    ])
                }`;

            case "Meeting Reminder":
                return `Meeting: ${
                    this.getRandomItem([
                        "Weekly Standup",
                        "Project Planning",
                        "Code Review",
                        "Team Sync",
                        "Client Demo",
                    ])
                }`;

            case "System Alert":
                return `Alert: ${
                    this.getRandomItem([
                        "High CPU Usage",
                        "Low Disk Space",
                        "Service Downtime",
                        "Security Update Required",
                        "Database Backup Completed",
                    ])
                }`;

            case "Project Milestone":
                return `Milestone: ${
                    this.getRandomItem([
                        "Version 1.0 Released",
                        "Beta Testing Complete",
                        "100 Users Milestone",
                        "First Customer Onboarded",
                        "Security Audit Passed",
                    ])
                }`;

            case "Team Message":
                return this.getRandomItem([
                    "New team member joining next week",
                    "Office closed for holiday",
                    "Team lunch on Friday",
                    "New project kickoff",
                    "Congratulations on the launch!",
                ]);

            default:
                return "Generic Notification";
        }
    }

    getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    getRandomDate() {
        // Generate a random date within the last 24 hours
        const now = new Date();
        const hoursAgo = Math.random() * 24;
        return new Date(now - hoursAgo * 60 * 60 * 1000);
    }
}

module.exports = MockIntegration;
