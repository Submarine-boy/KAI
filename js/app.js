import { supabase } from "./supabase.js";


/* =========================
   ELEMENTS
========================= */

const chatArea = document.querySelector(".chat-area");
const composer = document.querySelector(".composer");
const messageInput = document.querySelector("#message-input");
const welcome = document.querySelector(".welcome");

const newChatButton =
    document.querySelector(".new-chat");

const mobileMenuButton =
    document.querySelector(".mobile-menu");

const closeSidebarButton =
    document.querySelector(".close-sidebar");

const sidebar =
    document.querySelector(".sidebar");

const chatHistory =
    document.querySelector(".chat-history");


/* =========================
   STATE
========================= */

let currentUser = null;
let currentChatId = null;
let messages = [];


/* =========================
   INITIALIZE
========================= */

async function initializeApp() {

    const {
        data,
        error
    } = await supabase.auth.getUser();

    if (error) {

        console.error(
            "Could not get user:",
            error
        );

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


/* =========================
   USER PROFILE
========================= */

function loadUserProfile() {

    const name =
        currentUser.user_metadata?.full_name ||
        currentUser.email?.split("@")[0] ||
        "User";

    const userNameElement =
        document.querySelector(
            ".user-details strong"
        );

    const avatar =
        document.querySelector(".avatar");

    if (userNameElement) {
        userNameElement.textContent = name;
    }

    if (avatar) {
        avatar.textContent =
            name.charAt(0).toUpperCase();
    }
}


/* =========================
   LOAD CHATS
========================= */

async function loadChats() {

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


/* =========================
   RENDER CHAT HISTORY
========================= */

function renderChatHistory(chats) {

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
            <span class="history-icon">✦</span>

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
            async (event) => {

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


/* =========================
   CREATE CHAT
========================= */

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


/* =========================
   OPEN CHAT
========================= */

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


/* =========================
   SEND MESSAGE
========================= */

composer.addEventListener(
    "submit",
    async (event) => {

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


        /* =========================
           CREATE CHAT
        ========================= */

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


        /* =========================
           CLEAR INPUT
        ========================= */

        messageInput.value = "";

        autoResize();

        hideWelcome();


        /* =========================
           SAVE USER MESSAGE
        ========================= */

        const savedUserMessage =
            await saveUserMessage(message);

        if (!savedUserMessage) {
            return;
        }


        /* =========================
           SHOW TYPING
        ========================= */

        showTypingIndicator();


        try {

           /* =========================
               PREPARE CONVERSATION
               Send only the latest 30 messages
            ========================= */
            
            const conversation =
                messages
                    .slice(-30)
                    .map(message => ({
                        role: message.role,
                        content: message.content
                    }));


            /* =========================
               CALL NOVAAI
            ========================= */

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
                    "NovaAI returned no response."
                );
            }


            /* =========================
               REMOVE TYPING
            ========================= */

            removeTypingIndicator();


            /* =========================
               SAVE AI RESPONSE
            ========================= */

           await saveAssistantMessage(
              data.response,
              true
           );


       } catch (error) {

            removeTypingIndicator();

            console.error(
              "NOVAAI ERROR:",
                 error
             );

            addAssistantMessage(
              "Sorry, I couldn't connect to NovaAI right now. Please try again."
          );
      }
    }
);


/* =========================
   SAVE USER MESSAGE
========================= */

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


/* =========================
   SAVE ASSISTANT MESSAGE
========================= */

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


/* =========================
   UPDATE CHAT TIMESTAMP
========================= */

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


/* =========================
   NEW CHAT
========================= */

newChatButton.addEventListener(
    "click",
    () => {

        currentChatId = null;

        messages = [];


        clearDisplayedMessages();


        welcome.style.display =
            "";


        messageInput.value =
            "";


        autoResize();

        messageInput.focus();

        closeMobileSidebar();

        loadChats();
    }
);


/* =========================
   DELETE CHAT
========================= */

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


    /*
     * Because messages.chat_id
     * references chats.id with
     * ON DELETE CASCADE,
     * its messages are deleted too.
     */


    if (
        currentChatId === chatId
    ) {

        currentChatId = null;

        messages = [];

        clearDisplayedMessages();

        welcome.style.display =
            "";
    }


    await loadChats();
}


/* =========================
   DISPLAY USER MESSAGE
========================= */

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


/* =========================
   DISPLAY ASSISTANT MESSAGE
========================= */
function addAssistantMessage(message) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message-wrapper assistant-message-wrapper";

    const avatar =
        document.createElement("div");

    avatar.className =
        "assistant-avatar";

    avatar.textContent = "✦";

    const messageElement =
        document.createElement("div");

    messageElement.className =
        "message assistant-message";

    /*
     * Convert Markdown from NovaAI
     * into HTML, then sanitize it.
     */
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
async function typeAssistantMessage(message) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "message-wrapper assistant-message-wrapper";

    wrapper.innerHTML = `
        <div class="assistant-avatar">
            ✦
        </div>

        <div class="message assistant-message"></div>
    `;

    chatArea.insertBefore(
        wrapper,
        document.querySelector(".composer-container")
    );

    const messageElement =
        wrapper.querySelector(".assistant-message");

    let currentText = "";

    for (const character of message) {

        currentText += character;

        messageElement.innerHTML =
            marked.parse(currentText);

        scrollToBottom();

        await new Promise(
            resolve =>
                setTimeout(resolve, 15)
        );
    }
}

/* =========================
   CLEAR MESSAGES
========================= */

function clearDisplayedMessages() {

    document
        .querySelectorAll(
            ".message-wrapper"
        )
        .forEach(element => {
            element.remove();
        });
}


/* =========================
   TYPING INDICATOR
========================= */

function showTypingIndicator() {

    const typing =
        document.createElement("div");


    typing.id =
        "typing-indicator";


    typing.className =
        "message-wrapper";


    typing.innerHTML = `
        <div class="assistant-avatar">
            ✦
        </div>

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

/* =========================
   SUGGESTIONS
========================= */

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


                const prompt =
                    prompts[title] ||
                    title;


                messageInput.value =
                    prompt;


                composer.requestSubmit();
            }
        );
    });


/* =========================
   TEXTAREA
========================= */

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


function autoResize() {

    messageInput.style.height =
        "auto";


    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            180
        ) + "px";
}


/* =========================
   MOBILE SIDEBAR
========================= */

mobileMenuButton?.addEventListener(
    "click",
    () => {

        sidebar.style.left =
            "0";
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


/* =========================
   HELPERS
========================= */

function createChatTitle(message) {

    const cleaned =
        message
            .replace(/\s+/g, " ")
            .trim();


    if (
        cleaned.length <= 40
    ) {

        return cleaned;
    }


    return (
        cleaned.substring(0, 40) +
        "..."
    );
}


function hideWelcome() {

    if (welcome) {
        welcome.style.display =
            "none";
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
        document.createElement(
            "div"
        );


    element.textContent =
        text;


    return element.innerHTML;
}
