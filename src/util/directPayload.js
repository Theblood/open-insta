'use strict';

const crypto = require('crypto');

function clientContext() {
    return crypto.randomUUID();
}

function textPayload(threadId, text, id = clientContext()) {
    return {
        action: 'send_item',
        client_context: id,
        mutation_token: id,
        text: String(text),
        thread_ids: JSON.stringify([String(threadId)])
    };
}

function likePayload(threadId, id = clientContext()) {
    return {
        action: 'send_item',
        client_context: id,
        mutation_token: id,
        thread_ids: JSON.stringify([String(threadId)])
    };
}

function typingPayload(isTyping, id = clientContext()) {
    return {
        client_context: id,
        activity_status: isTyping ? '1' : '0'
    };
}

function simplifyUser(user) {
    if (!user) return null;
    return {
        pk: user.pk || user.id || null,
        username: user.username || null,
        full_name: user.full_name || null,
        profile_pic_url: user.profile_pic_url || null
    };
}

function simplifyInbox(data) {
    const inbox = (data && data.inbox) || {};
    const threads = Array.isArray(inbox.threads) ? inbox.threads : [];
    return {
        unseen_count: inbox.unseen_count == null ? null : inbox.unseen_count,
        has_older: Boolean(inbox.has_older),
        oldest_cursor: inbox.oldest_cursor || null,
        threads: threads.map((thread) => ({
            thread_id: thread.thread_id,
            thread_title: thread.thread_title || null,
            last_activity_at: thread.last_activity_at || null,
            users: (thread.users || []).map(simplifyUser),
            items: Array.isArray(thread.items) ? thread.items : []
        }))
    };
}

module.exports = {
    clientContext,
    textPayload,
    likePayload,
    typingPayload,
    simplifyUser,
    simplifyInbox
};
