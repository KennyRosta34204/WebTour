import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS  # Thêm thư viện Flask-CORS


app = Flask(__name__)
CORS(app)  # Kích hoạt CORS

API_KEY = 'AIzaSyASM1P-ryTTp8s6Mr_Cz8NtnMGobeVvMr8'  # Thay thế bằng API key hợp lệ của bạn
genai.configure(api_key=API_KEY)

model = genai.GenerativeModel('gemini-1.5-pro')
chat = model.start_chat(history=[])

@app.route('/chat', methods=['POST', 'OPTIONS'])  # Thêm phương thức OPTIONS
def chat_endpoint():
    if request.method == 'OPTIONS':  # Xử lý yêu cầu OPTIONS cho CORS
        return '', 200

    data = request.get_json()
    if 'message' not in data:
        return jsonify({"error": "Missing 'message' parameter"}), 400

    user_message = data['message']

    try:
        bot_response = interact_with_chatbot(user_message)
        return jsonify({"response": bot_response})
    except Exception as e:  # Xử lý các lỗi chung
        return jsonify({"error": f"Internal Server Error: {e}"}), 500


def interact_with_chatbot(question):
    # Danh sách chủ đề hợp lệ liên quan đến du lịch Việt Nam
    allowed_topics = [
        "du lịch", "travel", "Vietnam", "Việt Nam", "địa điểm du lịch", 
        "ẩm thực", "đặc sản", "homestay", "phương tiện đi lại", "visa", 
        "đi chơi", "tour", "thời tiết", "khách sạn", "vé máy bay"
    ]
    
    # Chuyển câu hỏi về chữ thường để kiểm tra chủ đề
    question_lower = question.lower()
    
    if not any(topic in question_lower for topic in allowed_topics):
        return "Xin lỗi, tôi chỉ có thể trả lời về chủ đề du lịch tại Việt Nam. Bạn có thể hỏi về các địa điểm nổi tiếng, ẩm thực, phương tiện di chuyển,..."

    # Nếu câu hỏi hợp lệ, gửi đến mô hình AI với yêu cầu trả lời bằng tiếng Việt
    response = chat.send_message(f"Trả lời câu hỏi sau bằng tiếng Việt:\n{question}")
    
    cleaned_response = response.text.replace('*', '')  # Xóa ký tự không cần thiết
    return cleaned_response



if __name__ == '__main__':
    app.run(debug=True)
