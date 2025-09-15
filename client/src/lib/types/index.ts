export interface Alumne {
  id: string;
  nom: string;
  grup: string;
  anyCurs: string;
  estat: 'alta' | 'baixa' | 'migrat';
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonalFamiliar {
  id: string;
  sexe?: 'M' | 'F' | 'X';
  dataNaixement?: string;
  tutor1_nom?: string;
  tutor1_tel?: string;
  tutor1_email?: string;
  tutor2_nom?: string;
  tutor2_tel?: string;
  tutor2_email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Entrevista {
  id: string;
  alumneId: string;
  alumneNom?: string; // Para mostrar en listados
  anyCurs: string;
  data: string;
  acords: string;
  usuariCreadorId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Curs {
  any: string;
  grups: string[];
}

export interface User {
  id: string;
  email: string;
  nom: string;
  role: 'admin' | 'docent';
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}
