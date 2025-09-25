// Script para asignar tutores a alumnos existentes
const fs = require('fs');
const path = require('path');

console.log('🎯 ASIGNACIÓN DE TUTORES A ALUMNOS');
console.log('==================================\n');

// Datos de asignación tutor-alumno
const asignaciones = [
    { alumno: 'irene.albors@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'giulia.barresi@insbitacola.cat', tutor: 'blanca.pi@insbitacola.cat' },
    { alumno: 'nour.benatia@insbitacola.cat', tutor: 'blanca.pi@insbitacola.cat' },
    { alumno: 'javi.chen@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'yassine.elmesaoudi@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'maria.esquivel@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'sara.fernandez@insbitacola.cat', tutor: 'blanca.pi@insbitacola.cat' },
    { alumno: 'alvaro.flores@insbitacola.cat', tutor: 'blanca.pi@insbitacola.cat' },
    { alumno: 'dune.fluja@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'oriol.giralt@insbitacola.cat', tutor: 'blanca.pi@insbitacola.cat' },
    { alumno: 'izan.gonzalez@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'maika.gutierrez@insbitacola.cat', tutor: 'laia.giner@insbitacola.cat' },
    { alumno: 'unai.mendoza@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'gerard.oliva@insbitacola.cat', tutor: 'laia.giner@insbitacola.cat' },
    { alumno: 'mireia.olive@insbitacola.cat', tutor: 'blanca.pi@insbitacola.cat' },
    { alumno: 'alba.rubio@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'nil.ruiz@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'erika.sanchez@insbitacola.cat', tutor: 'laia.giner@insbitacola.cat' },
    { alumno: 'arantxa.soto@insbitacola.cat', tutor: 'blanca.pi@insbitacola.cat' },
    { alumno: 'kohe-noor.sufyan@insbitacola.cat', tutor: 'blanca.pi@insbitacola.cat' },
    { alumno: 'roger.traval@insbitacola.cat', tutor: 'xavier.reyes@insbitacola.cat' },
    { alumno: 'hassan.alianwar@insbitacola.cat', tutor: 'albert.parrilla@insbitacola.cat' },
    { alumno: 'ismael.benatia@insbitacola.cat', tutor: 'rony.castillo@insbitacola.cat' },
    { alumno: 'kiara.damont@insbitacola.cat', tutor: 'rony.castillo@insbitacola.cat' },
    { alumno: 'hicham.elhayky@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'didac.garcia@insbitacola.cat', tutor: 'laia.giner@insbitacola.cat' },
    { alumno: 'silvia.garcia@insbitacola.cat', tutor: 'rony.castillo@insbitacola.cat' },
    { alumno: 'sara.hernandez@insbitacola.cat', tutor: 'laia.giner@insbitacola.cat' },
    { alumno: 'ibai.hernandez@insbitacola.cat', tutor: 'albert.parrilla@insbitacola.cat' },
    { alumno: 'nico.lopez@insbitacola.cat', tutor: 'laia.giner@insbitacola.cat' },
    { alumno: 'iker1.martin@insbitacola.cat', tutor: 'rony.castillo@insbitacola.cat' },
    { alumno: 'marc.mostazo@insbitacola.cat', tutor: 'rony.castillo@insbitacola.cat' },
    { alumno: 'teo.ramirez@insbitacola.cat', tutor: 'rony.castillo@insbitacola.cat' },
    { alumno: 'queralt.rodrigo@insbitacola.cat', tutor: 'rony.castillo@insbitacola.cat' },
    { alumno: 'laura.rodriguez@insbitacola.cat', tutor: 'albert.parrilla@insbitacola.cat' },
    { alumno: 'laia.rovira@insbitacola.cat', tutor: 'albert.parrilla@insbitacola.cat' },
    { alumno: 'mario.sanchez@insbitacola.cat', tutor: 'albert.parrilla@insbitacola.cat' },
    { alumno: 'juan.sassot@insbitacola.cat', tutor: 'albert.parrilla@insbitacola.cat' },
    { alumno: 'eric.serrano@insbitacola.cat', tutor: 'albert.parrilla@insbitacola.cat' },
    { alumno: 'berta.torres@insbitacola.cat', tutor: 'rony.castillo@insbitacola.cat' },
    { alumno: 'lucia.vives@insbitacola.cat', tutor: 'albert.parrilla@insbitacola.cat' },
    { alumno: 'pablo.aldana@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' },
    { alumno: 'judith.asensio@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'andres.cortes@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'zoe.fernandez@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' },
    { alumno: 'rafael.flores@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'gerard.fonolleda@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'aaron.fuentes@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' },
    { alumno: 'helena.guerra@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'oscar.hernandez@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' },
    { alumno: 'pau.jimenez@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' },
    { alumno: 'yasmina.lallali@insbitacola.cat', tutor: 'laia.giner@insbitacola.cat' },
    { alumno: 'antonio.martin@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'cristiano.moraru@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' },
    { alumno: 'hugo.porta@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' },
    { alumno: 'paola.ramirez@insbitacola.cat', tutor: 'laia.giner@insbitacola.cat' },
    { alumno: 'yoleymi.rincon@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'nuria.rodrigo@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' },
    { alumno: 'martina.rodriguez@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'silvia.traval@insbitacola.cat', tutor: 'dani.palau@insbitacola.cat' },
    { alumno: 'miriam.vilchez@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' },
    { alumno: 'xavi.zafra@insbitacola.cat', tutor: 'benet.andujar@insbitacola.cat' }
];

console.log(`📊 Total de asignaciones: ${asignaciones.length}`);

// Agrupar por tutor
const tutores = {};
asignaciones.forEach(asignacion => {
    if (!tutores[asignacion.tutor]) {
        tutores[asignacion.tutor] = [];
    }
    tutores[asignacion.tutor].push(asignacion.alumno);
});

console.log(`👥 Tutores únicos: ${Object.keys(tutores).length}`);
Object.keys(tutores).forEach(tutor => {
    console.log(`- ${tutor}: ${tutores[tutor].length} alumnos`);
});

// Función para asignar tutores
async function asignarTutores() {
    try {
        console.log('\n🔄 Asignando tutores a alumnos...');
        
        let asignados = 0;
        let errores = 0;
        
        for (const asignacion of asignaciones) {
            try {
                // Crear asignación tutor-alumno
                const response = await fetch('http://localhost:8081/tutors/assignacions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer benet.andujar@insbitacola.cat'
                    },
                    body: JSON.stringify({
                        email: asignacion.tutor,
                        anyCurs: '2025-2026',
                        grup: '1A' // Asumimos grupo 1A por defecto
                    })
                });
                
                if (response.ok) {
                    asignados++;
                    console.log(`✅ ${asignacion.alumno} → ${asignacion.tutor}`);
                } else {
                    errores++;
                    const error = await response.text();
                    console.log(`❌ Error asignando ${asignacion.alumno}: ${error}`);
                }
            } catch (error) {
                errores++;
                console.log(`❌ Error asignando ${asignacion.alumno}: ${error.message}`);
            }
        }
        
        console.log(`\n📊 Resultado:`);
        console.log(`✅ Asignados: ${asignados}`);
        console.log(`❌ Errores: ${errores}`);
        
        // Verificar tutores finales
        console.log('\n🔍 Verificando tutores finales...');
        const tutoresResponse = await fetch('http://localhost:8081/tutors/lista', {
            headers: { 'Authorization': 'Bearer benet.andujar@insbitacola.cat' }
        });
        
        if (tutoresResponse.ok) {
            const tutores = await tutoresResponse.json();
            console.log(`👥 Tutores activos: ${tutores.length}`);
            tutores.forEach(tutor => {
                console.log(`- ${tutor.tutor_email}: ${tutor.total_alumnes} alumnos`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error en asignación:', error.message);
        process.exit(1);
    }
}

// Ejecutar asignación
asignarTutores();
