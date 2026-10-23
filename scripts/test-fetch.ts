async function check() {
  try {
    const res = await fetch('http://localhost:5180');
    console.log('HTTP status:', res.status);
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}
check();
