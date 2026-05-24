import OrderStatusDetailView from '@/components/order-status/OrderStatusDetailView'
import { OrderStatusPageShell } from '@/components/order-status/OrderStatusShell'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

type Props = {
  params: { orderNumber: string }
}

export default function OrderStatusDetailPage({ params }: Props) {
  const orderNumber = decodeURIComponent(params.orderNumber)

  return (
    <OrderStatusPageShell backHref="/order-status">
      <OrderStatusDetailView orderNumber={orderNumber} />
    </OrderStatusPageShell>
  )
}
