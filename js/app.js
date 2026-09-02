import { supabase } from "./supabase.js";

/* =========================================================
   ELEMENTS
========================================================= */

const chatArea = document.querySelector(".chat-area");
const composer = document.querySelector(".composer");
const messageInput = document.querySelector("#message-input");
const welcome = document.querySelector(".welcome");

const newChatButton = document.querySelector(".new-chat");
const mobileMenuButton = document.querySelector(".mobile-menu");
const closeSidebarButton = document.querySelector(".close-sidebar");
const sidebar = document.querySelector(".sidebar");
const chatHistory = document.querySelector(".chat-history");

const userProfileButton = document.querySelector(".user-profile");
const accountPopup = document.querySelector(".account-popup");
const sidebarBottom = document.querySelector(".sidebar-bottom");

const logoutButton = document.querySelector(".logout-button");

const accountName = document.querySelector(".account-name");
const accountEmail = document.querySelector(".account-email");
const accountAvatar = document.querySelector(".account-avatar");

/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let currentChatId = null;
let messages = [];

/* =========================================================
   INITIALIZE
========================================================= */

async function initializeApp() {

    const {
        data,
        error
    } = await supabase.auth.getUser();

    if (error) {
        console.error("Could not get user:", error);
        return;
    }

    if (!data.user) {
        console.error("No logged-in user.");
        return;
    }

    currentUser = data.user;

    console.log(
        "CURRENT USER:",
        currentUser.id,
        currentUser.email
    );

    loadUserProfile();

    await loadChats();
}

initializeApp();

/* =========================================================
   USER PROFILE
========================================================= */

function loadUserProfile() {

    const name =
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split("@")[0] ||
        "User";

    const email =
        currentUser.email || "";

    const userNameElement =
        document.querySelector(".user-details strong");

    const avatar =
        document.querySelector(".avatar");

    if (userNameElement) {
        userNameElement.textContent = name;
    }

    if (avatar) {
        avatar.textContent =
            name.charAt(0).toUpperCase();
    }

    if (accountName) {
        accountName.textContent = name;
    }

    if (accountEmail) {
        accountEmail.textContent = email;
    }

    if (accountAvatar) {
        accountAvatar.textContent =
            name.charAt(0).toUpperCase();
    }
}

/* =========================================================
   ACCOUNT POPUP
========================================================= */

function openAccountPopup() {

    if (!accountPopup) {
        console.error("ACCOUNT POPUP NOT FOUND");
        return;
    }

    console.log("Opening account popup");

    accountPopup.style.display = "flex";
    accountPopup.style.visibility = "visible";
    accountPopup.style.opacity = "1";
    accountPopup.style.pointerEvents = "auto";
    accountPopup.style.transform = "translateY(0)";

    accountPopup.classList.add("show");

    if (sidebarBottom) {
        sidebarBottom.classList.add("profile-open");
    }
}


function closeAccountPopup() {

    if (!accountPopup) {
        return;
    }

    console.log("Closing account popup");

    accountPopup.style.display = "none";
    accountPopup.style.visibility = "hidden";
    accountPopup.style.opacity = "0";
    accountPopup.style.pointerEvents = "none";

    accountPopup.classList.remove("show");

    if (sidebarBottom) {
        sidebarBottom.classList.remove("profile-open");
    }
}


function toggleAccountPopup(event) {

    event.preventDefault();
    event.stopPropagation();

    if (!accountPopup) {
        console.error("ACCOUNT POPUP NOT FOUND");
        return;
    }

    const isOpen =
        accountPopup.style.display === "flex" ||
        accountPopup.classList.contains("show");

    if (isOpen) {
        closeAccountPopup();
    } else {
        openAccountPopup();
    }
}


/* Profile button */

if (userProfileButton) {

    userProfileButton.addEventListener(
        "click",
        toggleAccountPopup
    );

}


/* Prevent popup clicks from closing it */

if (accountPopup) {

    accountPopup.addEventListener(
        "click",
        event => {
            event.stopPropagation();
        }
    );

}


/* Click outside */

document.addEventListener(
    "click",
    event => {

        if (!accountPopup) {
            return;
        }

        if (
            !event.target.closest(".account-popup") &&
            !event.target.closest(".user-profile")
        ) {

            closeAccountPopup();

        }

    }
);

/* =========================================================
   LOGOUT
========================================================= */

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async event => {

            event.stopPropagation();

            const {
                error
            } = await supabase.auth.signOut();

            if (error) {

                console.error(
                    "LOGOUT ERROR:",
                    error
                );

                return;
            }

            currentUser = null;
            currentChatId = null;
            messages = [];

            window.location.href =
                "login.html";
        }
    );

}

/* =========================================================
   LOAD CHATS
========================================================= */

async function loadChats() {

    if (!currentUser || !chatHistory) {
        return;
    }

    const {
        data,
        error
    } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("updated_at", {
            ascending: false
        });

    if (error) {

        console.error(
            "Could not load chats:",
            error
        );

        return;
    }

    renderChatHistory(data || []);
}

/* =========================================================
   RENDER CHAT HISTORY
========================================================= */

function renderChatHistory(chats) {

    if (!chatHistory) {
        return;
    }

    chatHistory.innerHTML = "";

    if (chats.length === 0) {

        const empty =
            document.createElement("p");

        empty.className =
            "history-title";

        empty.textContent =
            "No previous chats";

        chatHistory.appendChild(empty);

        return;
    }

    const title =
        document.createElement("p");

    title.className =
        "history-title";

    title.textContent =
        "Recent chats";

    chatHistory.appendChild(title);

    chats.forEach(chat => {

        const item =
            document.createElement("div");

        item.className =
            "history-item";

        if (chat.id === currentChatId) {
            item.classList.add("active");
        }

        item.dataset.chatId =
            chat.id;

        item.innerHTML = `
            <span class="history-icon"><svg class="kai-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M9 7V25" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M23 7L10 16L23 25" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="8" r="2" fill="currentColor"/></svg></span>

            <span class="history-name">
                ${escapeHTML(chat.title)}
            </span>

            <button
                class="history-menu"
                type="button"
                title="Delete chat"
            >
                ⋯
            </button>
        `;

        item.addEventListener(
            "click",
            async event => {

                if (
                    event.target.classList.contains(
                        "history-menu"
                    )
                ) {

                    event.stopPropagation();

                    await deleteChat(chat.id);

                    return;
                }

                await openChat(chat.id);

                closeMobileSidebar();
            }
        );

        chatHistory.appendChild(item);

    });
}

/* =========================================================
   CREATE CHAT
========================================================= */

async function createChat(title) {

    const {
        data,
        error
    } = await supabase
        .from("chats")
        .insert({
            user_id: currentUser.id,
            title: title
        })
        .select()
        .single();

    if (error) {

        console.error(
            "CREATE CHAT ERROR:",
            error
        );

        return null;
    }

    currentChatId =
        data.id;

    await loadChats();

    return data;
}

/* =========================================================
   OPEN CHAT
========================================================= */

async function openChat(chatId) {

    const {
        data,
        error
    } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .eq("user_id", currentUser.id)
        .order("created_at", {
            ascending: true
        });

    if (error) {

        console.error(
            "LOAD MESSAGES ERROR:",
            error
        );

        return;
    }

    currentChatId =
        chatId;

    messages =
        data || [];

    clearDisplayedMessages();

    hideWelcome();

    messages.forEach(message => {

        if (message.role === "user") {

            addUserMessage(
                message.content
            );

        } else {

            addAssistantMessage(
                message.content
            );

        }

    });

    await loadChats();

    scrollToBottom();
}

/* =========================================================
   SEND MESSAGE
========================================================= */

if (composer) {

    composer.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const message =
                messageInput.value.trim();

            if (!message) {
                return;
            }

            if (!currentUser) {

                console.error(
                    "No authenticated user."
                );

                return;
            }

            if (!currentChatId) {

                const title =
                    createChatTitle(message);

                const chat =
                    await createChat(title);

                if (!chat) {

                    console.error(
                        "Chat could not be created."
                    );

                    return;
                }
            }

            messageInput.value = "";

            autoResize();

            hideWelcome();

            const savedUserMessage =
                await saveUserMessage(message);

            if (!savedUserMessage) {
                return;
            }

            showTypingIndicator();

            try {

                const conversation =
                    messages
                        .slice(-30)
                        .map(message => ({
                            role: message.role,
                            content: message.content
                        }));

                const {
                    data,
                    error
                } = await supabase.functions.invoke(
                    "swift-task",
                    {
                        body: {
                            messages: conversation
                        }
                    }
                );

                if (error) {
                    throw error;
                }

                if (!data?.response) {

                    throw new Error(
                        "KAI returned no response."
                    );
                }

                removeTypingIndicator();

                await saveAssistantMessage(
                    data.response,
                    true
                );

            } catch (error) {

                removeTypingIndicator();

                console.error(
                    "KAI ERROR:",
                    error
                );

                addAssistantMessage(
                    "Sorry, I couldn't connect to KAI right now. Please try again."
                );
            }

        }
    );

}

/* =========================================================
   SAVE USER MESSAGE
========================================================= */

async function saveUserMessage(message) {

    const {
        data,
        error
    } = await supabase
        .from("messages")
        .insert({
            chat_id: currentChatId,
            user_id: currentUser.id,
            role: "user",
            content: message
        })
        .select()
        .single();

    if (error) {

        console.error(
            "SAVE USER MESSAGE ERROR:",
            error
        );

        return null;
    }

    messages.push(data);

    addUserMessage(message);

    await updateChatTimestamp();

    return data;
}

/* =========================================================
   SAVE ASSISTANT MESSAGE
========================================================= */

async function saveAssistantMessage(
    message,
    animate = false
) {

    const {
        data,
        error
    } = await supabase
        .from("messages")
        .insert({
            chat_id: currentChatId,
            user_id: currentUser.id,
            role: "assistant",
            content: message
        })
        .select()
        .single();

    if (error) {

        console.error(
            "SAVE ASSISTANT MESSAGE ERROR:",
            error
        );

        return null;
    }

    messages.push(data);

    if (animate) {

        await typeAssistantMessage(
            message
        );

    } else {

        addAssistantMessage(
            message
        );

    }

    await updateChatTimestamp();

    return data;
}

/* =========================================================
   UPDATE CHAT
========================================================= */

async function updateChatTimestamp() {

    const {
        error
    } = await supabase
        .from("chats")
        .update({
            updated_at:
                new Date().toISOString()
        })
        .eq(
            "id",
            currentChatId
        )
        .eq(
            "user_id",
            currentUser.id
        );

    if (error) {

        console.error(
            "UPDATE CHAT ERROR:",
            error
        );

        return;
    }

    await loadChats();
}

/* =========================================================
   NEW CHAT
========================================================= */

if (newChatButton) {

    newChatButton.addEventListener(
        "click",
        () => {

            currentChatId = null;

            messages = [];

            clearDisplayedMessages();

            if (welcome) {
                welcome.style.display = "";
            }

            messageInput.value = "";

            autoResize();

            messageInput.focus();

            closeMobileSidebar();

            loadChats();
        }
    );

}

/* =========================================================
   DELETE CHAT
========================================================= */

async function deleteChat(chatId) {

    const confirmed =
        confirm(
            "Delete this conversation?"
        );

    if (!confirmed) {
        return;
    }

    const {
        error
    } = await supabase
        .from("chats")
        .delete()
        .eq(
            "id",
            chatId
        )
        .eq(
            "user_id",
            currentUser.id
        );

    if (error) {

        console.error(
            "DELETE CHAT ERROR:",
            error
        );

        return;
    }

    if (currentChatId === chatId) {

        currentChatId = null;

        messages = [];

        clearDisplayedMessages();

        if (welcome) {
            welcome.style.display = "";
        }
    }

    await loadChats();
}

/* =========================================================
   DISPLAY USER MESSAGE
========================================================= */

function addUserMessage(message) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message-wrapper user-message-wrapper";

    wrapper.innerHTML = `
        <div class="message user-message">
            ${escapeHTML(message)}
        </div>
    `;

    chatArea.insertBefore(
        wrapper,
        document.querySelector(
            ".composer-container"
        )
    );

    scrollToBottom();
}

/* =========================================================
   DISPLAY ASSISTANT MESSAGE
========================================================= */

function addAssistantMessage(message) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message-wrapper assistant-message-wrapper";

    const avatar =
        document.createElement("div");

    avatar.className =
        "assistant-avatar";

    avatar.innerHTML = `<svg class="kai-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M9 7V25" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M23 7L10 16L23 25" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="8" r="2" fill="currentColor"/></svg>`;

    const messageElement =
        document.createElement("div");

    messageElement.className =
        "message assistant-message";

    const markdownHTML =
        marked.parse(message);

    messageElement.innerHTML =
        DOMPurify.sanitize(markdownHTML);

    wrapper.appendChild(avatar);
    wrapper.appendChild(messageElement);

    chatArea.insertBefore(
        wrapper,
        document.querySelector(
            ".composer-container"
        )
    );

    scrollToBottom();
}

/* =========================================================
   TYPE ASSISTANT MESSAGE
========================================================= */

async function typeAssistantMessage(message) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message-wrapper assistant-message-wrapper";

    wrapper.innerHTML = `
        <div class="assistant-avatar"><svg class="kai-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M9 7V25" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M23 7L10 16L23 25" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="8" r="2" fill="currentColor"/></svg></div>

        <div class="message assistant-message"></div>
    `;

    chatArea.insertBefore(
        wrapper,
        document.querySelector(
            ".composer-container"
        )
    );

    const messageElement =
        wrapper.querySelector(
            ".assistant-message"
        );

    let currentText = "";

    for (const character of message) {

        currentText += character;

        messageElement.innerHTML =
            DOMPurify.sanitize(
                marked.parse(currentText)
            );

        scrollToBottom();

        await wait(15);
    }
}

/* =========================================================
   CLEAR MESSAGES
========================================================= */

function clearDisplayedMessages() {

    document
        .querySelectorAll(".message-wrapper")
        .forEach(element => {
            element.remove();
        });
}

/* =========================================================
   TYPING
========================================================= */

function showTypingIndicator() {

    const typing =
        document.createElement("div");

    typing.id =
        "typing-indicator";

    typing.className =
        "message-wrapper";

    typing.innerHTML = `
        <div class="assistant-avatar"><svg class="kai-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M9 7V25" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M23 7L10 16L23 25" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="8" r="2" fill="currentColor"/></svg></div>

        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    chatArea.insertBefore(
        typing,
        document.querySelector(
            ".composer-container"
        )
    );

    scrollToBottom();
}


function removeTypingIndicator() {

    const typing =
        document.querySelector(
            "#typing-indicator"
        );

    if (typing) {
        typing.remove();
    }
}

/* =========================================================
   SUGGESTIONS
========================================================= */

document
    .querySelectorAll(".suggestion")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const title =
                    button.querySelector(
                        "strong"
                    )?.textContent;

                if (!title) {
                    return;
                }

                const prompts = {

                    "Explain something":
                        "Explain an interesting concept to me.",

                    "Write some code":
                        "Help me build a website.",

                    "Help me write":
                        "Help me write something.",

                    "Brainstorm ideas":
                        "Help me brainstorm some ideas."
                };

                messageInput.value =
                    prompts[title] || title;

                composer.requestSubmit();
            }
        );
    });

/* =========================================================
   TEXTAREA
========================================================= */

if (messageInput) {

    messageInput.addEventListener(
        "input",
        autoResize
    );

    messageInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                composer.requestSubmit();
            }
        }
    );

}

function autoResize() {

    if (!messageInput) {
        return;
    }

    messageInput.style.height =
        "auto";

    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            180
        ) + "px";
}

/* =========================================================
   MOBILE SIDEBAR
========================================================= */

mobileMenuButton?.addEventListener(
    "click",
    () => {

        sidebar.style.left = "0";
    }
);

closeSidebarButton?.addEventListener(
    "click",
    closeMobileSidebar
);

function closeMobileSidebar() {

    if (
        window.innerWidth <= 800
    ) {

        sidebar.style.left =
            "-280px";
    }
}

/* =========================================================
   HELPERS
========================================================= */

function createChatTitle(message) {

    const cleaned =
        message
            .replace(/\s+/g, " ")
            .trim();

    if (cleaned.length <= 40) {
        return cleaned;
    }

    return (
        cleaned.substring(0, 40) +
        "..."
    );
}

function hideWelcome() {

    if (welcome) {
        welcome.style.display = "none";
    }
}

function scrollToBottom() {

    requestAnimationFrame(() => {

        chatArea.scrollTo({
            top: chatArea.scrollHeight,
            behavior: "smooth"
        });

    });
}

function wait(milliseconds) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
}

function escapeHTML(text) {

    const element =
        document.createElement("div");

    element.textContent =
        text;

    return element.innerHTML;
}
