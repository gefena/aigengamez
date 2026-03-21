export interface Game {
  id: string;
  title: string;
  developer: string;
  category: string;
  tags?: string[];
  emoji: string;
  thumbBg: string;
  rating: number;
  description: string;
}
