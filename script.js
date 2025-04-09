// script.js

// Hàm khởi tạo chatbox
const initializeChatbox = () => {
    const chatbotToggler = document.querySelector(".chatbot-toggler");
    const closeBtn = document.querySelector(".close-btn");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendChatBtn = document.querySelector(".chat-input span");
    const clearHistoryBtn = document.querySelector(".clear-history-btn");

    // Kiểm tra xem các phần tử cần thiết có tồn tại không
    if (!chatbotToggler || !closeBtn || !chatbox || !chatInput || !sendChatBtn) {
        console.error("Không tìm thấy các phần tử chatbox trong DOM!");
        return;
    }

    let userMessage = null;
    const inputInitHeight = chatInput.scrollHeight;

    // Hàm tạo phần tử tin nhắn (li) trong chatbox
    const createChatLi = (message, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
        chatLi.innerHTML = chatContent;
        chatLi.querySelector("p").innerHTML = message; // Sử dụng innerHTML để hỗ trợ định dạng HTML từ server
        return chatLi;
    };

    // Hàm gọi API để tạo phản hồi từ chatbot
    const generateResponse = async (chatElement) => {
        const API_URL = "http://localhost:5500/chat"; // Cập nhật URL để khớp với server
        const messageElement = chatElement.querySelector("p");

        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMessage }),
        };

        try {
            const response = await fetch(API_URL, requestOptions);
            const data = await response.json();
            if (response.ok) {
                messageElement.innerHTML = data.response; // Sử dụng innerHTML để hiển thị HTML từ server
                saveMessage("incoming", data.response);
            } else {
                throw new Error(data.error || "Request failed");
            }
        } catch (error) {
            console.error("Error:", error);
            messageElement.classList.add("error");
            messageElement.textContent = "Oops! Something went wrong. Please try again.";
            saveMessage("incoming", "Oops! Something went wrong. Please try again.");
        } finally {
            chatbox.scrollTo(0, chatbox.scrollHeight);
        }
    };

    // Hàm xử lý khi người dùng gửi tin nhắn
    const handleChat = () => {
        userMessage = chatInput.value.trim();
        if (!userMessage) return;

        chatInput.value = "";
        chatInput.style.height = `${inputInitHeight}px`;

        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);
        saveMessage("outgoing", userMessage);

        const incomingChatLi = createChatLi("Thinking...", "incoming");
        chatbox.appendChild(incomingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);

        // Gọi API ngay lập tức thay vì dùng setTimeout
        generateResponse(incomingChatLi);
    };

    // Điều chỉnh chiều cao textarea khi nhập
    chatInput.addEventListener("input", () => {
        chatInput.style.height = `${inputInitHeight}px`;
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });

    // Gửi tin nhắn khi nhấn Enter (trên màn hình lớn)
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
            e.preventDefault();
            handleChat();
        }
    });

    // Gửi tin nhắn khi nhấn nút Send
    sendChatBtn.addEventListener("click", handleChat);

    // Mở/đóng chatbox
    chatbotToggler.addEventListener("click", () => {
        document.body.classList.toggle("show-chatbot");
        localStorage.setItem("chatbotOpen", document.body.classList.contains("show-chatbot"));
    });

    // Đóng chatbox
    closeBtn.addEventListener("click", () => {
        document.body.classList.remove("show-chatbot");
        localStorage.setItem("chatbotOpen", "false");
    });

    // Xóa lịch sử trò chuyện nếu có nút clear-history-btn
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", clearChatHistory);
    }

    // Tải lịch sử khi khởi tạo
    loadChatHistory();
};

// Hàm lưu tin nhắn vào localStorage
const saveMessage = (sender, text) => {
    const chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatHistory.push({ sender, text, timestamp: new Date().toISOString() });
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
};

// Hàm tải lịch sử trò chuyện từ localStorage
const loadChatHistory = () => {
    const chatbox = document.querySelector(".chatbox");
    if (!chatbox) {
        console.error("Không tìm thấy chatbox để tải lịch sử!");
        return;
    }

    const chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatbox.innerHTML = `
        <li class="chat incoming">
            <span class="material-symbols-outlined">smart_toy</span>
            <p>Hi there 👋<br>How can I help you today?</p>
        </li>
    `;

    chatHistory.forEach((message) => {
        const messageLi = document.createElement("li");
        messageLi.classList.add("chat", message.sender);
        const chatContent =
            message.sender === "outgoing"
                ? `<p>${message.text}</p>`
                : `<span class="material-symbols-outlined">smart_toy</span><p>${message.text}</p>`;
        messageLi.innerHTML = chatContent;
        chatbox.appendChild(messageLi);
    });

    chatbox.scrollTo(0, chatbox.scrollHeight);
};

// Hàm xóa lịch sử trò chuyện
const clearChatHistory = () => {
    localStorage.removeItem("chatHistory");
    const chatbox = document.querySelector(".chatbox");
    if (chatbox) {
        chatbox.innerHTML = `
            <li class="chat incoming">
                <span class="material-symbols-outlined">smart_toy</span>
                <p>Hi there 👋<br>How can I help you today?</p>
            </li>
        `;
        chatbox.scrollTo(0, chatbox.scrollHeight);
    } else {
        console.error("Không tìm thấy chatbox để xóa lịch sử!");
    }
};

// Khởi tạo chatbox sau khi chèn
const initChatboxAfterLoad = () => {
    fetch("chatbox-component.html")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Không thể tải chatbox-component.html: ${response.statusText}`);
            }
            return response.text();
        })
        .then((data) => {
            // Xóa chatbox cũ nếu đã tồn tại để tránh trùng lặp
            const existingChatbot = document.querySelector(".chatbot");
            const existingToggler = document.querySelector(".chatbot-toggler");
            if (existingChatbot) existingChatbot.remove();
            if (existingToggler) existingToggler.remove();

            // Chèn chatbox mới
            document.body.insertAdjacentHTML("beforeend", data);
            console.log("Chatbox loaded successfully");

            // Khởi tạo chatbox
            initializeChatbox();

            // Khôi phục trạng thái hiển thị của chatbox
            const isChatbotOpen = localStorage.getItem("chatbotOpen") === "true";
            if (isChatbotOpen) {
                document.body.classList.add("show-chatbot");
            }
        })
        .catch((error) => {
            console.error("Lỗi khi chèn chatbox:", error);
        });
};

// Gọi hàm khởi tạo khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
    initChatboxAfterLoad();
});