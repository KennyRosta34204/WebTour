import React from "react";

const PaymentButton = () => {
    const createOrder = async () => {
        try {
            const response = await fetch("http://localhost:5000/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: 10000 }), // Số tiền thanh toán
            });

            const result = await response.json();
            if (result.zp_trans_token) {
                window.location.href = `https://sandbox.zalopay.vn/app/web/${result.zp_trans_token}`;
            } else {
                alert("Tạo đơn hàng thất bại");
            }
        } catch (error) {
            console.error("Lỗi khi tạo đơn hàng:", error);
        }
    };

    return <button onClick={createOrder}>Thanh Toán với ZaloPay</button>;
};

export default PaymentButton;
