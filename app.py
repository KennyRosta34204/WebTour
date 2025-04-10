import os
import time
from datetime import datetime
import json
import hashlib
import hmac
import random
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import requests
import bcrypt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import google.generativeai as genai

# Load biến môi trường từ file .env
load_dotenv()

app = Flask(__name__)
CORS(app)  # Kích hoạt CORS

# Cấu hình Google Generative AI (Gemini 1.5 Pro)
API_KEY = 'AIzaSyASM1P-ryTTp8s6Mr_Cz8NtnMGobeVvMr8'  # Thay thế bằng API key hợp lệ của bạn
genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro')
chat = model.start_chat(history=[])

# Hàm ghi log với timestamp
def log_with_timestamp(message, data=None):
    timestamp = datetime.now().isoformat()
    print(f"[{timestamp}] {message}", json.dumps(data, indent=2) if data else '')

# Hàm ghi log lỗi
def log_error(message, error):
    timestamp = datetime.now().isoformat()
    print(f"[{timestamp}] ERROR: {message}", {
        'message': str(error),
        'stack': getattr(error, 'stack', None),
        'response': getattr(error, 'response', None)
    })

# Cấu hình ZaloPay
config = {
    'app_id': os.getenv('ZALOPAY_APP_ID', '2554'),
    'key1': os.getenv('ZALOPAY_KEY1', 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn'),
    'key2': os.getenv('ZALOPAY_KEY2', 'trMrHtvjo6myautxF8KioRpXuW6Gxuna'),
    'endpoint': os.getenv('ZALOPAY_ENDPOINT', 'https://sb-openapi.zalopay.vn/v2/create'),
}

log_with_timestamp("🚀 ZaloPay Config Loaded:", {
    'app_id': config['app_id'],
    'endpoint': config['endpoint'],
    'has_key1': bool(config['key1']),
    'has_key2': bool(config['key2'])
})

# Kiểm tra config ZaloPay
if not all([config['app_id'], config['key1'], config['key2'], config['endpoint']]):
    log_error("Thiếu thông tin cấu hình ZaloPay", Exception("Missing ZaloPay config"))
    exit(1)

# Cấu hình kết nối MySQL
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'aitour',
    'pool_size': 10
}

# Tạo pool kết nối MySQL
connection_pool = mysql.connector.pooling.MySQLConnectionPool(**db_config)

# Kiểm tra kết nối MySQL và database đang sử dụng
def check_mysql_connection():
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor()
        cursor.execute("SELECT DATABASE() as db")
        result = cursor.fetchone()
        log_with_timestamp("✅ Kết nối MySQL thành công, database đang sử dụng:", result[0])
        
        # Kiểm tra và thêm các cột mới vào bảng product nếu chưa tồn tại
        cursor.execute("SHOW COLUMNS FROM product")
        columns = [col[0] for col in cursor.fetchall()]
        
        if 'url' not in columns:
            cursor.execute("ALTER TABLE product ADD COLUMN url VARCHAR(255)")
            log_with_timestamp("✅ Đã thêm cột 'url' vào bảng product")
        if 'hotel' not in columns:
            cursor.execute("ALTER TABLE product ADD COLUMN hotel VARCHAR(255)")
            log_with_timestamp("✅ Đã thêm cột 'hotel' vào bảng product")
        if 'transport' not in columns:
            cursor.execute("ALTER TABLE product ADD COLUMN transport VARCHAR(255)")
            log_with_timestamp("✅ Đã thêm cột 'transport' vào bảng product")
        
        cursor.close()
        connection.close()
    except Error as e:
        log_error("❌ Lỗi kết nối MySQL hoặc cập nhật bảng:", e)
        exit(1)

check_mysql_connection()

# Cấu hình gửi email
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASS = os.getenv('EMAIL_PASS')

def send_email(to_email, subject, html_content):
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))
        
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASS)
        server.sendmail(EMAIL_USER, to_email, msg.as_string())
        server.quit()
        log_with_timestamp("✅ Đã gửi email thành công:", {'to': to_email})
    except Exception as e:
        log_error("❌ Lỗi khi gửi email:", e)
        raise

# Hàm tạo app_trans_id
def generate_trans_id():
    now = datetime.now()
    year = str(now.year)[-2:]
    month = str(now.month).zfill(2)
    day = str(now.day).zfill(2)
    timestamp = str(int(time.time() * 1000))[-6:]
    return f"{year}{month}{day}_{timestamp}"

# Hàm tạo user_id
def generate_user_id():
    timestamp = str(int(time.time() * 1000))
    random_num = str(random.randint(0, 999)).zfill(3)
    return f"{timestamp}{random_num}"

# Hàm tạo mã xác nhận (6 chữ số)
def generate_verification_code():
    return str(random.randint(100000, 999999))

# API đăng ký
@app.route('/auth/register', methods=['POST'])
def register():
    connection = None
    try:
        connection = connection_pool.get_connection()
        connection.start_transaction()
        cursor = connection.cursor(dictionary=True)

        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        phone = data.get('phone')
        password = data.get('password')
        confirm_password = data.get('confirm_password')

        if not all([username, email, phone, password, confirm_password]):
            log_with_timestamp("⚠️ Thiếu thông tin:", data)
            return jsonify({'status': 'error', 'message': 'Tất cả các trường đều bắt buộc'}), 400

        if password != confirm_password:
            return jsonify({'status': 'error', 'message': 'Mật khẩu không khớp'}), 400

        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email):
            log_with_timestamp("⚠️ Email không hợp lệ:", {'email': email})
            return jsonify({'status': 'error', 'message': 'Định dạng email không hợp lệ'}), 400

        phone_regex = r'^\d{10,15}$'
        if not re.match(phone_regex, phone):
            log_with_timestamp("⚠️ Số điện thoại không hợp lệ:", {'phone': phone})
            return jsonify({'status': 'error', 'message': 'Số điện thoại không hợp lệ (phải có 10-15 chữ số)'}), 400

        cursor.execute('SELECT * FROM users WHERE username = %s OR email = %s', (username, email))
        if cursor.fetchall():
            log_with_timestamp("⚠️ Username hoặc email đã tồn tại:", {'username': username, 'email': email})
            return jsonify({'status': 'error', 'message': 'Username hoặc email đã tồn tại'}), 400

        user_id = generate_user_id()
        log_with_timestamp("🔍 Tạo user_id mới:", {'user_id': user_id})

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Thêm vào bảng users
        cursor.execute(
            'INSERT INTO users (user_id, username, email, phone, password) VALUES (%s, %s, %s, %s, %s)',
            (user_id, username, email, phone, hashed_password)
        )

        # Thêm vào bảng user
        cursor.execute(
            'INSERT INTO user (name, email, phone, username, password) VALUES (%s, %s, %s, %s, %s)',
            (username, email, phone, username, hashed_password)
        )
        user_table_id = cursor.lastrowid
        log_with_timestamp("✅ Thêm vào bảng user:", {'id': user_table_id, 'email': email})

        connection.commit()
        log_with_timestamp("✅ Đăng ký thành công:", {'user_id': user_id, 'username': username})
        return jsonify({'status': 'success', 'message': 'Đăng ký thành công'}), 201

    except Exception as e:
        log_error("❌ Lỗi khi đăng ký:", e)
        if connection:
            connection.rollback()
        return jsonify({'status': 'error', 'message': f'Đăng ký thất bại: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API đăng nhập
@app.route('/auth/login', methods=['POST'])
def login():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        data = request.get_json()
        username = data.get('username')
        password = data.get('password')

        if not all([username, password]):
            log_with_timestamp("⚠️ Thiếu thông tin:", {'username': username})
            return jsonify({'status': 'error', 'message': 'Tất cả các trường đều bắt buộc'}), 400

        cursor.execute('SELECT * FROM users WHERE username = %s', (username,))
        user = cursor.fetchone()

        if not user:
            log_with_timestamp("⚠️ Không tìm thấy user:", {'username': username})
            return jsonify({'status': 'error', 'message': 'Username hoặc mật khẩu không đúng'}), 400

        if not bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
            log_with_timestamp("⚠️ Mật khẩu không đúng:", {'username': username})
            return jsonify({'status': 'error', 'message': 'Username hoặc mật khẩu không đúng'}), 400

        cursor.execute('SELECT * FROM user WHERE email = %s', (user['email'],))
        user_table_row = cursor.fetchone()
        if not user_table_row:
            cursor.execute(
                'INSERT INTO user (name, email, phone, username, password) VALUES (%s, %s, %s, %s, %s)',
                (user['username'], user['email'], user['phone'], user['username'], user['password'])
            )
            user_table_id = cursor.lastrowid
            log_with_timestamp("✅ Thêm vào bảng user:", {'id': user_table_id, 'email': user['email']})
        else:
            user_table_id = user_table_row['id']
            log_with_timestamp("✅ Đã tồn tại trong bảng user:", {'id': user_table_id, 'email': user['email']})

        log_with_timestamp("✅ Đăng nhập thành công:", {'username': username})
        return jsonify({
            'status': 'success',
            'message': 'Đăng nhập thành công',
            'user': {
                'user_id': user['user_id'],
                'username': user['username'],
                'email': user['email'],
                'userTableId': user_table_id
            }
        }), 200

    except Exception as e:
        log_error("❌ Lỗi khi đăng nhập:", e)
        return jsonify({'status': 'error', 'message': f'Đăng nhập thất bại: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API quên mật khẩu
@app.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        data = request.get_json()
        email = data.get('email')

        if not email:
            log_with_timestamp("⚠️ Thiếu email:", {'email': email})
            return jsonify({'status': 'error', 'message': 'Email là bắt buộc'}), 400

        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, email):
            log_with_timestamp("⚠️ Email không hợp lệ:", {'email': email})
            return jsonify({'status': 'error', 'message': 'Định dạng email không hợp lệ'}), 400

        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()

        if not user:
            log_with_timestamp("⚠️ Không tìm thấy user với email:", {'email': email})
            return jsonify({'status': 'error', 'message': 'Email không tồn tại'}), 400

        verification_code = generate_verification_code()
        code_expiry = int(time.time() * 1000) + 3600000  # 1 giờ

        cursor.execute(
            'UPDATE users SET reset_code = %s, reset_code_expiry = %s WHERE email = %s',
            (verification_code, code_expiry, email)
        )
        connection.commit()

        log_with_timestamp("✅ Tạo mã xác nhận thành công:", {'email': email, 'verificationCode': verification_code})

        html_content = f"""
            <h2>Mã xác nhận đặt lại mật khẩu</h2>
            <p>Chào {user['username']},</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Dưới đây là mã xác nhận của bạn:</p>
            <h3>{verification_code}</h3>
            <p>Mã này sẽ hết hạn sau 1 giờ.</p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            <p>Trân trọng,<br>Đội ngũ AI Tour</p>
        """
        send_email(email, 'Mã xác nhận để đặt lại mật khẩu', html_content)

        return jsonify({
            'status': 'success',
            'message': 'Mã xác nhận đã được gửi. Vui lòng kiểm tra email của bạn.'
        }), 200

    except Exception as e:
        log_error("❌ Lỗi khi xử lý quên mật khẩu:", e)
        return jsonify({'status': 'error', 'message': f'Có lỗi xảy ra: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API kiểm tra mã xác nhận
@app.route('/auth/verify-code', methods=['POST'])
def verify_code():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        data = request.get_json()
        email = data.get('email')
        code = data.get('code')

        if not all([email, code]):
            log_with_timestamp("⚠️ Thiếu thông tin:", {'email': email, 'code': code})
            return jsonify({'status': 'error', 'message': 'Email và mã xác nhận là bắt buộc'}), 400

        cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = cursor.fetchone()

        if not user:
            log_with_timestamp("⚠️ Không tìm thấy user với email:", {'email': email})
            return jsonify({'status': 'error', 'message': 'Email không tồn tại'}), 400

        if user['reset_code'] != code:
            log_with_timestamp("⚠️ Mã xác nhận không đúng:", {'email': email, 'code': code})
            return jsonify({'status': 'error', 'message': 'Mã xác nhận không đúng'}), 400

        if user['reset_code_expiry'] < int(time.time() * 1000):
            log_with_timestamp("⚠️ Mã xác nhận đã hết hạn:", {'email': email})
            return jsonify({'status': 'error', 'message': 'Mã xác nhận đã hết hạn'}), 400

        reset_token = os.urandom(32).hex()
        reset_token_expiry = int(time.time() * 1000) + 3600000

        cursor.execute(
            'UPDATE users SET reset_code = NULL, reset_code_expiry = NULL, reset_token = %s, reset_token_expiry = %s WHERE email = %s',
            (reset_token, reset_token_expiry, email)
        )
        connection.commit()

        log_with_timestamp("✅ Xác nhận mã thành công:", {'email': email, 'resetToken': reset_token})

        return jsonify({
            'status': 'success',
            'message': 'Xác nhận mã thành công.',
            'resetToken': reset_token
        }), 200

    except Exception as e:
        log_error("❌ Lỗi khi kiểm tra mã xác nhận:", e)
        return jsonify({'status': 'error', 'message': f'Có lỗi xảy ra: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API đặt lại mật khẩu
@app.route('/auth/reset-password', methods=['POST'])
def reset_password():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        data = request.get_json()
        token = data.get('token')
        new_password = data.get('newPassword')
        confirm_password = data.get('confirmPassword')

        if not all([token, new_password, confirm_password]):
            log_with_timestamp("⚠️ Thiếu thông tin:", {'token': token, 'newPassword': new_password})
            return jsonify({'status': 'error', 'message': 'Tất cả các trường đều bắt buộc'}), 400

        if new_password != confirm_password:
            return jsonify({'status': 'error', 'message': 'Mật khẩu không khớp'}), 400

        cursor.execute('SELECT * FROM users WHERE reset_token = %s', (token,))
        user = cursor.fetchone()

        if not user:
            log_with_timestamp("⚠️ Token không hợp lệ:", {'token': token})
            return jsonify({'status': 'error', 'message': 'Token không hợp lệ hoặc đã hết hạn'}), 400

        if user['reset_token_expiry'] < int(time.time() * 1000):
            log_with_timestamp("⚠️ Token đã hết hạn:", {'token': token})
            return jsonify({'status': 'error', 'message': 'Token đã hết hạn'}), 400

        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())

        cursor.execute(
            'UPDATE users SET password = %s, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = %s',
            (hashed_password, token)
        )

        cursor.execute(
            'UPDATE user SET password = %s WHERE email = %s',
            (hashed_password, user['email'])
        )
        connection.commit()

        log_with_timestamp("✅ Đặt lại mật khẩu thành công:", {'email': user['email']})
        return jsonify({
            'status': 'success',
            'message': 'Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập bằng mật khẩu mới.'
        }), 200

    except Exception as e:
        log_error("❌ Lỗi khi đặt lại mật khẩu:", e)
        return jsonify({'status': 'error', 'message': f'Có lỗi xảy ra: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API lấy danh sách tour
@app.route('/tours', methods=['GET'])
def get_tours():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM product")
        rows = cursor.fetchall()
        log_with_timestamp("📊 Dữ liệu tour từ database:", rows)

        processed_tours = []
        for tour in rows:
            tour['image'] = tour.get('image', '')
            cursor.execute("SELECT image_url FROM gallery WHERE tour_id = %s", (tour['id'],))
            gallery_rows = cursor.fetchall()
            tour['gallery'] = [row['image_url'] for row in gallery_rows]
            processed_tours.append(tour)

        return jsonify(processed_tours)

    except Exception as e:
        log_error("❌ Lỗi khi lấy danh sách tour:", e)
        return jsonify({'error': 'Lỗi hệ thống khi lấy danh sách tour', 'details': str(e)}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API lấy chi tiết tour theo ID
@app.route('/tour/<int:tour_id>', methods=['GET'])
def get_tour(tour_id):
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM product WHERE id = %s", (tour_id,))
        product_rows = cursor.fetchall()
        if not product_rows:
            log_with_timestamp("⚠️ Không tìm thấy tour:", {'id': tour_id})
            return jsonify({'error': 'Tour không tồn tại'}), 404

        tour = product_rows[0]
        tour['image'] = tour.get('image', '')

        cursor.execute("SELECT image_url FROM gallery WHERE tour_id = %s", (tour_id,))
        gallery_rows = cursor.fetchall()
        tour['gallery'] = [row['image_url'] for row in gallery_rows]

        cursor.execute("SELECT day, activities FROM itinerary WHERE tour_id = %s", (tour_id,))
        itinerary_rows = cursor.fetchall()
        tour['itinerary'] = [{'day': row['day'], 'activities': json.loads(row['activities'])} for row in itinerary_rows]

        tour['bookingLink'] = f"/tour-detail.html?id={tour['id']}"

        log_with_timestamp("📋 Chi tiết tour:", tour)
        return jsonify(tour)

    except Exception as e:
        log_error("❌ Lỗi khi lấy chi tiết tour:", e)
        return jsonify({'error': 'Lỗi hệ thống khi lấy chi tiết tour', 'details': str(e)}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API tạo đơn hàng
@app.route('/create-order', methods=['POST'])
def create_order():
    log_with_timestamp("✅ Nhận request từ frontend:", request.get_json())

    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        data = request.get_json()
        product_id = data.get('product_id')
        user_info = data.get('userInfo')
        user_id = data.get('user_id')

        if not user_id:
            log_with_timestamp("⚠️ Thiếu user_id")
            return jsonify({'error': 'Thiếu user_id'}), 400

        cursor.execute('SELECT * FROM users WHERE user_id = %s', (user_id,))
        users = cursor.fetchall()
        if not users:
            log_with_timestamp("⚠️ Không tìm thấy user trong bảng users:", {'user_id': user_id})
            return jsonify({'error': 'Người dùng không hợp lệ'}), 401
        user = users[0]
        log_with_timestamp("✅ Tìm thấy user trong bảng users:", {'user_id': user_id})

        if not all([product_id, user_info, user_info.get('name'), user_info.get('email'), user_info.get('phone')]):
            log_with_timestamp("⚠️ Thiếu thông tin:", {'product_id': product_id, 'userInfo': user_info})
            return jsonify({'error': 'Thiếu thông tin tour hoặc người dùng'}), 400

        email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_regex, user_info['email']):
            log_with_timestamp("⚠️ Email không hợp lệ:", {'email': user_info['email']})
            return jsonify({'error': 'Email không hợp lệ'}), 400

        phone_regex = r'^\d{10,15}$'
        if not re.match(phone_regex, user_info['phone']):
            log_with_timestamp("⚠️ Số điện thoại không hợp lệ:", {'phone': user_info['phone']})
            return jsonify({'error': 'Số điện thoại không hợp lệ (phải có 10-15 chữ số)'}), 400

        connection.start_transaction()

        cursor.execute("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s", ('aitour', 'product'))
        if not cursor.fetchall():
            log_with_timestamp("⚠️ Bảng product không tồn tại")
            connection.rollback()
            return jsonify({'error': 'Bảng product không tồn tại trong database'}), 500
        log_with_timestamp("✅ Bảng product tồn tại")

        cursor.execute("SELECT * FROM product WHERE id = %s", (product_id,))
        product_rows = cursor.fetchall()
        if not product_rows:
            log_with_timestamp("⚠️ Không tìm thấy tour:", {'product_id': product_id})
            connection.rollback()
            return jsonify({'error': 'Không tìm thấy tour'}), 404

        product = product_rows[0]
        log_with_timestamp("🔍 Thông tin tour:", product)

        if not product['price']:
            log_with_timestamp("⚠️ Giá tour không tồn tại:", {'product_id': product_id})
            connection.rollback()
            return jsonify({'error': 'Giá tour không tồn tại'}), 400

        amount = int(''.join(filter(str.isdigit, product['price'] or '0')))
        log_with_timestamp("🔍 Số tiền sau khi xử lý:", amount)

        if not amount or amount < 1000 or amount > 10000000:
            log_with_timestamp("⚠️ Số tiền không hợp lệ:", {'amount': amount})
            connection.rollback()
            return jsonify({
                'error': 'Số tiền không hợp lệ (tối thiểu 1,000 VND, tối đa 10,000,000 VND)',
                'received_amount': amount
            }), 400

        cursor.execute("SELECT id FROM user WHERE email = %s", (user_info['email'],))
        user_table_rows = cursor.fetchall()
        if not user_table_rows:
            log_with_timestamp("🔍 Người dùng không tồn tại trong bảng user, tạo mới...")
            hashed_password = bcrypt.hashpw("defaultpassword".encode('utf-8'), bcrypt.gensalt())
            cursor.execute(
                "INSERT INTO user (name, email, phone, username, password) VALUES (%s, %s, %s, %s, %s)",
                (user_info['name'], user_info['email'], user_info['phone'], user_info['name'], hashed_password)
            )
            user_table_id = cursor.lastrowid
            log_with_timestamp("✅ Thêm người dùng mới vào bảng user:", {'userId': user_table_id, 'email': user_info['email']})
        else:
            user_table_id = user_table_rows[0]['id']
            log_with_timestamp("✅ Người dùng đã tồn tại trong bảng user:", {'userId': user_table_id, 'email': user_info['email']})

        app_trans_id = generate_trans_id()
        order = {
            'app_id': config['app_id'],
            'app_trans_id': app_trans_id,
            'app_user': user_info['email'],
            'app_time': int(time.time() * 1000),
            'amount': amount,
            'item': json.dumps([{'itemid': str(product['id']), 'itemname': product['title'], 'itemprice': amount, 'itemquantity': 1}]),
            'embed_data': json.dumps({'redirecturl': "http://localhost:5500/index.html"}),
            'description': f"Thanh toán đơn hàng - Tour: {product['title']}",
            'bank_code': "zalopayapp",
            'callback_url': "http://localhost:5500/payment_callback"
        }

        data = f"{order['app_id']}|{order['app_trans_id']}|{order['app_user']}|{order['amount']}|{order['app_time']}|{order['embed_data']}|{order['item']}"
        log_with_timestamp("Chuỗi dữ liệu để tạo MAC:", data)
        mac = hmac.new(config['key1'].encode('utf-8'), data.encode('utf-8'), hashlib.sha256).hexdigest()
        order['mac'] = mac

        log_with_timestamp("🔐 Chữ ký MAC:", order['mac'])
        log_with_timestamp("📤 Gửi request tới ZaloPay:", order)

        response = requests.post(config['endpoint'], params=order)
        response_data = response.json()
        log_with_timestamp("📩 Phản hồi từ ZaloPay:", response_data)

        if response_data.get('return_code') != 1:
            log_with_timestamp("⚠️ Lỗi từ ZaloPay:", response_data)
            connection.rollback()
            return jsonify({
                'error': f"Lỗi từ ZaloPay: {response_data.get('return_message', 'Không xác định')}",
                'return_code': response_data.get('return_code'),
                'sub_return_code': response_data.get('sub_return_code'),
                'sub_return_message': response_data.get('sub_return_message')
            }), 400

        cursor.execute("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s", ('aitour', 'order'))
        if not cursor.fetchall():
            log_with_timestamp("⚠️ Bảng order không tồn tại trong database")
            connection.rollback()
            return jsonify({
                'error': "Bảng order không tồn tại trong database. Vui lòng tạo bảng order với các cột: id, user_id, order_name, amount, payment_method, payment_status, app_trans_id, mac, created_at"
            }), 500
        log_with_timestamp("✅ Bảng order tồn tại")

        cursor.execute(
            "INSERT INTO `order` (user_id, order_name, amount, payment_method, payment_status, app_trans_id, mac) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                user_table_id,
                f"Tour: {product['title']}",
                amount,
                "ZaloPay",
                'PENDING' if response_data.get('return_code') == 1 else 'FAILED',
                order['app_trans_id'],
                order['mac']
            )
        )
        order_id = cursor.lastrowid
        log_with_timestamp("✅ Lưu đơn hàng thành công:", {'orderId': order_id})

        connection.commit()
        log_with_timestamp("✅ Commit transaction thành công")

        return jsonify({
            'order_url': response_data.get('order_url'),
            'order_id': order_id,
            'app_trans_id': order['app_trans_id']
        })

    except Exception as e:
        log_error("❌ Lỗi khi tạo đơn hàng:", e)
        if connection:
            connection.rollback()
            log_with_timestamp("🔍 Đã rollback transaction")
        return jsonify({
            'error': 'Lỗi hệ thống khi tạo đơn hàng',
            'details': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API xử lý callback từ ZaloPay
@app.route('/payment_callback', methods=['POST'])
def payment_callback():
    log_with_timestamp("📩 Webhook từ ZaloPay:", request.get_json())

    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        data = request.get_json()
        if not data or 'data' not in data or 'mac' not in data:
            log_with_timestamp("⚠️ Callback không hợp lệ:", data)
            return jsonify({'return_code': 0, 'return_message': 'Dữ liệu callback không hợp lệ'}), 400

        received_mac = data['mac']
        computed_mac = hmac.new(config['key2'].encode('utf-8'), data['data'].encode('utf-8'), hashlib.sha256).hexdigest()
        if received_mac != computed_mac:
            log_with_timestamp("⚠️ Chữ ký không hợp lệ:", {'receivedMac': received_mac, 'computedMac': computed_mac})
            return jsonify({'return_code': 0, 'return_message': 'Chữ ký không hợp lệ'}), 400

        callback_data = json.loads(data['data'])
        app_trans_id = callback_data['app_trans_id']
        status = callback_data['status']

        cursor.execute("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s", ('aitour', 'order'))
        if not cursor.fetchall():
            log_with_timestamp("⚠️ Bảng order không tồn tại trong database")
            return jsonify({'return_code': 0, 'return_message': 'Bảng order không tồn tại trong database'}), 500

        new_status = 'SUCCESS' if status == 1 else 'FAILED'
        cursor.execute(
            "UPDATE `order` SET payment_status = %s WHERE app_trans_id = %s",
            (new_status, app_trans_id)
        )
        if cursor.rowcount == 0:
            log_with_timestamp("⚠️ Không tìm thấy đơn hàng để cập nhật:", {'app_trans_id': app_trans_id})
        else:
            log_with_timestamp(f"✅ Cập nhật trạng thái đơn hàng: {app_trans_id} -> {new_status}")

        connection.commit()
        return jsonify({'return_code': 1, 'return_message': 'Nhận thành công'})

    except Exception as e:
        log_error("❌ Lỗi xử lý callback:", e)
        return jsonify({'return_code': 0, 'return_message': 'Lỗi xử lý callback', 'error': str(e)}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API kiểm tra trạng thái đơn hàng
@app.route('/order-status/<app_trans_id>', methods=['GET'])
def order_status(app_trans_id):
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT TABLE_NAME FROM information_schema.tables WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s", ('aitour', 'order'))
        if not cursor.fetchall():
            log_with_timestamp("⚠️ Bảng order không tồn tại trong database")
            return jsonify({'error': 'Bảng order không tồn tại trong database'}), 500

        cursor.execute("SELECT payment_status FROM `order` WHERE app_trans_id = %s", (app_trans_id,))
        rows = cursor.fetchall()

        if not rows:
            log_with_timestamp("⚠️ Không tìm thấy đơn hàng:", {'app_trans_id': app_trans_id})
            return jsonify({'error': 'Không tìm thấy đơn hàng'}), 404

        return jsonify({'status': rows[0]['payment_status']})

    except Exception as e:
        log_error("❌ Lỗi khi kiểm tra trạng thái đơn hàng:", e)
        return jsonify({'error': 'Lỗi hệ thống khi kiểm tra trạng thái đơn hàng', 'details': str(e)}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API cho Trang tổng quan (Dashboard)
@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT COUNT(*) AS total_tours FROM product")
        tours = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) AS total_bookings FROM `order`")
        bookings = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) AS total_customers FROM users")
        customers = cursor.fetchone()

        return jsonify({
            'total_tours': tours['total_tours'],
            'total_bookings': bookings['total_bookings'],
            'total_customers': customers['total_customers']
        })

    except Exception as e:
        log_error("❌ Lỗi khi lấy thống kê dashboard:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API cho danh sách khách hàng
@app.route('/api/customers', methods=['GET'])
def customers():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("""
            SELECT u.id, u.name, u.email, u.phone, o.order_name, o.payment_status
            FROM user u
            LEFT JOIN `order` o ON u.id = o.user_id
        """)
        customers = cursor.fetchall()

        for customer in customers:
            customer['booking_date'] = "2025-04-07"
            customer['departure_date'] = "2025-04-10"

        return jsonify(customers)

    except Exception as e:
        log_error("❌ Lỗi khi lấy danh sách khách hàng:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API cho danh sách đặt tour
@app.route('/api/bookings', methods=['GET'])
def bookings():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT id, order_name, payment_status FROM `order`")
        bookings = cursor.fetchall()
        return jsonify(bookings)

    except Exception as e:
        log_error("❌ Lỗi khi lấy danh sách đặt tour:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API cho báo cáo và thống kê
@app.route('/api/reports', methods=['GET'])
def reports():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT SUM(amount) AS total_revenue FROM `order` WHERE payment_status = 'SUCCESS'")
        revenue = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) AS total_bookings FROM `order`")
        bookings = cursor.fetchone()
        cursor.execute("""
            SELECT order_name, COUNT(*) AS booking_count
            FROM `order`
            GROUP BY order_name
            ORDER BY booking_count DESC
            LIMIT 1
        """)
        popular = cursor.fetchone()

        return jsonify({
            'total_revenue': revenue['total_revenue'] or 0,
            'total_bookings': bookings['total_bookings'],
            'popular_tour': popular['order_name'] if popular else "Không có dữ liệu"
        })

    except Exception as e:
        log_error("❌ Lỗi khi lấy báo cáo:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API cho danh sách tour
@app.route('/api/tours', methods=['GET'])
def api_tours():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT id, title, price, description, url, hotel, transport FROM product")
        tours = cursor.fetchall()
        return jsonify(tours)

    except Exception as e:
        log_error("❌ Lỗi khi lấy danh sách tour:", e)
        return jsonify({'error': str(e)}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API thêm tour mới
@app.route('/api/tours', methods=['POST'])
def add_tour():
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        data = request.get_json()
        title = data.get('title')
        price = data.get('price')
        description = data.get('description')
        url = data.get('url')
        hotel = data.get('hotel')
        transport = data.get('transport')

        if not all([title, price]):
            log_with_timestamp("⚠️ Thiếu thông tin tour:", data)
            return jsonify({'error': 'Tên tour và giá là bắt buộc'}), 400

        # Kiểm tra URL hợp lệ nếu có
        if url:
            try:
                response = requests.head(url, timeout=5, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                })
                if response.status_code != 200 or not response.headers.get('content-type', '').startswith('image/'):
                    log_with_timestamp("⚠️ URL ảnh không hợp lệ:", {'url': url})
                    return jsonify({'error': 'URL ảnh không hợp lệ'}), 400
            except requests.RequestException:
                log_with_timestamp("⚠️ URL ảnh không hợp lệ:", {'url': url})
                return jsonify({'error': 'URL ảnh không hợp lệ'}), 400

        cursor.execute(
            "INSERT INTO product (title, price, description, url, hotel, transport) VALUES (%s, %s, %s, %s, %s, %s)",
            (title, price, description, url, hotel, transport)
        )
        tour_id = cursor.lastrowid
        connection.commit()

        log_with_timestamp("✅ Thêm tour thành công:", {'id': tour_id, 'title': title})
        return jsonify({'message': 'Thêm tour thành công', 'tourId': tour_id}), 201

    except Exception as e:
        log_error("❌ Lỗi khi thêm tour:", e)
        return jsonify({'error': f'Lỗi hệ thống khi thêm tour: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API sửa tour
@app.route('/api/tours/<int:tour_id>', methods=['PUT'])
def update_tour(tour_id):
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        data = request.get_json()
        title = data.get('title')
        price = data.get('price')
        description = data.get('description')
        url = data.get('url')
        hotel = data.get('hotel')
        transport = data.get('transport')

        if not all([title, price]):
            log_with_timestamp("⚠️ Thiếu thông tin tour:", data)
            return jsonify({'error': 'Tên tour và giá là bắt buộc'}), 400

        if url:
            try:
                response = requests.head(url, timeout=5, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                })
                if response.status_code != 200 or not response.headers.get('content-type', '').startswith('image/'):
                    log_with_timestamp("⚠️ URL ảnh không hợp lệ:", {'url': url})
                    return jsonify({'error': 'URL ảnh không hợp lệ'}), 400
            except requests.RequestException:
                log_with_timestamp("⚠️ URL ảnh không hợp lệ:", {'url': url})
                return jsonify({'error': 'URL ảnh không hợp lệ'}), 400

        cursor.execute("SELECT * FROM product WHERE id = %s", (tour_id,))
        if not cursor.fetchall():
            log_with_timestamp("⚠️ Không tìm thấy tour:", {'tourId': tour_id})
            return jsonify({'error': 'Tour không tồn tại'}), 404

        cursor.execute(
            "UPDATE product SET title = %s, price = %s, description = %s, url = %s, hotel = %s, transport = %s WHERE id = %s",
            (title, price, description, url, hotel, transport, tour_id)
        )
        connection.commit()

        log_with_timestamp("✅ Sửa tour thành công:", {'tourId': tour_id, 'title': title})
        return jsonify({'message': 'Sửa tour thành công'}), 200

    except Exception as e:
        log_error("❌ Lỗi khi sửa tour:", e)
        return jsonify({'error': f'Lỗi hệ thống khi sửa tour: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API xóa tour
@app.route('/api/tours/<int:tour_id>', methods=['DELETE'])
def delete_tour(tour_id):
    connection = None
    try:
        connection = connection_pool.get_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute("SELECT * FROM product WHERE id = %s", (tour_id,))
        if not cursor.fetchall():
            log_with_timestamp("⚠️ Không tìm thấy tour:", {'tourId': tour_id})
            return jsonify({'error': 'Tour không tồn tại'}), 404

        cursor.execute("DELETE FROM product WHERE id = %s", (tour_id,))
        connection.commit()

        log_with_timestamp("✅ Xóa tour thành công:", {'tourId': tour_id})
        return jsonify({'message': 'Xóa tour thành công'}), 200

    except Exception as e:
        log_error("❌ Lỗi khi xóa tour:", e)
        return jsonify({'error': f'Lỗi hệ thống khi xóa tour: {str(e)}'}), 500
    finally:
        if connection:
            connection.close()
            log_with_timestamp("🔌 Đã giải phóng kết nối MySQL")

# API xử lý tin nhắn chat
@app.route('/chat', methods=['POST', 'OPTIONS'])
def chat_endpoint():
    if request.method == 'OPTIONS':  # Xử lý yêu cầu OPTIONS cho CORS
        return '', 200

    data = request.get_json()
    if 'message' not in data:
        return jsonify({"error": "Missing 'message' parameter"}), 400

    user_message = data['message']
    log_with_timestamp("📩 Nhận tin nhắn từ chatbox:", {'message': user_message})

    try:
        bot_response = interact_with_chatbot(user_message)
        log_with_timestamp("📤 Phản hồi từ chatbot:", bot_response)
        return jsonify({"response": bot_response['text'], "image": bot_response['image']})
    except Exception as e:
        log_error("❌ Lỗi khi xử lý tin nhắn chat:", e)
        return jsonify({"error": f"Internal Server Error: {e}"}), 500

def interact_with_chatbot(question):
    allowed_topics = [
        "du lịch", "travel", "Vietnam", "Việt Nam", "địa điểm du lịch", 
        "ẩm thực", "đặc sản", "homestay", "phương tiện đi lại", "visa", 
        "đi chơi", "tour", "thời tiết", "khách sạn", "vé máy bay"
    ]
    
    question_lower = question.lower()
    
    if not any(topic in question_lower for topic in allowed_topics):
        return {"text": "Xin lỗi, tôi chỉ có thể trả lời về chủ đề du lịch tại Việt Nam. Bạn có thể hỏi về các địa điểm nổi tiếng, ẩm thực, phương tiện di chuyển,...", "image": None}

    # Tìm kiếm địa điểm trong câu hỏi
    connection = connection_pool.get_connection()
    cursor = connection.cursor(dictionary=True)
    image_url = None

    # Tìm hình ảnh liên quan đến địa điểm
    if "đà lạt" in question_lower:
        cursor.execute("SELECT url FROM product WHERE title LIKE '%Đà Lạt%' LIMIT 1")
        result = cursor.fetchone()
        image_url = result['url'] if result and result['url'] else None
        log_with_timestamp("🔍 Tìm URL hình ảnh cho Đà Lạt:", {'url': image_url})
    elif "hạ long" in question_lower:
        cursor.execute("SELECT url FROM product WHERE title LIKE '%Hạ Long%' LIMIT 1")
        result = cursor.fetchone()
        image_url = result['url'] if result and result['url'] else None
        log_with_timestamp("🔍 Tìm URL hình ảnh cho Hạ Long:", {'url': image_url})
    elif "sa pa" in question_lower:
        cursor.execute("SELECT url FROM product WHERE title LIKE '%Sa Pa%' LIMIT 1")
        result = cursor.fetchone()
        image_url = result['url'] if result and result['url'] else None
        log_with_timestamp("🔍 Tìm URL hình ảnh cho Sa Pa:", {'url': image_url})

    connection.close()

    response = chat.send_message(f"Trả lời câu hỏi sau bằng tiếng Việt:\n{question}")
    cleaned_response = response.text.replace('*', '')
    
    return {"text": cleaned_response, "image": image_url}

# Chạy server Flask trên cổng 5000
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)