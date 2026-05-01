/**
 * Catálogo simplificado DIVIPOLA: 32 departamentos colombianos + Bogotá D.C.,
 * con sus municipios/ciudades principales.
 *
 * Decisión de scope: incluimos capitales + municipios más poblados de cada
 * departamento (10–25 por departamento promedio). NO los 1.100+ municipios
 * completos del DANE. Esto cubre ~90% de pedidos reales y mantiene el JSON
 * en ~25 KB. El usuario que necesite un municipio fuera de la lista lo
 * escribe en "Otro" (input libre).
 *
 * Cuando el negocio crezca y sea útil tener cobertura completa, este archivo
 * se reemplaza por el dataset oficial DANE sin tocar el resto del código.
 *
 * Fuente: DANE División Político-Administrativa 2023.
 */

export type Department = {
  /** Código DANE de 2 dígitos */
  code: string;
  name: string;
  /** Municipios/ciudades principales en orden de relevancia */
  cities: string[];
};

export const DEPARTMENTS: Department[] = [
  {
    code: "11",
    name: "Bogotá D.C.",
    cities: ["Bogotá"],
  },
  {
    code: "05",
    name: "Antioquia",
    cities: [
      "Medellín",
      "Bello",
      "Itagüí",
      "Envigado",
      "Apartadó",
      "Turbo",
      "Rionegro",
      "Sabaneta",
      "Copacabana",
      "La Estrella",
      "Caldas",
      "Girardota",
      "Marinilla",
      "El Carmen de Viboral",
      "La Ceja",
      "Caucasia",
      "Necoclí",
      "Chigorodó",
      "Yarumal",
    ],
  },
  {
    code: "08",
    name: "Atlántico",
    cities: [
      "Barranquilla",
      "Soledad",
      "Malambo",
      "Sabanagrande",
      "Puerto Colombia",
      "Galapa",
      "Baranoa",
      "Sabanalarga",
      "Santo Tomás",
      "Palmar de Varela",
    ],
  },
  {
    code: "13",
    name: "Bolívar",
    cities: [
      "Cartagena",
      "Magangué",
      "Turbaco",
      "Arjona",
      "El Carmen de Bolívar",
      "María La Baja",
      "San Pablo",
      "Mompós",
      "Santa Rosa del Sur",
      "San Jacinto",
    ],
  },
  {
    code: "15",
    name: "Boyacá",
    cities: [
      "Tunja",
      "Duitama",
      "Sogamoso",
      "Chiquinquirá",
      "Paipa",
      "Puerto Boyacá",
      "Villa de Leyva",
      "Moniquirá",
      "Garagoa",
      "Samacá",
    ],
  },
  {
    code: "17",
    name: "Caldas",
    cities: [
      "Manizales",
      "La Dorada",
      "Chinchiná",
      "Villamaría",
      "Riosucio",
      "Anserma",
      "Supía",
      "Salamina",
      "Aguadas",
      "Pensilvania",
    ],
  },
  {
    code: "18",
    name: "Caquetá",
    cities: [
      "Florencia",
      "San Vicente del Caguán",
      "Puerto Rico",
      "El Doncello",
      "La Montañita",
      "Belén de los Andaquíes",
    ],
  },
  {
    code: "85",
    name: "Casanare",
    cities: [
      "Yopal",
      "Aguazul",
      "Villanueva",
      "Tauramena",
      "Paz de Ariporo",
      "Monterrey",
      "Hato Corozal",
    ],
  },
  {
    code: "19",
    name: "Cauca",
    cities: [
      "Popayán",
      "Santander de Quilichao",
      "Puerto Tejada",
      "Patía",
      "Piendamó",
      "Caloto",
      "Guapi",
      "Miranda",
      "Corinto",
      "Cajibío",
    ],
  },
  {
    code: "20",
    name: "Cesar",
    cities: [
      "Valledupar",
      "Aguachica",
      "Codazzi",
      "La Jagua de Ibirico",
      "Curumaní",
      "Bosconia",
      "Chiriguaná",
      "El Copey",
    ],
  },
  {
    code: "27",
    name: "Chocó",
    cities: [
      "Quibdó",
      "Istmina",
      "Tadó",
      "Condoto",
      "Bahía Solano",
      "Nuquí",
      "Acandí",
      "Riosucio",
    ],
  },
  {
    code: "23",
    name: "Córdoba",
    cities: [
      "Montería",
      "Lorica",
      "Cereté",
      "Sahagún",
      "Planeta Rica",
      "Montelíbano",
      "Tierralta",
      "Ciénaga de Oro",
      "Ayapel",
      "San Pelayo",
    ],
  },
  {
    code: "25",
    name: "Cundinamarca",
    cities: [
      "Soacha",
      "Facatativá",
      "Zipaquirá",
      "Chía",
      "Mosquera",
      "Madrid",
      "Funza",
      "Cajicá",
      "Fusagasugá",
      "Girardot",
      "Cota",
      "Tabio",
      "Tenjo",
      "La Calera",
      "Sopó",
      "Tocancipá",
      "Sibaté",
      "Subachoque",
    ],
  },
  {
    code: "94",
    name: "Guainía",
    cities: ["Inírida"],
  },
  {
    code: "95",
    name: "Guaviare",
    cities: ["San José del Guaviare", "El Retorno", "Calamar", "Miraflores"],
  },
  {
    code: "41",
    name: "Huila",
    cities: [
      "Neiva",
      "Pitalito",
      "Garzón",
      "La Plata",
      "Campoalegre",
      "Rivera",
      "Aipe",
      "San Agustín",
      "Isnos",
      "Gigante",
    ],
  },
  {
    code: "44",
    name: "La Guajira",
    cities: [
      "Riohacha",
      "Maicao",
      "San Juan del Cesar",
      "Fonseca",
      "Villanueva",
      "Uribia",
      "Manaure",
      "Dibulla",
    ],
  },
  {
    code: "47",
    name: "Magdalena",
    cities: [
      "Santa Marta",
      "Ciénaga",
      "Fundación",
      "Aracataca",
      "Plato",
      "El Banco",
      "Pivijay",
      "Zona Bananera",
    ],
  },
  {
    code: "50",
    name: "Meta",
    cities: [
      "Villavicencio",
      "Acacías",
      "Granada",
      "Puerto López",
      "Puerto Gaitán",
      "Cumaral",
      "San Martín",
      "Restrepo",
    ],
  },
  {
    code: "52",
    name: "Nariño",
    cities: [
      "Pasto",
      "Tumaco",
      "Ipiales",
      "Túquerres",
      "La Unión",
      "Samaniego",
      "Sandoná",
      "Barbacoas",
      "El Charco",
    ],
  },
  {
    code: "54",
    name: "Norte de Santander",
    cities: [
      "Cúcuta",
      "Ocaña",
      "Pamplona",
      "Villa del Rosario",
      "Los Patios",
      "Tibú",
      "El Zulia",
      "Chinácota",
      "Convención",
    ],
  },
  {
    code: "86",
    name: "Putumayo",
    cities: [
      "Mocoa",
      "Puerto Asís",
      "Orito",
      "Valle del Guamuez",
      "Sibundoy",
      "Villagarzón",
    ],
  },
  {
    code: "63",
    name: "Quindío",
    cities: [
      "Armenia",
      "Calarcá",
      "La Tebaida",
      "Montenegro",
      "Quimbaya",
      "Circasia",
      "Filandia",
      "Salento",
    ],
  },
  {
    code: "66",
    name: "Risaralda",
    cities: [
      "Pereira",
      "Dosquebradas",
      "Santa Rosa de Cabal",
      "La Virginia",
      "Belén de Umbría",
      "Quinchía",
      "Marsella",
      "Apía",
    ],
  },
  {
    code: "88",
    name: "San Andrés y Providencia",
    cities: ["San Andrés", "Providencia"],
  },
  {
    code: "68",
    name: "Santander",
    cities: [
      "Bucaramanga",
      "Floridablanca",
      "Girón",
      "Piedecuesta",
      "Barrancabermeja",
      "San Gil",
      "Socorro",
      "Málaga",
      "Vélez",
      "Barbosa",
      "Rionegro",
      "Sabana de Torres",
    ],
  },
  {
    code: "70",
    name: "Sucre",
    cities: [
      "Sincelejo",
      "Corozal",
      "Sampués",
      "San Marcos",
      "Tolú",
      "San Onofre",
      "Coveñas",
      "Majagual",
    ],
  },
  {
    code: "73",
    name: "Tolima",
    cities: [
      "Ibagué",
      "Espinal",
      "Melgar",
      "Honda",
      "Líbano",
      "Mariquita",
      "Chaparral",
      "Fresno",
      "Purificación",
      "Guamo",
    ],
  },
  {
    code: "76",
    name: "Valle del Cauca",
    cities: [
      "Cali",
      "Palmira",
      "Buenaventura",
      "Tuluá",
      "Cartago",
      "Buga",
      "Jamundí",
      "Yumbo",
      "Candelaria",
      "Florida",
      "Pradera",
      "Sevilla",
      "Zarzal",
      "Roldanillo",
      "El Cerrito",
    ],
  },
  {
    code: "97",
    name: "Vaupés",
    cities: ["Mitú", "Carurú", "Taraira"],
  },
  {
    code: "99",
    name: "Vichada",
    cities: ["Puerto Carreño", "La Primavera", "Cumaribo", "Santa Rosalía"],
  },
  {
    code: "81",
    name: "Arauca",
    cities: [
      "Arauca",
      "Saravena",
      "Tame",
      "Arauquita",
      "Fortul",
      "Puerto Rondón",
    ],
  },
  {
    code: "91",
    name: "Amazonas",
    cities: ["Leticia", "Puerto Nariño"],
  },
];

/** Devuelve nombres de departamentos ordenados alfabéticamente para el select */
export function listDepartmentNames(): string[] {
  return [...DEPARTMENTS]
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((d) => d.name);
}

/** Devuelve municipios de un departamento, vacío si el nombre no existe */
export function citiesOfDepartment(departmentName: string): string[] {
  const dep = DEPARTMENTS.find((d) => d.name === departmentName);
  return dep ? [...dep.cities].sort((a, b) => a.localeCompare(b, "es")) : [];
}
