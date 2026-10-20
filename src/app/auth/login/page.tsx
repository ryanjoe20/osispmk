'use client'

import { useState } from 'react'
import { supabaseClient } from '@/lib/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'

export default function VoterLogin() {
  const [nis, setNis] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: voter, error } = await supabaseClient
        .from('voters')
        .select('*')
        .eq('nis', nis.trim())
        .single()

      if (error || !voter) {
        setError('Maaf, NIS Anda tidak ditemukan. Hubungi Admin atau panitia untuk verifikasi data.')
        return
      }

      if (voter.has_voted) {
        setError('Anda sudah melakukan voting. Terima kasih telah menggunakan hak suara Anda.')
        return
      }

      document.cookie = `voter=${JSON.stringify(voter)}; path=/`
      window.location.href = '/vote'

    } catch (err) {
      console.error('Login error:', err)
      setError('Terjadi kesalahan saat memproses login. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-stretch overflow-hidden relative">
      {/* Tombol Kembali ke Beranda */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-30 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-600 hover:bg-white hover:shadow-md transition-all duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Beranda</span>
      </Link>

      {/* Bagian Kiri: Hero Illustration Showcase (Lebar & Elegan) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 relative bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-950 p-12 flex-col justify-between overflow-hidden">
        {/* Background Image Overlay with Soft Dark Gradient */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-voting-illustration.png"
            alt="Ilustrasi E-Voting OSIS"
            fill
            priority
            sizes="50vw"
            className="object-cover object-center opacity-30 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-blue-950/80 to-blue-900/40 backdrop-blur-[1px]" />
        </div>

        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Header Kiri */}
        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo size="md" variant="squircle" />
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Pilih<span className="text-blue-400">Ku</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 border border-blue-400/30">
                E-VOTING
              </span>
            </h2>
            <p className="text-xs text-blue-200/80 font-medium">SMK Pratama Mulya Karawang</p>
          </div>
        </div>

        {/* Showcase Illustration Card di Tengah Kiri */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 my-auto py-6 flex flex-col items-center"
        >
          <div className="relative w-full max-w-md aspect-square rounded-3xl overflow-hidden p-3 bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900/60">
              <Image
                src="/images/hero-voting-illustration.png"
                alt="Hero E-Voting Illustration"
                fill
                priority
                sizes="(max-width: 1200px) 45vw, 480px"
                className="object-cover"
              />
            </div>

          </div>

          <div className="mt-8 text-center max-w-md">
            <h3 className="text-2xl font-black text-white tracking-tight">
              Gunakan Hak Pilihmu Sekarang
            </h3>
            <p className="text-sm text-blue-100/85 mt-2 leading-relaxed">
              Satu suara Anda menentukan arah dan inovasi kepemimpinan OSIS & MPK masa depan sekolah.
            </p>
          </div>
        </motion.div>

        {/* Security Footer Info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-blue-200/70 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Terverifikasi Kriptografi Database</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>Pemilihan Jujur & Adil</span>
          </div>
        </div>
      </div>

      {/* Bagian Kanan: Form Login NIS */}
      <div className="w-full lg:w-1/2 xl:w-5/12 flex items-center justify-center p-6 sm:p-10 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo & Judul Mobile / Form Header */}
          <div className="text-center mb-8 flex flex-col items-center">
            {/* Logo Sekolah */}
            <div className="mb-4 relative w-20 h-20 sm:w-24 sm:h-24 drop-shadow-md transition-transform hover:scale-105 duration-200">
              <Image
                src="/logo.png"
                alt="Logo Sekolah"
                fill
                priority
                className="object-contain"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Masuk Bilik Suara
            </h1>
            <p className="mt-2 text-sm text-slate-600 font-medium">
              Masukkan Kode Unik untuk memulai proses voting
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-7 sm:p-9 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3"
                >
                  <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs sm:text-sm font-medium text-red-700 leading-snug">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="nis" className="block text-sm font-bold text-slate-700 mb-2">
                  Kode Unik Siswa
                </label>
                <div className="relative">
                  <input
                    id="nis"
                    type="text"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-slate-50/70 focus:bg-white text-slate-900 font-semibold tracking-wide placeholder:font-normal placeholder:text-slate-400"
                    placeholder="Contoh: 202410123"
                    required
                    autoComplete="off"
                    disabled={loading}
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Kode Unik yang tertera pada kartu undangan pemilihan.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading || !nis.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memverifikasi NIS...</span>
                  </>
                ) : (
                  <span>Masuk & Berikan Suara</span>
                )}
              </motion.button>
            </form>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-xs text-slate-500">
              Gunakan hak suara secara jujur, langsung, bebas, dan rahasia.
            </p>
            <p className="text-xs text-slate-400">
              SMK Pratama Mulya Karawang • E-Voting System
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
