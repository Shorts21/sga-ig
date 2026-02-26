import fetch from 'node-fetch';

async function checkPivots() {
  try {
    const response = await fetch('http://localhost:3000/api/pivots');
    const data = await response.json();
    console.log('Pivots:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPivots();
