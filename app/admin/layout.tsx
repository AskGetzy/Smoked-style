import { LanguageProvider } from '@/lib/language-context'

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
