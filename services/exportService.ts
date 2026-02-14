import { ScanResult } from '../types';

/**
 * Exporte les résultats d'analyse (inventaire) vers un fichier CSV.
 * @param data Les données d'inventaire (tableau de ScanResult).
 * @param filename Le nom de fichier souhaité (sans extension).
 */
export const exportToCSV = (data: ScanResult[], filename: string = 'inventaire_vehicules') => {
  // En-têtes CSV
  const headers = [
    'Date Scan',
    'VIN',
    'Marque',
    'Modèle',
    'Année Fab.',
    'Immatriculation',
    'Carburant',
    'Motorisation',
    'Couleur',
    'Valeur Min (MAD)',
    'Valeur Max (MAD)',
    'Notes',
    'Utilisateur',
    'Lieu'
  ];

  // Transformer les données en lignes CSV
  const rows = data.map(item => {
    const analysis = item.analysis || {};
    const rowData = [
      `"${new Date(item.timestamp).toLocaleDateString('fr-MA')} ${new Date(item.timestamp).toLocaleTimeString('fr-MA')}"`,
      `"${analysis.vin || 'N/A'}"`,
      `"${analysis.brand || 'Inconnu'}"`,
      `"${analysis.model || 'Inconnu'}"`,
      `"${analysis.yearOfManufacture || ''}"`,
      `"${analysis.licensePlate || ''}"`,
      `"${analysis.fuelType || ''}"`,
      `"${analysis.motorization || ''}"`,
      `"${analysis.color || ''}"`,
      `"${analysis.marketValueMin || ''}"`,
      `"${analysis.marketValueMax || ''}"`,
      `"${(analysis.inventoryNotes || '').replace(/"/g, '""')}"`, // Échapper les guillemets
      `"${item.userName || ''}"`,
      `"${item.location || ''}"`
    ];
    return rowData.join(';'); // Utilisation du point-virgule pour compatibilité Excel FR
  });

  // Assembler le contenu CSV avec BOM pour UTF-8 (support Excel)
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');

  // Créer le Blob et déclencher le téléchargement
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Astuce pour le téléchargement via lien dynamique
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};
