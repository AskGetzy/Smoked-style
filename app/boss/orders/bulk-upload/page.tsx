'use client'

import Link from 'next/link'
import BulkOrderUpload from '@/components/BulkOrderUpload'

export default function BossBulkUploadPage() {
  return (
    <div className="space-y-4 p-4 pb-24">
      <Link href="/boss/orders" className="text-sm font-semibold text-gray-500">
        &larr; Back to Orders
      </Link>
      <p className="text-sm text-gray-500">
        Upload a spreadsheet to create many orders at once — for events, catering, or large batches.
      </p>
      <BulkOrderUpload variant="boss" />
    </div>
  )
}
