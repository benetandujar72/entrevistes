const fs = require('fs');
const csv = require('csv-parser');

// Llista d'alumnes esperats que has proporcionat
const alumnesEsperats = [
  "Arribas Bonilla, Neizan", "Ballester Altabella, Lola", "Cano Espinal, Abdiel Josue", "Clarà Cara, Max",
  "Cumelles Galvez, Xavier", "Cunha Morote, Lucas", "Del Pino Gerbolés, Olívia", "Fluja Sánchez, Delia",
  "Galan del Pino, Sheila", "Giralt Salguero, Aina", "González Fonts, Jan", "Ilie , Maria Dayana",
  "Navarro Giménez, Vera", "Páez Dueñas, Irene", "Quirós Solorzano, Lua", "Rama Morales, Laura",
  "Real Frutos, Albert", "Rodríguez Lozano, Hugo", "Sanz Riosalido, Lucía", "Carrillo Garcia, Antonio David",
  "Gómez-Lamadrid Valle, Héctor", "González Baño, Romeo", "Hernández González, Victor", "Huescar Cerezo, Uxue",
  "Jiang , Hang", "Lainez Perez, Júlia", "Moisan Marginean, Karina", "Pardo López, Nayara",
  "Pérez Gómez, Hugo", "Ramírez Alunda, Aithana Yanelly", "Rodríguez Catena, Alex", "Romera Hidalgo, Ilian",
  "Sánchez Pozo, Hugo", "Sánchez Soto, Daniela", "Suazo Colomer, Aisha Nahomi", "Taus Escriche, Nahla",
  "Villanova Valbuena, Kiara", "Álvarez Hernández, Hugo", "Cuevas Gálvez, Leire", "Da Sousa Ruiz, Ona",
  "Ferrer Rodríguez, Leo", "Garcia Velasco, Francisco", "Herrero Cosialls, Dídac", "Jiménez Gàzquez, Daniela",
  "Liesa Font, Laia", "Mañas Aguilera, Judith", "Molón Moreno, Mia", "Muñoz Rodriguez, David",
  "Olavide Reina, Thiago", "Olivé Capel, Emma", "Patón González, Alma", "Rincon Fernandez, Yorkellis Eliza",
  "Rodríguez Blanco, Alberto", "Ruzafa Mesa, Eric", "Sánchez Fernández, Roma", "Shahzad , Muhammad Zohaib",
  "Balboa Solano, Victor", "Cruz Jiménez, Gerard", "De Amo García, Sara", "El Mchichou El Kandoussi, Sara",
  "Faci Gamiz, Arnau", "Ferrándiz Gonzalez, Neizan", "Garcia Lara, Unai", "Gracia Amador, Izan",
  "Leiva Carreras, Lucas David", "Martínez de la Rosa, Noa", "Méndez Méndez, Irene", "Morales Castellano, Gina",
  "Moreno Robledo, Nagore", "Ohst López, Daniel", "Pirvan , Alexandru", "Porto Ruiz, Derek",
  "Ruglio Puigventós, Martina", "Vidal Luis, Bruno", "Zafra Ramos, Sara", "Bordas Bataller, Emma",
  "Cuyubamba Groppo, Aymara Amancay", "Díaz Calvo, Maia", "Dorado Navas, Pablo", "García Galán, Pablo",
  "García Pardo, Mario", "Jiménez Lleixà, Júlia Teresa", "Lázaro Arredondo, Marc", "Lin , Jia",
  "Marín Pulido, Alex", "Martin Crespo, Carla", "Martínez Barrio, Argau", "Molina Sánchez, Nil",
  "Montalvo Valls, Judit", "Montero Amuchastegui, Paula Gisel", "Rodríguez Roldán, Àlex", "Tarrés Acevedo, Alan",
  "Torres Bonet, Xavi", "Arenas Flores, Eloy", "Astasio Martínez, Irene", "Bueso Blanco, Martina",
  "Castro García, Pau", "Cengher Cismas, Nicoleta María", "de los Santos Arrigoni, Lucas", "El Mesaoudi , Aya",
  "Escribano González, Bruno", "Esteve Cornadó, Pere", "Fajardo Chavero, Èric", "Ferraz Egea, Asier",
  "Hinojosa Muñoz, Victor", "Makuere Ola, Ivan", "Matamoros Ricardi, Killian Manuel", "Muñoz Benito, Noa",
  "Peláez Garrancho, Júlia", "Sánchez Giménez, Daniel", "Sufyan, Wania", "Sulé Garcia, Marc",
  "Acebes Mata, Ariadna", "Ali Kousar, Nauman", "Cardós Castillo, Joan", "Crespo Martinez, Raquel",
  "Cuevas Reyes, Naia", "Derkaoui Idelouali, Zainab", "Garcia Maza, David", "Gracia Amador, Libertad",
  "Jara Catalán, Daniela", "Lazaro Balsera, Irene", "Malla Ruiz, Sofia", "Marcos Ramon, Jan",
  "Mestres González, Roc", "Noyola Martínez, Irene", "Ojeda Pérez, Ella", "Pellicer Sánchez, Gerard",
  "Pérez-Hita Laghzail, Omar", "Ramallo Valenzuela, Unai", "Rojas Ramirez, Samuel", "Ruiz Martin, Edgar",
  "Soler Palomo, Laia", "Bernabé Montañés, Gerard", "Boullón Navarro, Alex", "Bueno Moreno, Norah",
  "Dieng Perea, Maty", "Estevez González, Anna", "Jimenez de Dios, Nadia", "Lopez Quizhpi, Dorian Javier",
  "Martínez Engra, Alma", "Membrilla Rubio, Alvaro", "Navarro Bel, Noa", "Rosa Molina, Hugo",
  "Rosa Molina, Leo", "Sánchez Cebollero, Aleix", "Sanchez Pozo, Dylan", "Serrano Romero, Hugo",
  "Testuri Milan, Alvaro", "Torres Correa, Unai", "Valle Martínez, Dana", "Vílchez Hernández, Ainhoa",
  "Villar Barba, Iris", "Ali Anwar, Hajra Noor", "Aujla , Jasmeet Kaur", "Cabrera Martín, Alan",
  "Cobo Pachon, Manel", "Crespo Martinez, Richard", "Delgado Valladares, Mireia", "Duart Arpal, Naiara",
  "Garrido Jimenez, Naiala", "Gómez Raya, Sergi", "Hernández Espinosa, Leo de Borja", "Islam Martinez, Asier",
  "Jiang , Rui", "Lallali Vera, Sabrina", "Martinez Botifoll, Abril", "Méndez Méndez, Hugo",
  "Mendoza López, Bruno", "Rodríguez Martínez, Sergi", "Ruiz Martin, Gerard", "Valeanu , Mathias Nicolas",
  "Varela Fuentes, Ninsy Madysson", "Albors Cano, Irene", "Barresi Carrazo, Giulia", "Benatia Kaddouri, Nour",
  "Chen Zhou, Javi", "El Mesaoudi , Yassine", "Esquivel Isla, Maria", "Fernández Sacristán, Sara",
  "Flores Pardo, Alvaro", "Fluja Sánchez, Dune", "Giralt Salguero, Oriol", "González Díaz, Izan",
  "Gutierrez Paloma, Maika", "Mendoza Calvo, Unai", "Oliva Lio, Gerard", "Olivé Capel, Mireia",
  "Rubio Quintana, Alba", "Ruiz León, Nil", "Sánchez Oliveira, Érika", "Soto Vélez, Arantxa",
  "Sufyan , Koh E Noor", "Traval Sierra, Roger", "Ali Anwar, Hassan", "Benatia Ettaiek, Ismael",
  "Damont Zafra, Kiara", "El Hayky Gutierrez, Hicham", "Garcia Colomera, Didac", "García Oliva, Silvia",
  "Hernandez Borras, Sara", "Hernández Díaz, Ibai", "López Casas, Nico", "Martín del Águila, Iker",
  "Mostazo Aguilera, Marc", "Ramirez Perez, Teo", "Rodrigo Estor, Queralt", "Rodríguez Muñoz, Laura",
  "Rovira Martín, Laia", "Sánchez Pozo, Mario", "Sassot Puig, Juan Antonio", "Serrano Carrillo, Eric",
  "Torres Cebrian, Berta", "Vives Cazorla, Lucia", "Aldana Rivera, Pablo", "Asensio Rivera, Judith",
  "Cortes Albaladejo, Andres", "Fernández Pérez, Zöe", "Flores Pardo, Rafael", "Fonolleda Tudela, Gerard",
  "Guerra López, Helena", "Hernández Álvarez, Oscar", "Jimenez Lleixà, Pau", "Lallali Vera, Yasmina",
  "Martín Amelunge, Antonio", "Moraru , Cristiano Ronaldo", "Porta Sánchez, Hugo", "Ramirez Colomera, Paola",
  "Rincón Fernández, Yoleymi Jazmín", "Rodrigo Estor, Núria", "Rodriguez Ledesma, Martina",
  "Traval Sierra, Sílvia", "Vílchez Sierra, Miriam", "Zafra Ramos, Xavi"
];

console.log(`📊 Total alumnes esperats: ${alumnesEsperats.length}`);

// Llegir el CSV i comparar
const alumnesCSV = [];
const alumnesFaltants = [];

fs.createReadStream('Dades alumnat curs 25-26 - Full-Benet.csv')
  .pipe(csv({
    headers: [
      'numero', 'sexe', 'grup', 'alumne_nom', 'grup_alumne', 
      'tutor_personal', 'tutor_personal_email', 'mail_edu', 'email_alumnat',
      'ralc', 'doc_identitat', 'tis', 'data_naixement', 'municipi_naixement',
      'nacionalitat', 'adreca', 'municipi_residencia', 'cp',
      'tutor1_nom', 'tutor1_tel', 'tutor1_email',
      'tutor2_nom', 'tutor2_tel', 'tutor2_email', 'link_fotografia'
    ]
  }))
  .on('data', (row) => {
    if (row.alumne_nom && row.alumne_nom.trim()) {
      alumnesCSV.push(row.alumne_nom.trim());
    }
  })
  .on('end', () => {
    console.log(`📊 Total alumnes al CSV: ${alumnesCSV.length}`);
    
    // Trobar alumnes que falten
    alumnesEsperats.forEach(alumneEsperat => {
      if (!alumnesCSV.includes(alumneEsperat)) {
        alumnesFaltants.push(alumneEsperat);
      }
    });
    
    console.log(`❌ Alumnes que falten del CSV: ${alumnesFaltants.length}`);
    if (alumnesFaltants.length > 0) {
      console.log('\n📋 Llista d\'alumnes que falten:');
      alumnesFaltants.forEach((alumne, index) => {
        console.log(`${index + 1}. ${alumne}`);
      });
    }
    
    // Trobar alumnes del CSV que no estan a la llista esperada
    const alumnesExtres = alumnesCSV.filter(alumneCSV => !alumnesEsperats.includes(alumneCSV));
    console.log(`\n➕ Alumnes al CSV que no estan a la llista esperada: ${alumnesExtres.length}`);
    if (alumnesExtres.length > 0) {
      console.log('\n📋 Llista d\'alumnes extres:');
      alumnesExtres.forEach((alumne, index) => {
        console.log(`${index + 1}. ${alumne}`);
      });
    }
    
    console.log(`\n📊 RESUM:`);
    console.log(`- Alumnes esperats: ${alumnesEsperats.length}`);
    console.log(`- Alumnes al CSV: ${alumnesCSV.length}`);
    console.log(`- Alumnes que falten: ${alumnesFaltants.length}`);
    console.log(`- Alumnes extres: ${alumnesExtres.length}`);
  })
  .on('error', (error) => {
    console.error('Error llegint el CSV:', error);
  });
