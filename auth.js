document.addEventListener("DOMContentLoaded", () => {
    const authTitle = document.getElementById("auth-title");
    const authForm = document.getElementById("auth-form");
    const authSubmit = document.getElementById("auth-submit");
    const toggleAuth = document.getElementById("toggle-auth");

    let isLoginMode = false;

    // Chuyển đổi giữa Đăng ký và Đăng nhập
    toggleAuth.addEventListener("click", (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? "Đăng nhập" : "Đăng ký";
        authSubmit.textContent = isLoginMode ? "Đăng nhập" : "Đăng ký";
        toggleAuth.innerHTML = isLoginMode
            ? 'Chưa có tài khoản? <a href="#">Đăng ký ngay</a>'
            : 'Đã có tài khoản? <a href="#">Đăng nhập</a>';
    });

    // Xử lý form đăng nhập / đăng ký
    document.addEventListener("DOMContentLoaded", () => {
        const registerForm = document.getElementById("register-form");
    
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
    
            const username = document.getElementById("username").value.trim();
            const email = document.getElementById("email").value.trim();
            const phone = document.getElementById("phone").value.trim();
            const password = document.getElementById("password").value.trim();
            const confirmPassword = document.getElementById("confirm-password").value.trim();
    
            if (password !== confirmPassword) {
                alert("Mật khẩu xác nhận không khớp!");
                return;
            }
    
            if (localStorage.getItem(username)) {
                alert("Tên đăng nhập đã tồn tại!");
                return;
            }
    
            // Lưu thông tin vào localStorage
            const userData = { email, phone, password };
            localStorage.setItem(username, JSON.stringify(userData));
    
            alert("Đăng ký thành công! Chuyển đến trang đăng nhập.");
            window.location.href = "index.html"; // Quay lại trang chính
        });
    });
    document.addEventListener("DOMContentLoaded", () => {
        const registerForm = document.getElementById("register-form");
        const loginForm = document.getElementById("login-form");
    
        // Xử lý đăng ký
        if (registerForm) {
            registerForm.addEventListener("submit", (e) => {
                e.preventDefault();
    
                const username = document.getElementById("username").value.trim();
                const email = document.getElementById("email").value.trim();
                const phone = document.getElementById("phone").value.trim();
                const password = document.getElementById("password").value.trim();
                const confirmPassword = document.getElementById("confirm-password").value.trim();
    
                if (!username || !email || !phone || !password || !confirmPassword) {
                    alert("Vui lòng điền đầy đủ thông tin!");
                    return;
                }
    
                if (password !== confirmPassword) {
                    alert("Mật khẩu xác nhận không khớp!");
                    return;
                }
    
                if (localStorage.getItem(username)) {
                    alert("Tên đăng nhập đã tồn tại!");
                    return;
                }
    
                // Lưu thông tin vào localStorage
                const userData = { email, phone, password };
                localStorage.setItem(username, JSON.stringify(userData));
                localStorage.setItem("currentUser", username);
    
                alert("Đăng ký thành công! Đang chuyển hướng...");
                window.location.href = "index.html"; // Chuyển hướng về trang chính
            });
        }
    
        // Xử lý đăng nhập
        if (loginForm) {
            loginForm.addEventListener("submit", (e) => {
                e.preventDefault();
    
                const username = document.getElementById("login-username").value.trim();
                const password = document.getElementById("login-password").value.trim();
    
                if (!username || !password) {
                    alert("Vui lòng nhập đầy đủ thông tin!");
                    return;
                }
    
                const storedUser = localStorage.getItem(username);
                if (storedUser) {
                    const userData = JSON.parse(storedUser);
                    if (userData.password === password) {
                        alert("Đăng nhập thành công! Đang chuyển hướng...");
                        localStorage.setItem("currentUser", username);
                        window.location.href = "index.html"; // Chuyển hướng về trang chính
                    } else {
                        alert("Sai mật khẩu! Vui lòng thử lại.");
                    }
                } else {
                    alert("Tài khoản không tồn tại! Vui lòng đăng ký.");
                }
            });
        }
    });
});
