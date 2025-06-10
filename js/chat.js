const GET_PROFILE_API = "${API_PATH_PREFIX}auth/profile";
const POST_LOGOUT = "${API_PATH_PREFIX}auth/logout";

const GET_CURRENT_CHAT_THREAD = "${API_PATH_PREFIX}chat/thread";
const POST_NEW_THREAD = "${API_PATH_PREFIX}chat/thread";
const SWITCH_CHAT_THREAD = "${API_PATH_PREFIX}chat/thread";
const GET_CHAT_THREADS = "${API_PATH_PREFIX}chat/threads";

const POST_NEW_MESSAGE = "${API_PATH_PREFIX}chat/message";
const GET_CHAT_MESSAGES = "${API_PATH_PREFIX}chat/messages";
const POST_NEW_VOICE_MESSAGE = "${API_PATH_PREFIX}chat/voice_message";
const GET_SPEAK_MESSAGE = "${API_PATH_PREFIX}chat/speak_message";

const SHOW_READ_OUT_FOR_INPUTS = "${SHOW_READ_OUT_FOR_INPUTS}" === "true";

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

    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    messageBox.appendChild(messageTextDiv);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add(`message-${dollar}{sender}`);
    messageDiv.appendChild(messageBox);

    const messagesContainer = document.getElementById("messagesContainer");
    messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    if(scrollTop){
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    return messageDiv;
}

function addVoiceMessage(audioUrl, duration, scrollTop=true) {
    const audio = {src: audioUrl, audio: null};
    const playBtn = document.createElement('button');
    playBtn.classList.add('user-audio-play-btn');
    playBtn.innerHTML = '<span class="icon-play"></span>';
    playBtn.addEventListener('click', () => toggleAudioPlayback(audio, playBtn));

    const durationDiv = document.createElement('div');
    durationDiv.classList.add('user-audio-duration');
    durationDiv.innerHTML = '<span class="icon-volume"></span> ' + convertSecondsToReadableText(duration);

    const messageAudioDiv = document.createElement('div');
    messageAudioDiv.classList.add('message-audio');
    messageAudioDiv.appendChild(playBtn);
    messageAudioDiv.appendChild(durationDiv);

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message-user');
    messageDiv.appendChild(messageAudioDiv);

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
    message.firstChild.firstChild.innerHTML = markDownConverter.makeHtml(text);
    return message;
}

function addPlayButtonToMessage(message, messageId){
    const audio = {src: null, audio: null, messageId};

    const speakMessageButton = document.createElement('div');
    speakMessageButton.classList.add('speak-msg-btn');
    speakMessageButton.innerHTML = '<span class="icon-speak-start"></span>';
    speakMessageButton.addEventListener('click', async () => await toggleSpeakMessage(audio, speakMessageButton));

    message.firstChild.appendChild(speakMessageButton);
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
        addPlayButtonToMessage(aiMessage, resJson.message_id);
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
            if (msgRole != "user") addPlayButtonToMessage(msgDom, messages[i].message_id);
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
        addPlayButtonToMessage(aiMessage, createThreadResJson.message_id);
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

async function logout() {
    try {await fetch(POST_LOGOUT, {method: "POST"});} catch(err) {}
    window.location = "${PATH_PREFIX}login";
}

async function toggleMicButton(micButton, recordingIndicator, recordingTimeSpan, mediaRecorder){
    if(micButton.classList.contains('recording')){
        if (mediaRecorder.recorder && mediaRecorder.recorder.state === 'recording') {
            mediaRecorder.recorder.stop();
            mediaRecorder.recorder = null;

            micButton.classList.remove('recording');
            micButton.querySelector('.icon-mic').classList.remove('recording');
            recordingIndicator.classList.remove('active');
        }
    } else {
        const recordingTime = {value: 0};
        const recordingInterval = setInterval(() => {
            recordingTime.value++;
            recordingTimeSpan.textContent = "Recording... " + convertSecondsToReadableText(recordingTime.value);
        }, 1000);
        await startRecording(mediaRecorder, recordingTime, recordingInterval);
        micButton.classList.add('recording');
        micButton.querySelector('.icon-mic').classList.add('recording');
        recordingIndicator.classList.add('active');
    }
}

function toggleAudioPlayback(audio, button) {
    if(button.firstChild.classList.contains('icon-pause')){
        if (audio.audio) audio.audio.pause();
        audio.audio = null;
        button.innerHTML = '<span class="icon-play"></span>';
    } else {
        audio.audio = new Audio(audio.src);
        audio.audio.play();
        button.innerHTML = '<span class="icon-pause"></span>';

        audio.audio.onended = () => {
            button.innerHTML = '<span class="icon-play"></span>';
        };
    }
}

async function toggleSpeakMessage(audio, button) {
    if(button.firstChild.classList.contains('icon-speak-stop')){
        if (audio.audio) audio.audio.pause();
        audio.audio = null;
        button.innerHTML = '<span class="icon-speak-start"></span>';
    } else {
        if (!audio.src){
            button.innerHTML = '<span class="icon-speak-load"></span>';
            const res = await fetch(GET_SPEAK_MESSAGE, {
                method: "POST",
                body: JSON.stringify({message_id: audio.messageId}),
                headers: {"content-type": "application/json"},
            });
            if(!res.ok) throw Error(`Speak message Http Error. ${dollar}{res.status}. ${dollar}{await res.text()}`);
            audio.src = URL.createObjectURL(await res.blob());
        }
        audio.audio = new Audio(audio.src);
        audio.audio.play();
        button.innerHTML = '<span class="icon-speak-stop"></span>';

        audio.audio.onended = () => {
            button.innerHTML = '<span class="icon-speak-start"></span>';
        };
    }
}

async function startRecording(mediaRecorder, recordingTime, recordingInterval){
    try{
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioChunks = [];

        mediaRecorder.recorder = new MediaRecorder(stream);

        mediaRecorder.recorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);

            addVoiceMessage(audioUrl, recordingTime.value);
            const aiMessage = addMessage("...", "ai");

            // Send audio to backend API
            try {
                const formData = new FormData();
                formData.append("audio", audioBlob);
                const res = await fetch(POST_NEW_VOICE_MESSAGE,{
                    method: "POST",
                    body: formData,
                });

                const resJson = await res.json();
                replaceMessage(aiMessage, resJson.message);
                addTimeToMessage(aiMessage, new Date(resJson.sent_at));
                addPlayButtonToMessage(aiMessage, resJson.message_id);
            } catch (err) {
                console.error('Error sending audio to API', err);
                throw err;
            }

            // Cleanup
            stream.getTracks().forEach(track => track.stop());
            clearInterval(recordingInterval);
        };

        mediaRecorder.recorder.start();
    } catch(err) {
        console.error('Error accessing microphone:', err);
        alert('Unable to access microphone. Please check permissions.');
    }
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
    const micButton = document.getElementById('micButton');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const recordingTimeSpan = document.getElementById('recordingTime');
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

    const mediaRecorder = {recorder: null};

    micButton.addEventListener('click', () => toggleMicButton(micButton, recordingIndicator, recordingTimeSpan, mediaRecorder));

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
