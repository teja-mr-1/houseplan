const fs = require('fs');
const html = fs.readFileSync('house_3d_hologram.html', 'utf8');
const scriptStart = html.lastIndexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const jsCode = html.substring(scriptStart + 8, scriptEnd);
try {
  new Function(jsCode);
  console.log("No syntax errors found by new Function().");
} catch (e) {
  console.error("Syntax Error: ", e);
}
