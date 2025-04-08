const BASE_URL = "http://localhost:5056/api";

export const createPaymentSession = async (orderData, jwt) => {
  try {
    const res = await fetch(`${BASE_URL}/payment/create-checkout-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!res.ok) {
      const { message } = await res.json();
      return { success: false, message };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error:", error.message);
    return { success: false, message: "Failed to create payment session" };
  }
};

export const verifyPayment = async (sessionId, jwt) => {
  try {
    const res = await fetch(`${BASE_URL}/payment/verify/${sessionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    if (!res.ok) {
      const { message } = await res.json();
      return { success: false, message };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error:", error.message);
    return { success: false, message: "Failed to verify payment" };
  }
};
