export async function getAllSessions(stripe: any, customerId: string) {
    let hasMore = true;
    let startingAfter: string | undefined = undefined;
    const allSessions: any[] = [];

    while (hasMore) {
        const sessions: any = await stripe.checkout.sessions.list({
            customer: customerId,
            limit: 1000,
            starting_after: startingAfter,
        });

        allSessions.push(...sessions.data);
        hasMore = sessions.has_more;

        if (hasMore) {
            startingAfter = sessions.data[sessions.data.length - 1].id;
        }
    }

    return allSessions;
}

export async function getAllLineItems(stripe: any, sessionId: string) {
    let hasMore = true;
    let startingAfter: string | undefined = undefined;
    const allItems: any[] = [];

    while (hasMore) {
        const lineItems: any = await stripe.checkout.sessions.listLineItems(sessionId, {
            limit: 100,
            starting_after: startingAfter,
            expand: ["data.price.product"],
        });

        allItems.push(...lineItems.data);
        hasMore = lineItems.has_more;

        if (hasMore) {
            startingAfter = lineItems.data[lineItems.data.length - 1].id;
        }
    }

    return allItems;
}