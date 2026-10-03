export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  is_featured: boolean;
  is_available: boolean;
  dietary_tags: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  items: MenuItem[];
}

export interface ReservationRequest {
  name: string;
  email: string;
  phone: string;
  party_size: number;
  requested_date: string;
  requested_time: string;
  notes: string;
}
