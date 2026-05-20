import type { Metadata, Viewport } from 'next'
import BossClientLayout from '@/components/BossClientLayout'

export const metadata: Metadata = {
  title: 'Smoked Style Boss',
  description: 'Smoked Style order management',
  manifest: '/manifest.json',
  icons: {
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'SS Boss',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#c85c2d',
}

export default function BossLayout({ children }: { children: React.ReactNode }) {
  return <BossClientLayout>{children}</BossClientLayout>
}
