const GET_LOGIN_PROVIDERS_API = "${API_PATH_PREFIX}/auth/getLoginProviders";
const GET_PROFILE_API = "${API_PATH_PREFIX}/auth/profile";

async function checkLoginStatusAndRedirect(){
    const res = await fetch(GET_PROFILE_API + "?" + new URLSearchParams({online: false}).toString());
    if (res.status === 200){
        window.location = "${PATH_PREFIX}/chat";
    } else if(res.status != 401 && res.status != 403){
        console.debug("Login Page: Get profile response.", await res.text());
    }
}
async function fetchLoginProvidersAndRender(){
    checkLoginStatusAndRedirect();
    const loginContainer = document.getElementById("login-container");
    const res = await fetch(GET_LOGIN_PROVIDERS_API);
    const resJson = (await res.json()).loginProviders;
    resJson.forEach((lp) => {
        if (lp.id) {
            const newLink = document.createElement("a");
            newLink.setAttribute("href", `${API_PATH_PREFIX}/auth/getLoginProviderRedirect/${dollar}{lp.id}?redirect_uri=${PATH_PREFIX}/chat`);
            // const newButton = document.createElement("div");
            newLink.classList.add("login-button");

            if(lp.displayIconUrl){
                const newImage = document.createElement("img");
                newImage.classList.add("login-button-image");
                newImage.setAttribute("src", lp.displayIconUrl);
                newLink.appendChild(newImage);
            }
            if (typeof lp.displayName === "string") {
                newLink.appendChild(document.createTextNode(lp.displayName));
            } else if (typeof lp.displayName === "object") {
                // TODO: Remove this hardcoding
                newLink.appendChild(document.createTextNode(lp.displayName.en_US));
            }

            // newLink.appendChild(newButton);
            loginContainer.appendChild(newLink);
        }
    })
}
document.addEventListener("DOMContentLoaded", fetchLoginProvidersAndRender);
