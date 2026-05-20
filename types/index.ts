export interface Product {
  id: string
  name: string
  description: string
  category: 'jerky' | 'steaks' | 'smoked' | 'non_smoked' | 'boards'
  subcategory: string | null
  price: number
  sold_as: 'per_lb' | 'per_piece' | 'per_pack' | 'per_pan' | 'per_board'
  pack_size: number | null
  flavors: string[] | null
  weight_options: number[] | null
  size_label: string | null
  stock_quantity: number
  jerky_flavor_stock?: Record<string, number> | null
  jerky_flavor_thresholds?: Record<string, number> | null
  low_stock_threshold: number
  is_in_stock: boolean
  is_featured_purim: boolean
  image_url: string | null
  created_at: string
}

export interface CartItem {
  id: string
  product_id: string
  product_name: string
  category: string
  price: number
  quantity: number
  selected_flavor: string | null
  selected_weight: number | null
  selected_size: string | null
  unit_price: number
  line_total: number
  image_url: string | null
}

export interface BossLine {
  product_id: string
  product_name: string
  category: string
  quantity: number
  selected_flavor: string | null
  selected_weight: number | null
  selected_size: string | null
  unit_price: number
  line_total: number
}

export interface Customer {
  id: string
  full_name: string
  email: string
  phone: string | null
  stripe_customer_id: string | null
  tags: string[]
  admin_notes: string | null
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  status: 'pending' | 'approved' | 'ready_for_pickup' | 'out_for_delivery' | 'delivered' | 'cancelled'
  order_type: 'delivery' | 'pickup'
  delivery_area_id: string | null
  delivery_address: string | null
  delivery_date: string | null
  recipient_name: string | null
  recipient_phone: string | null
  buyer_name: string | null
  buyer_email: string | null
  buyer_phone: string | null
  subtotal: number
  delivery_fee: number
  custom_adjustment: number
  custom_adjustment_note: string | null
  total: number
  order_notes: string | null
  gift_message: string | null
  stripe_payment_intent_id: string | null
  is_bulk_order: boolean
  created_at: string
  approved_at: string | null
  delivered_at: string | null
  customers?: Customer
  order_items?: OrderItem[]
  delivery_areas?: { name: string } | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number
  selected_flavor: string | null
  selected_weight: number | null
  selected_size: string | null
  unit_price: number
  line_total: number
}

export interface DeliveryArea {
  id: string
  name: string
  delivery_fee: number
  is_backend_only: boolean
  is_active: boolean
}
