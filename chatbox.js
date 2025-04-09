// Lấy các phần tử DOM
const chatbotToggler = document.querySelector(".chatbot-toggler");
const closeBtn = document.querySelector(".close-btn");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("send-btn");

// Tải lịch sử trò chuyện khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    loadChatHistory();
});

// Mở/đóng chatbox
chatbotToggler.addEventListener("click", () => {
    document.body.classList.toggle("show-chatbot");
});

closeBtn.addEventListener("click", () => {
    document.body.classList.remove("show-chatbot");
});

// Gửi tin nhắn khi nhấn nút "Send" hoặc Enter
sendBtn.addEventListener("click", handleChat);

chatInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleChat();
    }
});

// Hàm xử lý gửi tin nhắn
function handleChat() {
    const messageText = chatInput.value.trim();
    if (!messageText) return;

    // Hiển thị tin nhắn của người dùng
    const userMessage = document.createElement("li");
    userMessage.classList.add("chat", "outgoing");
    userMessage.innerHTML = `<p>${messageText}</p>`;
    chatBox.appendChild(userMessage);

    // Lưu tin nhắn của người dùng
    saveMessage("outgoing", messageText);

    // Giả lập phản hồi từ bot
    setTimeout(() => {
        const botMessageText = `Hi! Tôi đã nhận được tin nhắn của bạn: "${messageText}". Bạn cần giúp gì nữa không?`;
        const botMessage = document.createElement("li");
        botMessage.classList.add("chat", "incoming");
        botMessage.innerHTML = `<span class="material-symbols-outlined">smart_toy</span><p>${botMessageText}</p>`;
        chatBox.appendChild(botMessage);

        // Lưu tin nhắn của bot
        saveMessage("incoming", botMessageText);
        
        // Cuộn xuống cuối chatbox
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 500);

    // Xóa input sau khi gửi
    chatInput.value = '';

    // Cuộn xuống cuối chatbox
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Hàm lưu tin nhắn vào localStorage
function saveMessage(sender, text) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    chatHistory.push({ sender, text });
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// Hàm tải lịch sử trò chuyện từ localStorage
function loadChatHistory() {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

    // Xóa nội dung hiện tại của chatbox (trừ tin nhắn chào mặc định)
    chatBox.innerHTML = `
        <li class="chat incoming">
            <span class="material-symbols-outlined">smart_toy</span>
            <p>Hi there 👋<br>How can I help you today?</p>
        </li>
    `;

    // Thêm các tin nhắn từ lịch sử
    chatHistory.forEach(message => {
        const messageLi = document.createElement("li");
        messageLi.classList.add("chat", message.sender);
        if (message.sender === "incoming") {
            messageLi.innerHTML = `<span class="material-symbols-outlined">smart_toy</span><p>${message.text}</p>`;
        } else {
            messageLi.innerHTML = `<p>${message.text}</p>`;
        }
        chatBox.appendChild(messageLi);
    });

    // Cuộn xuống cuối chatbox
    chatBox.scrollTop = chatBox.scrollHeight;
}
