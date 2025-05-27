class NotionIntegration {
    constructor(config) {
        this.config = config;
    }

    async fetchNotifications() {
        try {
            const response = await fetch("https://www.notion.so/api/v3/getNotificationLogV2", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "cookie": `token_v2=${this.config.token}`,
                },
                body: JSON.stringify({
                    spaceId: "da6c950d-f06a-81d8-86c1-000342cea774",
                    size: 20,
                    type: "unread_and_read",
                    variant: "no_grouping",
                }),
            });

            if (!response.ok) {
                throw new Error(`Notion API responded with status: ${response.status}`);
            }

            const data = await response.json();
            console.dir(data, { depth: null });

            return data.notificationIds.map((notificationId) => {
                // Get the notification and its associated activity
                const notificationValue = data.recordMap.notification[notificationId]?.value;
                const activity = notificationValue ? data.recordMap.activity[notificationValue.activity_id]?.value : null;
                const block = activity ? data.recordMap.block[activity.navigable_block_id || activity.parent_id]?.value : null;

                // Get user info if available
                const actorId = activity?.edits?.[0]?.authors?.[0]?.id;
                const actor = actorId ? data.recordMap.notion_user[actorId]?.value : null;

                // Get comment content if it's a comment notification
                const commentId = activity?.edits?.[0]?.comment_id;
                const comment = commentId ? data.recordMap.comment[commentId]?.value : null;

                // Get all comments if there are multiple
                const commentTexts = activity?.edits
                    ?.filter((edit) => edit.type === "comment-created" && edit.comment_data?.text)
                    ?.map((edit) => edit.comment_data.text.map((line) => line.join("")).join("\n"))
                    ?.join("\n\n") || "";

                return {
                    title: block?.properties?.title?.[0]?.[0] || "Untitled",
                    from: actor?.name || "Unknown User",
                    date: new Date(parseInt(activity?.end_time || notificationValue?.end_time || "0", 10)).toISOString(),
                    link: `https://www.notion.so/${block?.id?.replace(/-/g, "")}`,
                    source: "Notion",
                    type: notificationValue?.type || "Update",
                    unread: !notificationValue?.read,
                    content: commentTexts || activity?.type || "",
                    raw: {
                        activity,
                        block,
                        notification: notificationValue,
                        actor,
                        comment,
                    },
                };
            });
        } catch (error) {
            console.error("Error fetching Notion notifications:", error);
            return [];
        }
    }

    setupRoutes(app, onNewTokens) {
        // Notion doesn't require OAuth routes as it uses cookies
    }
}

module.exports = NotionIntegration;
