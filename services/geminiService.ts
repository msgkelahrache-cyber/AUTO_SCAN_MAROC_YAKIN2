import { GoogleGenAI, Type, Content } from "@google/genai";
import { VehicleAnalysis, ScanType } from "../types";

const getAIClient = () => {
  if (!process.env.API_KEY) throw new Error("Clé API Google Gemini manquante");
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Analyse un véhicule uniquement via son numéro VIN textuel.
 */
export const analyzeVehicleByVin = async (vin: string): Promise<Partial<VehicleAnalysis>> => {
  const ai = getAIClient();

  const systemPrompt = `Tu es KHABIR, expert automobile certifié au Maroc. 
       À partir de ce numéro VIN : ${vin}, effectue un décodage ISO 3779 rigoureux.
       
       RÈGLES D'IDENTIFICATION :
       1. Examine le VDS (caractères 4 à 9). Pour le groupe VAG (Audi, VW, Seat), les positions 7 et 8 sont critiques pour le code modèle (ex: 8X=A1, F5=A5, 5F=Leon, 51=Ateca).
       2. Ne confonds pas les segments. Si les positions 7-8 indiquent '5F', le modèle est 'LEON', pas 'ATECA'.
       3. Croise avec le marché MAROCAIN (importateurs officiels comme CAC, Sopriam, Renault Commerce Maroc).
       
       CHAMPS REQUIS :
       - brand : Constructeur.
       - model : Modèle commercial exact au Maroc.
       - deductionReasoning : Explique précisément quel code VDS (positions 4-9) ou VIS a permis d'identifier le modèle (ex: "Identifié comme Audi A1 grâce au code VDS '8X' en positions 7-8").
       - yearOfManufacture : Année code (Position 10).
       - motorization : Motorisation standard au Maroc.
       - fuelType : ["Essence", "Diesel", "Hybride", "Électrique", "N/A"].
       - color : Couleur probable.
       
       Réponds uniquement en JSON pur.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Décoder précisément le VIN : ${vin} selon ISO 3779. JSON.`,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          brand: { type: Type.STRING },
          model: { type: Type.STRING },
          deductionReasoning: { type: Type.STRING },
          yearOfManufacture: { type: Type.STRING },
          motorization: { type: Type.STRING },
          fuelType: { type: Type.STRING, enum: ["Essence", "Diesel", "Hybride", "Électrique", "N/A"] },
          color: { type: Type.STRING }
        },
        required: ["brand", "model", "deductionReasoning", "yearOfManufacture", "motorization", "fuelType"]
      }
    }
  });

  const textResponse = response.text;
  if (!textResponse) return {};
  return JSON.parse(textResponse.trim());
};

export const analyzeVehicleCritical = async (
  base64Image: string,
  mode: ScanType = 'vin'
): Promise<Partial<VehicleAnalysis>> => {
  const ai = getAIClient();

  const systemPrompt = `Tu es KHABIR, expert extraction documentaire automobile au Maroc.
       Ta mission est d'extraire le VIN (Numéro de Châssis) de l'image.
       
       RÈGLES CRITIQUES (ISO 3779 & NM ISO 3779 Maroc) :
       1. VIN = 17 caractères alphanumériques (0-9, A-Z sauf I, O, Q pour éviter confusion).
       2. Isole la zone du VIN (pare-brise, portière, carte grise) et OCR le texte.
       3. CORRIGE les erreurs d'OCR courantes :
          - 'I' -> '1'
          - 'O' -> '0'
          - 'Q' -> '0'
          - 'B' -> '8'
          - 'S' -> '5'
          - 'Z' -> '2'
       
       ANALYSE DU VÉHICULE (DÉDUCTION) :
       - Utilise le WMI (3 premiers chars) pour la Marque/Pays.
       - Utilise le VDS (chars 4-9) pour le Modèle/Moteur.
       - Utilise le caractère 10 pour l'Année Modèle (Code Année).
       
       EXTRAIRE :
       - brand : Nom du constructeur (Uppercased).
       - model : Modèle déduit du VDS.
       - vin : Le VIN corrigé de 17 caractères.
       - deductionReasoning : "Identifié [Marque] [Modèle] grâce au code WMI [XXX] et VDS [XXXX]."
       - yearOfManufacture : Année déduite du 10ème caractère.
       - licensePlate : Immatriculation (si visible).
       - registrationYear : Année 1ère mise en circulation (si visible carte grise).
       
       Réponds uniquement en JSON pur.
       FORMAT DATES : Années de 4 chiffres (YYYY).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
        { text: `Analyse critique ISO 3779 image de ${mode}. JSON.` }
      ]
    },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          vin: { type: Type.STRING },
          brand: { type: Type.STRING },
          model: { type: Type.STRING },
          deductionReasoning: { type: Type.STRING },
          yearOfManufacture: { type: Type.STRING },
          licensePlate: { type: Type.STRING },
          registrationYear: { type: Type.STRING }
        },
        required: ["brand", "vin", "model"]
      }
    }
  });

  const textResponse = response.text;
  if (!textResponse) throw new Error("IA_EMPTY_RESPONSE");
  const rawData = JSON.parse(textResponse.trim());

  return {
    vin: String(rawData.vin || "").replace(/[^A-Z0-9]/gi, '').toUpperCase(),
    brand: String(rawData.brand || "Inconnu").toUpperCase(),
    model: String(rawData.model || "ANALYSE...").toUpperCase(),
    deductionReasoning: rawData.deductionReasoning || "",
    yearOfManufacture: String(rawData.yearOfManufacture || "N/A"),
    licensePlate: String(rawData.licensePlate || ""),
    registrationYear: String(rawData.registrationYear || "")
  };
};

export const analyzeVehicleDetails = async (
  base64Image: string,
  brand: string
): Promise<Partial<VehicleAnalysis>> => {
  const ai = getAIClient();


  const systemPrompt = `Expert automobile spécialiste du marché MAROCAIN (KABIR).
       À partir de cette image et sachant que la marque est ${brand}, affine l'analyse.
       
       CONTEXTE MARCHÉ MAROC (Réglementation NM ISO 3779):
       - Le VIN doit être conforme.
       - Les motorisations sont souvent spécifiques (ex: 1.5 dCi, 2.0 TDI, 2.2 CDI).
       - IMPORTATEURS OFFICIELS :
         * Audi/VW/Skoda/Porsche/Bentley -> CAC (Centrale Automobile Chérifienne)
         * Peugeot/Citroën/DS -> SOPRIAM
         * Renault/Dacia -> RENAULT COMMERCE MAROC
         * Toyota -> TOYOTA DU MAROC
         * Fiat/Jeep/Alfa -> STELLANTIS MAROC
         * BMW/Mini -> SMEIA
         * Mercedes -> AUTO NEJMA
         * Hyundai -> GLOBAL ENGINES
         * Kia -> KIA MAROC
       
       CHAMPS À AFFINER :
       - model : Version/finition exacte si identifiable (ex: "Golf 8 R-Line").
       - motorization : DÉDUCTION LOGIQUE via VIN et Visuel (ex: sigle 'TDI', échappement).
       - fuelType : ["Essence", "Diesel", "Hybride", "Électrique", "N/A"].
       - color : Nom commercial approximatif (ex: "Gris Nardo", "Blanc Nacré").
       - registrationYear : Année 1ère mise en circulation.
       - deductionReasoning : EXPLIQUE COMMENT le modèle et le moteur sont déduits (Code Moteur dans le VIN ? Logo ?).
       
       Réponds uniquement en JSON pur.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
        { text: `Analyse détaillée pour ${brand}. JSON.` }
      ]
    },
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          model: { type: Type.STRING },
          motorization: { type: Type.STRING },
          fuelType: { type: Type.STRING, enum: ["Essence", "Diesel", "Hybride", "Électrique", "N/A"] },
          color: { type: Type.STRING },
          registrationYear: { type: Type.STRING },
          deductionReasoning: { type: Type.STRING }
        },
        required: []
      }
    }
  });

  const textResponse = response.text;
  if (!textResponse) return {};
  return JSON.parse(textResponse.trim());
};


/**
 * Génère un rapport d'expertise détaillé à partir d'un VIN.
 */
export const getVinAnalysisReport = async (vin: string): Promise<string> => {
  const ai = getAIClient();

  const systemPrompt = `Tu es KHABIR, expert automobile officiel au Maroc.
       Rédige un rapport d'expertise technique pour le VIN : ${vin}.
       Le rapport doit rassurer l'acheteur et prouver la conformité.
       
       STRUCTURE DU RAPPORT (Format Markdown) :
       
       ### 1. 🚘 Identité & Conformité
       - **Marque/Modèle** : [Nom]
       - **Origine** : [Pays détecté via WMI]
       - **Importateur Maroc** : (Citer l'importateur officiel: CAC pour VAG, Sopriam pour PSA, Auto Nejma pour Mercedes, Smeia pour BMW, etc.)
       
       ### 2. ⚙️ Analyse Technique (Déduction VIN)
       - **Moteur** : [Déduction via VDS]
       - **Année Modèle** : [Déduction via 10ème caractère]
       - *Note : Cette analyse respecte la norme NM ISO 3779 en vigueur au Maroc.*
       
       ### 3. 🔍 Décodage Détaillé
       | Section | Code | Signification |
       | :--- | :--- | :--- |
       | **WMI** | ${vin.substring(0, 3)} | Constructeur / Pays |
       | **VDS** | ${vin.substring(3, 9)} | Caractéristiques (Châssis, Moteur) |
       | **VIS** | ${vin.substring(9, 17)} | Identification Unique / Usine |
       
       ### 4. ⚠️ Points de Vigilance (Spécifique Modèle)
       - Lister 2-3 points à surveiller sur ce modèle précis (ex: distribution, boîte auto, etc.).
       
       Ton expert et professionnel. Pas de bla-bla générique.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Génère le rapport d'expertise pour le VIN : ${vin}.`,
    config: {
      systemInstruction: systemPrompt,
    }
  });

  return response.text?.trim() || "Impossible de générer le rapport pour ce VIN.";
};

/**
 * Interagit avec l'expert IA en mode conversationnel.
 */
export const chatWithExpert = async (history: Content[], question: string): Promise<string> => {
  const ai = getAIClient();
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `Tu es KHABIR, un expert automobile marocain très expérimenté et serviable. 
            Réponds aux questions techniques sur les véhicules, les pannes, les procédures d'entretien, et le marché marocain. 
            Sois précis, concis et utilise un langage accessible.`,
    },
    history,
  });

  const response = await chat.sendMessage({ message: question });

  return response.text?.trim() || "Désolé, je n'ai pas pu traiter votre demande.";
};


/**
 * Estime la valeur marchande d'un véhicule sur le marché marocain.
 */
export const estimateMarketValue = async (vehicle: VehicleAnalysis): Promise<Partial<VehicleAnalysis>> => {
  const ai = getAIClient();

  const systemPrompt = `Tu es un expert en évaluation de véhicules d'occasion au MAROC.
  Analyse les détails suivants et fournis une estimation de la valeur marchande en Dirhams Marocains (MAD).

  DÉTAILS DU VÉHICULE :
  - Marque: ${vehicle.brand}
  - Modèle: ${vehicle.model}
  - Année de fabrication: ${vehicle.yearOfManufacture}
  - Année de 1ère immatriculation: ${vehicle.registrationYear || 'N/A'}
  - Motorisation: ${vehicle.motorization}
  - Carburant: ${vehicle.fuelType}
  - Notes sur l'état: ${vehicle.inventoryNotes || "Pas de notes spécifiques sur l'état."}

  TA MISSION :
  1.  **Estimer une fourchette de prix réaliste** (min et max) pour une vente entre particuliers au Maroc.
  2.  **Fournir une justification claire** expliquant les facteurs pris en compte (popularité du modèle, motorisation, décote, état général supposé basé sur les notes).

  Réponds uniquement en JSON pur. Ne rajoute aucun commentaire en dehors du JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: "Estime la valeur de ce véhicule.",
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          marketValueMin: { type: Type.INTEGER, description: "Prix minimum estimé en MAD" },
          marketValueMax: { type: Type.INTEGER, description: "Prix maximum estimé en MAD" },
          marketValueJustification: { type: Type.STRING, description: "Justification détaillée de l'estimation." },
        },
        required: ["marketValueMin", "marketValueMax", "marketValueJustification"],
      },
    },
  });

  const textResponse = response.text;
  if (!textResponse) throw new Error("IA_ESTIMATION_FAILED");
  return JSON.parse(textResponse.trim());
};
