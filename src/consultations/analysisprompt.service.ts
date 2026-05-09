import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { BirthData, DeepseekService } from './deepseek.service';

@Injectable()
export class AnalysisPromptService {
  constructor(private readonly deepseekService: DeepseekService) {}

  async buildUserPromptByType(consultation: any): Promise<string> {
     const calendrierTransits2026 = this.getCalendrierTransits2026();
    
    const formData = consultation.formData || {};
 
    if (!consultation.tierces && !consultation.tierce) {
      return this.buildPromptSansTierce(formData);
    }

    if (consultation.tierce && this.estConsultationPourTiersSeul(consultation)) {
      return this.buildPromptTiersSeul(consultation.tierce);
    }

    if (consultation.tierces && this.estConsultationPourTiersSeul(consultation)) {
      return this.buildPromptMultiTiersSeul(consultation.tierces);
    }

    const promptUser = this.buildPromptUtilisateur(formData);
    const promptTiers = consultation.tierces
      ? await this.buildPromptTiersMultiples(consultation.tierces)
      : await this.buildPromptTiersSimple(consultation.tierce); 
 
    return `${promptUser}\n${promptTiers}${calendrierTransits2026}`;
  }

  buildUserPromptuser(formData: any): string {
    const birthData = this.extractBirthData(formData);
    this.validateBirthData(birthData);

    const { prenoms, nom, dateNaissance, heureNaissance, villeNaissance, paysNaissance, gender } = birthData;
    const dateFormatee = this.formatDate(dateNaissance);
    const sections: string[] = [];

    const nowUTC = new Date().toISOString();
    const [dateUTC, timeUTC] = nowUTC.split('T');
    const heureUTC = timeUTC.split('.')[0];

    sections.push(
      '## 👤 Date d\'aujourd\'hui - UTC',
      `• **date du jour** : ${dateUTC}`,
      `• **heure de la requête** : ${heureUTC}`,
    );

    sections.push(
      '## 👤 INFORMATIONS PERSONNELLES',
      `• **Prénoms à utiliser** : ${prenoms || ''}`,
      `• **Nom de famille** : ${nom || ''}`,
      `• **Genre** : ${gender || 'Non spécifié'}\n`,
    );

    sections.push(
      '## 🎂 DONNÉES DE NAISSANCE EXACTES',
      `• **Date de naissance** : ${dateFormatee}`,
      `• **Heure de naissance** : ${heureNaissance || 'Non spécifié'}`,
      `• **Pays de naissance** : ${paysNaissance || 'Non spécifié'}`,
      `• **Lieu de naissance** : ${villeNaissance}, ${paysNaissance}\n`
    );

    sections.push(
      '## CARTE DU CIEL\n',
      formData.aspectsTexte,
    );

    return sections.join('\n');
  }

  private extractBirthData(form: any): BirthData {
    return {
      nom: form.nom ?? form.lastName ?? '',
      prenoms: form.prenoms ?? form.firstName ?? '',
      dateNaissance: form.dateNaissance ?? form.dateOfBirth ?? '',
      heureNaissance: form.heureNaissance ?? form.timeOfBirth ?? '',
      villeNaissance: form.villeNaissance ?? form.cityOfBirth ?? '',
      paysNaissance: (form.paysNaissance || form.countryOfBirth || form.country || '').trim(),
      gender: form.genre || form.gender || '',
      country: form.country || '',
    } as BirthData;
  }

  private validateBirthData(birthData: BirthData): void {
    const fieldLabels: Record<keyof BirthData, string> = {
      nom: 'Nom',
      prenoms: 'Prénom(s)',
      dateNaissance: 'Date de naissance',
      heureNaissance: 'Heure de naissance',
      villeNaissance: 'Ville de naissance',
      paysNaissance: 'Pays de naissance',
      gender: 'Genre',
      dateOfBirth: 'Date de naissance',
      country: 'Pays',
    };

    const requiredFields: (keyof BirthData)[] = [
      'nom', 'prenoms', 'dateNaissance', 'heureNaissance', 'villeNaissance', 'paysNaissance'
    ];

    const missingFields = requiredFields
      .filter((field) => !birthData[field]?.toString().trim())
      .map((field) => fieldLabels[field] || field);

    if (missingFields.length) {
      throw new HttpException(
        `Données de naissance incomplètes. Champ(s) manquant(s) : ${missingFields.join(', ')}`,
        HttpStatus.BAD_REQUEST
      );
    }
  }

  private formatDate(date: string | Date, options: Intl.DateTimeFormatOptions = {}): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };

    try {
      return new Date(date).toLocaleDateString('fr-FR', defaultOptions);
    } catch {
      return String(date);
    }
  }

  private safeLine(label: string, value: unknown, fallback = ''): string {
    const normalizedValue = typeof value === 'string' ? value.trim() : value == null ? '' : String(value);
    return `• **${label}** : ${normalizedValue || fallback}`;
  }

  private normalizeGenderFr(gender: any): string {
    if (!gender) return 'Non spécifié';
    const normalizedGender = String(gender).trim().toLowerCase();

    if (normalizedGender === 'male' || normalizedGender === 'masculin' || normalizedGender === 'm' || normalizedGender === 'homme') {
      return 'Homme';
    }

    if (normalizedGender === 'female' || normalizedGender === 'feminin' || normalizedGender === 'féminin' || normalizedGender === 'f' || normalizedGender === 'femme') {
      return 'Femme';
    }

    return String(gender).trim() || 'Non spécifié';
  }

  private buildPromptSansTierce(formData: any): string {
    const { prenoms, nom, dateNaissance, heureNaissance, villeNaissance, paysNaissance, gender } =
      this.extractBirthData(formData);

    return [
      this.getDateHeureUTC(),
      '## 👤 INFORMATIONS PERSONNELLES',
      this.safeLine('Prénoms à utiliser', prenoms),
      this.safeLine('Nom de famille', nom),
      this.safeLine('Genre', this.normalizeGenderFr(gender)),
      '',
      '## 🎂 DONNÉES DE NAISSANCE EXACTES',
      this.safeLine('Date de naissance', this.formatDate(dateNaissance), 'Non spécifié'),
      this.safeLine('Heure de naissance', heureNaissance, 'Non spécifié'),
      this.safeLine('Lieu de naissance', [villeNaissance, paysNaissance].filter(Boolean).join(', '), 'Non spécifié'),
      '',
      '## 🌌 CARTE DU CIEL',
      formData.aspectsTexte || 'Non disponible'
    ].join('\n');
  }

  private buildPromptUtilisateur(formData: any): string {
    const { prenoms, nom, dateNaissance, heureNaissance, villeNaissance, paysNaissance, gender, country } =
      this.extractBirthData(formData);

    this.validateBirthData({ prenoms, nom, dateNaissance, heureNaissance, villeNaissance, paysNaissance, gender, country });

    return [
      this.getDateHeureUTC(),
      '## 👤 INFORMATIONS PERSONNELLES — UTILISATEUR',
      this.safeLine('Prénoms à utiliser', prenoms),
      this.safeLine('Nom de famille', nom),
      this.safeLine('Genre', this.normalizeGenderFr(gender)),
      '',
      '## 🎂 DONNÉES DE NAISSANCE EXACTES — UTILISATEUR',
      this.safeLine('Date de naissance', this.formatDate(dateNaissance), 'Non spécifié'),
      this.safeLine('Heure de naissance', heureNaissance, 'Non spécifié'),
      this.safeLine('Lieu de naissance', [villeNaissance, paysNaissance].filter(Boolean).join(', '), 'Non spécifié'),
      '',
      '## 🌌 CARTE DU CIEL UTILISATEUR',
      formData.aspectsTexte || 'Non disponible'
    ].join('\n');
  }

  private async buildPromptTiersSeul(tierce: any): Promise<string> {
    return this.buildPromptTiersUnique(tierce, '');
  }

  private async buildPromptMultiTiersSeul(tierces: any[]): Promise<string> {
    const sections = await Promise.all(tierces.map(async (tierce, index) => {
      const prefix = `PERSONNE ${index + 1}`;
      const prompt = await this.buildPromptTiersUnique(tierce, prefix);
      return index < tierces.length - 1 ? `${prompt}\n\n---\n` : prompt;
    }));

    return sections.join('');
  }

  private async buildPromptTiersUnique(tierce: any, prefix: string): Promise<string> {
    const gender = this.normalizeGenderFr(tierce?.gender || tierce?.genre);
    const dateFormatee = this.formatDate(tierce?.dateNaissance);
    const lieu = [tierce?.villeNaissance, tierce?.paysNaissance || tierce?.country]
      .filter(Boolean).join(', ') || 'Non spécifié';
    const aspectsTexte = await this.getTierceAspectsTexte(tierce);

    const titreInfo = prefix
      ? `## 👤 INFORMATIONS PERSONNELLES — ${prefix}`
      : '## 👤 INFORMATIONS PERSONNELLES';

    const titreNaissance = prefix
      ? `## 🎂 DONNÉES DE NAISSANCE EXACTES — ${prefix}`
      : '## 🎂 DONNÉES DE NAISSANCE EXACTES';

    return [
      this.getDateHeureUTC(),
      titreInfo,
      this.safeLine('Prénoms à utiliser', tierce?.prenoms),
      this.safeLine('Nom de famille', tierce?.nom),
      this.safeLine('Genre', gender),
      '',
      titreNaissance,
      this.safeLine('Date de naissance', dateFormatee, 'Non spécifié'),
      this.safeLine('Heure de naissance', tierce?.heureNaissance, 'Non spécifié'),
      this.safeLine('Lieu de naissance', lieu, 'Non spécifié'),
      '',
      prefix ? `## 🌌 CARTE DU CIEL — ${prefix}` : '## 🌌 CARTE DU CIEL',
      aspectsTexte,
    ].join('\n');
  }

  private async buildPromptTiersSimple(tierce: any): Promise<string> {
    return this.buildPromptTiersUnique(tierce, 'PERSONNE TIERCE');
  }

  private async buildPromptTiersMultiples(tierces: any[]): Promise<string> {
    const prompts = await Promise.all(
      tierces.map((tierce, index) => this.buildPromptTiersUnique(tierce, `PERSONNE TIERCE ${index + 1}`))
    );

    return prompts.join('\n\n---\n\n');
  }

  private async getTierceAspectsTexte(tierce: any): Promise<string> {
    const existingSkyChart = tierce?.aspectsTexte || tierce?.carteDuCiel || tierce?.skyChart;
    if (typeof existingSkyChart === 'string' && existingSkyChart.trim()) {
      return existingSkyChart.trim();
    }

    const birthData: BirthData = {
      nom: tierce?.nom ?? '',
      prenoms: tierce?.prenoms ?? '',
      dateNaissance: tierce?.dateNaissance ?? '',
      heureNaissance: tierce?.heureNaissance ?? '',
      villeNaissance: tierce?.villeNaissance ?? '',
      paysNaissance: (tierce?.paysNaissance || tierce?.country || '').trim(),
      gender: tierce?.gender || tierce?.genre || '',
      country: tierce?.country || '',
    };

    this.validateBirthData(birthData);

    const { aspectsTexte } = await this.deepseekService.generateSkyChart(birthData);
    return aspectsTexte?.trim() || 'Non disponible';
  }

  private getDateHeureUTC(): string {
    const now = new Date();
    const dateUTC = now.toISOString().split('T')[0];
    const heureUTC = now.toISOString().split('T')[1].split('.')[0];

    return [
      '## 📅 DATE ET HEURE UTC',
      `• **Date du jour** : ${dateUTC}`,
      `• **Heure de la requête** : ${heureUTC}`
    ].join('\n');
  }

  private estConsultationPourTiersSeul(consultation: any): boolean {
    return consultation?.choice?.frequence === 'LIBRE' && consultation?.choice?.participants === 'POUR_TIERS';
  }

  private getCalendrierTransits2026(): string {
    return `

---

# CALENDRIER DES TRANSITS 2026

## MARS
${this.formatTransit('MARS', [
  'Capricorne: 16/01 → 23/02',
  'Verseau: 23/02 → 02/04',
  'Poissons: 02/04 → 11/05',
  'Bélier: 11/05 → 21/06',
  'Taureau: 21/06 → 02/08',
  'Gémeaux: 02/08 → 18/09',
  'Cancer: 18/09 → 12/11',
  'Lion: 12/11 → 31/12'
])}

## MERCURE
${this.formatTransit('MERCURE', [
  'Sagittaire (D): 01/01 → 17/01',
  'Capricorne (D): 17/01 → 03/02',
  'Verseau (D): 03/02 → 26/02',
  'Verseau (R): 26/02 → 20/03',
  'Verseau (D): 20/03 → 11/04',
  'Poissons (D): 11/04 → 30/04',
  'Bélier (D): 30/04 → 15/05',
  'Taureau (D): 15/05 → 29/05',
  'Gémeaux (D): 29/05 → 29/06',
  'Cancer (R): 29/06 → 23/07',
  'Cancer (D): 23/07 → 05/08',
  'Lion (D): 05/08 → 22/08',
  'Vierge (D): 22/08 → 07/09',
  'Balance (D): 07/09 → 24/10',
  'Scorpion (R): 24/10 → 13/11',
  'Balance (D): 13/11 → 02/12',
  'Scorpion (D): 02/12 → 22/12',
  'Sagittaire (D): 22/12 → 31/12'
])}

## VÉNUS
${this.formatTransit('VÉNUS', [
  'Capricorne: 01/01 → 23/01',
  'Verseau: 23/01 → 16/02',
  'Poissons: 16/02 → 12/03',
  'Bélier: 12/03 → 06/04',
  'Taureau: 06/04 → 30/04',
  'Gémeaux: 30/04 → 24/05',
  'Cancer: 24/05 → 17/06',
  'Lion: 17/06 → 11/07',
  'Vierge: 11/07 → 06/08',
  'Balance: 06/08 → 31/08',
  'Scorpion: 31/08 → 24/09',
  'Sagittaire: 24/09 → 18/10',
  'Capricorne: 18/10 → 11/11',
  'Verseau: 11/11 → 05/12',
  'Poissons: 05/12 → 31/12'
])}

## JUPITER
${this.formatTransit('JUPITER', [
  'Gémeaux (D): 01/01 → 02/06',
  'Cancer (D): 02/06 → 09/10',
  'Cancer (R): 09/10 → 31/12'
])}

## SATURNE
${this.formatTransit('SATURNE', [
  'Poissons (D): 01/01 → 13/02',
  'Bélier (D): 14/02 → 26/07',
  'Bélier (R): 26/07 → 10/12',
  'Bélier (D): 10/12 → 31/12'
])}

## URANUS
${this.formatTransit('URANUS', [
  'Taureau (R): 01/01 → 04/02',
  'Taureau (D): 04/02 → 26/04',
  'Gémeaux (D): 26/04 → 10/09',
  'Gémeaux (R): 10/09 → 31/12'
])}

## NEPTUNE
${this.formatTransit('NEPTUNE', [
  'Poissons (D): 01/01 → 26/01',
  'Bélier (D): 26/01 → 07/07',
  'Bélier (R): 07/07 → 12/12',
  'Bélier (D): 12/12 → 31/12'
])}

## PLUTON
${this.formatTransit('PLUTON', [
  'Verseau (D): 01/01 → 06/05',
  'Verseau (R): 06/05 → 15/10',
  'Verseau (D): 15/10 → 31/12'
])}

## CHIRON
${this.formatTransit('CHIRON', [
  'Bélier (D): 01/01 → 19/06',
  'Taureau (D): 19/06 → 03/08',
  'Taureau (R): 03/08 → 19/09',
  'Bélier (R): 19/09 → 31/12'
])}

## NŒUDS LUNAIRES
• Nœud Nord Bélier / Sud Balance: 01/01 → 17/05
• Nœud Nord Poissons / Sud Vierge: 17/05 → 31/12

## LUNE NOIRE (Lilith)
${this.formatTransit('LILITH', [
  'Gémeaux: 01/01 → 22/01',
  'Cancer: 22/01 → 14/02',
  'Lion: 14/02 → 06/03',
  'Vierge: 06/03 → 29/03',
  'Balance: 29/03 → 17/04',
  'Scorpion: 17/04 → 05/05',
  'Sagittaire: 05/05 → 25/05',
  'Capricorne: 25/05 → 15/06',
  'Verseau: 15/06 → 06/07',
  'Poissons: 06/07 → 27/07',
  'Bélier: 27/07 → 17/08',
  'Taureau: 17/08 → 06/09',
  'Gémeaux: 06/09 → 26/09',
  'Cancer: 26/09 → 16/10',
  'Lion: 16/10 → 06/11',
  'Vierge: 06/11 → 26/11',
  'Balance: 26/11 → 16/12',
  'Scorpion: 16/12 → 31/12'
])}`;
  }

  private formatTransit(planete: string, periods: string[]): string {
    return periods.map((period) => `• ${planete} ${period}`).join('\n');
  }
}