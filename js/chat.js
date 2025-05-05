const GET_PROFILE_API = "${API_PATH_PREFIX}/auth/profile";
const POST_LOGOUT = "${API_PATH_PREFIX}/auth/logout";
const POST_NEW_CHAT = "${API_PATH_PREFIX}/newChat";
const POST_NEW_MESSAGE = "${API_PATH_PREFIX}/newChatMessage";

const userProfile = {};

function userDropDownClicked(){
    userDropdownContent.classList.toggle('show');
}

function addMessage(text, sender) {
    const messageText = document.createTextNode(text);

    const messageTextDiv = document.createElement('div');
    messageTextDiv.classList.add(`message-text`, `message-text-${dollar}{sender}`);
    messageTextDiv.appendChild(messageText);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add(`message-${dollar}{sender}`);
    messageDiv.appendChild(messageTextDiv);

    const messagesContainer = document.getElementById("messageContainer");
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageDiv;
}

function replaceMessage(message, text) {
    message.childNodes[0].textContent = text;
    return message;
}

function addTimeToMessage(message, time) {
    const messageTime = document.createTextNode(convertIsoTimestampToReadableText(time ? new Date(time) : new Date()));

    const messageTimeDiv = document.createElement('div');
    messageTimeDiv.classList.add(`message-time`);
    messageTimeDiv.appendChild(messageTime);

    message.appendChild(messageTimeDiv);
    return message;
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message === '') return;

    // Add user message to UI
    const userMessage = addMessage(message, 'user');
    addTimeToMessage(userMessage);

    const aiMessage = addMessage("...", "ai");

    // Clear input
    messageInput.value = '';

    fetch(POST_NEW_MESSAGE, {
        method: "POST",
        body: JSON.stringify({message}),
        headers: {"content-type": "application/json"},
    }).then((res) => res.json()).then((resJson) => {
        replaceMessage(aiMessage, resJson.message);
        addTimeToMessage(aiMessage);
    }).catch((err) => {
        console.error("Error sending message to backend", err);
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

async function checkLoginStatusAndRedirect(){
    const res = await fetch(GET_PROFILE_API + "?" + new URLSearchParams({online: true}).toString());
    if(res.status === 401 || res.status === 403){
        window.location = "${PATH_PREFIX}/login";
    } else if (res.status != 200){
        console.debug("Chat Page: Get profile response.", await res.text());
        window.location = "${PATH_PREFIX}/login";
    } else {
        const resJson = await res.json();
        for(const key in resJson) { userProfile[key] = resJson[key]; }
    }
}

function logout() {
    fetch(POST_LOGOUT, {
        method: "POST"
    });
    window.location = "${PATH_PREFIX}/login";
}

document.addEventListener("DOMContentLoaded", async () => {
    await checkLoginStatusAndRedirect();
    updateUserDataInDropdown();

    const messageInput = document.getElementById('messageInput');
    const userDropdownContent = document.getElementById('userDropdownContent');
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main');

    // Toggle sidebar when button is clicked
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        main.classList.toggle('nav-expanded');
    });

    // markActiveNavLink();

    // Close dropdown when clicking outside
    window.addEventListener('click', (e) => {
        if (!e.target.matches('.dropdown-btn') && !e.target.matches('.avatar') && !e.target.matches('#userDisplayName')) {
            if (userDropdownContent.classList.contains('show')) {
                userDropdownContent.classList.remove('show');
            }
        }
    });

    // Send message on Enter key
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
