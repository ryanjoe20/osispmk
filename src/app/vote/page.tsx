'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/auth'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Vote,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Target,
  Sparkles,
  ArrowRight,
  User,
  Check,
  ChevronRight,
  ChevronLeft,
  Info,
  Users,
  Lock
} from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import BrandLogo from '@/components/BrandLogo'
import toast from 'react-hot-toast'

interface Candidate {
  id: string
  candidate_number: number
  ketua_name: string
  wakil_name: string
  ketua_class: string
  wakil_class: string
  visi: string
  misi: string
  program_kerja: string
  ketua_photo_url?: string
  wakil_photo_url?: string
  category?: 'osis' | 'mpk'
}

interface Voter {
  id: string
  nis: string
  full_name: string
  class: string
  has_voted: boolean
  has_voted_osis?: boolean
  has_voted_mpk?: boolean
}

type TabType = 'visi' | 'misi' | 'program'

interface CandidateTheme {
  primary: string
  primaryHover: string
  text: string
  textDark: string
  border: string
  ring: string
  shadow: string
  badgeBg: string
  badgeBorder: string
  wakilTag: string
  accentNumberBg: string
}

const CANDIDATE_THEMES: CandidateTheme[] = [
  // Paslon 1: Royal Blue
  {
    primary: 'bg-blue-600',
    primaryHover: 'hover:bg-blue-700',
    text: 'text-blue-600',
    textDark: 'text-blue-700',
    border: 'border-blue-600',
    ring: 'ring-blue-600/15',
    shadow: 'shadow-blue-600/20',
    badgeBg: 'bg-blue-50',
    badgeBorder: 'border-blue-200',
    wakilTag: 'bg-blue-700/85',
    accentNumberBg: 'bg-blue-100 text-blue-700',
  },
  // Paslon 2: Vibrant Purple
  {
    primary: 'bg-purple-600',
    primaryHover: 'hover:bg-purple-700',
    text: 'text-purple-600',
    textDark: 'text-purple-700',
    border: 'border-purple-600',
    ring: 'ring-purple-600/15',
    shadow: 'shadow-purple-600/20',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    wakilTag: 'bg-purple-700/85',
    accentNumberBg: 'bg-purple-100 text-purple-700',
  },
  // Paslon 3: Emerald Green
  {
    primary: 'bg-emerald-600',
    primaryHover: 'hover:bg-emerald-700',
    text: 'text-emerald-600',
    textDark: 'text-emerald-800',
    border: 'border-emerald-600',
    ring: 'ring-emerald-600/15',
    shadow: 'shadow-emerald-600/20',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    wakilTag: 'bg-emerald-700/85',
    accentNumberBg: 'bg-emerald-100 text-emerald-800',
  },
  // Paslon 4: Warm Amber / Orange
  {
    primary: 'bg-amber-600',
    primaryHover: 'hover:bg-amber-700',
    text: 'text-amber-600',
    textDark: 'text-amber-900',
    border: 'border-amber-600',
    ring: 'ring-amber-600/15',
    shadow: 'shadow-amber-600/20',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    wakilTag: 'bg-amber-700/85',
    accentNumberBg: 'bg-amber-100 text-amber-900',
  },
  // Paslon 5: Rose / Crimson
  {
    primary: 'bg-rose-600',
    primaryHover: 'hover:bg-rose-700',
    text: 'text-rose-600',
    textDark: 'text-rose-800',
    border: 'border-rose-600',
    ring: 'ring-rose-600/15',
    shadow: 'shadow-rose-600/20',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    wakilTag: 'bg-rose-700/85',
    accentNumberBg: 'bg-rose-100 text-rose-800',
  },
]

function getCandidateTheme(candidateNumber: number, index: number): CandidateTheme {
  const targetIndex = (candidateNumber > 0 ? candidateNumber - 1 : index) % CANDIDATE_THEMES.length
  return CANDIDATE_THEMES[targetIndex]
}

function parseLines(text?: string): string[] {
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^[-*•\d.]+\s*/, ''))
}

export default function VotePage() {
  const router = useRouter()
  const [voter, setVoter] = useState<Voter | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Data kandidat terpisah
  const [osisCandidates, setOsisCandidates] = useState<Candidate[]>([])
  const [mpkCandidates, setMpkCandidates] = useState<Candidate[]>([])
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true)

  // Step wizard: 1 = Pilih OSIS, 2 = Pilih MPK
  const [step, setStep] = useState<1 | 2>(1)

  // Pilihan
  const [selectedOsisId, setSelectedOsisId] = useState<string | null>(null)
  const [selectedMpkId, setSelectedMpkId] = useState<string | null>(null)

  // Dialog & status
  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null)
  const [modalActiveTab, setModalActiveTab] = useState<TabType>('visi')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ totalVoters: 0, votedCount: 0 })

  useEffect(() => {
    let isMounted = true

    async function init() {
      // 1. Load Voter Data
      try {
        const voterCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('voter='))

        if (!voterCookie) {
          if (isMounted) {
            setVoter(null)
            setIsCheckingAuth(false)
          }
        } else {
          const parsedVoter: Voter = JSON.parse(decodeURIComponent(voterCookie.split('=')[1]))
          if (parsedVoter?.id) {
            const { data: latestVoter } = await supabaseClient
              .from('voters')
              .select('*')
              .eq('id', parsedVoter.id)
              .single()

            if (isMounted) {
              setVoter(latestVoter || parsedVoter)
              setIsCheckingAuth(false)
            }
          } else if (isMounted) {
            setVoter(parsedVoter)
            setIsCheckingAuth(false)
          }
        }
      } catch (err) {
        console.error('Gagal membaca sesi pemilih:', err)
        if (isMounted) {
          setVoter(null)
          setIsCheckingAuth(false)
        }
      }

      // 2. Fetch Candidates
      try {
        const { data, error: candError } = await supabaseClient
          .from('candidates')
          .select('*')
          .order('candidate_number', { ascending: true })

        if (candError) throw candError
        if (isMounted && data) {
          const osis = data.filter((c: Candidate) => (c.category || 'osis') === 'osis')
          const mpk = data.filter((c: Candidate) => c.category === 'mpk')
          setOsisCandidates(osis)
          setMpkCandidates(mpk)
          setIsLoadingCandidates(false)
        }
      } catch (err) {
        console.error('Error fetching candidates:', err)
        if (isMounted) {
          setError('Gagal memuat daftar pasangan calon. Silakan muat ulang halaman.')
          setIsLoadingCandidates(false)
        }
      }

      // 3. Fetch Stats
      try {
        const { data: votersData } = await supabaseClient
          .from('voters')
          .select('has_voted')

        const totalVoters = votersData?.length || 0
        const votedCount = votersData?.filter(v => v.has_voted)?.length || 0

        if (isMounted) {
          setStats({ totalVoters, votedCount })
        }
      } catch (err) {
        console.error('Error fetching stats:', err)
      }
    }

    init()

    return () => {
      isMounted = false
    }
  }, [])

  // Kandidat aktif berdasarkan step
  const activeCandidates = useMemo(() => {
    return step === 1 ? osisCandidates : mpkCandidates
  }, [step, osisCandidates, mpkCandidates])

  const selectedCandidateId = step === 1 ? selectedOsisId : selectedMpkId

  const selectedOsisCandidate = useMemo(() => {
    return osisCandidates.find(c => c.id === selectedOsisId) || null
  }, [osisCandidates, selectedOsisId])

  const selectedMpkCandidate = useMemo(() => {
    return mpkCandidates.find(c => c.id === selectedMpkId) || null
  }, [mpkCandidates, selectedMpkId])

  const currentSelectedCandidate = step === 1 ? selectedOsisCandidate : selectedMpkCandidate

  const currentTheme = useMemo(() => {
    if (!currentSelectedCandidate) return CANDIDATE_THEMES[0]
    const index = activeCandidates.findIndex(c => c.id === currentSelectedCandidate.id)
    return getCandidateTheme(currentSelectedCandidate.candidate_number, index)
  }, [currentSelectedCandidate, activeCandidates])

  function handleSelectCandidate(candidateId: string) {
    if (step === 1) {
      setSelectedOsisId(candidateId)
    } else {
      setSelectedMpkId(candidateId)
    }
  }

  function handleOpenDetail(candidate: Candidate) {
    setModalCandidate(candidate)
    setModalActiveTab('visi')
  }

  async function handleVote() {
    if (!voter) return

    // Validasi kedua pilihan jika ada kandidat di masing-masing kategori
    if (osisCandidates.length > 0 && !selectedOsisId) {
      toast.error('Silakan tentukan pilihan Ketua & Wakil OSIS terlebih dahulu.')
      setStep(1)
      setShowConfirmModal(false)
      return
    }

    if (mpkCandidates.length > 0 && !selectedMpkId) {
      toast.error('Silakan tentukan pilihan Ketua & Wakil MPK terlebih dahulu.')
      setStep(2)
      setShowConfirmModal(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Simpan suara masuk (OSIS & MPK)
      const votesToInsert = []
      if (selectedOsisId) {
        votesToInsert.push({
          voter_id: voter.id,
          candidate_id: selectedOsisId,
          category: 'osis'
        })
      }
      if (selectedMpkId) {
        votesToInsert.push({
          voter_id: voter.id,
          candidate_id: selectedMpkId,
          category: 'mpk'
        })
      }

      if (votesToInsert.length > 0) {
        const { error: voteError } = await supabaseClient
          .from('votes')
          .insert(votesToInsert)

        if (voteError) throw voteError
      }

      // 2. Perbarui status has_voted pemilih
      const { error: updateError } = await supabaseClient
        .from('voters')
        .update({
          has_voted: true,
          has_voted_osis: Boolean(selectedOsisId),
          has_voted_mpk: Boolean(selectedMpkId)
        })
        .eq('id', voter.id)

      if (updateError) throw updateError

      toast.success('Suara OSIS & MPK Anda berhasil dicatat!')
      setShowConfirmModal(false)

      // 3. Arahkan ke halaman sukses
      router.push('/vote/success')
    } catch (err: unknown) {
      console.error('Error submitting vote:', err)
      const errorMsg = (err instanceof Error) ? err.message : 'Gagal mengirim suara. Silakan coba kembali.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Hitung persentase partisipasi suara
  const turnoutPercentage = useMemo(() => {
    if (stats.totalVoters === 0) return 0
    return Math.round((stats.votedCount / stats.totalVoters) * 100)
  }, [stats])

  // --- STATE 1: LOADING SESSION ---
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Memverifikasi status hak suara Anda...</p>
        </div>
      </div>
    )
  }

  // --- STATE 2: BELUM LOGIN ---
  if (!voter) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Akses Bilik Suara Dibatasi
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Untuk menjaga integritas dan kerahasiaan suara, Anda harus login terlebih dahulu menggunakan Nomor Induk Siswa (NIS) resmi.
          </p>
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <span>Login dengan NIS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/"
              className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors text-center"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // --- STATE 3: SUDAH PERNAH MEMILIH ---
  if (voter.has_voted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-3">
            Hak Suara Telah Digunakan
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Terima Kasih, {voter.full_name}!
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Anda telah berhasil memberikan suara dalam Pemilihan Ketua & Wakil Ketua OSIS serta MPK. Setiap siswa hanya memiliki satu hak suara yang sah dan terlindungi kerahasiaannya.
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Nama Siswa:</span>
              <span className="font-semibold text-slate-900">{voter.full_name}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Kelas:</span>
              <span className="font-semibold text-slate-900">{voter.class}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 text-sm transition-colors text-center"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // --- STATE 4: BILIK SUARA AKTIF DENGAN WIZARD OSIS & MPK ---
  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col">
      {/* Sticky Modern App Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BrandLogo size="sm" variant="squircle" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                    Pilih<span className="text-blue-600">Ku</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-wide border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-none">Bilik Suara Siswa</p>
              </div>
            </div>

            {/* Stepper Progress OSIS & MPK */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  step === 1
                    ? 'bg-blue-600 text-white shadow-xs'
                    : selectedOsisId
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>1. OSIS</span>
                {selectedOsisId && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!selectedOsisId && osisCandidates.length > 0) {
                    toast.error('Silakan tentukan pilihan OSIS terlebih dahulu')
                  } else {
                    setStep(2)
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  step === 2
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : selectedMpkId
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>2. MPK</span>
                {selectedMpkId && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </button>
            </div>

            {/* Info Siswa */}
            <div className="text-right px-3 py-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/70 hidden sm:block max-w-[180px]">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                {voter.full_name}
              </p>
              <p className="text-[11px] font-medium text-slate-500 truncate leading-none mt-0.5">
                {voter.class}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area: Horizontal Full-Width Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 pb-36">
        {/* Banner Kategori dan Petunjuk */}
        <section className="mb-4">
          <div className={`rounded-2xl p-4 sm:p-5 border transition-all relative overflow-hidden ${
            step === 1 
              ? 'bg-gradient-to-r from-blue-500/10 via-blue-50 to-white border-blue-200' 
              : 'bg-gradient-to-r from-indigo-500/10 via-indigo-50 to-white border-indigo-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm ${
                  step === 1 ? 'bg-blue-600' : 'bg-indigo-600'
                }`}>
                  {step === 1 ? '🏛️' : '⚖️'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${
                      step === 1 ? 'bg-blue-600' : 'bg-indigo-600'
                    }`}>
                      Langkah {step} dari 2
                    </span>
                    <h1 className="text-base sm:text-lg font-bold text-slate-900">
                      {step === 1 ? 'Pemilihan Ketua & Wakil Ketua OSIS' : 'Pemilihan Ketua & Wakil Ketua MPK'}
                    </h1>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {step === 1 
                      ? 'Pilih 1 Pasangan Calon OSIS berikut ini, lalu klik lanjutkan untuk memilih MPK.' 
                      : 'Pilih 1 Pasangan Calon MPK berikut ini untuk menyelesaikan hak suara Anda.'}
                  </p>
                </div>
              </div>

              {/* Status Pilihan Sesi Ini */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                {step === 1 && selectedOsisCandidate && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100/80 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold">
                    <Check className="w-4 h-4 text-blue-600 stroke-[3]" />
                    <span>Terpilih: Paslon {selectedOsisCandidate.candidate_number}</span>
                  </div>
                )}
                {step === 2 && selectedMpkCandidate && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100/80 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold">
                    <Check className="w-4 h-4 text-indigo-600 stroke-[3]" />
                    <span>Terpilih: Paslon {selectedMpkCandidate.candidate_number}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <p className="flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs font-semibold underline hover:text-red-900"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Candidate Feed: Sejajar Kesamping (Grid Horizontal / Flex No Scroll) */}
        {isLoadingCandidates ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white rounded-3xl p-5 border border-slate-200/80 animate-pulse">
                <div className="h-6 w-32 bg-slate-200 rounded-full mb-4" />
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="aspect-[4/5] bg-slate-200 rounded-xl" />
                  <div className="aspect-[4/5] bg-slate-200 rounded-xl" />
                </div>
                <div className="h-8 bg-slate-100 rounded-xl mb-3" />
                <div className="h-10 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : activeCandidates.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 text-center shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Belum Ada Paslon {step === 1 ? 'OSIS' : 'MPK'} Terdaftar
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Panitia pemilihan belum mengunggah daftar pasangan calon aktif untuk kategori ini.
            </p>
            {step === 1 && mpkCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Lanjut ke Pemilihan MPK &rarr;
              </button>
            )}
          </div>
        ) : (
          <div className={`grid gap-4 sm:gap-6 items-stretch ${
            activeCandidates.length === 1
              ? 'grid-cols-1 max-w-md mx-auto'
              : activeCandidates.length === 2
              ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto'
              : activeCandidates.length === 3
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}>
            {activeCandidates.map((candidate, index) => {
              const isSelected = selectedCandidateId === candidate.id
              const theme = getCandidateTheme(candidate.candidate_number, index)

              return (
                <div
                  key={candidate.id}
                  onClick={() => handleSelectCandidate(candidate.id)}
                  className={`relative rounded-3xl group transition-all duration-300 ease-out cursor-pointer overflow-hidden border flex flex-col justify-between transform hover:-translate-y-2.5 active:scale-[0.98] ${
                    isSelected
                      ? `bg-white ${theme.border} shadow-xl ${theme.shadow} ring-4 ${theme.ring}`
                      : 'bg-white border-slate-200/80 shadow-sm hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/20'
                  }`}
                >
                  {/* Top Header Glow */}
                  {isSelected && (
                    <div className={`h-1.5 w-full ${theme.primary}`} />
                  )}

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Header Badge & Selected State */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${theme.primary} text-white font-extrabold text-xs tracking-wide shadow-xs`}>
                          <Vote className="w-3.5 h-3.5" />
                          <span>PASLON {String(candidate.candidate_number).padStart(2, '0')}</span>
                        </div>

                        {isSelected ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${theme.badgeBg} ${theme.textDark} text-[11px] font-bold border ${theme.badgeBorder}`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                            Terpilih
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">
                            Ketuk untuk memilih
                          </span>
                        )}
                      </div>

                      {/* Dual Candidate Showcase: Sejajar Ketua & Wakil */}
                      <div className="grid grid-cols-2 gap-2.5 mb-3">
                        {/* Ketua */}
                        <div className="flex flex-col">
                          <div className="aspect-[4/5] relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/70 shadow-inner">
                            {candidate.ketua_photo_url ? (
                              <Image
                                src={candidate.ketua_photo_url}
                                alt={candidate.ketua_name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 45vw, 20vw"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-gradient-to-b from-slate-50 to-slate-100">
                                <User className="w-8 h-8 mb-1 opacity-40 text-slate-500" />
                                <span className="text-[10px] font-medium text-slate-400">Foto Ketua</span>
                              </div>
                            )}
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-slate-900/85 backdrop-blur-xs text-white text-[9px] font-bold tracking-wider uppercase">
                              Ketua
                            </div>
                          </div>
                          <div className="mt-1.5">
                            <h2 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight line-clamp-1">
                              {candidate.ketua_name}
                            </h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {candidate.ketua_class || '-'}
                            </p>
                          </div>
                        </div>

                        {/* Wakil */}
                        <div className="flex flex-col">
                          <div className="aspect-[4/5] relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/70 shadow-inner">
                            {candidate.wakil_photo_url ? (
                              <Image
                                src={candidate.wakil_photo_url}
                                alt={candidate.wakil_name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 45vw, 20vw"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-2 text-center bg-gradient-to-b from-slate-50 to-slate-100">
                                <User className="w-8 h-8 mb-1 opacity-40 text-slate-500" />
                                <span className="text-[10px] font-medium text-slate-400">Foto Wakil</span>
                              </div>
                            )}
                            <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded ${theme.wakilTag} backdrop-blur-xs text-white text-[9px] font-bold tracking-wider uppercase`}>
                              Wakil
                            </div>
                          </div>
                          <div className="mt-1.5">
                            <h2 className="font-bold text-slate-900 text-xs sm:text-sm leading-tight line-clamp-1">
                              {candidate.wakil_name}
                            </h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {candidate.wakil_class || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Tombol Lihat Visi & Misi Dialog */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenDetail(candidate)
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mb-3"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Lihat Visi, Misi & Proker</span>
                      </button>
                    </div>

                    {/* Tombol Pilih Paslon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectCandidate(candidate.id)
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? `${theme.primary} text-white shadow-md ${theme.shadow}`
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Paslon Ini Dipilih</span>
                        </>
                      ) : (
                        <>
                          <span>Pilih Paslon {String(candidate.candidate_number).padStart(2, '0')}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Action Dock (Thumb-Zone Optimized & Dual Step Navigator) */}
      <div className="fixed bottom-0 inset-x-0 z-30 p-3 sm:p-4 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Ringkasan Pilihan di Bawah */}
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto py-1">
            {/* Box Status OSIS */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs flex-shrink-0 ${
              selectedOsisCandidate 
                ? 'bg-blue-50 border-blue-200 text-blue-900' 
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <span className="font-bold">OSIS:</span>
              {selectedOsisCandidate ? (
                <span className="font-semibold text-blue-700 truncate max-w-[140px]">
                  Paslon {selectedOsisCandidate.candidate_number} ({selectedOsisCandidate.ketua_name.split(' ')[0]})
                </span>
              ) : (
                <span>Belum dipilih</span>
              )}
            </div>

            {/* Box Status MPK */}
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs flex-shrink-0 ${
              selectedMpkCandidate 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              <span className="font-bold">MPK:</span>
              {selectedMpkCandidate ? (
                <span className="font-semibold text-indigo-700 truncate max-w-[140px]">
                  Paslon {selectedMpkCandidate.candidate_number} ({selectedMpkCandidate.ketua_name.split(' ')[0]})
                </span>
              ) : (
                <span>Belum dipilih</span>
              )}
            </div>
          </div>

          {/* Navigasi Tombol Langkah & Konfirmasi */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Ubah OSIS</span>
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (!selectedOsisId && osisCandidates.length > 0) {
                    toast.error('Silakan tentukan pilihan Ketua & Wakil OSIS terlebih dahulu')
                    return
                  }
                  setStep(2)
                }}
                disabled={osisCandidates.length > 0 && !selectedOsisId}
                className="flex-1 sm:flex-initial px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Lanjut ke Pemilihan MPK</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!selectedMpkId && mpkCandidates.length > 0) {
                    toast.error('Silakan tentukan pilihan Ketua & Wakil MPK terlebih dahulu')
                    return
                  }
                  setShowConfirmModal(true)
                }}
                disabled={mpkCandidates.length > 0 && !selectedMpkId}
                className="flex-1 sm:flex-initial px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Konfirmasi Pilihan Suara</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Dialog: Visi, Misi & Proker Paslon */}
      <DialogPrimitive.Root open={Boolean(modalCandidate)} onOpenChange={(open) => !open && setModalCandidate(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 max-h-[85vh] overflow-y-auto outline-none">
            {modalCandidate && (
              <>
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />

                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
                      PASLON {String(modalCandidate.candidate_number).padStart(2, '0')} - {(modalCandidate.category || 'osis').toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => setModalCandidate(null)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    Tutup
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                    {modalCandidate.ketua_name} & {modalCandidate.wakil_name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kelas: {modalCandidate.ketua_class} / {modalCandidate.wakil_class}
                  </p>
                </div>

                {/* Tabs switcher: visi / misi / proker */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl my-4">
                  <button
                    type="button"
                    onClick={() => setModalActiveTab('visi')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      modalActiveTab === 'visi' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalActiveTab('misi')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      modalActiveTab === 'misi' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Misi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalActiveTab('program')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      modalActiveTab === 'program' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Program</span>
                  </button>
                </div>

                {/* Konten detail */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed min-h-[140px]">
                  {modalActiveTab === 'visi' && (
                    <div>
                      <h4 className="font-bold text-slate-900 mb-2">Visi Calon:</h4>
                      <p className="italic text-slate-700">“{modalCandidate.visi || 'Visi belum diisi oleh kandidat.'}”</p>
                    </div>
                  )}

                  {modalActiveTab === 'misi' && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 mb-1">Misi Calon:</h4>
                      {parseLines(modalCandidate.misi).length > 0 ? (
                        parseLines(modalCandidate.misi).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-slate-700">{item}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 italic">Misi belum diisi.</p>
                      )}
                    </div>
                  )}

                  {modalActiveTab === 'program' && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 mb-1">Program Kerja Unggulan:</h4>
                      {parseLines(modalCandidate.program_kerja).length > 0 ? (
                        parseLines(modalCandidate.program_kerja).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-4 h-4 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center mt-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                            </span>
                            <span className="text-slate-700">{item}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 italic">Program kerja belum diisi.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectCandidate(modalCandidate.id)
                      setModalCandidate(null)
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors"
                  >
                    Pilih Paslon {modalCandidate.candidate_number} Ini
                  </button>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Modal Dialog: Konfirmasi Final Suara OSIS & MPK */}
      <DialogPrimitive.Root open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
          <DialogPrimitive.Content className="fixed inset-x-0 bottom-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200/90 max-h-[88vh] overflow-y-auto outline-none">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />

            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto mb-2.5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <DialogPrimitive.Title className="text-lg font-bold text-slate-900">
                Konfirmasi Pilihan Suara
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs text-slate-500 mt-0.5">
                Pastikan pilihan Paslon OSIS dan Paslon MPK Anda sudah sesuai sebelum dikirimkan.
              </DialogPrimitive.Description>
            </div>

            <div className="space-y-3">
              {/* Snapshot Pilihan OSIS */}
              {selectedOsisCandidate ? (
                <div className="bg-blue-50/80 rounded-2xl p-3.5 border border-blue-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      🏛️ Pilihan Ketua & Wakil OSIS
                    </span>
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-black">
                      PASLON {selectedOsisCandidate.candidate_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 truncate">
                        {selectedOsisCandidate.ketua_name} & {selectedOsisCandidate.wakil_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedOsisCandidate.ketua_class} / {selectedOsisCandidate.wakil_class}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-100 text-xs text-slate-500">
                  Tidak ada pilihan OSIS yang dipilih
                </div>
              )}

              {/* Snapshot Pilihan MPK */}
              {selectedMpkCandidate ? (
                <div className="bg-indigo-50/80 rounded-2xl p-3.5 border border-indigo-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      ⚖️ Pilihan Ketua & Wakil MPK
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black">
                      PASLON {selectedMpkCandidate.candidate_number}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 truncate">
                        {selectedMpkCandidate.ketua_name} & {selectedMpkCandidate.wakil_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedMpkCandidate.ketua_class} / {selectedMpkCandidate.wakil_class}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-100 text-xs text-slate-500">
                  Tidak ada pilihan MPK yang dipilih
                </div>
              )}

              {/* Alert Permanen */}
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  Suara Anda akan disimpan secara permanen dan hak suara Anda akan dikunci untuk kedua pemilihan ini.
                </p>
              </div>

              {/* Tombol Aksi */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors"
                >
                  Periksa Kembali
                </button>

                <button
                  type="button"
                  onClick={handleVote}
                  disabled={loading}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan Suara...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Ya, Kirim Suara Saya</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
