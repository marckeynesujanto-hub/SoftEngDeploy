import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'Waste Collection App',
  description: 'Aplikasi layanan jemput sampah berlangganan dengan gamifikasi dan produk daur ulang',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}