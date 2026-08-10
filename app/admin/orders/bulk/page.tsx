'use client'

import AdminLayout from '@/components/AdminLayout'
import BulkOrderBuilder from '@/components/BulkOrderBuilder'

export default function AdminBulkOrderPage() {
  return (
    <AdminLayout>
      <BulkOrderBuilder variant="admin" />
    </AdminLayout>
  )
}
