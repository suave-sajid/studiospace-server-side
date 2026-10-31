
import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
  console.log(
    `StudioSpace API running on http://localhost:${PORT}`
  );
});
