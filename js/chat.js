const GET_PROFILE_API = "${API_PATH_PREFIX}auth/profile";
const POST_LOGOUT = "${API_PATH_PREFIX}auth/logout";
const POST_NEW_CHAT = "${API_PATH_PREFIX}newChat";
const POST_NEW_MESSAGE = "${API_PATH_PREFIX}newChatMessage";
const GET_CHAT_THREADS = "${API_PATH_PREFIX}getThreads";
const GET_CHAT_MESSAGES = "${API_PATH_PREFIX}getMessages";

const THREAD_ID_COOKIE_NAME = "${THREAD_ID_COOKIE_NAME}" || "thread_id"

const userProfile = {};

function userDropDownClicked(userDropdownContent){
    userDropdownContent.classList.toggle('show');
}

function addThread(threadId, time) {
    const threadTime = convertIsoTimestampToReadableText(time);
    const threadDom = document.createElement('li');
    threadDom.id = `navLink-${dollar}{threadId}`
    threadDom.classList.add("nav-link");
    threadDom.innerHTML = `<span class="nav-icon">📑</span><span class="nav-text">${dollar}{threadTime}</span>`;
    threadDom.addEventListener('click', () => switchChatThread(threadId));

    document.getElementById("navMenu").appendChild(threadDom);
}

function addMessage(text, sender, scrollTop=true) {
    const messageText = document.createTextNode(text);

    const messageTextDiv = document.createElement('div');
    messageTextDiv.classList.add(`message-text`, `message-text-${dollar}{sender}`);
    messageTextDiv.appendChild(messageText);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add(`message-${dollar}{sender}`);
    messageDiv.appendChild(messageTextDiv);

    const messagesContainer = document.getElementById("messagesContainer");
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    if(scrollTop){
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    return messageDiv;
}

function replaceMessage(message, text) {
    message.childNodes[0].textContent = text;
    return message;
}

function addTimeToMessage(message, time) {
    const messageTime = document.createTextNode(convertIsoTimestampToReadableText(time));

    const messageTimeDiv = document.createElement('div');
    messageTimeDiv.classList.add(`message-time`);
    messageTimeDiv.appendChild(messageTime);

    message.appendChild(messageTimeDiv);
    return message;
}

function sendMessage(messageInput) {
    const message = messageInput.value.trim();
    if (message === '') return;

    // Add user message to UI
    const userMessage = addMessage(message, 'user');
    addTimeToMessage(userMessage, new Date());

    const aiMessage = addMessage("...", "ai");

    // Clear input
    messageInput.value = '';

    fetch(POST_NEW_MESSAGE, {
        method: "POST",
        body: JSON.stringify({message}),
        headers: {"content-type": "application/json"},
    }).then((res) => {
        if(!res.ok) throw Error(`Http Error. ${dollar}{res.status}.`);
        return res.json();
    }).then((resJson) => {
        replaceMessage(aiMessage, resJson.message);
        addTimeToMessage(aiMessage, new Date(resJson.sent_at));
    }).catch((err) => {
        console.error("Error sending message to backend", err);
        throw err;
        // TODO: Handle Error.
    });
}

function updateUserDataInDropdown(){
    if (userProfile) {
        document.getElementById("userDisplayName").textContent = userProfile.name;

        if(userProfile.picture) {
            const profileImage = document.createElement("img");
            profileImage.classList.add("avatar");
            profileImage.setAttribute("src", userProfile.picture);
            document.getElementById("userAvatar").replaceWith(profileImage);
        } else {
            document.getElementById("userAvatar").textContent = getInitials(userProfile.name);
        }

        let userInfoTableInnerHtml = '';

        if(userProfile.individual_id){
            userInfoTableInnerHtml += `<tr><td class="user-attribute-key">National ID</td><td class="user-attribute-value">${dollar}{userProfile.individual_id}</td></tr>`;
        }
        if(userProfile.gender){
            userInfoTableInnerHtml += `<tr><td class="user-attribute-key">Gender</td><td class="user-attribute-value">${dollar}{userProfile.gender}</td></tr>`;
        }
        if(userProfile.birthdate){
            userInfoTableInnerHtml += `<tr><td class="user-attribute-key">Birthdate</td><td class="user-attribute-value">${dollar}{userProfile.birthdate}</td></tr>`;
        }
        if(userProfile.address){
            let address = '';
            if (typeof userProfile.address === "string"){
                address = userProfile.address;
            } else if (typeof userProfile.address === "object"){
                address = `${dollar}{userProfile.address.street_address}, ${dollar}{userProfile.address.locality}, ${dollar}{userProfile.address.region}, ${dollar}{userProfile.address.postal_code}`;
            }
            userInfoTableInnerHtml += `<tr><td class="user-attribute-key">Address</td><td class="user-attribute-value">${dollar}{address}</td></tr>`;
        }
        if(userProfile.email){
            userInfoTableInnerHtml += `<tr><td class="user-attribute-key">Email</td><td class="user-attribute-value">${dollar}{userProfile.email}</td></tr>`;
        }
        if(userProfile.phone_number){
            userInfoTableInnerHtml += `<tr><td class="user-attribute-key">Phone</td><td class="user-attribute-value">${dollar}{userProfile.phone_number}</td></tr>`;
        }

        if(userInfoTableInnerHtml){
            document.getElementById("userDropdownInfo").innerHTML = userInfoTableInnerHtml;
        }
    }
}

function markActiveNavLink(threadId){
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.classList.contains('active')){
            if(link.id.slice("navLink-".length) != threadId){
                link.classList.remove('active');
            }
        } else if (link.id.slice("navLink-".length) === threadId) {
            link.classList.add('active');
        }
    });
}

async function populateChatThreads(page=0){
    try {
        const res = await fetch(GET_CHAT_THREADS + "?" + new URLSearchParams({page}).toString());
        if(!res.ok) throw Error(`Http Error. ${dollar}{res.status}. ${dollar}{await res.text()}`);
        const threads = (await res.json()).threads || [];

        for(const thread in threads){
            addThread(thread.thread_id, new Date(thread.created_at));
        }
    } catch (err) {
        console.error("Error retrieving threads", err);
        throw err;
    }
}

async function populatePastMessages(page=0){
    try {
        const res = await fetch(GET_CHAT_MESSAGES + "?" + new URLSearchParams({page}).toString());
        if(!res.ok) throw Error(`Http Error. ${dollar}{res.status}. ${dollar}{await res.text()}`);
        const messages = (await res.json()).messages || [];

        for(const message in messages){
            const msgTime = convertIsoTimestampToReadableText(new Date(message.sent_at || ''));
            let msgRole = '';
            switch (message.message_by) {
                case "user":
                    msgRole = "user";
                    break;
                case "assistant":
                    msgRole = "ai";
                    break;
            }
            const msgDom = addMessage(message.message, msgRole, false);
            addTimeToMessage(msgDom, new Date(msgTime));
        }
    } catch (err) {
        console.error("Error retrieving messages", err);
        throw err;
        // TODO: Handle Error
    }
}

function initiateChatThread(force=false){
    const threadId = Cookies.get(THREAD_ID_COOKIE_NAME);
    document.getElementById("messagesContainer").innerHTML = '';
    if (force || !Cookies.get(THREAD_ID_COOKIE_NAME)) {
        // Create new Chat Thread
        (async () => {
            const aiMessage = addMessage("...", "ai");
            try {
                const res = await fetch(POST_NEW_CHAT, { method: "POST" });
                if(!res.ok) throw Error(`Http Error. ${dollar}{res.status}. ${dollar}{await res.text()}`);
                const resJson = await res.json();
                const threadTime = new Date(resJson.sent_at);
                const newThreadId = Cookies.get(THREAD_ID_COOKIE_NAME);
                addThread(newThreadId, threadTime);
                markActiveNavLink(newThreadId);
                replaceMessage(aiMessage, resJson.message);
                addTimeToMessage(aiMessage, threadTime);
            } catch (err) {
                console.error("Error creating new chat thread", err);
                throw err;
                // TODO: Handle error
            }
        })();
    } else {
        // Get messages in chat existing chat thread
        markActiveNavLink(threadId);
        populatePastMessages();
    }
}

function switchChatThread(newThreadId){
    Cookies.set(THREAD_ID_COOKIE_NAME, newThreadId);
    initiateChatThread();
}

async function checkLoginStatusAndRedirect(){
    const res = await fetch(GET_PROFILE_API + "?" + new URLSearchParams({online: true}).toString());
    if(res.status === 401 || res.status === 403){
        window.location = "${PATH_PREFIX}login";
    } else if (res.status != 200){
        console.debug("Chat Page: Get profile response.", await res.text());
        window.location = "${PATH_PREFIX}login";
    } else {
        const resJson = await res.json();
        for(const key in resJson) { userProfile[key] = resJson[key]; }
    }
}

function logout() {
    fetch(POST_LOGOUT, {method: "POST"});
    window.location = "${PATH_PREFIX}login";
}

document.addEventListener("DOMContentLoaded", async () => {
    await checkLoginStatusAndRedirect();
    const messageInput = document.getElementById('messageInput');
    const userDropdownContent = document.getElementById('userDropdownContent');
    const userDropdownBtn = document.getElementById("userDropdownBtn");
    const navToggleBtn = document.getElementById('navToggleBtn');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');
    const sendButton = document.getElementById('sendButton');
    const logoutButton = document.getElementById("logoutButton");
    const newChatButton = document.getElementById("newChatButton");

    // Event Listeners
    // Toggle sidebar when button is clicked
    navToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        main.classList.toggle('nav-expanded');
    });

    userDropdownBtn.addEventListener('click', () => userDropDownClicked(userDropdownContent));

    // Close dropdown when clicking outside
    window.addEventListener('click', (e) => {
        if (!e.target.matches('.dropdown-btn') && !e.target.matches('.avatar') && !e.target.matches('#userDisplayName')) {
            if (userDropdownContent.classList.contains('show')) {
                userDropDownClicked(userDropdownContent);
            }
        }
    });

    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(messageInput);
        }
    });
    sendButton.addEventListener('click', () => sendMessage(messageInput));
    logoutButton.addEventListener('click', logout);
    newChatButton.addEventListener('click', () => initiateChatThread(true));

    updateUserDataInDropdown();
    await populateChatThreads();
    initiateChatThread();
});
