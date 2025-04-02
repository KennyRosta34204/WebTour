// Hàm khởi tạo chatbox (gắn các sự kiện sau khi chèn)
const initializeChatbox = () => {
    const chatbotToggler = document.querySelector(".chatbot-toggler");
    const closeBtn = document.querySelector(".close-btn");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendChatBtn = document.querySelector(".chat-input span");

    let userMessage = null;
    const API_KEY = "AIzaSyASM1P-ryTTp8s6Mr_Cz8NtnMGobeVvMr8";
    const inputInitHeight = chatInput.scrollHeight;

    const createChatLi = (message, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", `${className}`);
        let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
        chatLi.innerHTML = chatContent;
        chatLi.querySelector("p").textContent = message;
        return chatLi;
    }

    const generateResponse = async (chatElement) => {
        const API_URL = "http://127.0.0.1:5000/chat";
        const messageElement = chatElement.querySelector("p");

        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: userMessage
            })
        };

        try {
            const response = await fetch(API_URL, requestOptions);
            const data = await response.json();

            if (response.ok) {
                messageElement.textContent = data.response;
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
    }

    const handleChat = () => {
        userMessage = chatInput.value.trim();
        if (!userMessage) return;

        chatInput.value = "";
        chatInput.style.height = `${inputInitHeight}px`;

        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        saveMessage("outgoing", userMessage);

        setTimeout(() => {
            const incomingChatLi = createChatLi("Thinking...", "incoming");
            chatbox.appendChild(incomingChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);
            generateResponse(incomingChatLi);
        }, 600);
    }

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

    chatbotToggler.addEventListener("click", () => {
        document.body.classList.toggle("show-chatbot");
        // Lưu trạng thái hiển thị của chatbox
        localStorage.setItem('chatbotOpen', document.body.classList.contains("show-chatbot"));
    });

    closeBtn.addEventListener("click", () => {
        document.body.classList.remove("show-chatbot");
        localStorage.setItem('chatbotOpen', 'false');
    });
};

// Hàm lưu tin nhắn vào localStorage
const saveMessage = (sender, text) => {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    chatHistory.push({ sender, text });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
};

// Hàm tải lịch sử trò chuyện từ localStorage
const loadChatHistory = () => {
    const chatbox = document.querySelector(".chatbox");
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

    chatbox.innerHTML = `
        <li class="chat incoming">
            <span class="material-symbols-outlined">smart_toy</span>
            <p>Hi there 👋<br>How can I help you today?</p>
        </li>
    `;

    chatHistory.forEach(message => {
        const messageLi = document.createElement("li");
        messageLi.classList.add("chat", message.sender);
        const chatContent = message.sender === "outgoing" ? `<p>${message.text}</p>` : `<span class="material-symbols-outlined">smart_toy</span><p>${message.text}</p>`;
        messageLi.innerHTML = chatContent;
        chatbox.appendChild(messageLi);
    });

    chatbox.scrollTo(0, chatbox.scrollHeight);
};

// Hàm xóa lịch sử trò chuyện
const clearChatHistory = () => {
    localStorage.removeItem('chatHistory');
    const chatbox = document.querySelector(".chatbox");
    chatbox.innerHTML = `
        <li class="chat incoming">
            <span class="material-symbols-outlined">smart_toy</span>
            <p>Hi there 👋<br>How can I help you today?</p>
        </li>
    `;
    chatbox.scrollTo(0, chatbox.scrollHeight);
};

// Gọi initializeChatbox() sau khi chèn chatbox (được gọi trong mỗi trang)
document.addEventListener('DOMContentLoaded', () => {
    // Đảm bảo các sự kiện được gắn sau khi chèn chatbox
    initializeChatbox();
});

/* Payment */
fetch("http://localhost:3000/api/zalopay", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({ amount: 100000, description: "Thanh toán đơn hàng" })
})
.then(response => response.json())
.then(data => {
    console.log("Kết quả từ backend:", data);
})
.catch(error => console.error("Lỗi khi gọi API:", error));

document.querySelectorAll(".payment-option").forEach(option => {
    option.addEventListener("click", function () {
        document.getElementById("payment-form").style.display = "block";
    });
});

document.getElementById("pay-btn").addEventListener("click", function () {
    alert("Thanh toán thành công!");
});

document.addEventListener("DOMContentLoaded", function () {
    const paymentOptions = document.querySelectorAll(".payment-option");
    const paymentForm = document.getElementById("payment-form");

    paymentOptions.forEach(option => {
        option.addEventListener("click", function () {
            paymentOptions.forEach(opt => opt.classList.remove("active"));
            this.classList.add("active");
            if (this.id === "napas") {
                paymentForm.style.display = "block";
            } else {
                paymentForm.style.display = "none";
                alert("Bạn đã chọn " + this.innerText);
            }
        });
    });
});