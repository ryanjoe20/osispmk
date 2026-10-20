'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { Clock, Award, CheckCircle2, User, X, BarChart3, ArrowRight, Users } from 'lucide-react'
import { supabaseClient } from '@/lib/auth'

interface WinnerAnnouncementProps {
  announcementTime: string | null
  winnerId?: string | null
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}

interface WinnerInfo {
  id: string
  candidate_number: number
  ketua_name: string
  wakil_name: string
  ketua_class: string
  wakil_class: string
  ketua_photo_url?: string
  wakil_photo_url?: string
  category?: 'osis' | 'mpk'
  voteCount?: number
  percentage?: number
  totalVotes?: number
}

export default function WinnerAnnouncement({ announcementTime, winnerId }: WinnerAnnouncementProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)
  const [showWinner, setShowWinner] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [osisWinner, setOsisWinner] = useState<WinnerInfo | null>(null)
  const [mpkWinner, setMpkWinner] = useState<WinnerInfo | null>(null)
  const [activeModalTab, setActiveModalTab] = useState<'osis' | 'mpk'>('osis')
  const [isAnnouncementActive, setIsAnnouncementActive] = useState(true)

  useEffect(() => {
    if (!announcementTime) {
      setIsAnnouncementActive(false)
      return
    }

    checkAnnouncementStatus()

    const checkTime = () => {
      const now = new Date().getTime()
      const announcementDate = new Date(announcementTime).getTime()
      const distance = announcementDate - now

      if (distance <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true
        })
        setShowWinner(true)
        fetchWinners()
        return true
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24))
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        isExpired: false
      })
      return false
    }

    // Run immediate check
    const isAlreadyExpired = checkTime()
    if (isAlreadyExpired) {
      return
    }

    const timer = setInterval(() => {
      const expired = checkTime()
      if (expired) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [announcementTime, winnerId])

  async function checkAnnouncementStatus() {
    try {
      const { data: candidates, error: candidatesError } = await supabaseClient
        .from('candidates')
        .select('id')
        .limit(1)

      if (candidatesError) throw candidatesError

      const { data: allSettings, error: settingsError } = await supabaseClient
        .from('settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (settingsError) throw settingsError

      if (!candidates?.length || !allSettings?.length || !allSettings[0].announcement_time) {
        setIsAnnouncementActive(false)
        setShowWinner(false)
        return
      }

      setIsAnnouncementActive(true)
    } catch (error) {
      console.error('Error checking announcement status:', error)
      setIsAnnouncementActive(false)
    }
  }

  async function fetchWinners() {
    try {
      // 1. Dapatkan semua kandidat
      const { data: candidatesData, error: candError } = await supabaseClient
        .from('candidates')
        .select('*')
        .order('candidate_number')

      if (candError) throw candError

      // 2. Ambil data semua suara
      const { data: votesData, error: voteError } = await supabaseClient
        .from('votes')
        .select('candidate_id, category')

      if (voteError) throw voteError

      const voteCounts: Record<string, number> = {}
      votesData?.forEach(v => {
        if (v.candidate_id) {
          voteCounts[v.candidate_id] = (voteCounts[v.candidate_id] || 0) + 1
        }
      })

      // Pisahkan kandidat berdasarkan category (default: 'osis')
      const osisCandidates = (candidatesData || []).filter(c => (c.category || 'osis') === 'osis')
      const mpkCandidates = (candidatesData || []).filter(c => c.category === 'mpk')

      const totalOsisVotes = osisCandidates.reduce((sum, c) => sum + (voteCounts[c.id] || 0), 0)
      const totalMpkVotes = mpkCandidates.reduce((sum, c) => sum + (voteCounts[c.id] || 0), 0)

      // Cari pemenang OSIS (suara terbanyak atau fallback ke paslon pertama)
      let winningOsis: any = null
      if (osisCandidates.length > 0) {
        const sortedOsis = [...osisCandidates].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0))
        winningOsis = sortedOsis[0]
      }

      // Cari pemenang MPK (suara terbanyak atau fallback ke paslon pertama)
      let winningMpk: any = null
      if (mpkCandidates.length > 0) {
        const sortedMpk = [...mpkCandidates].sort((a, b) => (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0))
        winningMpk = sortedMpk[0]
      }

      let hasAnyWinner = false

      if (winningOsis) {
        const votes = voteCounts[winningOsis.id] || 0
        const percentage = totalOsisVotes > 0 ? Number(((votes / totalOsisVotes) * 100).toFixed(1)) : 0
        setOsisWinner({
          ...winningOsis,
          voteCount: votes,
          percentage,
          totalVotes: totalOsisVotes,
          category: 'osis'
        })
        hasAnyWinner = true
      }

      if (winningMpk) {
        const votes = voteCounts[winningMpk.id] || 0
        const percentage = totalMpkVotes > 0 ? Number(((votes / totalMpkVotes) * 100).toFixed(1)) : 0
        setMpkWinner({
          ...winningMpk,
          voteCount: votes,
          percentage,
          totalVotes: totalMpkVotes,
          category: 'mpk'
        })
        hasAnyWinner = true
      }

      if (hasAnyWinner) {
        setShowWinner(true)
        setIsModalOpen(true)
      } else {
        setIsAnnouncementActive(false)
      }
    } catch (error) {
      console.error('Error fetching winners:', error)
      setIsAnnouncementActive(false)
    }
  }

  function getCurrentPeriod() {
    const currentYear = new Date().getFullYear()
    return `${currentYear}/${currentYear + 1}`
  }

  function scrollToResults() {
    setIsModalOpen(false)
    const el = document.getElementById('hasil-voting')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  if (!isAnnouncementActive) {
    return null
  }

  const currentDisplayWinner = activeModalTab === 'osis' ? osisWinner : mpkWinner
  const winnerTitle = activeModalTab === 'osis' ? 'Ketua & Wakil Ketua OSIS' : 'Ketua & Wakil Ketua MPK'
  const badgeTitle = activeModalTab === 'osis' ? 'Pengumuman Resmi Pemilu OSIS' : 'Pengumuman Resmi Pemilu MPK'

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* 1. KONTEN TAMPILAN DALAM HALAMAN (Countdown atau Banner Pengumuman) */}
      <AnimatePresence mode="wait">
        {!showWinner ? (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100/70">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    Hitung Mundur Pengumuman Pemenang
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Hasil resmi dan penetapan paslon terpilih OSIS & MPK akan diumumkan serentak
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200/80 w-fit">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Periode Pemilihan {getCurrentPeriod()}
              </div>
            </div>

            <div className="pt-6">
              {timeRemaining ? (
                <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-xl mx-auto text-center">
                  {[
                    { label: 'Hari', value: timeRemaining.days },
                    { label: 'Jam', value: timeRemaining.hours },
                    { label: 'Menit', value: timeRemaining.minutes },
                    { label: 'Detik', value: timeRemaining.seconds }
                  ].map((unit, index) => (
                    <div 
                      key={index}
                      className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3 sm:p-4"
                    >
                      <span className="block text-2xl sm:text-4xl font-bold text-slate-900 tabular-nums">
                        {String(unit.value).padStart(2, '0')}
                      </span>
                      <span className="text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider mt-1 block">
                        {unit.label}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  Menyiapkan waktu pengumuman...
                </div>
              )}
            </div>
          </motion.div>
        ) : (osisWinner || mpkWinner) ? (
          <motion.div
            key="winner-banner"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border-2 border-blue-600/30 shadow-sm p-6 sm:p-8 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Hasil Resmi Pemilu Telah Ditetapkan
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                    Pengumuman Pemenang Terpilih OSIS & MPK
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {osisWinner && `OSIS: Paslon ${String(osisWinner.candidate_number).padStart(2, '0')}`}
                    {osisWinner && mpkWinner && ' • '}
                    {mpkWinner && `MPK: Paslon ${String(mpkWinner.candidate_number).padStart(2, '0')}`}
                    {' '}Periode {getCurrentPeriod()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs"
                >
                  <Award className="w-4 h-4" />
                  <span>Buka Pop-up Pengumuman</span>
                </button>
                <button
                  type="button"
                  onClick={scrollToResults}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-all border border-slate-200/80"
                >
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <span>Lihat Hasil Suara</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 2. POP-UP MODAL SELEBRASI PEMENANG (Muncul ketika waktu pengumuman selesai) */}
      <AnimatePresence>
        {showWinner && isModalOpen && (osisWinner || mpkWinner) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop Gelap Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
            />

            {/* Efek Confetti */}
            <Confetti
              numberOfPieces={180}
              recycle={false}
              gravity={0.18}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 60,
                pointerEvents: 'none'
              }}
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative z-50 w-full max-w-xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8 text-center my-auto overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="winner-modal-title"
            >
              {/* Tombol Tutup X */}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                aria-label="Tutup Pengumuman"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Badge Proklamasi Pemenang */}
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
                <Award className="w-9 h-9" />
              </div>

              {/* Tab Switcher OSIS & MPK (jika keduanya ada) */}
              {osisWinner && mpkWinner && (
                <div className="inline-flex p-1 bg-slate-100 rounded-2xl mb-4 border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('osis')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeModalTab === 'osis'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pemenang OSIS
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('mpk')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeModalTab === 'mpk'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pemenang MPK
                  </button>
                </div>
              )}

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {badgeTitle}
              </div>

              <h2 id="winner-modal-title" className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Selamat Kepada Paslon Terpilih!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                Ditetapkan sebagai {winnerTitle} Periode {getCurrentPeriod()}
              </p>

              {currentDisplayWinner ? (
                <>
                  {/* Nomor Paslon Badge */}
                  <div className="mt-4 mb-5">
                    <span className={`inline-block font-mono font-black text-sm px-3.5 py-1 rounded-full text-white ${
                      activeModalTab === 'mpk' ? 'bg-purple-600' : 'bg-slate-900'
                    }`}>
                      PASLON {String(currentDisplayWinner.candidate_number).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Dual Portrait Foto Paslon */}
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-6">
                    {/* Ketua */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-center">
                      <div className="aspect-[3/4] relative w-full rounded-xl overflow-hidden bg-slate-200 mb-2.5 border border-slate-300/60 shadow-xs">
                        {currentDisplayWinner.ketua_photo_url ? (
                          <Image
                            src={currentDisplayWinner.ketua_photo_url}
                            alt={currentDisplayWinner.ketua_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <User className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                        activeModalTab === 'mpk' ? 'text-purple-700' : 'text-blue-700'
                      }`}>
                        {activeModalTab === 'mpk' ? 'Ketua MPK' : 'Ketua OSIS'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mt-0.5">
                        {currentDisplayWinner.ketua_name}
                      </h3>
                      <p className="text-[11px] text-slate-500">{currentDisplayWinner.ketua_class}</p>
                    </div>

                    {/* Wakil */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-center">
                      <div className="aspect-[3/4] relative w-full rounded-xl overflow-hidden bg-slate-200 mb-2.5 border border-slate-300/60 shadow-xs">
                        {currentDisplayWinner.wakil_photo_url ? (
                          <Image
                            src={currentDisplayWinner.wakil_photo_url}
                            alt={currentDisplayWinner.wakil_name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <User className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                        activeModalTab === 'mpk' ? 'text-purple-700' : 'text-blue-700'
                      }`}>
                        {activeModalTab === 'mpk' ? 'Wakil Ketua MPK' : 'Wakil Ketua OSIS'}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mt-0.5">
                        {currentDisplayWinner.wakil_name}
                      </h3>
                      <p className="text-[11px] text-slate-500">{currentDisplayWinner.wakil_class}</p>
                    </div>
                  </div>

                  {/* Info Statistik Perolehan Suara */}
                  {currentDisplayWinner.voteCount !== undefined && currentDisplayWinner.percentage !== undefined && (
                    <div className="mb-6 p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl max-w-sm mx-auto">
                      <div className="flex items-center justify-around text-center">
                        <div>
                          <span className={`text-xl sm:text-2xl font-black tabular-nums block ${
                            activeModalTab === 'mpk' ? 'text-purple-700' : 'text-blue-700'
                          }`}>
                            {currentDisplayWinner.voteCount}
                          </span>
                          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Suara Sah
                          </span>
                        </div>
                        <div className="h-8 w-px bg-blue-200" />
                        <div>
                          <span className={`text-xl sm:text-2xl font-black tabular-nums block ${
                            activeModalTab === 'mpk' ? 'text-purple-700' : 'text-blue-700'
                          }`}>
                            {currentDisplayWinner.percentage}%
                          </span>
                          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Persentase
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-slate-500 text-sm">
                  Belum ada data pemenang untuk kategori ini.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={scrollToResults}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Lihat Rekapitulasi Suara</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-all border border-slate-200/80"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}