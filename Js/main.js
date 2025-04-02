// Xử lý form đăng ký và đăng nhập
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');

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

            const data = await response.json();
            if (data.status === 'success') {
                alert('Đăng ký thành công! Đang chuyển hướng đến trang đăng nhập...');
                window.location.href = 'login.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
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

            const data = await response.json();
            if (data.status === 'success') {
                // Lưu user_id vào localStorage
                localStorage.setItem('user_id', data.user.user_id);
                // Lưu thông tin user vào localStorage
                localStorage.setItem('user', JSON.stringify(data.user));
                // Chuyển hướng ngay lập tức đến trang index.html
                window.location.href = 'index.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('Đăng nhập thất bại: ' + error.message);
        }
    });

    // Xử lý nút "Quên mật khẩu?"
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const closeModal = document.querySelector('.close');
    const sendResetLinkButton = document.getElementById('send-reset-link');

    if (forgotPasswordLink && forgotPasswordModal) {
        // Hiển thị modal khi bấm "Quên mật khẩu?"
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotWPasswordModal.style.display = 'flex';
        });

        // Đóng modal khi bấm nút đóng
        closeModal.addEventListener('click', () => {
            forgotPasswordModal.style.display = 'none';
        });

        // Đóng modal khi bấm ra ngoài modal
        window.addEventListener('click', (e) => {
            if (e.target === forgotPasswordModal) {
                forgotPasswordModal.style.display = 'none';
            }
        });

        // Xử lý gửi yêu cầu đặt lại mật khẩu
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

                const data = await response.json();
                if (data.status === 'success') {
                    alert('Yêu cầu đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra email của bạn.');
                    forgotPasswordModal.style.display = 'none';
                } else {
                    alert(data.message);
                }
            } catch (error) {
                alert('Có lỗi xảy ra: ' + error.message);
            }
        });
    }
}

// Kiểm tra trạng thái đăng nhập và gắn sự kiện đăng xuất khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));

    // Kiểm tra trạng thái đăng nhập
    if (user) {
        document.getElementById('nav-auth').style.display = 'none';
        document.getElementById('nav-user').style.display = 'block';
        document.getElementById('user-name').textContent = user.username;

        // Gắn sự kiện cho nút đăng xuất
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Nút Đăng xuất được bấm!");
                localStorage.removeItem('user');
                localStorage.removeItem('user_id');
                document.getElementById('nav-auth').style.display = 'block';
                document.getElementById('nav-user').style.display = 'none';
                window.location.href = 'index.html';
            });
        } else {
            console.error("Không tìm thấy phần tử logout-link trong DOM!");
        }
    }
});