
import fetch from 'node-fetch';

async function fetchPivos() {
  try {
    const response = await fetch('http://localhost:3000/api/pivots');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching pivos:', error);
  }
}

fetchPivos();
