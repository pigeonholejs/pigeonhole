import { css } from "lit"

export const appHeaderStyles = css`
    :host {
        display: block;
    }

    .app-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--pico-muted-border-color);
    }

    .app-title {
        font-weight: bold;
        font-size: 1.25rem;
        text-decoration: none;
        margin-right: auto;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .user-info playful-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
    }

    .current-user {
        color: var(--pico-muted-color);
    }

    .logout-button {
        width: auto;
        margin: 0;
        padding: 0.25rem 0.75rem;
    }
`

export const postCardStyles = css`
    :host {
        display: block;
    }

    .post-card {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        border-bottom: 1px solid var(--pico-muted-border-color);
    }

    .post-avatar {
        flex-shrink: 0;
        width: 48px;
        height: 48px;
    }

    .post-avatar playful-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        overflow: hidden;
    }

    .post-body {
        flex: 1;
        min-width: 0;
    }

    .post-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
    }

    .post-username {
        font-weight: bold;
    }

    .post-time {
        color: var(--pico-muted-color);
        font-size: 0.875rem;
    }

    .post-content {
        margin-bottom: 0.5rem;
    }

    .post-actions {
        display: flex;
        gap: 0.5rem;
    }

    .like-button {
        background: none;
        border: none;
        color: var(--pico-muted-color);
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        border-radius: 9999px;
        padding: 0.25rem 0.75rem;
        margin: 0;
        font-size: 0.875rem;
        cursor: pointer;
        transition:
            color 0.15s,
            background-color 0.15s;
    }

    .like-button:hover {
        background-color: rgba(224, 36, 94, 0.1);
        color: #e0245e;
    }

    .like-button:hover .heart-icon {
        stroke: #e0245e;
    }

    .like-button.liked {
        color: #e0245e;
    }

    .heart-icon {
        fill: none;
        stroke: currentColor;
        stroke-width: 1.5;
    }

    .like-button.liked .heart-icon {
        fill: #e0245e;
        stroke: #e0245e;
    }
`

export const postComposerStyles = css`
    :host {
        display: block;
    }

    .post-composer {
        display: flex;
        gap: 0.75rem;
        padding: 1rem;
        border-bottom: 1px solid var(--pico-muted-border-color);
        margin-bottom: 0;
    }

    .composer-avatar {
        flex-shrink: 0;
        width: 48px;
        height: 48px;
    }

    .composer-avatar playful-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        overflow: hidden;
    }

    .composer-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .composer-body textarea {
        min-height: 4rem;
        resize: vertical;
        border: none;
        border-bottom: 1px solid var(--pico-muted-border-color);
        border-radius: 0;
        padding: 0.5rem 0;
    }

    .composer-body textarea:focus {
        border-bottom-color: var(--pico-primary);
        box-shadow: none;
    }

    .composer-body button {
        width: auto;
        align-self: flex-end;
        border-radius: 9999px;
        padding: 0.375rem 1.25rem;
    }
`

export const timelineStyles = css`
    :host {
        display: block;
    }

    .timeline {
        display: flex;
        flex-direction: column;
    }

    .empty-state {
        text-align: center;
        color: var(--pico-muted-color);
        padding: 2rem 0;
    }

    .load-more {
        align-self: center;
        width: auto;
    }
`

export const suggestedPostsStyles = css`
    :host {
        display: block;
    }

    .suggested-posts {
        padding: 1rem;
    }

    .suggested-posts h3 {
        margin-bottom: 0.75rem;
    }

    .suggested-posts ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .suggested-posts li {
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--pico-muted-border-color);
    }

    .suggested-posts li:last-child {
        border-bottom: none;
    }

    .suggestion-row {
        display: flex;
        gap: 0.5rem;
    }

    .suggestion-avatar {
        flex-shrink: 0;
        width: 32px;
        height: 32px;
    }

    .suggestion-avatar playful-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
    }

    .suggested-posts .content {
        margin-bottom: 0.25rem;
    }

    .suggested-posts .meta {
        font-size: 0.8rem;
        color: var(--pico-muted-color);
    }

    .suggested-posts .error {
        color: var(--pico-del-color);
    }
`

export const clientStatusPanelStyles = css`
    :host {
        display: block;
    }

    .client-status-panel {
        padding: 1rem;
        font-size: 0.875rem;
    }

    .client-status-panel h3 {
        margin-bottom: 0.5rem;
    }

    .client-status-panel p {
        margin-bottom: 0.25rem;
        word-break: break-all;
    }
`

export const formPageStyles = css`
    :host {
        display: block;
    }

    form {
        padding: 1.5rem;
        border: 1px solid var(--pico-muted-border-color);
        border-radius: var(--pico-border-radius);
    }

    .error {
        color: var(--pico-del-color);
        margin-bottom: 0.75rem;
    }
`
