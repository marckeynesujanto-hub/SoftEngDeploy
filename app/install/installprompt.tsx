'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // iOS detection
    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())
    setIsIOS(ios)

    if (ios) {
      const dismissed = sessionStorage.getItem('pwa-ios-dismissed')
      if (!dismissed) setShowBanner(true)
      return
    }

    // Android / Desktop
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      const dismissed = sessionStorage.getItem('pwa-dismissed')
      if (!dismissed) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setIsInstalled(true)
      setShowBanner(false)
    }
  }

  const dismiss = () => {
    sessionStorage.setItem(isIOS ? 'pwa-ios-dismissed' : 'pwa-dismissed', '1')
    setShowBanner(false)
  }

  if (!showBanner || isInstalled) return null

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-4 pt-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-start gap-3">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          ♻️
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-sm">Install TrashAway</p>
          {isIOS ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Tap <strong>Share</strong> lalu pilih <strong>"Add to Home Screen"</strong> untuk install
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Tambahkan ke layar utama untuk akses cepat
            </p>
          )}
          {!isIOS && (
            <button
              onClick={handleInstall}
              className="mt-2 bg-green-600 text-white text-xs px-4 py-1.5 rounded-lg font-semibold"
            >
              Install Sekarang
            </button>
          )}
        </div>
        <button onClick={dismiss} className="text-gray-400 text-lg leading-none">✕</button>
      </div>
    </div>
  )
}