document.addEventListener("DOMContentLoaded", () => {
    const chatbotToggler = document.querySelector(".chatbot-toggler");
    const closeBtn = document.querySelector(".close-btn");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendChatBtn = document.querySelector(".chat-input span");

    let userMessage = null;
    const inputInitHeight = chatInput.scrollHeight;

    const createChatLi = (message, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
        chatLi.innerHTML = chatContent;
        chatLi.querySelector("p").textContent = message;
        return chatLi;
    };

    const generateResponse = (chatElement) => {
        const messageElement = chatElement.querySelector("p");
        setTimeout(() => {
            messageElement.textContent = "Cảm ơn bạn đã liên hệ! Chúng tôi sẽ trả lời sớm nhất có thể.";
        }, 600);
    };

    chatInput.addEventListener("input", () => {
        chatInput.style.height = `${inputInitHeight}px`;
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });

    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
            e.preventDefault();
            handleChat();
        }
    });

    sendChatBtn.addEventListener("click", handleChat);
    closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
    chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));

    function handleChat() {
        userMessage = chatInput.value.trim();
        if (!userMessage) return;

        chatInput.value = "";
        chatInput.style.height = `${inputInitHeight}px`;

        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        setTimeout(() => {
            const incomingChatLi = createChatLi("Đang xử lý...", "incoming");
            chatbox.appendChild(incomingChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);
            generateResponse(incomingChatLi);
        }, 600);
    }

    // Chức năng kéo thả chatbox
    const chatbot = document.querySelector(".chatbot");
    const header = document.querySelector(".chat-header");
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener("mousedown", startDragging);
    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", stopDragging);

    function startDragging(e) {
        initialX = e.clientX - currentX;
        initialY = e.clientY - currentY;
        isDragging = true;
    }

    function drag(e) {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;

            // Giới hạn vị trí để chatbox không vượt ra ngoài màn hình
            const maxX = window.innerWidth - chatbot.offsetWidth;
            const maxY = window.innerHeight - chatbot.offsetHeight;
            currentX = Math.max(0, Math.min(currentX, maxX));
            currentY = Math.max(0, Math.min(currentY, maxY));

            chatbot.style.right = "auto";
            chatbot.style.bottom = "auto";
            chatbot.style.left = `${currentX}px`;
            chatbot.style.top = `${currentY}px`;
        }
    }

    function stopDragging() {
        isDragging = false;
    }

    // Khởi tạo vị trí ban đầu
    currentX = window.innerWidth - chatbot.offsetWidth - 35;
    currentY = window.innerHeight - chatbot.offsetHeight - 90;
    chatbot.style.right = "35px";
    chatbot.style.bottom = "90px";
});