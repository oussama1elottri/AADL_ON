export interface Batch {
  id: number;
  merkle_root: string;
  tx_hash: string | null;
  created_at: string;
}