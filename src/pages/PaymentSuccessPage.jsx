// Handles the payment success page after a user completes a stripe payment.

import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyPayment } from "../services/apiPayment";
import { AuthContext } from "../contexts/AuthProvider";
import OrderContext from "../contexts/OrderProvider";
import { getOrderByPaymentIntentId } from "../services/apiOrder";

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const { jwt, isAuthenticated } = useContext(AuthContext);
  const { setOrders } = useContext(OrderContext);
  const navigate = useNavigate();

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (!isAuthenticated || !sessionId) {
        setError("Authentication required or invalid session");
        setIsLoading(false);
        return;
      }

      try {
        // 验证支付
        const verificationResult = await verifyPayment(sessionId, jwt);

        if (!verificationResult.success) {
          setError("Payment verification failed");
          setIsLoading(false);
          return;
        }

        // 支付已验证，现在获取订单（由webhook创建）
        // const paymentId = verificationResult.data.paymentId;

        // // 尝试获取订单（可能需要轮询，因为webhook处理可能需要一些时间）
        // let orderResult = null;
        // let retries = 0;
        // const maxRetries = 5;

        // while (!orderResult && retries < maxRetries) {
        //   const result = await getOrderByPaymentIntentId(paymentId, jwt);
        //   if (result.success && result.data) {
        //     orderResult = result;
        //     break;
        //   }

        //   // 等待1秒后重试
        //   await new Promise((resolve) => setTimeout(resolve, 1000));
        //   retries++;
        // }

        // if (orderResult && orderResult.success) {
        //   const createdOrder = orderResult.data;
        //   setOrder(createdOrder);
        //   setOrders((prevOrders) => [...prevOrders, createdOrder]);

        // 延迟后跳转到订单详情页
        // setTimeout(() => {
        //   navigate(`/orders/${createdOrder.id}`);
        // }, 2000);
        // } else {
        //   // 如果订单尚未创建，显示处理中的消息
        //   setIsLoading(false);
        //   setError(
        //     "Your order is being processed. Please check your orders page in a moment.",
        //   );
        // }
      } catch (err) {
        setError("An error occurred while processing your payment");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [sessionId, jwt, isAuthenticated, setOrders, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        <p className="mt-4 text-lg">Verifying your payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center">
        <div className="mb-4 text-5xl">😕</div>
        <h1 className="mb-2 text-2xl font-bold">Payment verification</h1>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => navigate("/orders")}
          className="mt-6 rounded-lg bg-amber-500 px-6 py-2 text-white hover:bg-amber-600"
        >
          View My Orders
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[70vh] flex-col items-center justify-center">
      <div className="mb-4 text-5xl">🎉</div>
      <h1 className="mb-2 text-2xl font-bold">Payment Successful!</h1>
      <p className="text-gray-600">Your order has been placed successfully.</p>
      {order ? (
        <p className="mt-2 text-amber-500">Order #{order.id}</p>
      ) : (
        <p className="mt-2 text-sm text-gray-500">Processing your order...</p>
      )}
      <p className="mt-2 text-sm text-gray-500">
        You will be redirected to your order details...
      </p>
    </div>
  );
};

export default PaymentSuccessPage;
