// Xử lý form đăng ký và đăng nhập
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const resetPasswordForm = document.getElementById('reset-password-form');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        try {
            const response = await fetch('http://localhost:5500/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    email,
                    phone,
                    password,
                    confirm_password: confirmPassword,
                }),
            });

            // Kiểm tra nếu phản hồi không hợp lệ
            if (!response.ok) {
                const text = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(text);
                } catch (parseError) {
                    throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
                }
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            // Kiểm tra nếu phản hồi rỗng hoặc không phải JSON
            const text = await response.text();
            if (!text) {
                throw new Error('Phản hồi từ server rỗng');
            }

            // Thử parse JSON
            const data = JSON.parse(text);
            if (data.status === 'success') {
                alert('Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...');
                window.location.href = 'login.html';
            } else {
                alert(data.message || 'Đăng ký thất bại');
            }
        } catch (error) {
            console.error('Lỗi khi đăng ký:', error);
            alert('Đăng ký thất bại: ' + error.message);
        }
    });
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:5500/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(text);
                } catch (parseError) {
                    throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
                }
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const text = await response.text();
            if (!text) {
                throw new Error('Phản hồi từ server rỗng');
            }

            const data = JSON.parse(text);
            if (data.status === 'success') {
                localStorage.setItem('user_id', data.user.user_id);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'index.html';
            } else {
                alert(data.message || 'Đăng nhập thất bại');
            }
        } catch (error) {
            console.error('Lỗi khi đăng nhập:', error);
            alert('Đăng nhập thất bại: ' + error.message);
        }
    });

    // Xử lý nút "Quên mật khẩu?"
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const closeModal = document.querySelector('.close');
    const sendResetLinkButton = document.getElementById('send-reset-link');
    const verifyCodeButton = document.getElementById('verify-code-btn');
    const forgotEmailSection = document.getElementById('forgot-email-section');
    const verifyCodeSection = document.getElementById('verify-code-section');
    const displayEmail = document.getElementById('display-email');

    if (forgotPasswordLink && forgotPasswordModal) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPasswordModal.style.display = 'flex';
            forgotEmailSection.style.display = 'block';
            verifyCodeSection.style.display = 'none';
        });

        closeModal.addEventListener('click', () => {
            forgotPasswordModal.style.display = 'none';
            forgotEmailSection.style.display = 'block';
            verifyCodeSection.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === forgotPasswordModal) {
                forgotPasswordModal.style.display = 'none';
                forgotEmailSection.style.display = 'block';
                verifyCodeSection.style.display = 'none';
            }
        });

        sendResetLinkButton.addEventListener('click', async () => {
            const email = document.getElementById('forgot-email').value;

            if (!email) {
                alert('Vui lòng nhập email!');
                return;
            }

            try {
                const response = await fetch('http://localhost:5500/auth/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                if (!response.ok) {
                    const text = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(text);
                    } catch (parseError) {
                        throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
                    }
                    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
                }

                const text = await response.text();
                if (!text) {
                    throw new Error('Phản hồi từ server rỗng');
                }

                const data = JSON.parse(text);
                if (data.status === 'success') {
                    alert('Mã xác nhận đã được gửi! Vui lòng kiểm tra email của bạn.');
                    forgotEmailSection.style.display = 'none';
                    verifyCodeSection.style.display = 'block';
                    displayEmail.textContent = email;
                } else {
                    alert(data.message || 'Gửi yêu cầu thất bại');
                }
            } catch (error) {
                console.error('Lỗi khi gửi yêu cầu đặt lại mật khẩu:', error);
                alert('Có lỗi xảy ra: ' + error.message);
            }
        });

        verifyCodeButton.addEventListener('click', async () => {
            const email = document.getElementById('forgot-email').value;
            const code = document.getElementById('verification-code').value;

            if (!code) {
                alert('Vui lòng nhập mã xác nhận!');
                return;
            }

            try {
                const response = await fetch('http://localhost:5500/auth/verify-code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, code }),
                });

                if (!response.ok) {
                    const text = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(text);
                    } catch (parseError) {
                        throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
                    }
                    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
                }

                const text = await response.text();
                if (!text) {
                    throw new Error('Phản hồi từ server rỗng');
                }

                const data = JSON.parse(text);
                if (data.status === 'success') {
                    alert('Xác nhận mã thành công! Đang chuyển hướng đến trang đặt lại mật khẩu...');
                    forgotPasswordModal.style.display = 'none';
                    window.location.href = `reset-password.html?token=${data.resetToken}`;
                } else {
                    alert(data.message || 'Xác nhận mã thất bại');
                }
            } catch (error) {
                console.error('Lỗi khi xác nhận mã:', error);
                alert('Xác nhận mã thất bại: ' + error.message);
            }
        });
    }
}

// Xử lý form đặt lại mật khẩu
if (resetPasswordForm) {
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!token) {
            alert('Token không hợp lệ! Vui lòng thử lại.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Mật khẩu xác nhận không khớp!');
            return;
        }

        try {
            const response = await fetch('http://localhost:5500/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token,
                    newPassword,
                    confirmPassword,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(text);
                } catch (parseError) {
                    throw new Error(`HTTP error! Status: ${response.status}, Response: ${text}`);
                }
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const text = await response.text();
            if (!text) {
                throw new Error('Phản hồi từ server rỗng');
            }

            const data = JSON.parse(text);
            if (data.status === 'success') {
                alert('Đặt lại mật khẩu thành công! Đang chuyển hướng đến trang đăng nhập...');
                window.location.href = 'login.html';
            } else {
                alert(data.message || 'Đặt lại mật khẩu thất bại');
            }
        } catch (error) {
            console.error('Lỗi khi đặt lại mật khẩu:', error);
            alert('Đặt lại mật khẩu thất bại: ' + error.message);
        }
    });
}

// Kiểm tra trạng thái đăng nhập và gắn sự kiện đăng xuất khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (user) {
        const navAuth = document.getElementById('nav-auth');
        const navUser = document.getElementById('nav-user');
        const userName = document.getElementById('user-name');

        if (navAuth && navUser && userName) {
            navAuth.style.display = 'none';
            navUser.style.display = 'block';
            userName.textContent = user.username;
        }

        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Nút Đăng xuất được bấm!");
                localStorage.removeItem('user');
                localStorage.removeItem('user_id');
                if (navAuth && navUser) {
                    navAuth.style.display = 'block';
                    navUser.style.display = 'none';
                }
                window.location.href = 'index.html';
            });
        } else {
            console.error("Không tìm thấy phần tử logout-link trong DOM!");
        }
    }
});