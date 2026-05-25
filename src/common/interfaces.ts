
export interface EndedGameConsultationsResulte {
  consultations: any[];
  activeEdition: any;
  winners: any;
  statistics: any;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Winner {
  consultationId: string;
  clientId: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  combination: string;
  timeSpent: number;
  createdAt: Date;
  rank: number;
}

export interface WinnersData {
  exact: Winner[];
  disordered: Winner[];
  totalExact: number;
  totalDisordered: number;
  totalWinners: number;
}

export interface StatisticsData {
  totalConsultations: number;
  totalParticipants: number;
  uniqueParticipants: number;
  winningCombination: string;
  successRate: {
    exact: number;
    disordered: number;
    overall: number;
  };
  digits: {
    frequency: Record<string, number>;
    mostFrequent: Array<{ digit: number; count: number; percentage: number }>;
    leastFrequent: Array<{ digit: number; count: number; percentage: number }>;
  };
  timeStats: {
    average: number;
    fastest: {
      time: number;
      clientId: string | null;
      username: string | null;
      combination: string | null;
    };
    slowest: {
      time: number;
      clientId: string | null;
      username: string | null;
      combination: string | null;
    };
    distribution: {
      under30s: number;
      under60s: number;
      under120s: number;
      over120s: number;
    };
  };
  combinations: {
    totalUnique: number;
    mostCommon: Array<{ combination: string; count: number; percentage: number }>;
    diversity: number;
  };
  topParticipants: Array<{
    clientId: string;
    username: string;
    participations: number;
  }>;
  medals: {
    gold: Winner | null;
    silver: Winner | null;
    bronze: Winner | null;
  };
}

export interface EndedGameConsultationsResult {
  consultations: any[];
  activeEdition: {
    id: string;
    startDate: Date;
    endDate: Date;
    status: string;
    isActive: boolean;
    winningCombination: string | null;
  } | null;
  winners: WinnersData | null;
  statistics: StatisticsData | null;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


export interface Winner {
  consultationId: string;
  clientId: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  combination: string;
  timeSpent: number;
  createdAt: Date;
  rank: number;
  reward?: number;
}

// types/game-stats.interface.ts
export interface WinningStats {
  winningCombination: string;
  totalParticipants: number;
  exactWinners: Winner[];
  disorderedWinners: Winner[];
  statistics: GameStatistics;
}

export interface Winner {
  consultationId: string;
  clientId: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  combination: string;
  rank: number;
  reward?: number;
}

export interface GameStatistics {
  // Statistiques générales
  totalConsultations: number;
  uniqueParticipants: number;

  // Statistiques des combinaisons
  mostFrequentDigits: number[];
  leastFrequentDigits: number[];
  combinationFrequency: Map<string, number>;

  // Statistiques de temps
  averageTimeSpent: number;
  fastestCompletion: {
    time: number;
    clientId: string;
    username: string;
  } | null;
  slowestCompletion: {
    time: number;
    clientId: string;
    username: string;
  } | null;

  // Distribution
  timeDistribution: {
    under30s: number;
    under60s: number;
    under120s: number;
    over120s: number;
  };

  // Pourcentages
  exactMatchPercentage: number;
  disorderedMatchPercentage: number;

  // Top participants
  topParticipants: {
    clientId: string;
    username: string;
    participations: number;
  }[];
}

export interface PopulatedConsultation {
  _id: any;
  combinaison: string;
  timeSpent: number;
  createdAt: Date;
  clientId: {
    _id: any;
    username?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
}