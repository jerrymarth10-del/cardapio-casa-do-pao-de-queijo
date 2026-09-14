import OrderTracker from '@/components/order-tracker';

export const metadata = {
  title: 'Acompanhar pedido'
};

export default async function OrderPage({ params }) {
  const { token } = await params;
  return <OrderTracker token={token} />;
}
