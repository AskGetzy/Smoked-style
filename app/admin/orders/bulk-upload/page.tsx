'use client'

import Link from 'next/link'
import AdminLayout from '@/components/AdminLayout'
import BulkOrderUpload from '@/components/BulkOrderUpload'

export default function AdminBulkUploadPage() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back to Orders
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--navy)' }}>Bulk Order Upload</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload a spreadsheet to create many orders at once — for events, catering, or large batches.
          </p>
        </div>
        <BulkOrderUpload variant="admin" />
      </div>
    </AdminLayout>
  )
}
