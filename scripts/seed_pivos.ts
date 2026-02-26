
import fetch from 'node-fetch';

async function seedPivos() {
  try {
    const response = await fetch('http://localhost:3000/api/seed-pivos', {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Pivos seeded successfully:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error seeding pivos:', error);
  }
}

seedPivos();
