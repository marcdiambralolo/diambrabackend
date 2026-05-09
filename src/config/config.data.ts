
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const servicesStructure = require(path.resolve(__dirname, '../../docs/services_structure.json'));

// Expose the raw structure for /config/domaines
export function getDomaines() {
  return servicesStructure;
}

// Get all consultations for a given domain (ASTROLOGIE or NUMEROLOGIE)
export function getConsultationsByDomaine(domaineId: string) {
  const domaine = servicesStructure[domaineId.toUpperCase()];
  if (!domaine) return [];
  // Aggregate all consultations in all rubriques
  let consultations: any[] = [];
  Object.values(domaine).forEach((rubrique: any) => {
    if (rubrique.consultations) {
      consultations = consultations.concat(rubrique.consultations);
    }
  });
  return consultations;
}

// Get a consultation by its name (nom)
export function getConsultationById(consultationId: string) {
  for (const domaineKey of Object.keys(servicesStructure)) {
    const domaine = servicesStructure[domaineKey];
    for (const rubriqueKey of Object.keys(domaine)) {
      const rubrique = domaine[rubriqueKey];
      if (rubrique.consultations) {
        const found = rubrique.consultations.find((c: any) => c.nom === consultationId || c.nom.toLowerCase() === consultationId.toLowerCase());
        if (found) return found;
      }
    }
  }
  return undefined;
}

// Get all consultations for a given rubrique (by rubrique key)
export function getConsultationsBySousRubrique(sousRubriqueId: string) {
  for (const domaineKey of Object.keys(servicesStructure)) {
    const domaine = servicesStructure[domaineKey];
    const rubrique = domaine[sousRubriqueId];
    if (rubrique && rubrique.consultations) {
      return rubrique.consultations;
    }
  }
  return [];
}

// Platform stats
export function getPlatformStats() {
  let totalConsultations = 0;
  let consultationsUnique = 0;
  let consultationsCycliques = 0;
  let totalRubriques = 0;
  for (const domaineKey of Object.keys(servicesStructure)) {
    const domaine = servicesStructure[domaineKey];
    for (const rubriqueKey of Object.keys(domaine)) {
      totalRubriques++;
      const rubrique = domaine[rubriqueKey];
      if (rubrique.consultations) {
        for (const consultation of rubrique.consultations) {
          totalConsultations++;
          if (consultation.type === 'unique') consultationsUnique++;
          else consultationsCycliques++;
        }
      }
    }
  }
  return {
    totalDomaines: Object.keys(servicesStructure).length,
    totalRubriques,
    totalConsultations,
    consultationsUnique,
    consultationsCycliques,
  };
}
