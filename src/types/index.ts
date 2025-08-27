export interface Participant {
  id: string;
  name: string;
  addedAt: Date;
}

export interface Winner {
  id: string;
  name: string;
  wonAt: Date;
  prizeId?: string;
  prizeName?: string;
  drawSession?: string;
}

export interface Prize {
  id: string;
  name: string;
  description: string;
  quota: number;
  remainingQuota: number;
  createdAt: Date;
}

export interface AppSettings {
  eventLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  animationType: 'wheel' | 'scroll' | 'cards';
  soundEnabled: boolean;
  backgroundMusic: boolean;
  multiDrawCount: number;
}

export interface AppState {
  participants: Participant[];
  winners: Winner[];
  prizes: Prize[];
  isDrawing: boolean;
  currentWinners: Winner[];
  settings: AppSettings;
  isFullscreen: boolean;
  isLocked: boolean;
  selectedPrize: Prize | null;
}