// Frontend preview with Vite ("npm run dev").
// Chat requests (/api/...) are forwarded to the Node.js backend, so run "npm start" as well.
export default {
  root: "site",
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
};
