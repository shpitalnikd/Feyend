export type RequestStatus = 'open' | 'claimed' | 'completed' | 'expired';
export type ClaimStatus = 'pending' | 'accepted' | 'rejected';
export type RatingRole = 'requester' | 'finder';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  posts_count: number;
  paid_out_percent: number;
  avg_rating: number;
  created_at: string;
}

export interface Request {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  photo_url: string | null;
  store_name: string | null;
  location: unknown;
  lat: number;
  lng: number;
  radius_km: number;
  reward_amount: number | null;
  expires_at: string;
  status: RequestStatus;
  created_at: string;
  poster?: Profile;
  distance_km?: number;
}

export interface Claim {
  id: string;
  request_id: string;
  finder_id: string;
  photo_url: string;
  status: ClaimStatus;
  created_at: string;
  finder?: Profile;
  request?: Request;
}

export interface Rating {
  id: string;
  request_id: string;
  rater_id: string;
  rated_id: string;
  role: RatingRole;
  score: number;
  created_at: string;
}
