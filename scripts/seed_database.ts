
import fetch from 'node-fetch';

async function seedDatabase() {
  try {
    const response = await fetch('http://localhost:3000/api/seed-database', {
      method: 'POST',
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    const data = await response.json();
    console.log('Database seeded successfully:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
