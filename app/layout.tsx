import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Smoked Style — Premium Smoked Meats',
  description: 'Kosher premium smoked meats. Delivery & pickup available.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
