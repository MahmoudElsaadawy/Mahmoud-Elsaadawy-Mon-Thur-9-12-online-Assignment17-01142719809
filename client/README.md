!! The Frontend part in this project is written using claude !!

# Chat Frontend — REST (auth/friends/groups) + Socket.IO (live chat)

No bundler, no build step. socket.io-client installed via npm, loaded
straight from node_modules.

## Split

- **REST API** (`fetch`) — login, signup, logout, profile, friends
  list, add friend, groups list, create group. All hit `API_BASE`.
- **Socket.IO** — only the live chat part: joining a conversation,
  chat history, sending/receiving messages, typing indicator, live
  friend online/offline status.

## Session persistence

`accessToken`/`refreshToken` are saved to `localStorage` on login/signup
and cleared on logout. On page load, `tryRestoreSession()` checks for a
saved token and calls `/users/profile` to rehydrate the session instead
of showing the login screen — if that token's expired/invalid, it's
cleared and you land back on the auth screen.

## Setup

```bash
npm install
npm start
```

`npm start` runs `npx serve .` -> serves this folder as static files.
Opens at `http://localhost:3000` by default — that clashes with a
backend also on 3000, so run this on a different port:
`npx serve . -l 5000` (or edit the `start` script in package.json).

## Point it at your backend

Both near the top of `script.js`:

```js
const API_BASE = "http://localhost:3000";   // REST endpoints, no /api prefix
```

```js
socket = io("http://localhost:3000", {      // Socket.IO connection
  auth: { token },
});
```

## REST endpoints (confirmed shapes)

- `POST /auth/login`   body `{ email, password }`
  -> `{ success, message, data: { accessToken, refreshToken } }`
- `POST /auth/signup`  body `{ email, password }` — assumed same shape as login
  (your auth middleware requires `confirmedAt` to be set, so signup
  may not log you straight in — adjust if it behaves differently)
- `GET  /users/profile` (Bearer token) -> `{ success, data: { user: {...} } }`
  — real user fields: `_id`/`id`, `name` (not `username`), `email`, `phone`,
  `age`, `gender`, `isOnline`, `bio`, etc.
- `POST /auth/logout`
- `GET  /friends` — assumed `[{ id, username, online }]`, **not confirmed** —
  friends almost certainly use `name` like the profile does, not `username`.
  Update `friend.username` refs in `script.js` once you confirm the real shape.
- `POST /friends`      body `{ username }`
- `GET  /groups`       — assumed `[{ id, name, memberCount }]`, not confirmed
- `POST /groups`       body `{ groupName, memberIds }`

All authenticated requests send `Authorization: Bearer <accessToken>`.

## Socket.IO events expected

**Emit:** `join_conversation`, `get_chat_history`, `send_message`, `typing`, `stop_typing`

**Listen:** `chat_history`, `receive_message`, `user_typing`, `user_stopped_typing`, `friend_status_change`

Socket connects with `auth: { token }` on the handshake — read it
server-side to identify the user (Socket.IO middleware).

Right after connecting, the client joins **every** friend/group room
via `joinAllConversations()` — not just the one you click into — so
new-message notifications work for chats you haven't opened yet. A
red dot appears on a sidebar item (`.has-unread`) when a message
comes in for a conversation that isn't the active one; opening that
chat clears it.

**Important:** `receive_message` payloads need `conversationType` and
`conversationId` fields added (in addition to `senderId`, `senderName`,
`text`, `timestamp`) so the client can tell which chat a message
belongs to and route it correctly.

## Files

- `index.html` — markup
- `style.css` — styling
- `script.js` — REST calls (`api()` helper + `fetchProfile()`) + Socket.IO wiring.
  Search for `BACKEND HOOK` comments.
