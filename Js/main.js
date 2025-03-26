document.addEventListener("DOMContentLoaded", function () {
    let username = localStorage.getItem("loggedInUser");
    let authLink = document.getElementById("auth-link");
    let userSection = document.getElementById("nav-user");
    let userName = document.getElementById("user-name");
    let logoutLink = document.getElementById("logout-link");

    if (username) {
        if (authLink) authLink.parentElement.style.display = "none"; // Ẩn Đăng nhập / Đăng ký
        if (userSection) {
            userSection.style.display = "block"; // Hiển thị tên người dùng
            userName.textContent = "Xin chào, " + username;
        }
    }

    // Xử lý đăng xuất
    if (logoutLink) {
        logoutLink.addEventListener("click", function () {
            localStorage.removeItem("loggedInUser");
            window.location.reload(); // Tải lại trang
        });
    }

    // Xử lý đăng nhập
    let loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault(); // Ngăn load lại trang
            let inputUsername = document.getElementById("username").value;
            if (inputUsername) {
                localStorage.setItem("loggedInUser", inputUsername);
                window.location.href = "index.html"; // Chuyển về trang chủ
            }
        });
    }

    // Xử lý đăng ký (nếu có form riêng)
    let registerForm = document.getElementById("register-form");
    if (registerForm) {
        registerForm.addEventListener("submit", function (event) {
            event.preventDefault();
            let inputUsername = document.getElementById("username").value;
            if (inputUsername) {
                localStorage.setItem("loggedInUser", inputUsername);
                window.location.href = "index.html"; // Chuyển về trang chủ
            }
        });
    }
});
document.addEventListener("DOMContentLoaded", function () {
    let username = localStorage.getItem("loggedInUser");
    let authLink = document.getElementById("auth-link");
    let userSection = document.getElementById("nav-user");
    let userName = document.getElementById("user-name");
    let logoutLink = document.getElementById("logout-link");

    if (username) {
        if (authLink) authLink.style.display = "none"; // Ẩn nút đăng nhập / đăng ký
        if (userSection) {
            userSection.style.display = "inline"; // Hiện tên người dùng và nút đăng xuất
            userName.textContent = "Xin chào, " + username;
        }
    }

    // Xử lý đăng xuất
    if (logoutLink) {
        logoutLink.addEventListener("click", function () {
            localStorage.removeItem("loggedInUser");
            window.location.reload(); // Tải lại trang để cập nhật giao diện
        });
    }
});


