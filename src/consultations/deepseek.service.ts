import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';

export interface BirthData {
  dateOfBirth?: string;
  nom: string;
  country: string;
  prenoms: string;
  dateNaissance: string;
  heureNaissance: string;
  paysNaissance: string;
  villeNaissance: string;
  gender?: string;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnalysisResult {
  timestamp: Date;
  carteDuCiel: {
    aspectsTexte: string;
  };
  metadata: {
    processingTime: number;
    tokensUsed: number;
    model: string;
    cached?: boolean;
  };
}

export interface PlanetPosition {
  planete: string;
  signe: string;
  maison: number;
  retrograde: boolean;
  degre?: number;
}

// Configuration minimale sans cache
const DEFAULT_CONFIG = {
  API_URL: 'https://api.deepseek.com/v1/chat/completions',
  MODEL: 'deepseek-chat',
  REQUEST_TIMEOUT: 3000000, // 50 minutes
  MAX_RETRIES: 4,
  RETRY_DELAY: 1000,
  DEFAULT_TEMPERATURE: 0.2,
  DEFAULT_MAX_TOKENS: 4000,
} as const;

// Regex précompilées pour la performance
const REGEX_PATTERNS = {
  principal: /^([A-Za-zÀ-ÿ\s]+?)\s+(?:\([^)]+\)\s+)?(?:\[RÉTROGRADE\]\s+)?en\s+([A-Za-zÀ-ÿ]+)(?:\s+[–\-]\s+Maison\s+(\d+))?/i,
  avecDegre: /([A-Za-zÀ-ÿ\s]+)\s+(\d+°\d+['']\d+[""])\s+([A-Za-zÀ-ÿ]+)/i,
  degreeParser: /(\d+)°(\d+)[''](\d+)[""]/,
  retrogradeCheck: /RÉTROGRADE|rétrograde/i,
  jsonExtractor: /\{[\s\S]*\}/,
} as const;

@Injectable()
export class DeepseekService {

  private readonly logger = new Logger(DeepseekService.name);
  private readonly DEEPSEEK_API_KEY: string;
  private apiCalls = 0;

  private readonly SYSTEM_PROMPTS = {
    astrologer: `Tu es un astrologue professionnel expert avec plus de 20 ans d'expérience.
Tes analyses sont précises, structurées et basées sur l'astrologie traditionnelle et moderne.
Tu fournis des insights pratiques, empathiques et personnalisés.
Format de réponse : clair, organisé en sections, avec des bullet points pour les éléments clés.`,

    carteDuCiel: `
     LA CARTE DU CIEL

Ce prompt est conçu pour transformer l'IA en un moteur de calcul certifié, spécialisé dans la génération de cartes du ciel natales de précision archivistique. Il intègre un protocole de vérification historique impératif avant tout calcul astronomique, éliminant le risque d'erreur sur le fuseau horaire. L'IA se concentre exclusivement sur les données mathématiques et astronomiques brutes, basées sur les éphémérides du Jet Propulsion Laboratory (JPL), et produit des résultats reproductibles et vérifiables.

Rôle : Agis comme un ingénieur expert en astrométrie doublé d'un archiviste spécialisé en chronologie des fuseaux horaires historiques. Ton expertise combine la mécanique céleste, la recherche historique des décalages horaires, la conversion temporelle précise (temps local vers UTC) et la domification selon des algorithmes standards. Tu es dépourvu de tout biais interprétatif ; ta fonction exclusive est l'exactitude absolue et vérifiable des données de référence.
Objectif : Établir la carte du ciel intégrale et incontestable d'un individu. L'objectif primaire et non-négociable est d'abord de déterminer l'heure UTC exacte par une vérification documentée du fuseau horaire historique. Ensuite, fournir le positionnement précis de tous les corps célestes, points mathématiques et maisons (Système Placidus). Le résultat final est une base de données pure, traçable et essentielle pour toute analyse ultérieure.
Style et Ton :
- Technique et Factuel : Utilise un langage strictement scientifique.
- Minimaliste : Aucune interprétation, aucune psychologie, aucun adjectif superflu.
- Abolition du récit : Seules les données comptent.

STRUCTURE DE L'ANALYSE À RESPECTER
Introduction : Tu dois obligatoirement débuter par la validation des paramètres d'entrée : [PRÉNOM], [DATE], [HEURE PRÉCISE], [VILLE/PAYS]. Elle doit confirmer l'identification des coordonnées géographiques et la réussite de la conversion en Temps Universel (UTC) avant d'afficher les résultats.
L'IA devra suivre rigoureusement les étapes suivantes dans l'ordre indiqué. Le saut ou la simplification d'une étape est interdit.
Tu ne dois pas inclure des tableaux, ni de chiffres romains dans le résultat final. utilise que des chiffres indo-arabes.
N'utilise pas les chiffres romains pour désigner les maisons.
1. AUDIT CHRONO-GÉOSPATIAL
  • Vérification historique du fuseau horaire et détermination des coordonnées géographiques précises.
    - Identifier et confirmer les paramètres d'entrée : [PRÉNOM], [DATE (JJ/MM/AAAA)], [HEURE LOCALE DÉCLARÉE], [LIEU (Ville, Pays)].
    - Rechercher et citer le décalage horaire légal (Offset) historiquement en vigueur à la date et au lieu exacts de naissance, en consultant les bases de données des fuseaux horaires (ex: IANA Time Zone Database).
    - Vérifier explicitement l'application d'un régime d'heure d'été ou d'hiver pour cette date.
    - Calculer l'heure UTC de référence avec la formule : Heure UTC = Heure Locale Déclarée - Offset Historique.
    - Convertir le lieu en coordonnées géodésiques WGS 84 : Latitude (Nord + / Sud -) et Longitude (Est + / Ouest -).
    - Clause de sécurité : Si l'information historique est absente, ambiguë ou contradictoire :
    - a) Suspendre le calcul de la carte du ciel.
    - b) Lister tous les scénarios horaires plausibles (ex: heure d'été ON/OFF) avec les heures UTC et Ascendants potentiels correspondants.
    - c) Demander une clarification avant de poursuivre.
2. ÉTALONNAGE ASTRONOMIQUE
  • Calcul des référentiels temporels célestes fondamentaux.
    - Afficher l'Heure UTC de référence établie et justifiée en Section 0.
    - Calculer et indiquer le Temps Sidéral de Greenwich (GST) pour cette heure UTC exacte.
    - Calculer et indiquer le Temps Sidéral Local (LST) avec la formule : LST = GST + (Longitude/15), où la Longitude est exprimée en heures décimales (Est positif, Ouest négatif).
3. CORPS PRIMAIRES DU SYSTÈME SOLAIRE
  • Positions géocentriques des luminaires et planètes majeures.
    - Utiliser exclusivement les éphémérides JPL DE440.
    - Pour chaque corps, suivre le format strict :
    - [Nom] | [Signe Zodiacal] | [Degrés]° [Minutes]' [Secondes]'' | [Maison] | [État : Direct/Rétrograde].
    - Lister les corps dans l'ordre suivant : Soleil, Lune, Mercure, Vénus, Mars, Jupiter, Saturne, Uranus, Neptune, Pluton.
4. ASTÉROÏDES ET CORPS SECONDAIRES
  • Positions d'objets mineurs sélectionnés.
    - Suivre le même format que la Section 2.
    - Lister les corps dans l'ordre suivant : Chiron, Cérès, Pallas, Junon, Vesta.
    - Pour tout corps (notamment Éris) dont la position n'est pas fiable dans les éphémérides JPL DE440 pour la date, indiquer :
    - [Nom] | Position non disponible dans les éphémérides JPL DE440 pour cette date.
5. POINTS MATHÉMATIQUES ET SENSIBLES
  • Calcul des points astronomiques et astrologiques dérivés.
    - Pour chaque point, utiliser le format :
    - [Nom] | [Signe] | [Degrés]° [Minutes]' [Secondes]'' | [Maison].
    - Nœud Nord Vrai : Calculer la position ascendante moyenne de l'orbite lunaire.
    - Nœud Sud Vrai : Calculer la position opposée (descendante).
    - Lune Noire Lilith : Utiliser la position moyenne (apogée lunaire moyenne).
    - Part de Fortune : Appliquer la formule diurne (Ascendant + Lune - Soleil) si le Soleil est au-dessus de l'horizon (Maisons I à XII), sinon appliquer la formule nocturne (Ascendant + Soleil - Lune).
    - Vertex : Calculer le point d'intersection ouest de l'écliptique et du premier vertical.
6. SYSTÈME DE MAISONS PLACIDUS
  • Calcul et liste des douze cuspides des maisons astrologiques.
    - Calculer les cuspides en utilisant l'algorithme Placidus avec le Temps Sidéral Local (Section 1) et la Latitude (Section 0).
    - Pour chaque maison, de I à XII, utiliser le format :
    - Maison [Chiffre Romain] ([Abbr.]) | [Signe] | [Degrés]° [Minutes]' [Secondes]''.
    - Utiliser les abréviations suivantes : AS (Maison I), II (II), III (III), IC (IV), V (V), VI (VI), DS (VII), VIII (VIII), IX (IX), MC (X), XI (XI), XII (XII).
7. INVENTAIRE DES 5 ASPECTS MAJEURS
  • Recensement des relations angulaires significatives entre les corps célestes.
    - Ne lister uniquement que les 5 aspects majeurs les plus importants : Conjonction (0°), Opposition (180°), Carré (90°), Trigone (120°), Sextile (60°).
    - Appliquer un orbe maximum strict de 1°00'.
    - Utiliser le format :
    - [Corps A] [Aspect] [Corps B] – Orbe : [Degrés]° [Minutes]'.
    - Analyser les relations entre tous les corps listés dans les Sections 2 et 4.
8. PROTOCOLE DE SORTIE
  • Format et règles de présentation finale.
    - Le rendu final doit être une succession linéaire de listes à puces, présentant strictement les Sections 0 à 6 dans l'ordre numérique.
    - L'utilisation de tableaux, de graphiques ou de toute mise en forme complexe est interdite.
    - Toutes les positions angulaires doivent être exprimées avec une précision allant jusqu'à la seconde d'arc (″).
9. CONFIRMATION DE CONFORMITÉ
  • Déclaration finale standardisée.
    - Après la Section 6, ajouter cette déclaration unique certifiant la conformité des données aux éphémérides JPL de la NASA pour le référentiel donné:
    - "Calculs planétaires conformes aux éphémérides JPL DE440 de la NASA. Domification Placidus basée sur le Temps Sidéral Local dérivé de l'heure UTC vérifiée historiquement en Section 0."
    - Ne rien ajouter après cette déclaration (pas de conseils, pas d'interprétations, pas de message de clôture personnalisé).

Synthèse : Le rendu final doit être exclusivement constitué de listes à puces. L'utilisation de tableaux est strictement interdite. Chaque position doit être rendue avec une précision allant jusqu'à la seconde d'arc pour garantir une fiabilité astrométrique totale.

Conclusion : Tu dois achever son exécution par une mention unique certifiant la conformité des données aux éphémérides JPL de la NASA pour le référentiel donné. Aucun message de clôture amical, interprétation ou conseil ne doit être ajouté.
    `,

  } as const;

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.DEEPSEEK_API_KEY = this.configService.get<string>('DEEPSEEK_API_KEY') || '';

    if (!this.DEEPSEEK_API_KEY) {
      this.logger.warn('DEEPSEEK_API_KEY non configurée dans les variables d\'environnement');
    } else {
      this.logger.log('Service DeepSeek initialisé avec succès (sans cache)');
    }
  }

  async generateSkyChart(data: BirthData): Promise<AnalysisResult['carteDuCiel']> {
    try {
      const prompt = this.buildCarteDuCielPrompt(data);
      const messages: DeepSeekMessage[] = [
        {
          role: 'system',
          content: this.SYSTEM_PROMPTS.carteDuCiel,
        },
        {
          role: 'user',
          content: prompt,
        },
      ];
      const response = await this.callDeepSeekApi(messages, 0.2, 1500);

      const carteDuCiel: AnalysisResult['carteDuCiel'] = {
        aspectsTexte: response.choices[0]?.message?.content || '',
      };
      return carteDuCiel;
    } catch (error) {
      this.logger.error('[generateSkyChart] Erreur:', error);
      throw new HttpException(
        "Erreur lors de la génération de la carte du ciel",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Appelle l'API DeepSeek avec retry logic
   */
  private async callDeepSeekApi(
    messages: DeepSeekMessage[],
    temperature: number = DEFAULT_CONFIG.DEFAULT_TEMPERATURE,
    maxTokens: number = DEFAULT_CONFIG.DEFAULT_MAX_TOKENS,
    model: string = DEFAULT_CONFIG.MODEL,
  ): Promise<DeepSeekResponse> {
    if (!this.DEEPSEEK_API_KEY) {
      throw new HttpException('Service DeepSeek non configuré', HttpStatus.SERVICE_UNAVAILABLE);
    }

    const requestId = randomUUID().slice(0, 8);
    const startTime = Date.now();

    this.logger.debug(`[${requestId}] Appel API DeepSeek - Model: ${model}, Tokens: ${maxTokens}, Temp: ${temperature}`);

    const requestBody: DeepSeekRequest = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.DEEPSEEK_API_KEY}`,
        'Accept': 'application/json',
      },
      timeout: DEFAULT_CONFIG.REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500,
    };

    for (let attempt = 1; attempt <= DEFAULT_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post<DeepSeekResponse>(DEFAULT_CONFIG.API_URL, requestBody, config),
        );

        const duration = Date.now() - startTime;
        this.apiCalls++;

        if (response.status === 200) {
          this.logger.debug(`[${requestId}] Réponse reçue en ${duration}ms - Tokens: ${response.data.usage?.total_tokens || 0}`);
          return response.data;
        }

        // Gestion des erreurs HTTP
        if (response.status === 429) {
          this.logger.warn(`[${requestId}] Rate limit atteint, tentative ${attempt}/${DEFAULT_CONFIG.MAX_RETRIES}`);
          await this.delay(DEFAULT_CONFIG.RETRY_DELAY * attempt * 2);
          continue;
        }

        throw this.createHttpException(response);
      } catch (error) {
        if (error instanceof HttpException) throw error;

        const axiosError = error as AxiosError;
        const shouldRetry = await this.handleApiError(axiosError, attempt, requestId);

        if (!shouldRetry) {
          this.logger.error(`[${requestId}] Toutes les tentatives ont échoué`);
          throw new HttpException(
            'Échec de la communication avec DeepSeek API',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
      }
    }

    throw new HttpException(
      'Échec de la communication avec DeepSeek API après plusieurs tentatives',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Gère les erreurs d'API
   */
  private async handleApiError(error: AxiosError, attempt: number, requestId: string): Promise<boolean> {
    if (error.code === 'ECONNABORTED') {
      this.logger.warn(`[${requestId}] Timeout API, tentative ${attempt}/${DEFAULT_CONFIG.MAX_RETRIES}`);
    } else if (error.response?.status === 429) {
      this.logger.warn(`[${requestId}] Rate limit, tentative ${attempt}/${DEFAULT_CONFIG.MAX_RETRIES}`);
      await this.delay(DEFAULT_CONFIG.RETRY_DELAY * attempt * 3);
      return attempt < DEFAULT_CONFIG.MAX_RETRIES;
    } else {
      this.logger.error(`[${requestId}] Erreur API`, {
        attempt,
        error: error.message,
        status: error.response?.status,
      });
    }

    if (attempt < DEFAULT_CONFIG.MAX_RETRIES) {
      await this.delay(DEFAULT_CONFIG.RETRY_DELAY * attempt);
      return true;
    }

    return false;
  }

  /**
   * Crée une exception HTTP appropriée
   */
  private createHttpException(response: any): HttpException {
    const status = response.status;
    const data = response.data;

    const statusMap: Record<number, HttpStatus> = {
      401: HttpStatus.UNAUTHORIZED,
      429: HttpStatus.TOO_MANY_REQUESTS,
    };

    return new HttpException(
      `Erreur DeepSeek API: ${status} - ${JSON.stringify(data)}`,
      statusMap[status] || HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * Génère une analyse complète SANS CACHE
   */
  async genererAnalyseComplete(
    userPrompt: string,
    systemPrompt: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      const messages: DeepSeekMessage[] = [
        {
          role: 'system' as const,
          content: systemPrompt 
        },
        {
          role: 'user' as const,
          content: userPrompt
        },
      ];

      const response = await this.callDeepSeekApi(messages, 0.8, 4000);

      const result: AnalysisResult = {
        timestamp: new Date(),
        carteDuCiel: {
          aspectsTexte: '',
        },
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: response.usage?.total_tokens || 0,
          model: DEFAULT_CONFIG.MODEL,
        },
      };

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Erreur lors de la génération de l'analyse",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Délai avec promesse
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retourne les statistiques minimales du service
   */
  getServiceStats() {
    return {
      apiCalls: this.apiCalls,
      cacheSize: 0, // Indique explicitement qu'il n'y a pas de cache
      cacheEnabled: false,
    };
  }

  /**
   * Génère du contenu à partir d'un prompt simple
   */
  async generateContentFromPrompt(
    prompt: string,
    temperature: number = DEFAULT_CONFIG.DEFAULT_TEMPERATURE,
    maxTokens: number = DEFAULT_CONFIG.DEFAULT_MAX_TOKENS,
    systemPrompt?: string
  ): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: systemPrompt || 'Tu es un expert en astrologie, analyses psychologiques et développement personnel. Fournir des réponses détaillées, bienveillantes et éducatives.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.callDeepSeekApi(messages, temperature, maxTokens);
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new HttpException(
        `Échec de la génération de contenu: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extrait le JSON d'une réponse
   */
  extractJsonFromResponse(content: string): any {
    try {
      const match = REGEX_PATTERNS.jsonExtractor.exec(content);
      return match ? JSON.parse(match[0]) : null;
    } catch {
      return null;
    }
  }

  /**
   * Construit un prompt pour la carte du ciel
   */
  buildCarteDuCielPrompt(data: BirthData): string {
    return `CALCUL CARTE DU CIEL - Format strict

DONNÉES DE NAISSANCE:
NOM: ${data.nom}
PRÉNOMS: ${data.prenoms}
DATE: ${data.dateNaissance}
HEURE: ${data.heureNaissance}
LIEU: ${data.villeNaissance}, ${data.paysNaissance}
GENRE: ${data.gender}`;
  }

  /**
   * Alternative simplifiée pour les analyses rapides (moins de tokens)
   */
  async genererAnalyseRapide(
    userPrompt: string,
    systemPrompt?: string,
    maxTokens: number = 2000
  ): Promise<string> {
    const messages: DeepSeekMessage[] = [
      {
        role: 'system',
        content: systemPrompt || this.SYSTEM_PROMPTS.astrologer,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    try {
      const response = await this.callDeepSeekApi(messages, 0.7, maxTokens);
      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new HttpException(
        "Erreur lors de la génération de l'analyse rapide",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Vérifie la santé de l'API avec une requête légère
   */
  async checkApiHealth(): Promise<{ healthy: boolean; latency?: number }> {
    const startTime = Date.now();

    try {
      const messages: DeepSeekMessage[] = [
        {
          role: 'system',
          content: 'Réponds simplement "OK"',
        },
        {
          role: 'user',
          content: 'Test de santé',
        },
      ];

      await this.callDeepSeekApi(messages, 0.1, 10);
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
      };
    }
  }
}