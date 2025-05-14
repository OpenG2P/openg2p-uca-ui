const GET_PROFILE_API = "${API_PATH_PREFIX}auth/profile";
const POST_LOGOUT = "${API_PATH_PREFIX}auth/logout";

const GET_CURRENT_CHAT_THREAD = "${API_PATH_PREFIX}chat/thread";
const POST_NEW_THREAD = "${API_PATH_PREFIX}chat/thread";
const SWITCH_CHAT_THREAD = "${API_PATH_PREFIX}chat/thread";
const GET_CHAT_THREADS = "${API_PATH_PREFIX}chat/threads";

const POST_NEW_MESSAGE = "${API_PATH_PREFIX}chat/message";
const GET_CHAT_MESSAGES = "${API_PATH_PREFIX}chat/messages";

const userProfile = {};

const markDownConverter = new showdown.Converter();

function userDropDownClicked(userDropdownContent){
    userDropdownContent.classList.toggle('show');
}

function addThread(threadId, time, active=false) {
    const threadTime = convertIsoTimestampToReadableText(time);
    const threadDom = document.createElement('li');
    threadDom.classList.add("nav-link");
    if(active) threadDom.classList.add("active");
    threadDom.innerHTML = `<span class="nav-icon">📑</span><span class="nav-text">${dollar}{threadTime}</span>`;
    threadDom.addEventListener('click', () => switchChatThread(threadDom, threadId));

    const newChatButton = document.getElementById("newChatButton");
    newChatButton.parentNode.insertBefore(threadDom, newChatButton.nextSibling);
}

function addMessage(text, sender, scrollTop=true) {
    const messageTextDiv = document.createElement('div');
    messageTextDiv.classList.add(`message-text`, `message-text-${dollar}{sender}`);
    messageTextDiv.innerHTML = markDownConverter.makeHtml(text);

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
    if(!text) message.remove();
    message.childNodes[0].innerHTML = markDownConverter.makeHtml(text);
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

function markAllNavLinksInactive(){
    const navLinks = document.querySelectorAll('.nav-link.active');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });
}

async function populateChatThreads(page=0, currentThreadId=""){
    try {
        const res = await fetch(GET_CHAT_THREADS + "?" + new URLSearchParams({page}).toString());
        if(!res.ok) throw Error(`Http Error. ${dollar}{res.status}. ${dollar}{await res.text()}`);
        const resJson = await res.json();
        const threads = resJson.threads || [];

        for(let i = threads.length-1; i>=0; i--) {
            addThread(threads[i].thread_id, new Date(threads[i].created_at), threads[i].thread_id === currentThreadId);
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
        const resJson = await res.json();
        const messages = resJson.messages || [];

        for(let i=messages.length-1; i>=0; i--){
            let msgRole = '';
            switch (messages[i].message_by) {
                case "user":
                    msgRole = "user";
                    break;
                case "assistant":
                    msgRole = "ai";
                    break;
            }
            const msgDom = addMessage(messages[i].message, msgRole, false);
            addTimeToMessage(msgDom, new Date(messages[i].sent_at));
        }
    } catch (err) {
        console.error("Error retrieving messages", err);
        throw err;
        // TODO: Handle Error
    }
}

async function initiateNewChatThread(){
    document.getElementById("messagesContainer").innerHTML = '';
    const aiMessage = addMessage("...", "ai");
    try {
        const createThreadRes = await fetch(POST_NEW_THREAD, { method: "POST" });
        if(!createThreadRes.ok) throw Error(`Http Error. ${dollar}{createThreadResJson.status}. ${dollar}{await createThreadResJson.text()}`);
        const createThreadResJson = await createThreadRes.json();
        const newThreadId = createThreadResJson.thread_id;
        markAllNavLinksInactive();
        addThread(newThreadId, new Date(createThreadResJson.thread_created_at), true);
        replaceMessage(aiMessage, createThreadResJson.message);
        addTimeToMessage(aiMessage, new Date(createThreadResJson.message_sent_at));
    } catch (err) {
        console.error("Error creating new chat thread", err);
        throw err;
        // TODO: Handle error
    }
}

async function switchChatThread(threadDom, newThreadId){
    document.getElementById("messagesContainer").innerHTML = '';
    const res = await fetch(SWITCH_CHAT_THREAD, {
        method: "PUT",
        body: JSON.stringify({thread_id: newThreadId}),
        headers: {"content-type": "application/json"},
    });
    if(!res.ok) throw Error(`Http Error. ${dollar}{res.status}. ${dollar}{await res.text()}`);
    markAllNavLinksInactive();
    threadDom.classList.add("active");
    await populatePastMessages();
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
    newChatButton.addEventListener('click', () => initiateNewChatThread());

    updateUserDataInDropdown();
    const currentThreadRes = await fetch(GET_CURRENT_CHAT_THREAD);
    let currentThreadId = "";
    if(currentThreadRes.ok) currentThreadId = (await currentThreadRes.json()).thread_id;

    await populateChatThreads(0, currentThreadId);
    if (!currentThreadId){
        await initiateNewChatThread();
    } else {
        await populatePastMessages();
    }
});
