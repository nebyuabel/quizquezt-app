const fs = require("fs");
const path = require("path");

// Ensure the dist folder has proper structure
function fixVercelBuild() {
  const distPath = path.join(__dirname, "../dist");

  // Check if index.html exists
  if (!fs.existsSync(path.join(distPath, "index.html"))) {
    console.log("❌ index.html not found in dist folder");

    // Look for the actual built HTML file
    const files = fs.readdirSync(distPath);
    const htmlFiles = files.filter((f) => f.endsWith(".html"));

    if (htmlFiles.length > 0) {
      // Rename the first HTML file to index.html
      fs.renameSync(
        path.join(distPath, htmlFiles[0]),
        path.join(distPath, "index.html")
      );
      console.log(`✅ Renamed ${htmlFiles[0]} to index.html`);
    }
  }

  // Ensure all static assets are accessible
  console.log("📁 Dist folder contents:", fs.readdirSync(distPath));
}

fixVercelBuild();
