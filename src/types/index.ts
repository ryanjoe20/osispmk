export type ElectionCategory = 'osis' | 'mpk'

export interface Candidate {
  id: string
  candidate_number: number
  ketua_name: string
  wakil_name: string
  ketua_class?: string
  wakil_class?: string
  visi: string
  misi: string
  program_kerja?: string
  photo_url?: string
  ketua_photo_url?: string
  wakil_photo_url?: string
  category?: ElectionCategory
}

export interface Voter {
  id: string
  nis: string
  full_name: string
  class: string
  has_voted: boolean
  has_voted_osis?: boolean
  has_voted_mpk?: boolean
}

export interface Vote {
  id: string
  voter_id: string
  candidate_id: string
  category?: ElectionCategory
  created_at: string
}

