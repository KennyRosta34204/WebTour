// script.js

// Hàm kiểm tra trạng thái đăng nhập và cập nhật giao diện
const updateAuthUI = () => {
    const navAuth = document.querySelector("#nav-auth");
    const navUser = document.querySelector("#nav-user");
    const userName = document.querySelector("#user-name");
    const logoutLink = document.querySelector("#logout-link");

    const user = JSON.parse(localStorage.getItem("user"));

    // Kiểm tra sự tồn tại của navAuth và navUser trước khi thao tác
    if (navAuth && navUser) {
        if (user) {
            navAuth.style.display = "none";
            navUser.style.display = "block";
            if (userName) {
                userName.textContent = user.username;
            }
        } else {
            navAuth.style.display = "block";
            navUser.style.display = "none";
        }
    } else {
        console.warn("Không tìm thấy #nav-auth hoặc #nav-user trong DOM. Bỏ qua cập nhật giao diện đăng nhập.");
    }

    if (logoutLink) {
        logoutLink.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("user");
            localStorage.removeItem("user_id");
            localStorage.removeItem("lastTransactionId");
            localStorage.removeItem("lastOrderId");
            localStorage.removeItem("paymentSuccess");
            window.location.href = "index.html";
        });
    }
};

// Hàm xử lý đăng nhập (dành cho login.html)
const handleLogin = () => {
    const loginForm = document.querySelector("#loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.querySelector("#username").value;
            const password = document.querySelector("#password").value;

            try {
                const response = await fetch("http://localhost:5500/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });
                const data = await response.json();

                if (data.status === "success") {
                    localStorage.setItem("user", JSON.stringify(data.user));
                    localStorage.setItem("user_id", data.user.user_id); // Lưu user_id
                    window.location.href = "index.html";
                } else {
                    alert(data.message);
                }
            } catch (error) {
                console.error("Lỗi khi đăng nhập:", error);
                alert("Đã có lỗi xảy ra. Vui lòng thử lại.");
            }
        });
    }
};

// Hàm khởi tạo chatbox
const initializeChatbox = () => {
    const chatbotToggler = document.querySelector(".chatbot-toggler");
    const closeBtn = document.querySelector(".close-btn");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendChatBtn = document.querySelector(".chat-input span");

    if (!chatbotToggler || !closeBtn || !chatbox || !chatInput || !sendChatBtn) {
        console.error("Không tìm thấy các phần tử chatbox trong DOM!");
        return;
    }

    let userMessage = null;
    const inputInitHeight = chatInput.scrollHeight;

    const createChatLi = (message, className, image = null) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        let chatContent = className === "outgoing" ? `<p></p>` : `<span class="material-symbols-outlined">smart_toy</span><p></p>`;
        chatLi.innerHTML = chatContent;
        chatLi.querySelector("p").innerHTML = message;
        if (image) {
            const img = document.createElement("img");
            img.src = image;
            img.style.maxWidth = "100%";
            img.style.marginTop = "10px";
            img.style.borderRadius = "5px";
            img.alt = "Hình ảnh địa điểm du lịch";
            img.onerror = () => {
                console.error("Không thể tải hình ảnh:", image);
                img.remove();
                chatLi.querySelector("p").innerHTML += "<br><i>(Không thể tải hình ảnh)</i>";
            };
            img.onload = () => {
                console.log("Hình ảnh đã tải thành công:", image);
            };
            chatLi.appendChild(img);
        }
        return chatLi;
    };

    const generateResponse = async (chatElement) => {
        const API_URL = "http://localhost:5500/chat";
        const messageElement = chatElement.querySelector("p");

        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMessage }),
        };

        try {
            const response = await fetch(API_URL, requestOptions);
            const data = await response.json();
            console.log("Phản hồi từ API /chat:", data);

            if (response.ok) {
                messageElement.innerHTML = data.response;
                if (data.image) {
                    const img = document.createElement("img");
                    img.src = data.image;
                    img.style.maxWidth = "100%";
                    img.style.marginTop = "10px";
                    img.style.borderRadius = "5px";
                    img.alt = "Hình ảnh địa điểm du lịch";
                    
                    img.onerror = () => {
                        console.error("Không thể tải hình ảnh:", data.image);
                        img.remove();
                        messageElement.innerHTML += "<br><i>(Không thể tải hình ảnh)</i>";
                    };
                    
                    img.onload = () => {
                        console.log("Hình ảnh đã tải thành công:", data.image);
                    };

                    chatElement.appendChild(img);
                } else {
                    console.log("Không có hình ảnh trong phản hồi từ API.");
                }
                saveMessage("incoming", data.response, data.image);
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

        generateResponse(incomingChatLi);
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

    chatbotToggler.addEventListener("click", () => {
        document.body.classList.toggle("show-chatbot");
        localStorage.setItem("chatbotOpen", document.body.classList.contains("show-chatbot"));
    });

    closeBtn.addEventListener("click", () => {
        document.body.classList.remove("show-chatbot");
        localStorage.setItem("chatbotOpen", "false");
    });

    // Gán sự kiện cho nút "Xóa lịch sử" trong chatbox-component.html
    const clearHistoryBtn = document.querySelector(".clear-history-btn");
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", clearChatHistory);
    } else {
        console.warn("Không tìm thấy nút 'Xóa lịch sử' trong DOM!");
    }

    loadChatHistory();
};

// Hàm lưu tin nhắn vào localStorage
const saveMessage = (sender, text, image = null) => {
    const chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatHistory.push({ sender, text, image, timestamp: new Date().toISOString() });
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
        if (message.image) {
            const img = document.createElement("img");
            img.src = message.image;
            img.style.maxWidth = "100%";
            img.style.marginTop = "10px";
            img.style.borderRadius = "5px";
            img.alt = "Hình ảnh địa điểm du lịch";
            img.onerror = () => {
                console.error("Không thể tải hình ảnh từ lịch sử:", message.image);
                img.remove();
                messageLi.querySelector("p").innerHTML += "<br><i>(Không thể tải hình ảnh)</i>";
            };
            messageLi.appendChild(img);
        }
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

// Hàm khởi tạo chatbox sau khi chèn
const initChatboxAfterLoad = () => {
    fetch("chatbox-component.html")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Không thể tải chatbox-component.html: ${response.statusText}`);
            }
            return response.text();
        })
        .then((data) => {
            const existingChatbot = document.querySelector(".chatbot");
            const existingToggler = document.querySelector(".chatbot-toggler");
            if (existingChatbot) existingChatbot.remove();
            if (existingToggler) existingToggler.remove();

            document.body.insertAdjacentHTML("beforeend", data);
            console.log("Chatbox loaded successfully");

            initializeChatbox();

            const isChatbotOpen = localStorage.getItem("chatbotOpen") === "true";
            if (isChatbotOpen) {
                document.body.classList.add("show-chatbot");
            }
        })
        .catch((error) => {
            console.error("Lỗi khi chèn chatbox:", error);
        });
};

// Gọi các hàm khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    handleLogin();
    initChatboxAfterLoad();

    // Kiểm tra trạng thái thanh toán sau khi đăng nhập
    const paymentSuccess = localStorage.getItem("paymentSuccess");
    const lastOrderId = localStorage.getItem("lastOrderId");
    if (paymentSuccess === "true" && lastOrderId) {
        console.log(`✅ Thanh toán thành công cho đơn hàng ID: ${lastOrderId}`);
        // Có thể hiển thị thông báo hoặc xử lý thêm nếu cần
    }
});