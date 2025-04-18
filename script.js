
const updateAuthUI = () => {
    const navAuth = document.querySelector("#nav-auth");
    const navUser = document.querySelector("#nav-user");
    const userName = document.querySelector("#user-name");
    const logoutLink = document.querySelector("#logout-link");

    const user = JSON.parse(localStorage.getItem("user"));

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
            localStorage.removeItem("chatbotOpen");
            window.location.href = "index.html";
        });
    }
};

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

                if (!response.ok) {
                    throw new Error(`Đăng nhập thất bại: ${response.status} - ${response.statusText}`);
                }

                const data = await response.json();

                if (data.status === "success") {
                    localStorage.setItem("user", JSON.stringify(data.user));
                    localStorage.setItem("user_id", data.user.user_id);
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

function fetchTourDetail(tourId) {
    console.log(`🔍 Đang lấy chi tiết tour với ID: ${tourId}`);
    fetch(`/tour/${tourId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Không thể lấy chi tiết tour: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .then(tour => {
            console.log("✅ Dữ liệu tour:", tour);
            const chatboxMessages = document.getElementById('chatbox-messages');
            if (!chatboxMessages) {
                console.error("Không tìm thấy phần tử #chatbox-messages trong DOM");
                return;
            }

            const tourDetailHTML = `
                <div class="tour-detail">
                    <h3>${tour.title}</h3>
                    <img src="${tour.url || 'https://via.placeholder.com/200'}" alt="${tour.title}" style="width: 100%; max-width: 200px; border-radius: 8px; margin: 10px 0;">
                    <p>${tour.description || 'Không có mô tả'}</p>
                    <p>Giá: ${tour.price || 'Liên hệ'}</p>
                    <p>Khách sạn: ${tour.hotel || 'Không có thông tin'}</p>
                    <p>Phương tiện: ${tour.transport || 'Không có thông tin'}</p>
                    <button onclick="bookTour(${tour.id})" style="background-color: #007bff; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">Đặt tour ngay</button>
                </div>
            `;
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'bot-message');
            messageDiv.innerHTML = tourDetailHTML;
            chatboxMessages.appendChild(messageDiv);
            chatboxMessages.scrollTop = chatboxMessages.scrollHeight;
        })
        .catch(error => {
            console.error("❌ Lỗi khi lấy chi tiết tour:", error);
            const chatboxMessages = document.getElementById('chatbox-messages');
            if (chatboxMessages) {
                const messageDiv = document.createElement('div');
                messageDiv.classList.add('message', 'bot-message');
                messageDiv.textContent = "Có lỗi xảy ra khi lấy chi tiết tour. Vui lòng thử lại sau.";
                chatboxMessages.appendChild(messageDiv);
                chatboxMessages.scrollTop = chatboxMessages.scrollHeight;
            }
        });
}

let isHistoryCleared = false;

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
    const API_URL = "http://localhost:5500/api/chatbot";

    const createChatLi = (message, className, suggestions = []) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
    
        const messageContent = document.createElement("div");
        messageContent.classList.add("message-content");
    
        if (className === "incoming") {
            const botIcon = document.createElement("span");
            botIcon.classList.add("material-symbols-outlined");
            botIcon.textContent = "smart_toy";
            chatLi.appendChild(botIcon);
        }
    
        const textContent = document.createElement("div");
        textContent.classList.add("text-content");
        const messageP = document.createElement("p");
        messageP.innerHTML = message.replace(/\n/g, "<br>");
        textContent.appendChild(messageP);
        messageContent.appendChild(textContent);
    
        if (suggestions.length > 0 && className === "incoming") {
            const tourContainer = document.createElement("div");
            tourContainer.classList.add("tour-suggestions");
    
            suggestions.forEach(suggestion => {
                const tourDiv = document.createElement("div");
                tourDiv.classList.add("tour-item");
                tourDiv.innerHTML = `
                    <img src="${suggestion.image || 'https://via.placeholder.com/200x150'}" alt="${suggestion.title || 'Tour'}" style="width: 100%; max-width: 200px; border-radius: 8px; margin: 10px 0;">
                    <h4>${suggestion.title || 'Tour'}</h4>
                    <p>${suggestion.intro || 'Không có mô tả'}</p> <!-- Hiển thị văn bản giới thiệu -->
                    <p><a href="${suggestion.link || '#'}" style="color: #007bff; text-decoration: none;">Xem chi tiết và đặt tour</a></p>
                    <p>Giá: ${suggestion.price || 'Liên hệ'}</p>
                `;
                const link = tourDiv.querySelector("a");
                link.addEventListener("click", (e) => {
                    e.preventDefault();
                    console.log("Chuyển hướng đến:", suggestion.link);
                    window.location.href = suggestion.link;
                });
                tourContainer.appendChild(tourDiv);
            });
    
            messageContent.appendChild(tourContainer);
        }
    
        chatLi.appendChild(messageContent);
        return chatLi;
    };

    const generateResponse = async (chatElement) => {
        const messageElement = chatElement.querySelector(".text-content p");

        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: userMessage }),
        };

        try {
            const response = await fetch(API_URL, requestOptions);
            if (!response.ok) {
                if (response.status === 400) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Yêu cầu không hợp lệ");
                } else if (response.status === 405) {
                    throw new Error("Phương thức không được hỗ trợ. Kiểm tra server có hỗ trợ POST cho /api/chatbot không.");
                } else if (response.status === 500) {
                    throw new Error("Lỗi server. Vui lòng kiểm tra log server.");
                }
                throw new Error(`Server responded with status: ${response.status}`);
            }

            const data = await response.json();
            console.log("Phản hồi từ API /api/chatbot:", data);

            // Xóa dòng "Đang xử lý..." và cập nhật lại nội dung
            const parentLi = messageElement.closest("li.chat.incoming");
            parentLi.remove(); // Xóa tin nhắn "Đang xử lý..."

            // Tạo tin nhắn mới với phản hồi từ server
            const newChatLi = createChatLi(data.response, "incoming", data.suggestions || []);
            chatbox.appendChild(newChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);

            saveMessage("incoming", data.response, null, data.suggestions || []);
        } catch (error) {
            console.error("Lỗi khi gọi API /api/chatbot:", error);
            messageElement.classList.add("error");
            let errorMessage = "Không thể kết nối đến server. Vui lòng thử lại sau.";
            if (error.message.includes("Failed to fetch")) {
                errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra xem server có đang chạy trên cổng 5500 không.";
            } else if (error.message.includes("400")) {
                errorMessage = "Tin nhắn không hợp lệ. Vui lòng thử lại.";
            } else if (error.message.includes("405")) {
                errorMessage = "Phương thức không được hỗ trợ. Kiểm tra server có hỗ trợ POST cho /api/chatbot không.";
            } else if (error.message.includes("500")) {
                errorMessage = "Lỗi server. Vui lòng kiểm tra log server.";
            }
            messageElement.textContent = errorMessage;
            saveMessage("incoming", errorMessage);
        } finally {
            chatbox.scrollTo(0, chatbox.scrollHeight);
        }
    };

    const handleChat = () => {
        userMessage = chatInput.value.trim();
        if (!userMessage) {
            console.warn("Tin nhắn không được để trống");
            return;
        }

        chatInput.value = "";
        chatInput.style.height = `${inputInitHeight}px`;

        const outgoingChatLi = createChatLi(userMessage, "outgoing");
        chatbox.appendChild(outgoingChatLi);
        chatbox.scrollTo(0, chatbox.scrollHeight);
        saveMessage("outgoing", userMessage);

        const incomingChatLi = createChatLi("Đang xử lý...", "incoming");
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
};

const saveMessage = (sender, text, image = null, suggestions = null) => {
    // Loại bỏ kiểm tra isHistoryCleared để luôn lưu tin nhắn mới
    const chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
    chatHistory.push({ sender, text, image, suggestions, timestamp: new Date().toISOString() });
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
};

const loadChatHistory = () => {
    const chatbox = document.querySelector(".chatbox");
    if (!chatbox) {
        console.error("Không tìm thấy chatbox để tải lịch sử!");
        return;
    }

    const chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];

    if (chatHistory.length === 0) {
        chatbox.innerHTML = `
            <li class="chat incoming">
                <span class="material-symbols-outlined">smart_toy</span>
                <div class="message-content">
                    <div class="text-content">
                        <p>Xin chào! Tôi là chatbot du lịch của AI Tour. Tôi có thể giúp bạn tìm kiếm các tour du lịch tại Việt Nam, gợi ý địa điểm, ẩm thực, phương tiện di chuyển, và nhiều hơn nữa. Bạn muốn khám phá nơi nào?</p>
                    </div>
                </div>
            </li>
        `;
    } else {
        chatbox.innerHTML = "";
        chatHistory.forEach((message) => {
            const chatLi = document.createElement("li");
            chatLi.classList.add("chat", message.sender);

            const messageContent = document.createElement("div");
            messageContent.classList.add("message-content");

            if (message.sender === "incoming") {
                const botIcon = document.createElement("span");
                botIcon.classList.add("material-symbols-outlined");
                botIcon.textContent = "smart_toy";
                chatLi.appendChild(botIcon);
            }

            const textContent = document.createElement("div");
            textContent.classList.add("text-content");
            const messageP = document.createElement("p");
            messageP.innerHTML = message.text.replace(/\n/g, "<br>");
            textContent.appendChild(messageP);
            messageContent.appendChild(textContent);

            if (message.suggestions && message.suggestions.length > 0) {
                const tourContainer = document.createElement("div");
                tourContainer.classList.add("tour-suggestions");
                message.suggestions.forEach(suggestion => {
                    const tourDiv = document.createElement("div");
                    tourDiv.classList.add("tour-item");
                    tourDiv.innerHTML = `
                        <img src="${suggestion.image || 'https://via.placeholder.com/200x150'}" alt="${suggestion.title || 'Tour'}" style="width: 100%; max-width: 200px; border-radius: 8px; margin: 10px 0;">
                        <p><a href="${suggestion.link || '#'}" style="color: #007bff; text-decoration: none;">Xem chi tiết và đặt tour</a></p>
                        <p>Giá: ${suggestion.price || 'Liên hệ'}</p>
                    `;
                    tourContainer.appendChild(tourDiv);
                });
                messageContent.appendChild(tourContainer);
            }

            chatLi.appendChild(messageContent);
            chatbox.appendChild(chatLi);
        });
    }

    chatbox.scrollTo(0, chatbox.scrollHeight);
};

const clearChatHistory = () => {
    // Không cần isHistoryCleared vì saveMessage đã được sửa
    try {
        localStorage.removeItem("chatHistory");
        if (localStorage.getItem("chatHistory") === null) {
            console.log("✅ Đã xóa chatHistory trong localStorage");
        } else {
            console.error("❌ Không thể xóa chatHistory trong localStorage");
            return;
        }
    } catch (error) {
        console.error("❌ Lỗi khi xóa chatHistory trong localStorage:", error);
        return;
    }

    const chatbox = document.querySelector(".chatbox");
    if (chatbox) {
        console.log("Trước khi cập nhật chatbox:", chatbox.innerHTML);
        chatbox.innerHTML = `
            <li class="chat incoming">
                <span class="material-symbols-outlined">smart_toy</span>
                <div class="message-content">
                    <div class="text-content">
                        <p>Lịch sử trò chuyện đã được xóa thành công!</p>
                    </div>
                </div>
            </li>
            <li class="chat incoming">
                <span class="material-symbols-outlined">smart_toy</span>
                <div class="message-content">
                    <div class="text-content">
                        <p>Xin chào! Tôi là chatbot du lịch của AI Tour. Tôi có thể giúp bạn tìm kiếm các tour du lịch tại Việt Nam, gợi ý địa điểm, ẩm thực, phương tiện di chuyển, và nhiều hơn nữa. Bạn muốn khám phá nơi nào?</p>
                    </div>
                </div>
            </li>
        `;
        console.log("Sau khi cập nhật chatbox:", chatbox.innerHTML);
        chatbox.scrollTo(0, chatbox.scrollHeight);
    } else {
        console.error("Không tìm thấy chatbox để xóa lịch sử!");
    }
};

const initChatboxAfterLoad = () => {
    // Xóa điều kiện giới hạn chỉ khởi tạo trên index.html
    // hoặc điều chỉnh để áp dụng cho các trang mong muốn
    const existingChatbot = document.querySelector(".chatbot");
    const existingToggler = document.querySelector(".chatbot-toggler");
    if (existingChatbot) existingChatbot.remove();
    if (existingToggler) existingToggler.remove();

    fetch("chatbox-component.html")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Không thể tải chatbox-component.html: ${response.status} - ${response.statusText}`);
            }
            return response.text();
        })
        .then((data) => {
            document.body.insertAdjacentHTML("beforeend", data);
            console.log("Chatbox loaded successfully");

            initializeChatbox();
            loadChatHistory();

            const clearHistoryBtn = document.querySelector(".clear-history-btn");
            if (clearHistoryBtn) {
                clearHistoryBtn.addEventListener("click", (e) => {
                    e.preventDefault();
                    clearChatHistory();
                    console.log("Lịch sử trò chuyện đã được xóa!");
                });
            } else {
                console.warn("Không tìm thấy nút 'Xóa lịch sử' trong DOM sau khi chèn chatbox!");
            }

            const isChatbotOpen = localStorage.getItem("chatbotOpen") === "true";
            if (isChatbotOpen) {
                document.body.classList.add("show-chatbot");
            }
        })
        .catch((error) => {
            console.error("Lỗi khi chèn chatbox:", error);
            document.body.insertAdjacentHTML("beforeend", "<p>Không thể tải khung chat. Vui lòng thử lại sau.</p>");
        });
};

document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    handleLogin();
    initChatboxAfterLoad();

    const paymentSuccess = localStorage.getItem("paymentSuccess");
    const lastOrderId = localStorage.getItem("lastOrderId");
    const notification = document.getElementById("notification");

    if (paymentSuccess === "true" && lastOrderId) {
        console.log(`✅ Thanh toán thành công cho đơn hàng ID: ${lastOrderId}`);
        if (notification) {
            notification.textContent = `Bạn đã thanh toán thành công cho đơn hàng ID: ${lastOrderId}!`;
            notification.classList.add("show");
            setTimeout(() => {
                notification.classList.remove("show");
                localStorage.removeItem("paymentSuccess");
                localStorage.removeItem("lastOrderId");
            }, 5000);
        }
    }
});