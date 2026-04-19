/**
 * Seeds the local SQLite DB with 50 fake applicants (children records).
 * Run from trace-app: npm run seed:applicants
 */
const { faker } = require('@faker-js/faker');
const { initDb } = require('../db');
const childModel = require('../models/child');

const SEED_COUNT = 100;

const PH_CITIES = [
  'Manila', 'Quezon City', 'Davao City', 'Cebu City', 'Caloocan',
  'Zamboanga City', 'Antipolo', 'Pasig', 'Taguig', 'Valenzuela',
  'Cagayan de Oro', 'Parañaque', 'Dasmariñas', 'Makati', 'Bacolod',
  'Iloilo City', 'San Jose del Monte', 'Calamba', 'Mandaluyong', 'Angeles',
];

function formatDateOnly(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Builds one random applicant payload matching POST /api/children body. */
function buildFakeApplicant() {
  const birth = faker.date.birthdate({ min: 0, max: 85, mode: 'age' });
  const city = faker.helpers.arrayElement(PH_CITIES);
  const barangay = faker.location.street();
  return {
    first_name: faker.person.firstName(),
    middle_name: faker.datatype.boolean({ probability: 0.85 }) ? faker.person.middleName() : '',
    last_name: faker.person.lastName(),
    date_of_birth: formatDateOnly(birth),
    place_of_birth: `${barangay}, ${city}`,
    contact_no: `09${faker.string.numeric(9)}`,
    registrant_deceased: faker.datatype.boolean({ probability: 0.08 }),
    hilot_deceased: faker.datatype.boolean({ probability: 0.06 }),
    parent_foreigner: faker.datatype.boolean({ probability: 0.1 }),
    out_of_town: faker.datatype.boolean({ probability: 0.1 }),
  };
}

async function seedApplicants(count = SEED_COUNT) {
  await initDb();
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    const row = buildFakeApplicant();
    const id = childModel.create({
      first_name: row.first_name,
      middle_name: row.middle_name || undefined,
      last_name: row.last_name,
      date_of_birth: row.date_of_birth,
      place_of_birth: row.place_of_birth,
      contact_no: row.contact_no,
      registrant_deceased: row.registrant_deceased,
      hilot_deceased: row.hilot_deceased,
      parent_foreigner: row.parent_foreigner,
      out_of_town: row.out_of_town,
    });
    ids.push(Number(id));
  }
  return ids;
}

if (require.main === module) {
  seedApplicants()
    .then((ids) => {
      console.log(`Seeded ${ids.length} fake applicants. Last id: ${ids[ids.length - 1]}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { buildFakeApplicant, seedApplicants, SEED_COUNT };
