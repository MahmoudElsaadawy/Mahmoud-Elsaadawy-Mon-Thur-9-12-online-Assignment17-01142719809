// ============================================================
// CONFIG
// ============================================================
// REST backend base URL — handles login, signup, friends, groups.
const API_BASE = "http://localhost:3000";

// Socket.IO — ONLY used for live chat (sending/receiving messages,
// typing indicators). Not connected until after REST login/signup
// succeeds, since we need an auth token first.
let socket = null;

// ============================================================
// APP STATE
// ============================================================
const state = {
  currentUser: null, // { id, username } once logged in
  token: null, // auth token returned by REST login/signup, sent on every request
  refreshToken: null, // stored for later — not wired up to any refresh flow yet
  activeConversation: null, // { type: 'dm' | 'group', id: string, name: string }
  friends: [], // populated from REST: [{ id, username, online }]
  groups: [], // populated from REST: [{ id, name, memberCount }]
  unreadConversations: new Set(), // keys like "dm:123" / "group:456" — survives sidebar re-renders
};

// ============================================================
// DOM REFERENCES
// ============================================================
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");

const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginError = document.getElementById("login-error");
const signupError = document.getElementById("signup-error");
const signupSuccess = document.getElementById("signup-success");

const currentUsername = document.getElementById("current-username");
const currentUserAvatar = document.getElementById("current-user-avatar");
const logoutBtn = document.getElementById("logout-btn");

const tabFriends = document.getElementById("tab-friends");
const tabGroups = document.getElementById("tab-groups");
const friendsList = document.getElementById("friends-list");
const groupsList = document.getElementById("groups-list");

const addFriendBtn = document.getElementById("add-friend-btn");
const createGroupBtn = document.getElementById("create-group-btn");

const chatHeaderName = document.getElementById("chat-header-name");
const chatHeaderStatus = document.getElementById("chat-header-status");
const chatHeaderAvatar = document.getElementById("chat-header-avatar");
const messagesContainer = document.getElementById("messages-container");
const typingIndicator = document.getElementById("typing-indicator");

const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");


// ============================================================
// REST HELPER
// Small wrapper around fetch() that adds JSON headers + auth token
// and throws on non-2xx responses so callers can just try/catch.
// ============================================================
async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}


// ============================================================
// AUTH SCREEN: TAB SWITCHING (Login <-> Signup)
// ============================================================
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
  signupSuccess.textContent = "";
});

tabSignup.addEventListener("click", () => {
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});


// ============================================================
// LOGIN — REST call
// ============================================================
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  // BACKEND HOOK -----------------------------------------------------
  // POST /auth/login  body: { email, password }
  // Response: { success, message, data: { accessToken, refreshToken } }
  // No user object comes back from login itself — once we have the
  // accessToken, fetch the real profile from GET /users/profile
  // (protected by your `auth` middleware, reads req.user server-side).
  try {
    const { data } = await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    const user = await fetchProfile(data.accessToken);
    onAuthSuccess(user, data.accessToken, data.refreshToken);
  } catch (err) {
    loginError.textContent = err.message || "Login failed. Try again.";
  }
  // --------------------------------------------------------------------
});


// ============================================================
// SIGNUP — REST call
// ============================================================
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  signupError.textContent = "";
  signupSuccess.textContent = "";

  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const phone = document.getElementById("signup-phone").value.trim();
  const age = Number(document.getElementById("signup-age").value);
  const gender = Number(document.getElementById("signup-gender").value); // 0 = Male, 1 = Female
  const role = Number(document.getElementById("signup-role").value); // 0 = User, 1 = Admin
  const bio = document.getElementById("signup-bio").value.trim();

  // BACKEND HOOK -----------------------------------------------------
  // POST /auth/signup  body matches IUser: { name, email, password, phone, age, gender, role, bio }
  // Confirmed response shape: { success, message, data: { ...createdUserFields } }
  // No tokens come back — signup just creates the account. Your auth
  // middleware also requires `confirmedAt` to be set, so this account
  // likely needs an email confirmation step before it can log in at all.
  // So: show the success message, switch to the login tab, and let
  // them log in separately — don't try to auto-login here.
  try {
    const { message } = await api("/auth/signup", {
      method: "POST",
      body: { name, email, password, phone, age, gender, role, bio },
    });
    signupSuccess.textContent = message || "Account created.";
    signupForm.reset();
  } catch (err) {
    signupError.textContent = err.message || "Signup failed. Try again.";
  }
  // --------------------------------------------------------------------
});


// ============================================================
// FETCH PROFILE — GET /users/profile
// Protected route: your `auth` middleware reads the Bearer token,
// looks up the user, and attaches it as req.user server-side.
// Called right after login/signup since neither of those responses
// includes a user object, only tokens.
// ============================================================
async function fetchProfile(accessToken) {
  const res = await fetch(`${API_BASE}/users/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(body.message || "Could not load profile");
    err.status = res.status; // callers use this to tell "token is bad" apart from "something else broke"
    throw err;
  }

  // Actual shape: { success, message, data: { user: { ... } } }
  return body.data.user;
}


// ============================================================
// SHARED: what happens once login OR signup succeeds
// ============================================================
async function onAuthSuccess(user, token, refreshToken) {
  state.currentUser = user;
  state.token = token;
  state.refreshToken = refreshToken;

  // Persist tokens so a page refresh doesn't sign the user out.
  // (localStorage survives reloads; plain JS state does not.)
  localStorage.setItem("accessToken", token);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

  // Confirmed shape: user.name (not username), user.id (also has _id).
  const displayName = user.name || user.email || "User";
  currentUsername.textContent = displayName;
  currentUserAvatar.textContent = displayName[0].toUpperCase();

  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");

  // Load sidebar data via REST first — we need the friend/group ids
  // before we can join every conversation's socket room below.
  await Promise.all([loadFriends(), loadGroups()]);

  // Connect the chat socket right at login (not on first click into a
  // chat), and join every conversation's room immediately — so
  // notifications/messages come in for ALL chats, not just whichever
  // one happens to be open.
  // BACKEND HOOK: server should read `auth.token` on connection to
  // identify the user for this socket (e.g. via Socket.IO middleware).
  connectChatSocket(token);
}


// ============================================================
// RESTORE SESSION ON PAGE LOAD
// If a token is already saved from a previous session, skip the
// auth screen and try to jump straight into the app.
// ============================================================
async function tryRestoreSession() {
  const savedToken = localStorage.getItem("accessToken");
  if (!savedToken) return; // nobody logged in before — show auth screen as normal

  try {
    const user = await fetchProfile(savedToken);
    const savedRefreshToken = localStorage.getItem("refreshToken");
    onAuthSuccess(user, savedToken, savedRefreshToken);
  } catch (err) {
    if (err.status === 401) {
      // Token is genuinely invalid/expired — clear it, back to login screen.
      console.warn("[session] saved token rejected (401), clearing:", err.message);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } else {
      // Something else went wrong (network blip, server down, rate limit,
      // 500, etc) — the token might still be perfectly valid. Don't throw
      // it away over a transient failure; just tell the person and let
      // them retry (e.g. by refreshing again) instead of forcing a re-login.
      console.error("[session] could not restore session (non-auth error):", err.message);
      loginError.textContent = "Couldn't reach the server — try refreshing.";
    }
  }
}

tryRestoreSession();


// ============================================================
// LOGOUT
// ============================================================
logoutBtn.addEventListener("click", async () => {
  // BACKEND HOOK: POST /auth/logout (optional — depends on your auth scheme)
  try {
    await api("/auth/logout", { method: "POST" });
  } catch (err) {
    console.warn("[logout] request failed, clearing local session anyway:", err.message);
  }

  if (socket) socket.disconnect();

  // Clear persisted session
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");

  // Reset frontend state back to auth screen
  state.currentUser = null;
  state.token = null;
  state.activeConversation = null;
  state.unreadConversations.clear();
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  loginForm.reset();
  signupForm.reset();
  messagesContainer.innerHTML = '<p class="empty-state">No conversation selected. Pick a friend or group to start chatting.</p>';
});


// ============================================================
// SIDEBAR: FRIENDS / GROUPS TAB SWITCHING
// ============================================================
tabFriends.addEventListener("click", () => {
  tabFriends.classList.add("active");
  tabGroups.classList.remove("active");
  friendsList.classList.remove("hidden");
  groupsList.classList.add("hidden");
});

tabGroups.addEventListener("click", () => {
  tabGroups.classList.add("active");
  tabFriends.classList.remove("active");
  groupsList.classList.remove("hidden");
  friendsList.classList.add("hidden");
});


// ============================================================
// FRIENDS LIST — REST
// ============================================================
// BACKEND HOOK: GET /users/list-friends
// Confirmed response shape:
// { success, data: { friendRequests: [{ _id, from, to, status, ... }] } }
// Each entry represents a friend REQUEST, not necessarily an accepted
// friend — one of `from`/`to` is null (that's you, omitted by the
// server) and the other is the other user's info. `status` is:
//   0 = pending, 1 = accepted, 2 = rejected, 3 = canceled
// Only `accepted` entries are real friends — the rest (pending
// incoming/outgoing requests) aren't surfaced in the UI yet.
const FriendRequestStatus = { pending: 0, accepted: 1, rejected: 2, canceled: 3 };

async function loadFriends() {
  try {
    const { data } = await api("/users/list-friends");
    const requests = data.friendRequests || [];

    state.friends = requests
      .filter((req) => req.status === FriendRequestStatus.accepted)
      .map((req) => {
        const otherUser = req.from || req.to; // whichever side isn't you
        return {
          id: otherUser.id,
          username: otherUser.name, // real field is "name", not "username"
          online: false, // not included in this response — updated live via 'friend_status_change' socket event
        };
      });

    renderFriendsList();
  } catch (err) {
    console.error("[friends] failed to load:", err.message);
  }
}

function renderFriendsList() {
  friendsList.innerHTML = "";
  state.friends.forEach((friend) => {
    const li = document.createElement("li");
    li.className = "list-item" + (state.unreadConversations.has(`dm:${friend.id}`) ? " has-unread" : "");
    li.dataset.conversationType = "dm";
    li.dataset.id = friend.id;

    li.innerHTML = `
      <div class="avatar">${friend.username[0].toUpperCase()}</div>
      <div class="list-item-info">
        <span class="list-item-name">${friend.username}</span>
        <span class="list-item-status ${friend.online ? "online" : ""}">
          ${friend.online ? "Online" : "Offline"}
        </span>
      </div>
    `;

    li.addEventListener("click", () => openConversation("dm", friend.id, friend.username));
    friendsList.appendChild(li);
  });
}

// BACKEND HOOK: POST /friends  body: { username } — NOT CONFIRMED.
// Given /friends turned out to actually be /users/list-friends, this
// add-friend endpoint is probably also under /users/... with a
// different name/body (e.g. sending a friend request by user id
// rather than username). Update once you confirm the real route.
addFriendBtn.addEventListener("click", async () => {
  const username = prompt("Enter friend's username:");
  if (!username) return;

  try {
    await api("/friends", { method: "POST", body: { username } });
    loadFriends(); // refresh list after adding
  } catch (err) {
    alert(err.message || "Could not add friend.");
  }
});


// ============================================================
// GROUPS LIST — REST
// ============================================================
// BACKEND HOOK: GET /groups -> [{ id, name, memberCount }, ...]
async function loadGroups() {
  try {
    const { data } = await api("/users/list-groups"); // unwrap, matching loadFriends()
    state.groups = data;
    renderGroupsList();
  } catch (err) {
    console.error("[groups] failed to load:", err.message);
  }
}

function renderGroupsList() {
  groupsList.innerHTML = "";
  state.groups.forEach((group) => {
    const li = document.createElement("li");
    li.className = "list-item" + (state.unreadConversations.has(`group:${group.id}`) ? " has-unread" : "");
    li.dataset.conversationType = "group";
    li.dataset.id = group.id;

    li.innerHTML = `
      <div class="avatar">#</div>
      <div class="list-item-info">
        <span class="list-item-name">${group.name}</span>
        <span class="list-item-status">${group.memberCount} members</span>
      </div>
    `;

    li.addEventListener("click", () => openConversation("group", group.id, group.name));
    groupsList.appendChild(li);
  });
}

// BACKEND HOOK: POST /groups  body: { groupName, memberIds: [] }
// memberIds left empty here for test purposes — wire up a real
// member-picker UI when connecting to your backend.
createGroupBtn.addEventListener("click", async () => {
  const groupName = prompt("Enter new group name:");
  if (!groupName) return;

  const participantsInput = prompt("Enter friend user IDs, separated by spaces:");
  if (!participantsInput) return;

  const participants = participantsInput.trim().split(/\s+/).filter(Boolean);

  try {
    await api("/create-group", {
      method: "POST",
      body: { group: groupName, participants },
    });
    loadGroups();
  } catch (err) {
    alert(err.message || "Could not create group.");
  }
});


// ============================================================
// CHAT SOCKET — the ONLY thing that goes over Socket.IO.
// Everything above this line (auth, friends, groups) is plain REST.
// ============================================================
function connectChatSocket(token) {
  // BACKEND HOOK -----------------------------------------------------
  // Connect with the auth token so the server can identify this user
  // on the socket (e.g. read `socket.handshake.auth.token` server-side).
  socket = io("http://localhost:3000", {
    auth: { token },
    // WORKAROUND: WebSocket upgrade was failing right after handshake
    // (common with nodemon/ts-node-dev auto-restarts, or a proxy that
    // blocks raw WS frames). Forcing polling-only skips the upgrade
    // entirely. Remove this line once the upgrade issue is fixed
    // server-side — polling has more latency than a real WebSocket.
    transports: ["polling"],
  });
  // --------------------------------------------------------------------

  socket.on("connect", () => {
    console.log("[socket] connected:", socket.id);

    // Join every DM + group room right away — this is what makes
    // "new message" notifications work for chats you haven't opened
    // yet, instead of only hearing about the one chat you're viewing.
    joinAllConversations();
  });

  socket.on("disconnect", () => {
    console.log("[socket] disconnected");
  });

  socket.on("connect_error", (err) => {
    console.error("[socket] connection error:", err.message);
  });

  // No longer used — both DM and group history now load over REST
  // (loadDmHistory / loadGroupHistory). Left in place harmlessly in
  // case anything server-side still emits it.
  socket.on("chat_history", (messages) => {
    messagesContainer.innerHTML = "";
    messages.forEach(renderMessage);
    scrollMessagesToBottom();
  });

  // BACKEND HOOK: server broadcasts a new message to everyone in the room.
  // Expected payload now needs conversationType + conversationId added
  // so the client can tell which chat it belongs to:
  // { conversationType, conversationId, senderId, senderName, text, timestamp }
  socket.on("receive_message", (message) => {
    const isActiveConversation =
      state.activeConversation &&
      state.activeConversation.type === message.conversationType &&
      state.activeConversation.id === message.conversationId;

    if (isActiveConversation) {
      renderMessage(message);
      scrollMessagesToBottom();
    } else {
      // Message is for a chat that isn't open right now — show an
      // unread marker on its sidebar entry instead of dropping it.
      markConversationUnread(message.conversationType, message.conversationId);
    }
  });

  // BACKEND HOOK: server tells us someone else is typing in this room.
  // Expected payload example: { username }
  socket.on("user_typing", (data) => {
    typingIndicator.textContent = `${data.username} is typing...`;
    typingIndicator.classList.remove("hidden");
  });

  // BACKEND HOOK: server tells us that user stopped typing.
  socket.on("user_stopped_typing", () => {
    typingIndicator.classList.add("hidden");
  });

  // BACKEND HOOK: server pushes a live status change for a friend
  // (still socket-based since it's real-time presence tied to chat).
  // Expected payload example: { userId, online }
  socket.on("friend_status_change", ({ userId, online }) => {
    const friend = state.friends.find((f) => f.id === userId);
    if (friend) {
      friend.online = online;
      renderFriendsList();
    }
  });
}


// ============================================================
// JOIN EVERY CONVERSATION ROOM
// Called once right after the socket connects (see connectChatSocket
// above) so messages/notifications arrive for every chat, not just
// whichever one is currently open.
// ============================================================
function joinAllConversations() {
  state.friends.forEach((friend) => {
    socket.emit("join_conversation", { type: "dm", id: friend.id });
  });
  state.groups.forEach((group) => {
    socket.emit("join_conversation", { type: "group", id: group.id });
  });
}


// ============================================================
// UNREAD MARKERS
// Small dot on a sidebar item when a message comes in for a chat
// that isn't the one currently open.
// ============================================================
function markConversationUnread(type, id) {
  state.unreadConversations.add(`${type}:${id}`);
  const li = document.querySelector(`.list-item[data-conversation-type="${type}"][data-id="${id}"]`);
  if (li) li.classList.add("has-unread");
}

function clearConversationUnread(type, id) {
  state.unreadConversations.delete(`${type}:${id}`);
  const li = document.querySelector(`.list-item[data-conversation-type="${type}"][data-id="${id}"]`);
  if (li) li.classList.remove("has-unread");
}


// ============================================================
// OPEN A CONVERSATION (DM or Group) — joins the Socket.IO room
// and loads chat history over REST (loadDmHistory / loadGroupHistory).
// ============================================================
function openConversation(type, id, name) {
  state.activeConversation = { type, id, name };
  clearConversationUnread(type, id);

  // Highlight selected item in sidebar
  document.querySelectorAll(".list-item").forEach((el) => el.classList.remove("selected"));
  const selectedEl = document.querySelector(`.list-item[data-id="${id}"]`);
  if (selectedEl) selectedEl.classList.add("selected");

  // Update chat header
  chatHeaderAvatar.textContent = type === "group" ? "#" : name[0].toUpperCase();
  chatHeaderName.textContent = name;
  chatHeaderStatus.textContent = type === "group" ? "Group chat" : "Direct message";

  // Enable message input now that a conversation is open
  messageInput.disabled = false;
  sendBtn.disabled = false;

  // Clear old messages while we wait for history
  messagesContainer.innerHTML = "";

  // Still join the socket room — this is what makes live incoming
  // messages/notifications work, separate from loading past history.
  socket.emit("join_conversation", { type, id });

  if (type === "dm") {
    loadDmHistory(id);
  } else {
    loadGroupHistory(id);
  }
}


// ============================================================
// DM CHAT HISTORY — REST
// BACKEND HOOK: GET /chats/:friendId
// Confirmed response: { success, data: { participants, messages, ... } }
// `messages` was empty in the sample response, so the exact per-message
// field names (sender/content/timestamp vs other naming) aren't
// confirmed yet — mapChatMessage() below guesses common variants.
// Send a real populated message and I'll lock this down exactly.
// ============================================================
async function loadDmHistory(friendId) {
  try {
    const { data } = await api(`/chats/${friendId}`);
    const messages = (data.messages || []).map(mapChatMessage);
    messages.forEach(renderMessage);
    scrollMessagesToBottom();
  } catch (err) {
    console.error("[chat] failed to load history:", err.message);
  }
}

function mapChatMessage(raw) {
  // 1. Extract sender ID (handles populated User object vs raw ObjectId string)
  const creator = raw.createdBy;
  const senderId =
    typeof creator === "object" && creator !== null
      ? (creator._id || creator.id).toString()
      : creator?.toString() || "";

  // 2. Extract sender name (uses populated name or falls back)
  let senderName = "User";
  if (typeof creator === "object" && creator?.name) {
    senderName = creator.name;
  } else if (state.activeConversation) {
    const isOwn = senderId === state.currentUser?.id;
    if (isOwn) {
      senderName = state.currentUser?.name || "You";
    } else if (state.activeConversation.type === "dm") {
      // Only one other participant in a DM — it's always them.
      senderName = state.activeConversation.name;
    } else {
      // Group message from someone else: `createdBy` here is just a raw
      // id, not a populated user, so the real name isn't available yet.
      // Falls back to a placeholder until group member names are fetched
      // from somewhere (e.g. a group-details endpoint).
      senderName = "Member";
    }
  }

  // 3. Construct unified message object for renderMessage()
  return {
    senderId: senderId,
    senderName: senderName,
    text: raw.content || "",
    timestamp: raw.createdAt || raw.updatedAt,
  };
}


// ============================================================
// GROUP CHAT HISTORY — REST
// BACKEND HOOK: GET /get-group-chat/:groupId
// Confirmed response: { success, data: { participants, messages, ... } }
// Same message shape as the DM endpoint (createdBy, content, createdAt),
// so this reuses mapChatMessage() above.
// ============================================================
async function loadGroupHistory(groupId) {
  try {
    const { data } = await api(`/chats/get-group-chat/${groupId}`);
    const messages = (data.messages || []).map(mapChatMessage);
    messages.forEach(renderMessage);
    scrollMessagesToBottom();
  } catch (err) {
    console.error("[chat] failed to load group history:", err.message);
  }
}


// ============================================================
// SEND MESSAGE — over the socket (this is the live chat part)
// ============================================================
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const content = messageInput.value.trim();
  if (!content || !state.activeConversation || !socket) return;

  // BACKEND HOOK -----------------------------------------------------
  // Server should broadcast this to everyone in the room, including
  // this client, via 'receive_message'.
  socket.emit("send_message", {
    conversationType: state.activeConversation.type,
    conversationId: state.activeConversation.id,
    content,
  });
  // --------------------------------------------------------------------

  messageInput.value = "";
  socket.emit("stop_typing", { conversationId: state.activeConversation.id });
});

function renderMessage(message) {
  const div = document.createElement("div");
  const isOwnMessage = message.senderId === state.currentUser?.id;

  div.className = "message" + (isOwnMessage ? " own-message" : "");
  div.innerHTML = `
    ${!isOwnMessage ? `<span class="message-sender">${message.senderName}</span>` : ""}
    <span class="message-text"></span>
    <span class="message-time">${formatTime(message.timestamp)}</span>
  `;
  // Set text via textContent (not innerHTML) to avoid XSS from message contents
  div.querySelector(".message-text").textContent = message.text;

  messagesContainer.appendChild(div);
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scrollMessagesToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


// ============================================================
// TYPING INDICATOR — over the socket (ephemeral, real-time only)
// ============================================================
let typingTimeout;

messageInput.addEventListener("input", () => {
  if (!state.activeConversation || !socket) return;

  socket.emit("typing", { conversationId: state.activeConversation.id });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stop_typing", { conversationId: state.activeConversation.id });
  }, 1500);
});
