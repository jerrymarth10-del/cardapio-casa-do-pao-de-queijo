import OrderTracker from '@/components/order-tracker';
import './tracking.css';

export const metadata = {
  title: 'Acompanhar pedido'
};

export default async function OrderPage({ params }) {
  const { token } = await params;
  return <OrderTracker token={token} />;
}
