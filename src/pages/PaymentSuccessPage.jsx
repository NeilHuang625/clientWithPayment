import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { verifyPayment } from "../services/apiPayment";
import { getOrderByPaymentIntentId } from "../services/apiOrder";
import { AuthContext } from "../contexts/AuthProvider";
import OrderContext from "../contexts/OrderProvider";
import { formatCurrency } from "../utils";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiLoader,
  FiShoppingBag,
  FiHome,
} from "react-icons/fi";
import { getOrderTotal } from "../utils";

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("loading"); // loading, verified, polling, success, error
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const { jwt, isAuthenticated, user } = useContext(AuthContext);
  const { setOrders } = useContext(OrderContext);
  const navigate = useNavigate();

  useEffect(() => {
    let pollingTimeout;
    let pollingAttempts = 0;
    const maxPollingAttempts = 8; // 约8秒后超时

    const cleanupPolling = () => {
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
    };

    const pollForOrder = async (paymentIntentId) => {
      try {
        pollingAttempts++;

        // 更新进度条
        setProgressPercent(
          Math.min((pollingAttempts / maxPollingAttempts) * 100, 95),
        );

        const orderResult = await getOrderByPaymentIntentId(
          paymentIntentId,
          jwt,
        );

        if (orderResult.success && orderResult.data) {
          // 订单已找到
          setStatus("success");
          setProgressPercent(100);
          setOrder(orderResult.data);
          setOrders((prevOrders) => {
            // 检查订单是否已经存在于列表中
            const exists = prevOrders.some(
              (prevOrder) => prevOrder.id === orderResult.data.id,
            );
            return exists ? prevOrders : [...prevOrders, orderResult.data];
          });

          return;
        }

        // 如果达到最大尝试次数，终止轮询
        if (pollingAttempts >= maxPollingAttempts) {
          setStatus("error");
          setMessage(
            "We've received your payment, but your order details are still processing. Please check your orders page in a moment.",
          );
          return;
        }

        // 继续轮询
        pollingTimeout = setTimeout(() => pollForOrder(paymentIntentId), 1000);
      } catch (error) {
        console.error("Error polling for order:", error);
        setStatus("error");
        setMessage(
          "We've received your payment, but there was an issue retrieving your order details.",
        );
      }
    };

    const verifySession = async () => {
      if (!isAuthenticated || !sessionId) {
        setStatus("error");
        setMessage(
          isAuthenticated
            ? "Invalid session ID. Please check your orders page for confirmation."
            : "You need to be logged in to view your payment status.",
        );
        return;
      }

      try {
        // 第一步：验证支付
        setStatus("loading");
        const verificationResult = await verifyPayment(sessionId, jwt);

        if (!verificationResult.success) {
          setStatus("error");
          setMessage(
            "Payment verification failed. If you've been charged, please contact customer support.",
          );
          return;
        }

        // 支付已验证，现在开始轮询订单
        setStatus("polling");
        setMessage(
          "Your payment was successful! We're preparing your order...",
        );

        // 开始轮询以获取订单
        const paymentIntentId = verificationResult.data.paymentId;
        pollingTimeout = setTimeout(() => pollForOrder(paymentIntentId), 1000);
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus("error");
        setMessage(
          "An error occurred while processing your payment. If you've been charged, please contact customer support.",
        );
      }
    };

    verifySession();

    // 组件卸载时清理轮询
    return cleanupPolling;
  }, [sessionId, jwt, isAuthenticated, setOrders, navigate, user]);

  // 渲染加载状态
  if (status === "loading") {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center">
        <div className="mb-6 h-16 w-16 animate-spin text-amber-500">
          <FiLoader className="h-full w-full" />
        </div>
        <h2 className="mb-2 text-xl font-semibold">Verifying Your Payment</h2>
        <p className="text-gray-600">
          Please wait while we confirm your payment...
        </p>
      </div>
    );
  }

  // 渲染轮询状态（等待订单创建）
  if (status === "polling") {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center">
        <div className="mb-6 text-7xl text-green-500">
          <FiCheckCircle />
        </div>
        <h2 className="mb-2 text-2xl font-semibold">Payment Successful!</h2>
        <p className="mb-4 text-center text-gray-600">{message}</p>

        {/* 进度条 */}
        <div className="mb-8 h-2 w-64 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-amber-500 transition-all duration-500 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        <div className="mt-2 text-sm text-gray-500">
          We&apos;re processing your order. You&apos;ll be redirected shortly...
        </div>
      </div>
    );
  }

  // 渲染成功状态
  if (status === "success" && order) {
    return (
      <div className="container mx-auto my-12 max-w-2xl px-4">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="bg-green-50 p-6 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-500">
              <FiCheckCircle className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Payment Successful!</h2>
            <p className="text-gray-600">
              Your order has been placed successfully
            </p>
          </div>

          <div className="border-t border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold">Order Details</h3>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Order Number:</span>
                <span className="font-medium">{order.id}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Date:</span>
                <span className="font-medium">
                  {new Date(order.createdDate).toLocaleDateString("en-NZ", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total Amount:</span>
                <span className="font-medium">
                  {formatCurrency(getOrderTotal(order))}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Payment Status:</span>
                <span className="font-medium text-green-500">Paid</span>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold">Order Summary</h3>
              <div className="max-h-48 overflow-y-auto">
                {order.orderItems.map(
                  (item) => (
                    console.log(item),
                    (
                      <div key={item.cakeId} className="mb-3 flex items-center">
                        {item.cakeImage && (
                          <img
                            src={item.cakeImage}
                            alt={item.cakeName}
                            className="mr-3 h-12 w-12 rounded-md object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">{item.cakeName}</div>
                          <div className="text-xs text-gray-500">
                            Size: {item.cakeSize} | Quantity: {item.quantity}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(item.quantity * item.cakePrice)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrency(item.cakePrice)} each
                          </div>
                        </div>
                      </div>
                    )
                  ),
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-2 pt-4 text-center sm:flex-row sm:space-y-0 sm:space-x-3">
              <Link
                to="/orders"
                className="inline-flex items-center justify-center rounded-lg border border-amber-500 px-4 py-2.5 text-sm font-medium text-amber-600 transition hover:bg-amber-50 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none"
              >
                <FiShoppingBag className="mr-2 h-4 w-4" />
                View All Orders
              </Link>
              <Link
                to="/cakes"
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none"
              >
                <FiHome className="mr-2 h-4 w-4" />
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (status === "error") {
    return (
      <div className="container mx-auto my-12 max-w-2xl px-4">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="bg-yellow-50 p-6 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-500">
              <FiAlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Payment Processed</h2>
            <p className="text-gray-600">{message}</p>
          </div>

          <div className="border-t border-gray-200 p-6">
            <div className="flex flex-col space-y-2 pt-4 text-center sm:flex-row sm:space-y-0 sm:space-x-3">
              <Link
                to="/orders"
                className="inline-flex items-center justify-center rounded-lg border border-amber-500 px-4 py-2.5 text-sm font-medium text-amber-600 transition hover:bg-amber-50 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none"
              >
                <FiShoppingBag className="mr-2 h-4 w-4" />
                View My Orders
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none"
              >
                <FiHome className="mr-2 h-4 w-4" />
                Continue Shopping
              </Link>
            </div>

            <div className="mt-6 text-center text-sm text-gray-500">
              If you have any questions or concerns, please contact our customer
              support.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 默认回退渲染
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center">
      <div className="mb-4 text-5xl">🎂</div>
      <h1 className="mb-2 text-2xl font-bold">Processing your order...</h1>
      <p className="text-gray-600">
        Please wait while we prepare your delicious cake!
      </p>
    </div>
  );
};

export default PaymentSuccessPage;
